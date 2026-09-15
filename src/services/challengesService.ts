import {
  collection,
  doc,
  getDocs,
  increment,
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
import { DEFAULT_ECONOMY, initialVillageDoc } from '../config/village';
import type { ChallengeDoc, ChallengeKind, ChallengeStatus, EconomySettings } from '../types/village';
import { addDays, getTodayBrazil, isoWeekOf, nowBrazil } from '../utils/clock';
import { applyEvent, challengeState } from './village/challenges';
import { capGold } from './village/caps';
import { claimKey, hasClaim } from './village/claims';
import { fromVillageDoc, stripUndefined } from './villageService';
import { getSettings } from './settingsService';
import { listGoldTransactions, roomForGameGold, txsInWeek } from './goldTx';

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

export function fromChallengeDoc(id: string, data: Record<string, unknown>): ChallengeDoc {
  const kind = data.kind as ChallengeKind;
  const status = data.status as ChallengeStatus;
  return {
    id,
    userId: String(data.userId || ''),
    familyId: String(data.familyId || FAMILY_ID),
    title: String(data.title || ''),
    description: String(data.description || ''),
    kind: kind || 'tasks_count',
    target: Math.max(1, Number(data.target) || 1),
    progress: Math.max(0, Number(data.progress) || 0),
    startsOn: String(data.startsOn || ''),
    endsOn: String(data.endsOn || ''),
    xpReward: Math.min(100, Math.max(0, Number(data.xpReward) || 0)),
    goldReward: Math.min(60, Math.max(0, Number(data.goldReward) || 0)),
    createdBy: data.createdBy === 'child' ? 'child' : 'admin',
    status: status === 'proposed' || status === 'rejected' ? status : 'active',
    completedAt: typeof data.completedAt === 'string' ? data.completedAt : undefined,
    extendedDays: Math.max(0, Number(data.extendedDays) || 0),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  };
}

export function subscribeChallenges(uid: string, onChange: (items: ChallengeDoc[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, 'challenges'), where('userId', '==', uid)),
    (snap) => {
      const items = snap.docs.map((d) => fromChallengeDoc(d.id, d.data() as Record<string, unknown>));
      items.sort((a, b) => a.endsOn.localeCompare(b.endsOn));
      onChange(items);
    },
    (e) => onError?.(e)
  );
}

export async function listChallenges(uid: string): Promise<ChallengeDoc[]> {
  const snap = await getDocs(query(collection(db, 'challenges'), where('userId', '==', uid)));
  return snap.docs.map((d) => fromChallengeDoc(d.id, d.data() as Record<string, unknown>));
}

export async function createChallenge(input: {
  userId: string;
  title: string;
  description?: string;
  kind: ChallengeKind;
  target: number;
  startsOn: string;
  endsOn: string;
  xpReward: number;
  goldReward: number;
  createdBy: 'admin' | 'child';
}): Promise<string> {
  const ref = doc(collection(db, 'challenges'));
  const now = nowBrazil().iso;
  const status: ChallengeStatus = input.createdBy === 'child' ? 'proposed' : 'active';
  await setDoc(ref, stripUndefined({
    userId: input.userId,
    familyId: FAMILY_ID,
    title: input.title.trim().slice(0, 40),
    description: (input.description || '').trim().slice(0, 140),
    kind: input.kind,
    target: Math.max(1, Math.floor(input.target)),
    progress: 0,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    xpReward: Math.min(100, Math.max(0, Math.floor(input.xpReward))),
    goldReward: Math.min(60, Math.max(0, Math.floor(input.goldReward))),
    createdBy: input.createdBy,
    status,
    extendedDays: 0,
    createdAt: now,
    updatedAt: now,
  }));
  return ref.id;
}

export async function approveChallenge(id: string, accept: boolean): Promise<void> {
  await updateDoc(doc(db, 'challenges', id), {
    status: accept ? 'active' : 'rejected',
    updatedAt: nowBrazil().iso,
  });
}

