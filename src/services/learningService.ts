import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { LearningDoc } from '../types/village';
import { isoWeekOf, nowBrazil } from '../utils/clock';
import { listGoldTransactions } from './goldTx';
import { weeklyStatement } from './village/bank';
import { getVillage } from './villageService';
import { touchHealth } from './observability';

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}

export async function computeWeeklyLearning(uid: string, week: string): Promise<LearningDoc> {
  const [quizSnap, txSnap, chalSnap, village] = await Promise.all([
    getDocs(query(collection(db, 'dailyQuizzes'), where('userId', '==', uid))),
    listGoldTransactions(uid, 800),
    getDocs(query(collection(db, 'challenges'), where('userId', '==', uid))),
    getVillage(uid),
  ]);

  const byCat: Record<string, { ok: number; n: number }> = {};
  let reflections = 0;
  for (const d of quizSnap.docs) {
    const data = d.data();
    const date = String(data.date || '');
    if (!date || isoWeekOf(date) !== week) continue;
    if (data.reflection) reflections += 1;
    const answers = Array.isArray(data.answers) ? data.answers : [];
    for (const a of answers) {
      if (!a || typeof a !== 'object') continue;
      const cat = String((a as { category?: string }).category || 'geral');
      const hit = (a as { correct?: boolean }).correct === true;
      byCat[cat] = byCat[cat] || { ok: 0, n: 0 };
      byCat[cat].n += 1;
      if (hit) byCat[cat].ok += 1;
    }
  }
  const quizAccuracyByCategory: Record<string, number> = {};
  for (const [k, v] of Object.entries(byCat)) {
    quizAccuracyByCategory[k] = v.n ? Math.round((v.ok / v.n) * 100) : 0;
  }

  const money = weeklyStatement(txSnap, week);
  const fullDays = Number(village.stats.fullDaysCount || village.fullDays || 0);
  const challengesDone = chalSnap.docs.filter((d) => {
    const data = d.data();
    const at = data.completedAt;
    if (!at) return false;
    const iso = nowBrazil(asDate(at).getTime()).date;
    return isoWeekOf(iso) === week;
  }).length;

  const docData: LearningDoc = {
    week,
    quizAccuracyByCategory,
    wordsMastered: Number(village.stats.wordsMastered || 0),
    reflections,
    savingsRatePct: money.savingsRatePct,
    goldEarned: money.earned,
    goldSpent: money.spent,
    goldSaved: money.saved,
    fullDays,
    challengesDone,
    updatedAt: nowBrazil().iso,
  };

  await setDoc(doc(db, 'learning', uid), { userId: uid, ...docData }, { merge: true });
  await touchHealth(uid, 'lastLearningWeek', week);
  return docData;
}

export async function getLearning(uid: string): Promise<LearningDoc | null> {
  const snap = await getDoc(doc(db, 'learning', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    week: String(d.week || ''),
    quizAccuracyByCategory: (d.quizAccuracyByCategory as Record<string, number>) || {},
    wordsMastered: Number(d.wordsMastered) || 0,
    reflections: Number(d.reflections) || 0,
    savingsRatePct: Number(d.savingsRatePct) || 0,
    goldEarned: Number(d.goldEarned) || 0,
    goldSpent: Number(d.goldSpent) || 0,
    goldSaved: Number(d.goldSaved) || 0,
    fullDays: Number(d.fullDays) || 0,
    challengesDone: Number(d.challengesDone) || 0,
    updatedAt: String(d.updatedAt || ''),
  };
}
