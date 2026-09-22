import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FAMILY_ID } from '../config/rules';
import { DEFAULT_ECONOMY, DEFAULT_MODULES } from '../config/village';
import type { EconomySettings, GoalDoc, GoalStatus, ModuleSettings } from '../types/village';
import { getTodayBrazil, isoWeekOf, nowBrazil } from '../utils/clock';
import { pickGhostPile, validateDeposit, vaultGoalCap, weeklyInterest, unlockOnAfter, canRedeemPile } from './village/bank';
import { ensureBase } from './englishBaseService';
import { capGold } from './village/caps';
import { getSettings } from './settingsService';
import { listGoldTransactions, roomForGameGold, txsInWeek } from './goldTx';
import { stripUndefined } from './villageService';
import { touchHealth } from './observability';
import { cracksOf, isBroken, ruinUseError } from './village/repair';

function omitUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as T;
}

function asIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return nowBrazil().iso;
}

export function fromGoalDoc(id: string, data: Record<string, unknown>): GoalDoc {
  const status = data.status as GoalStatus;
  return {
    id,
    userId: String(data.userId || ''),
    familyId: String(data.familyId || FAMILY_ID),
    title: String(data.title || '').slice(0, 40),
    targetGold: Math.max(0, Number(data.targetGold) || 0),
    savedGold: Math.max(0, Number(data.savedGold) || 0),
    status: status === 'achieved' || status === 'cancelled' || status === 'cancel_requested' ? status : 'open',
    rewardId: typeof data.rewardId === 'string' ? data.rewardId : undefined,
    cancelReason: typeof data.cancelReason === 'string' ? data.cancelReason : undefined,
    lastInterestWeek: typeof data.lastInterestWeek === 'string' ? data.lastInterestWeek : undefined,
    interestPaid: Math.max(0, Number(data.interestPaid) || 0),
    unlockOn: typeof data.unlockOn === 'string' ? data.unlockOn : undefined,
    lockWeeks: Number.isInteger(Number(data.lockWeeks)) ? Number(data.lockWeeks) : undefined,
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    achievedAt: typeof data.achievedAt === 'string' ? data.achievedAt : undefined,
    cancelledAt: typeof data.cancelledAt === 'string' ? data.cancelledAt : undefined,
  };
}

export function subscribeGoals(uid: string, onChange: (goals: GoalDoc[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, 'goals'), where('userId', '==', uid)),
    (snap) => {
      const items = snap.docs.map((d) => fromGoalDoc(d.id, d.data() as Record<string, unknown>));
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(items);
    },
    (e) => onError?.(e)
  );
}

export async function listGoals(uid: string): Promise<GoalDoc[]> {
  const snap = await getDocs(query(collection(db, 'goals'), where('userId', '==', uid)));
  return snap.docs.map((d) => fromGoalDoc(d.id, d.data() as Record<string, unknown>));
}

export async function createGoal(
  uid: string,
  input: { title: string; targetGold: number; rewardId?: string }
): Promise<string> {
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  if (modules.bank === false) throw new Error('O Banco da Vila está desligado');
  const villageSnap = await getDoc(doc(db, 'village', uid));
  if (isBroken(cracksOf(villageSnap.data()?.cracks), 'cofre')) throw ruinUseError('cofre');
  const base = await ensureBase(uid);
  const cap = vaultGoalCap(base.buildings.cofre || 0);
  const listed = await listGoals(uid);
  const open = listed.filter((g) => g.status === 'open' || g.status === 'cancel_requested');
  if (cap <= 0) throw new Error('Construa o Cofre para guardar gold.');
  const title = input.title.trim().slice(0, 40);
  const targetGold = Math.floor(Number(input.targetGold) || 0);
  if (!title) throw new Error('Dê um nome para a meta');
  if (targetGold < 20) throw new Error('A meta precisa de pelo menos 20 gold');
  const ghost = pickGhostPile(open);
  const now = nowBrazil().iso;
  if (ghost) {
    await updateDoc(doc(db, 'goals', ghost.id), stripUndefined({
      title,
      targetGold,
      rewardId: input.rewardId || null,
      updatedAt: now,
    }));
    return ghost.id;
  }
  if (open.length >= cap) {
    throw new Error('O Cofre está cheio. Espera um montinho voltar.');
  }
  const ref = doc(collection(db, 'goals'));
  await setDoc(ref, stripUndefined({
    userId: uid,
    familyId: FAMILY_ID,
    title,
    targetGold,
    savedGold: 0,
    status: 'open',
    rewardId: input.rewardId || null,
    interestPaid: 0,
    lastInterestWeek: isoWeekOf(getTodayBrazil()),
    createdAt: now,
    updatedAt: now,
  }));
  return ref.id;
}

