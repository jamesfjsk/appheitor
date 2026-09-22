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
import { addDays, getTodayBrazil, isoWeekOf, isBeforeLaunch } from '../utils/clock';
import { DAILY_RULES_DEFAULTS } from '../config/rules';
import { dueTasksOn, nextFullDays, rangeCoversDate } from './village/schedule';
import { fromVillageDoc } from './villageService';
import { initialVillageDoc } from '../config/village';
import { touchHealth } from './observability';
import type { Period, ScheduleTask } from '../types/village';
import { cracksAfterClose, cracksOf, liveBuildingLevel, RUIN_ROUND_CAP } from './village/repair';
import { claimKey, hasClaim } from './village/claims';
import { bumpChallenge, extendActiveChallenges } from './challengesService';
import { addVillageStats, skipDayPenalty } from './village/stats';

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
  return addDays(date, days);
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

async function loadDueTasks(userId: string, date: string): Promise<ScheduleTask[]> {
  const snap = await getDocs(query(collection(db, 'tasks'), where('ownerId', '==', userId)));
  const tasks: ScheduleTask[] = snap.docs.map((t) => {
    const data = t.data();
    return {
      id: t.id,
      active: data.active !== false,
      frequency: data.frequency || 'daily',
      period: data.period || 'morning',
      createdAt: data.createdAt?.toDate?.() ?? null,
      optional: data.optional === true,
    };
  });
  return dueTasksOn(tasks, date);
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
    if (data.isActive === false && !data.deactivatedAt) return false; // inativa sem data de desativação: não vale (18/09)
    const deactivated = data.deactivatedAt?.toDate?.() as Date | undefined;
    const endMs = deactivated ? Math.min(end.getTime(), deactivated.getTime()) : end.getTime();
    return rangeCoversDate(start.getTime(), endMs, date);
  });
}

async function completionsOn(userId: string, date: string): Promise<{ count: number; xp: number; gold: number; taskIds: string[] }> {
  const snap = await getDocs(query(collection(db, 'taskCompletions'), where('userId', '==', userId), where('date', '==', date)));
  let xp = 0;
  let gold = 0;
  let count = 0;
  const taskIds: string[] = [];
  for (const c of snap.docs) {
    if (c.data().reverted === true) continue;
    count += 1;
    xp += Number(c.data().xpEarned) || 0;
    gold += Number(c.data().goldEarned) || 0;
    if (c.data().taskId) taskIds.push(String(c.data().taskId));
  }
  return { count, xp, gold, taskIds };
}

/**
 * Fecha um dia: grava dailyProgress e aplica penalidade/bônus uma única vez.
 * Devolve null se o dia já estava fechado.
 */
