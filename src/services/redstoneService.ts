// ========================================
// Redstone da Mina: uma concessão por dia (claimed redstone:data).
// Recado do dia precisa estar feito. Paga redstone + XP, nunca gold.
// ========================================

import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { initialBaseDoc } from '../config/englishBase';
import { initialVillageDoc } from '../config/village';
import { fromBaseDoc, fromPlanDoc, planId } from './englishBaseService';
import { fromVillageDoc } from './villageService';
import { claimKey, hasClaim } from './village/claims';
import { noteDoneOf, sessionMarks } from './village/redstone';
import { getTodayBrazil } from '../utils/clock';
import { getLevelFromXP } from '../utils/levelSystem';
import { bumpFriend, bumpVillage } from './village/statsBump';
import { addVillageStats } from './village/stats';

export interface CompleteRedstoneResult {
  redstone: number;
  xp: number;
  previousXP: number;
  totalXP: number;
}

const nowIso = (): string => new Date().toISOString();

function omitUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripUndefined(v)) as unknown as T;
  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    const clean = omitUndefined(value);
    return Object.fromEntries(Object.entries(clean).map(([k, v]) => [k, stripUndefined(v)])) as T;
  }
  return value;
}

export async function completeRedstone(
  uid: string,
  date: string,
  stagesWon: number,
): Promise<CompleteRedstoneResult> {
  if (!uid) throw new Error('Entre com a conta da criança para jogar.');
  if (date !== getTodayBrazil()) throw new Error('Só vale o circuito de hoje.');
  if (!Number.isInteger(stagesWon) || stagesWon < 0 || stagesWon > 3) {
    throw new Error('Resultado inválido.');
  }
  const marks = sessionMarks(stagesWon);
  const pay = { redstone: marks.redstone, xp: marks.xp };
  const key = claimKey('redstone', date);
  const pRef = doc(db, 'englishPlans', planId(uid, date));
  const bRef = doc(db, 'englishBase', uid);
  const vRef = doc(db, 'village', uid);
  const progressRef = doc(db, 'progress', uid);
  const sessionRef = doc(collection(db, 'englishSessions'));
  const finishedAt = nowIso();
  let out: CompleteRedstoneResult | null = null;

  await runTransaction(db, async (tx) => {
    const [planSnap, baseSnap, vSnap, pSnap] = await Promise.all([
      tx.get(pRef),
      tx.get(bRef),
      tx.get(vRef),
      tx.get(progressRef),
    ]);
    if (!planSnap.exists()) throw new Error('Primeiro o Recado do dia.');
    const plan = fromPlanDoc(planSnap.id, (planSnap.data() || {}) as Record<string, unknown>);
    if (!noteDoneOf(plan)) throw new Error('Primeiro o Recado do dia.');
    const village = vSnap.exists() ? fromVillageDoc(uid, (vSnap.data() || {}) as Record<string, unknown>) : initialVillageDoc(uid, finishedAt);
    if (hasClaim(village, key)) throw new Error('Este circuito já foi feito hoje.');
    const base = baseSnap.exists() ? fromBaseDoc(uid, (baseSnap.data() || {}) as Record<string, unknown>) : initialBaseDoc(uid, finishedAt);
    const materials = { ...base.materials, redstone: base.materials.redstone + pay.redstone };
    const claimed = { ...village.claimed, [key]: finishedAt };
    const deltas: Record<string, number> = {};
    if (marks.redstoneDone) deltas.redstoneDone = marks.redstoneDone;
    if (marks.redstonePerfect) deltas.redstonePerfect = marks.redstonePerfect;
    if (stagesWon > 0) deltas.redstoneStages = stagesWon;
    const stats = addVillageStats(village.stats, deltas);
    const previousXP = Number(pSnap.data()?.totalXP) || 0;
    const totalXP = previousXP + pay.xp;

    if (!vSnap.exists()) tx.set(vRef, stripUndefined({ ...village, claimed, stats, updatedAt: finishedAt }));
    else tx.update(vRef, stripUndefined({ claimed, stats, updatedAt: finishedAt }));
    if (!baseSnap.exists()) tx.set(bRef, stripUndefined({ ...base, materials, updatedAt: finishedAt }));
    else tx.update(bRef, stripUndefined({ materials, updatedAt: finishedAt }));
    if (pSnap.exists()) {
      tx.update(progressRef, {
        totalXP,
        level: getLevelFromXP(totalXP),
        updatedAt: serverTimestamp(),
      });
    }
    tx.set(sessionRef, {
      userId: uid,
      game: 'redstone',
      category: stagesWon > 0 ? 'win' : 'fail',
      date,
      correct: stagesWon,
      total: 3,
      score: stagesWon,
      durationSec: 0,
      xpEarned: pay.xp,
      goldEarned: 0,
      rewarded: pay.redstone > 0,
      createdAt: serverTimestamp(),
    });
    out = { redstone: pay.redstone, xp: pay.xp, previousXP, totalXP };
  });

  const result = out as CompleteRedstoneResult | null;
  if (!result) throw new Error('Não deu para guardar o circuito.');
  await bumpVillage(uid, {}, { level: getLevelFromXP(result.totalXP) });
  if (marks.ferreiro > 0) await bumpFriend(uid, 'ferreiro', marks.ferreiro);
  return result;
}
