// ========================================
// Fechamento do dia: penalidade por missão perdida e bônus por dia completo
//
// Substitui o processamento antigo (desligado por bugs). Diferenças:
//   * datas sempre como "YYYY-MM-DD" no fuso do Brasil, sem aritmética de horas
//   * fecha TODOS os dias pendentes até ontem (limite de alguns dias), não só ontem
//   * cada dia é fechado uma vez só, mesmo com dois aparelhos abertos (transação)
//   * dias de férias não têm penalidade
//   * começa a valer na data em que o responsável ligou, sem cobrar o passado
// ========================================

import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayBrazil } from '../utils/timezone';
import { DAILY_RULES_DEFAULTS } from '../config/rules';
import { dueTasksOn, nextFullDays, rangeCoversDate } from './village/schedule';
import { fromVillageDoc } from './villageService';
import { initialVillageDoc } from '../config/village';
import { touchHealth } from './observability';
import type { ScheduleTask } from '../types/village';

export interface DailyRules {
  enabled: boolean;
  penaltyPerMissedTask: number;
  allDoneBonus: number;
  /** YYYY-MM-DD: primeiro dia que pode ser fechado */
  activatedOn: string | null;
}

export interface DayClosure {
  date: string;
  totalTasksAvailable: number;
  tasksCompleted: number;
  xpEarned: number;
  goldEarned: number;
  goldPenalty: number;
  allTasksBonusGold: number;
  vacation: boolean;
  paused?: boolean;
  punished?: boolean;
}

const RULES_DOC = doc(db, 'settings', 'dailyRules');

export function addDaysStr(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function parseRules(data: Record<string, unknown> | undefined): DailyRules {
  return {
    enabled: typeof data?.enabled === 'boolean' ? data.enabled : DAILY_RULES_DEFAULTS.enabled,
    penaltyPerMissedTask: typeof data?.penaltyPerMissedTask === 'number' ? data.penaltyPerMissedTask : DAILY_RULES_DEFAULTS.penaltyPerMissedTask,
    allDoneBonus: typeof data?.allDoneBonus === 'number' ? data.allDoneBonus : DAILY_RULES_DEFAULTS.allDoneBonus,
    activatedOn: typeof data?.activatedOn === 'string' ? data.activatedOn : null,
  };
}

export async function getDailyRules(): Promise<DailyRules> {
  const snap = await getDoc(RULES_DOC);
  return parseRules(snap.exists() ? snap.data() : undefined);
}

export function subscribeDailyRules(onChange: (rules: DailyRules) => void): () => void {
  return onSnapshot(RULES_DOC, (snap) => onChange(parseRules(snap.exists() ? snap.data() : undefined)));
}

/** Responsável salva as regras. Ao ligar pela primeira vez, marca a data de início. */
export async function saveDailyRules(updates: Partial<DailyRules>): Promise<void> {
  const current = await getDailyRules();
  const next: Partial<DailyRules> = { ...updates };
  if (updates.enabled && !current.activatedOn) next.activatedOn = getTodayBrazil();
  await setDoc(RULES_DOC, { ...next, updatedAt: serverTimestamp() }, { merge: true });
}

async function isVacationOn(date: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'settings', 'vacationMode'));
  if (!snap.exists()) return false;
  const v = snap.data();
  if (!v.is_enabled) return false;
  if (v.start_date && date < v.start_date) return false;
  if (v.end_date && date > v.end_date) return false;
  return true;
}

async function tasksDueOn(userId: string, date: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'tasks'), where('ownerId', '==', userId)));
  const tasks: ScheduleTask[] = snap.docs.map((t) => {
    const data = t.data();
    return {
      id: t.id,
      active: data.active !== false,
      frequency: data.frequency || 'daily',
      period: data.period || 'morning',
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
  return dueTasksOn(tasks, date).length;
}

async function isPauseDay(date: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'settings', 'pauseDays'));
  const dates = Array.isArray(snap.data()?.dates) ? snap.data()?.dates as string[] : [];
  return dates.includes(date);
}