export async function closeDay(
  userId: string,
  date: string,
  rules?: DailyRules,
  opts?: { allowRuin?: boolean },
): Promise<DayClosure | null> {
  const r = rules ?? (await getDailyRules());
  const dailyRef = doc(db, 'dailyProgress', `${userId}_${date}`);

  const existing = await getDoc(dailyRef);
  if (existing.exists() && existing.data().summaryProcessed === true) return null;

  const [dueTasks, done, vacation, paused, punished] = await Promise.all([
    loadDueTasks(userId, date),
    completionsOn(userId, date),
    isVacationOn(date),
    isPauseDay(date),
    isPunishedOn(userId, date),
  ]);
  const due = dueTasks.length;
  const skipPenalty = skipDayPenalty({ vacation, paused, punished, enabled: r.enabled });
  const missedTasks = dueTasks.filter((t) => !done.taskIds.includes(t.id));
  const quizSnap = await getDoc(doc(db, 'dailyQuizzes', `${userId}_${date}`));
  const quizDone = quizSnap.data()?.completed === true;

  const progressRef = doc(db, 'progress', userId);
  const villageRef = doc(db, 'village', userId);
  let applied: DayClosure | null = null;
  let extendPunish = false;
  let fullDaysAfter = 0;
  let skippedClose = skipPenalty;

  await runTransaction(db, async (tx) => {
    const dailySnap = await tx.get(dailyRef);
    if (dailySnap.exists() && dailySnap.data().summaryProcessed === true) return;

    const progressSnap = await tx.get(progressRef);
    const villageSnap = await tx.get(villageRef);
    const baseSnap = await tx.get(doc(db, 'englishBase', userId));
    const village = villageSnap.exists()
      ? fromVillageDoc(userId, villageSnap.data() as Record<string, unknown>)
      : initialVillageDoc(userId, new Date().toISOString());
    const buildings = (baseSnap.data()?.buildings || {}) as Record<string, number>;
    const cerca = liveBuildingLevel(buildings, village.cracks, 'cerca');
    const skip = skipPenalty
      || dailySnap.data()?.skipPenalty === true
      || isBeforeLaunch(date, village.launchedOn);
    skippedClose = skip;

    let missed = missedTasks.length;
    let helmetUsed = false;
    const week = isoWeekOf(date);
    if (!skip && missed === 1 && village.gear.helmet >= 1 && village.shield.helmetWeek !== week) {
      missed = 0;
      helmetUsed = true;
    }
    const dueDone = Math.max(0, due - missed);

    let penaltyWanted = r.enabled && !skip ? missed * r.penaltyPerMissedTask : 0;
    if (cerca >= 3 && penaltyWanted > 1) penaltyWanted = 1;
    const bonus = r.enabled && !skip && due > 0 && dueDone >= due ? r.allDoneBonus : 0;

    const gold = Number(progressSnap.data()?.availableGold) || 0;
    const penalty = Math.min(penaltyWanted, gold);
    const afterPenalty = gold - penalty;
    const finalGold = afterPenalty + bonus;

    tx.set(dailyRef, {
      userId,
      date,
      totalTasksAvailable: due,
      tasksCompleted: dueDone,
      xpEarned: done.xp,
      goldEarned: done.gold,
      goldPenalty: penalty,
      allTasksBonusGold: bonus,
      vacation,
      paused,
      punished,
      helmetUsed,
      skipPenalty: skip,
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
        metadata: { date, tasksCompleted: dueDone, totalTasksAvailable: due, incompleteTasks: missed },
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
        metadata: { date, tasksCompleted: dueDone, totalTasksAvailable: due },
        balanceBefore: afterPenalty,
        balanceAfter: finalGold,
        createdAt: serverTimestamp(),
      });
    }

    const missedIds = skip
      ? []
      : helmetUsed
        ? missedTasks.slice(1).map((t) => t.id)
        : missedTasks.map((t) => t.id);
    const missedForCrack = missedTasks.filter((t) => missedIds.includes(t.id)).map((t) => ({ period: t.period as Period }));
    const crackMissed = opts?.allowRuin === false ? [] : missedForCrack;
    const cracks = cracksAfterClose(cerca >= 2 ? [] : village.cracks, crackMissed, buildings);
    const punishKey = claimKey('punish', date);
    const claimed = { ...village.claimed };
    if (punished && !hasClaim(village, punishKey)) {
      claimed[punishKey] = new Date().toISOString();
      extendPunish = true;
    }
    const lost = !skip && due > 0 && dueDone < due;
    const fenceKey = claimKey('fence', date.slice(0, 7));
    let keepTorches = false;
    if (lost && cerca >= 1 && !hasClaim(village, fenceKey)) {
      keepTorches = true;
      claimed[fenceKey] = new Date().toISOString();
    }
    const shield = helmetUsed ? { ...village.shield, helmetWeek: week } : village.shield;
    const torches = nextFullDays({
      due,
      done: dueDone,
      fullDays: village.fullDays,
      fullDaysStart: village.fullDaysStart,
      date,
      skip: skip || keepTorches,
    });
    fullDaysAfter = torches.changed ? torches.fullDays : village.fullDays;
    const torch = !skip && due > 0 && dueDone >= due;
    const stats = addVillageStats(village.stats, {
      fullDaysCount: torch ? 1 : 0,
      noPunishDays: skip ? 0 : 1,
    });
    if (punished) stats.noPunishDays = 0;
    if (skip) {
      /* férias/folga/off/pré-lançamento: não mexe na sequência "sem esquecer" */
    } else if (lost) {
      stats.perfectWeeks = 0;
    } else if (torch) {
      stats.perfectWeeks = (village.stats.perfectWeeks || 0) + 1;
    }
    if (torch) stats.fullDaysBest = Math.max(Number(stats.fullDaysBest) || 0, fullDaysAfter);
    if (!vacation && !paused && !quizDone && progressSnap.data()?.quizEnabled !== false) stats.quizStreak = 0;
    const patch = {
      fullDays: torches.changed ? torches.fullDays : village.fullDays,
      fullDaysStart: torches.changed ? torches.fullDaysStart : village.fullDaysStart,
      cracks,
      claimed,
      shield,
      stats,
      updatedAt: new Date().toISOString(),
    };
    if (villageSnap.exists()) tx.update(villageRef, patch);
    else tx.set(villageRef, { ...village, ...patch });

    applied = {
      date,
      totalTasksAvailable: due,
      tasksCompleted: dueDone,
      xpEarned: done.xp,
      goldEarned: done.gold,
      goldPenalty: penalty,
      allTasksBonusGold: bonus,
      vacation,
      paused,
      punished,
    };
  });

  if (extendPunish) {
    try { await extendActiveChallenges(userId, 1); } catch (e) { console.warn('closeDay: extend desafios', e); }
  }
  if (applied && !skippedClose) {
    try { await bumpChallenge(userId, 'full_days', fullDaysAfter, true); } catch (e) { console.warn('closeDay: bump full_days', e); }
  }
  try {
    const { bumpVillage } = await import('./village/statsBump');
    await bumpVillage(userId, {});
  } catch (e) {
    console.warn('closeDay: stats', e);
  }

  void touchHealth(userId, 'lastCloseDay', date);
  return applied;
}