export async function completeChallenge(uid: string, challengeId: string): Promise<boolean> {
  const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
  const week = isoWeekOf(getTodayBrazil());
  const txs = await listGoldTransactions(uid);
  const weekGold = txsInWeek(txs, week)
    .filter((t) => t.source === 'challenge' && t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const weekRoom = Math.max(0, (economy.challengeGoldWeeklyCap ?? 60) - weekGold);
  const room = await roomForGameGold(uid, economy);
  let paid = false;

  await runTransaction(db, async (tx) => {
    const cRef = doc(db, 'challenges', challengeId);
    const pRef = doc(db, 'progress', uid);
    const vRef = doc(db, 'village', uid);
    const cSnap = await tx.get(cRef);
    const pSnap = await tx.get(pRef);
    const vSnap = await tx.get(vRef);
    if (!cSnap.exists()) throw new Error('Desafio não encontrado');
    const challenge = fromChallengeDoc(cSnap.id, cSnap.data() as Record<string, unknown>);
    if (challenge.userId !== uid) throw new Error('Desafio de outro minerador');
    if (challenge.completedAt) return;
    if (challenge.progress < challenge.target) throw new Error('Desafio ainda não bateu a meta');
    const village = vSnap.exists()
      ? fromVillageDoc(uid, vSnap.data() as Record<string, unknown>)
      : initialVillageDoc(uid, nowBrazil().iso);
    const key = claimKey('challenge', challengeId);
    if (hasClaim(village, key)) return;
    const goldWanted = Math.min(challenge.goldReward, weekRoom, room.room);
    const cut = capGold(goldWanted, room.room);
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const after = gold + cut.paid;
    const today = getTodayBrazil();
    tx.update(cRef, { completedAt: today, updatedAt: today });
    const claimed = { ...village.claimed, [key]: nowBrazil().iso };
    if (vSnap.exists()) tx.update(vRef, stripUndefined({ claimed, updatedAt: nowBrazil().iso }));
    else tx.set(vRef, stripUndefined({ ...village, claimed, updatedAt: nowBrazil().iso }));
    if (pSnap.exists()) {
      tx.update(pRef, {
        totalXP: increment(challenge.xpReward),
        availableGold: after,
        totalGoldEarned: increment(cut.paid),
        updatedAt: serverTimestamp(),
      });
    }
    if (cut.paid > 0) {
      tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
        userId: uid,
        amount: cut.paid,
        type: 'earned' as const,
        source: 'challenge' as const,
        description: `Desafio: ${challenge.title}`,
        relatedId: challengeId,
        relatedTitle: challenge.title,
        metadata: { challengeId, capped: cut.capped },
        balanceBefore: gold,
        balanceAfter: after,
        createdAt: serverTimestamp(),
      }));
    }
    paid = true;
  });
  return paid;
}

export async function bumpChallenge(
  uid: string,
  kind: ChallengeKind,
  value: number,
  absolute?: boolean
): Promise<void> {
  const today = getTodayBrazil();
  const items = (await listChallenges(uid)).filter((c) => c.status === 'active' && !c.completedAt && c.kind === kind);
  for (const item of items) {
    if (challengeState(item, today) !== 'active') continue;
    const { challenge, justCompleted } = applyEvent(item, { kind, value, absolute }, today);
    if (challenge.progress === item.progress && !justCompleted) continue;
    await updateDoc(doc(db, 'challenges', item.id), {
      progress: challenge.progress,
      updatedAt: today,
    });
    if (justCompleted) {
      try {
        await completeChallenge(uid, item.id);
      } catch (e) {
        console.warn('challenges: pagamento falhou', e);
      }
    }
  }
}

export async function extendActiveChallenges(uid: string, days: number): Promise<void> {
  const n = Math.max(0, Math.floor(days));
  if (n === 0) return;
  const items = (await listChallenges(uid)).filter((c) => c.status === 'active' && !c.completedAt);
  for (const item of items) {
    await updateDoc(doc(db, 'challenges', item.id), {
      endsOn: addDays(item.endsOn, n),
      extendedDays: (item.extendedDays || 0) + n,
      updatedAt: nowBrazil().iso,
    });
  }
}