export async function depositGoal(uid: string, goalId: string, amount: number, weeks = 1, today = getTodayBrazil()): Promise<void> {
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  if (modules.bank === false) throw new Error('O Banco da Vila está desligado');
  await runTransaction(db, async (tx) => {
    const goalRef = doc(db, 'goals', goalId);
    const progressRef = doc(db, 'progress', uid);
    const gSnap = await tx.get(goalRef);
    const pSnap = await tx.get(progressRef);
    const vSnap = await tx.get(doc(db, 'village', uid));
    if (isBroken(cracksOf(vSnap.data()?.cracks), 'cofre')) throw ruinUseError('cofre');
    if (!gSnap.exists()) throw new Error('Meta não encontrada');
    const goal = fromGoalDoc(gSnap.id, gSnap.data() as Record<string, unknown>);
    if (goal.userId !== uid) throw new Error('Meta de outro minerador');
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const check = validateDeposit(goal, amount, gold);
    if (!check.ok) {
      if (check.reason === 'gold') throw new Error('Gold insuficiente');
      if (check.reason === 'closed') throw new Error('Essa meta já fechou');
      if (check.reason === 'target') throw new Error('Meta inválida');
      throw new Error('Valor inválido');
    }
    const after = gold - amount;
    const unlockOn = unlockOnAfter(today, weeks, goal.unlockOn);
    tx.update(progressRef, { availableGold: after, updatedAt: serverTimestamp() });
    tx.update(goalRef, {
      savedGold: goal.savedGold + amount,
      unlockOn,
      lockWeeks: Math.max(1, Math.floor(weeks)),
      updatedAt: nowBrazil().iso,
    });
    tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
      userId: uid,
      amount: -amount,
      type: 'saved' as const,
      source: 'goal_deposit' as const,
      description: `Guardou ${amount} gold: ${goal.title}`,
      relatedId: goalId,
      relatedTitle: goal.title,
      metadata: { goalId, savedBefore: goal.savedGold, savedAfter: goal.savedGold + amount },
      balanceBefore: gold,
      balanceAfter: after,
      createdAt: serverTimestamp(),
    }));
  });
  const { bumpVillage } = await import('./village/statsBump');
  await bumpVillage(uid, { deposits: 1, savedGold: amount });
}

export async function redeemGoal(uid: string, goalId: string, today = getTodayBrazil()): Promise<number> {
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  if (modules.bank === false) throw new Error('O Banco da Vila está desligado');
  let paid = 0;
  await runTransaction(db, async (tx) => {
    const goalRef = doc(db, 'goals', goalId);
    const progressRef = doc(db, 'progress', uid);
    const gSnap = await tx.get(goalRef);
    const pSnap = await tx.get(progressRef);
    const vSnap = await tx.get(doc(db, 'village', uid));
    if (isBroken(cracksOf(vSnap.data()?.cracks), 'cofre')) throw ruinUseError('cofre');
    if (!gSnap.exists()) throw new Error('Meta não encontrada');
    if (!pSnap.exists()) throw new Error('O bolso do minerador não apareceu.');
    const goal = fromGoalDoc(gSnap.id, gSnap.data() as Record<string, unknown>);
    if (goal.userId !== uid) throw new Error('Meta de outro minerador');
    if (!canRedeemPile(goal, today)) throw new Error('Ainda rendendo.');
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const back = Math.max(0, Math.floor(goal.savedGold));
    paid = back;
    const after = gold + back;
    const now = nowBrazil().iso;
    tx.update(progressRef, { availableGold: after, updatedAt: serverTimestamp() });
    tx.update(goalRef, {
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    });
    if (back > 0) {
      tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
        userId: uid,
        amount: back,
        type: 'saved' as const,
        source: 'goal_withdraw' as const,
        description: `Resgatou ${back} gold do Cofre`,
        relatedId: goalId,
        relatedTitle: goal.title,
        metadata: { goalId, reason: 'redeem' },
        balanceBefore: gold,
        balanceAfter: after,
        createdAt: serverTimestamp(),
      }));
    }
  });
  return paid;
}