/**
 * A data (YYYY-MM-DD, Brasil) caiu dentro de alguma punição? Olha todas as punições do usuário,
 * ativas ou já encerradas (o fechamento do dia roda depois, quando a punição pode já ter acabado),
 * e compara instantes no fuso do Brasil: punição ligada às 21h de terça cobre a terça.
 */
async function isPunishedOn(userId: string, date: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'punishmentMode'), where('userId', '==', userId)));
  return snap.docs.some((d) => {
    const data = d.data();
    const start = data.startDate?.toDate?.() as Date | undefined;
    const end = data.endDate?.toDate?.() as Date | undefined;
    if (!start || !end) return false;
    const deactivated = data.deactivatedAt?.toDate?.() as Date | undefined;
    const endMs = deactivated ? Math.min(end.getTime(), deactivated.getTime()) : end.getTime();
    return rangeCoversDate(start.getTime(), endMs, date);
  });
}

async function completionsOn(userId: string, date: string): Promise<{ count: number; xp: number; gold: number }> {
  const snap = await getDocs(query(collection(db, 'taskCompletions'), where('userId', '==', userId), where('date', '==', date)));
  let xp = 0;
  let gold = 0;
  let count = 0;
  for (const c of snap.docs) {
    if (c.data().reverted === true) continue;
    count += 1;
    xp += Number(c.data().xpEarned) || 0;
    gold += Number(c.data().goldEarned) || 0;
  }
  return { count, xp, gold };
}

/**
 * Fecha um dia: grava dailyProgress e aplica penalidade/bônus uma única vez.
 * Devolve null se o dia já estava fechado.
 */