/**
 * Fecha todos os dias pendentes até ontem. Começa no dia em que as regras foram
 * ligadas (ou no último dia fechado + 1) e alcança no máximo alguns dias para trás.
 */
export async function processPendingDays(userId: string): Promise<DayClosure[]> {
  const rules = await getDailyRules();
  const today = getTodayBrazil();
  const yesterday = addDaysStr(today, -1);
  const progressSnap = await getDoc(doc(db, 'progress', userId));
  const lastClosed = progressSnap.exists() ? (progressSnap.data().lastDailySummaryProcessedDay as string | undefined) : undefined;

  let start = rules.activatedOn ?? (lastClosed ? addDaysStr(lastClosed, 1) : addDaysStr(today, -DAILY_RULES_DEFAULTS.maxLookbackDays));
  if (lastClosed && addDaysStr(lastClosed, 1) > start) start = addDaysStr(lastClosed, 1);
  const floor = addDaysStr(today, -DAILY_RULES_DEFAULTS.maxLookbackDays);
  if (start < floor) start = floor;

  const results: DayClosure[] = [];
  const villageSnap = await getDoc(doc(db, 'village', userId));
  let knownCracks = cracksOf(villageSnap.data()?.cracks).length;
  let ruins = 0;
  for (let d = start; d <= yesterday; d = addDaysStr(d, 1)) {
    const closed = await closeDay(userId, d, rules, { allowRuin: ruins < RUIN_ROUND_CAP });
    if (!closed) continue;
    results.push(closed);
    const after = await getDoc(doc(db, 'village', userId));
    const now = cracksOf(after.data()?.cracks).length;
    if (now > knownCracks) ruins += now - knownCracks;
    knownCracks = now;
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
    paused: d.paused === true,
    punished: d.punished === true,
  };
}