export async function requestCancel(uid: string, goalId: string, reason: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const goalRef = doc(db, 'goals', goalId);
    const snap = await tx.get(goalRef);
    if (!snap.exists()) throw new Error('Meta não encontrada');
    const goal = fromGoalDoc(snap.id, snap.data() as Record<string, unknown>);
    if (goal.userId !== uid) throw new Error('Meta de outro minerador');
    if (goal.status !== 'open') throw new Error('Essa meta já fechou');
    tx.update(goalRef, {
      status: 'cancel_requested',
      cancelReason: reason.trim().slice(0, 140) || 'Pedido de cancelamento',
      updatedAt: nowBrazil().iso,
    });
  });
}

export async function applyWeeklyInterest(uid: string): Promise<number> {
  const week = isoWeekOf(getTodayBrazil());
  const [economy, modules] = await Promise.all([
    getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as Promise<EconomySettings>,
    getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as Promise<ModuleSettings>,
  ]);
  if (modules.interest === false) return 0;
  const villageSnap = await getDoc(doc(db, 'village', uid));
  if (isBroken(cracksOf(villageSnap.data()?.cracks), 'cofre')) return 0;
  const base = await ensureBase(uid);
  const vaultLevel = base.buildings.cofre || 0;
  const goals = (await listGoals(uid)).filter((g) => g.status === 'open');
  const weekTxs = txsInWeek(await listGoldTransactions(uid), week);
  const depositedThisWeek: Record<string, number> = {};
  for (const t of weekTxs) {
    if (t.source === 'goal_deposit' && t.relatedId) {
      depositedThisWeek[t.relatedId] = (depositedThisWeek[t.relatedId] || 0) + Math.abs(t.amount);
    }
  }
  const lines = weeklyInterest(goals, week, vaultLevel, depositedThisWeek);
  if (lines.length === 0) return 0;
  const room = await roomForGameGold(uid, economy);
  let remaining = room.room;
  let paid = 0;
  for (const line of lines) {
    const cut = capGold(line.interest, remaining);
    if (cut.paid <= 0) continue;
    remaining -= cut.paid;
    await runTransaction(db, async (tx) => {
      const goalRef = doc(db, 'goals', line.goalId);
      const progressRef = doc(db, 'progress', uid);
      const gSnap = await tx.get(goalRef);
      const pSnap = await tx.get(progressRef);
      if (!gSnap.exists()) return;
      const goal = fromGoalDoc(gSnap.id, gSnap.data() as Record<string, unknown>);
      if (goal.status !== 'open' || goal.lastInterestWeek === week) return;
      const gold = Number(pSnap.data()?.availableGold) || 0;
      const interest = cut.paid;
      tx.update(goalRef, {
        savedGold: goal.savedGold + interest,
        lastInterestWeek: week,
        interestPaid: (goal.interestPaid || 0) + interest,
        updatedAt: nowBrazil().iso,
      });
      tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
        userId: uid,
        amount: 0,
        type: 'saved' as const,
        source: 'goal_interest' as const,
        description: `Bônus de paciência: ${goal.title}`,
        relatedId: line.goalId,
        relatedTitle: goal.title,
        metadata: {
          goalId: line.goalId,
          savedBefore: goal.savedGold,
          savedAfter: goal.savedGold + interest,
          week,
          capped: cut.capped,
        },
        balanceBefore: gold,
        balanceAfter: gold,
        createdAt: serverTimestamp(),
      }));
    });
    paid += cut.paid;
  }
  if (paid > 0) {
    void touchHealth(uid, 'lastInterestWeek', week);
    const { bumpVillage } = await import('./village/statsBump');
    await bumpVillage(uid, { interestWeeks: 1 });
  }
  return paid;
}