export async function closeDay(userId: string, date: string, rules?: DailyRules): Promise<DayClosure | null> {
  const r = rules ?? (await getDailyRules());
  const dailyRef = doc(db, 'dailyProgress', `${userId}_${date}`);

  const existing = await getDoc(dailyRef);
  if (existing.exists() && existing.data().summaryProcessed === true) return null;

  const [due, done, vacation, paused, punished] = await Promise.all([
    tasksDueOn(userId, date),
    completionsOn(userId, date),
    isVacationOn(date),
    isPauseDay(date),
    isPunishedOn(userId, date),
  ]);
  const skipPenalty = vacation || paused || punished;
  const missed = Math.max(0, due - done.count);
  const penaltyWanted = r.enabled && !skipPenalty ? missed * r.penaltyPerMissedTask : 0;
  const bonus = r.enabled && !skipPenalty && due > 0 && done.count >= due ? r.allDoneBonus : 0;

  const progressRef = doc(db, 'progress', userId);
  const villageRef = doc(db, 'village', userId);
  let applied: DayClosure | null = null;

  await runTransaction(db, async (tx) => {
    const dailySnap = await tx.get(dailyRef);
    if (dailySnap.exists() && dailySnap.data().summaryProcessed === true) return;

    const progressSnap = await tx.get(progressRef);
    const villageSnap = await tx.get(villageRef);
    const gold = Number(progressSnap.data()?.availableGold) || 0;
    const penalty = Math.min(penaltyWanted, gold);
    const afterPenalty = gold - penalty;
    const finalGold = afterPenalty + bonus;

    tx.set(dailyRef, {
      userId,
      date,
      totalTasksAvailable: due,
      tasksCompleted: done.count,
      xpEarned: done.xp,
      goldEarned: done.gold,
      goldPenalty: penalty,
      allTasksBonusGold: bonus,
      vacation,
      paused,
      punished,
      summaryProcessed: true,
      processedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (progressSnap.exists()) {
      tx.update(progressRef, {
        availableGold: finalGold,
        totalGoldEarned: (Number(progressSnap.data()?.totalGoldEarned) || 0) + bonus,
        lastDailySummaryProcessedDay: date,
        lastDailySummaryProcessedDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (penalty > 0) {
      tx.set(doc(collection(db, 'goldTransactions')), {
        userId,
        amount: -penalty,
        type: 'penalty',
        source: 'daily_penalty',
        description: `${missed} ${missed === 1 ? 'missão perdida' : 'missões perdidas'} em ${date.split('-').reverse().slice(0, 2).join('/')}`,
        metadata: { date, tasksCompleted: done.count, totalTasksAvailable: due, incompleteTasks: missed },
        balanceBefore: gold,
        balanceAfter: afterPenalty,
        createdAt: serverTimestamp(),
      });
    }
    if (bonus > 0) {
      tx.set(doc(collection(db, 'goldTransactions')), {
        userId,
        amount: bonus,
        type: 'bonus',
        source: 'daily_bonus',
        description: `Dia completo em ${date.split('-').reverse().slice(0, 2).join('/')}: todas as missões feitas`,
        metadata: { date, tasksCompleted: done.count, totalTasksAvailable: due },
        balanceBefore: afterPenalty,
        balanceAfter: finalGold,
        createdAt: serverTimestamp(),
      });
    }

    const village = villageSnap.exists()
      ? fromVillageDoc(userId, villageSnap.data() as Record<string, unknown>)
      : initialVillageDoc(userId, new Date().toISOString());
    // Tochas: dia sem missão devida, folga, férias e punição não mexem (nextFullDays é puro e testado)
    const torches = nextFullDays({
      due,
      done: done.count,
      fullDays: village.fullDays,
      fullDaysStart: village.fullDaysStart,
      date,
      skip: paused || punished || vacation,
    });
    if (torches.changed) {
      const patch = { fullDays: torches.fullDays, fullDaysStart: torches.fullDaysStart, updatedAt: new Date().toISOString() };
      if (villageSnap.exists()) {
        tx.update(villageRef, patch);
      } else {
        tx.set(villageRef, { ...village, ...patch });
      }
    }

    applied = {
      date,
      totalTasksAvailable: due,
      tasksCompleted: done.count,
      xpEarned: done.xp,
      goldEarned: done.gold,
      goldPenalty: penalty,
      allTasksBonusGold: bonus,
      vacation,
      paused,
      punished,
    };
  });

  void touchHealth(userId, 'lastCloseDay', date);
  return applied;
}

/**
 * Fecha todos os dias pendentes até ontem. Começa no dia em que as regras foram
 * ligadas (ou no último dia fechado + 1) e alcança no máximo alguns dias para trás.
 */
export async function processPendingDays(userId: string): Promise<DayClosure[]> {
  const rules = await getDailyRules();
  if (!rules.enabled) return [];

  const today = getTodayBrazil();
  const yesterday = addDaysStr(today, -1);
  const progressSnap = await getDoc(doc(db, 'progress', userId));
  const lastClosed = progressSnap.exists() ? (progressSnap.data().lastDailySummaryProcessedDay as string | undefined) : undefined;

  let start = rules.activatedOn ?? today;
  if (lastClosed && addDaysStr(lastClosed, 1) > start) start = addDaysStr(lastClosed, 1);
  const floor = addDaysStr(today, -DAILY_RULES_DEFAULTS.maxLookbackDays);
  if (start < floor) start = floor;

  const results: DayClosure[] = [];
  for (let d = start; d <= yesterday; d = addDaysStr(d, 1)) {
    const closed = await closeDay(userId, d, rules);
    if (closed) results.push(closed);
  }
  return results;
}

/** Leitura do fechamento de um dia (para a tela da criança e do responsável) */
export async function getDayClosure(userId: string, date: string): Promise<DayClosure | null> {
  const snap = await getDoc(doc(db, 'dailyProgress', `${userId}_${date}`));
  if (!snap.exists() || snap.data().summaryProcessed !== true) return null;
  const d = snap.data();
  return {
    date,
    totalTasksAvailable: Number(d.totalTasksAvailable) || 0,
    tasksCompleted: Number(d.tasksCompleted) || 0,
    xpEarned: Number(d.xpEarned) || 0,
    goldEarned: Number(d.goldEarned) || 0,
    goldPenalty: Number(d.goldPenalty) || 0,
    allTasksBonusGold: Number(d.allTasksBonusGold) || 0,
    vacation: d.vacation === true,
  };
}