export async function finishGoal(
  goalId: string,
  outcome: 'achieved' | 'cancelled',
  adminUid: string
): Promise<void> {
  let finishedUid = '';
  let finishedTarget = 0;
  await runTransaction(db, async (tx) => {
    const goalRef = doc(db, 'goals', goalId);
    const gSnap = await tx.get(goalRef);
    if (!gSnap.exists()) throw new Error('Meta não encontrada');
    const goal = fromGoalDoc(gSnap.id, gSnap.data() as Record<string, unknown>);
    finishedUid = goal.userId;
    finishedTarget = goal.targetGold;
    if (goal.status === 'achieved' || goal.status === 'cancelled') throw new Error('Essa meta já fechou');
    const progressRef = doc(db, 'progress', goal.userId);
    const pSnap = await tx.get(progressRef);
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const now = nowBrazil().iso;
    if (outcome === 'cancelled') {
      const after = gold + goal.savedGold;
      if (pSnap.exists()) {
        tx.update(progressRef, { availableGold: after, updatedAt: serverTimestamp() });
      }
      tx.update(goalRef, {
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
      });
      if (goal.savedGold > 0) {
        tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
          userId: goal.userId,
          amount: goal.savedGold,
          type: 'saved' as const,
          source: 'goal_withdraw' as const,
          description: `Devolveu ${goal.savedGold} gold: ${goal.title}`,
          relatedId: goalId,
          relatedTitle: goal.title,
          metadata: { goalId, reason: 'cancelled' },
          balanceBefore: gold,
          balanceAfter: after,
          createdAt: serverTimestamp(),
          createdBy: adminUid,
        }));
      }
      return;
    }
    tx.update(goalRef, {
      status: 'achieved',
      savedGold: 0,
      achievedAt: now,
      updatedAt: now,
    });
    const redemptionRef = doc(collection(db, 'redemptions'));
    tx.set(redemptionRef, omitUndefined({
      userId: goal.userId,
      rewardId: goal.rewardId || goalId,
      rewardTitle: goal.title,
      costGold: 0,
      status: 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvedBy: adminUid,
      metadata: { fromGoal: true, goalId, title: goal.title, icon: 'reward:cofre' },
    }));
    tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
      userId: goal.userId,
      amount: 0,
      type: 'saved' as const,
      source: 'goal_achieved' as const,
      description: `Meta alcançada: ${goal.title}`,
      relatedId: goalId,
      relatedTitle: goal.title,
      metadata: { goalId, redemptionId: redemptionRef.id },
      balanceBefore: gold,
      balanceAfter: gold,
      createdAt: serverTimestamp(),
      createdBy: adminUid,
    }));
  });
  if (outcome === 'achieved' && finishedUid) {
    const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
    const dayGold = Number(economy.incomeDayGold) || DEFAULT_ECONOMY.incomeDayGold;
    const deltas: Record<string, number> = { goalsAchieved: 1 };
    if (finishedTarget >= dayGold * 20) deltas.bigGoals = 1;
    const { bumpVillage } = await import('./village/statsBump');
    await bumpVillage(finishedUid, deltas);
  }
}

export async function weeklyStatementsFor(uid: string, weeks: string[]) {
  const txs = await listGoldTransactions(uid);
  const { weeklyStatement } = await import('./village/bank');
  return weeks.map((w) => weeklyStatement(txsInWeek(txs, w), w));
}
