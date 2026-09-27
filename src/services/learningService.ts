import { collection, deleteField, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { LearningDoc } from '../types/village';
import { addDays, getTodayBrazil, isoWeekOf, mondayOfIsoWeek, nowBrazil } from '../utils/clock';
import { listGoldTransactions } from './goldTx';
import { weeklyStatement } from './village/bank';
import { countWeekTorches } from './village/season';
import { getVillage } from './villageService';
import { touchHealth } from './observability';
import { buildProfile, type ProfileItem } from './quiz/profile';

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}

function wordsFromVocab(vocab: unknown): number {
  if (!vocab || typeof vocab !== 'object') return 0;
  return Object.values(vocab as Record<string, { seen?: number }>).filter((v) => (Number(v?.seen) || 0) >= 3).length;
}

export async function computeWeeklyLearning(uid: string, week: string): Promise<LearningDoc> {
  const [bankSnap, quizSnap, txSnap, chalSnap, village, baseSnap] = await Promise.all([
    getDocs(query(collection(db, 'quizBank'), where('userId', '==', uid))),
    getDocs(query(collection(db, 'dailyQuizzes'), where('userId', '==', uid))),
    listGoldTransactions(uid, 800),
    getDocs(query(collection(db, 'challenges'), where('userId', '==', uid))),
    getVillage(uid),
    getDoc(doc(db, 'englishBase', uid)),
  ]);

  const byCat: Record<string, { ok: number; n: number }> = {};
  let reflections = 0;
  for (const d of bankSnap.docs) {
    const data = d.data();
    const date = String(data.date || '');
    if (!date || isoWeekOf(date) !== week) continue;
    const cat = String(data.category || 'geral');
    const hit = data.correct === true;
    byCat[cat] = byCat[cat] || { ok: 0, n: 0 };
    byCat[cat].n += 1;
    if (hit) byCat[cat].ok += 1;
  }
  for (const d of quizSnap.docs) {
    const data = d.data();
    const date = String(data.date || '');
    if (!date || isoWeekOf(date) !== week) continue;
    if (data.reflection) reflections += 1;
  }
  const quizAccuracyByCategory: Record<string, number> = {};
  for (const [k, v] of Object.entries(byCat)) {
    quizAccuracyByCategory[k] = v.n ? Math.round((v.ok / v.n) * 100) : 0;
  }

  const money = weeklyStatement(txSnap, week);
  const monday = mondayOfIsoWeek(week);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const torchSnaps = await Promise.all(dates.map((d) => getDoc(doc(db, 'dailyProgress', `${uid}_${d}`))));
  const fullDays = countWeekTorches(torchSnaps.map((s) => {
    if (!s.exists()) return { due: 0, done: 0 };
    const d = s.data();
    return {
      due: Number(d.totalTasksAvailable) || 0,
      done: Number(d.tasksCompleted) || 0,
      vacation: d.vacation === true,
      paused: d.paused === true,
      punished: d.punished === true,
    };
  }));
  const challengesDone = chalSnap.docs.filter((d) => {
    const data = d.data();
    const at = data.completedAt;
    if (!at) return false;
    const iso = nowBrazil(asDate(at).getTime()).date;
    return isoWeekOf(iso) === week;
  }).length;
  const wordsMastered = wordsFromVocab(baseSnap.data()?.vocab) || Number(village.stats.wordsMastered || 0);

  const profile = buildProfile(bankSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      date: String(data.date || ''),
      category: String(data.category || ''),
      subject: String(data.subject || ''),
      skill: String(data.skill || ''),
      kind: String(data.kind || ''),
      question: String(data.question || ''),
      correct: data.correct === true,
      msToAnswer: Number(data.msToAnswer) || 0,
      attempts: Number(data.attempts) || 1,
      supportLevel: typeof data.supportLevel === 'number' ? data.supportLevel : undefined,
      retryOk: data.retryOk === true,
    } satisfies ProfileItem;
  }), getTodayBrazil());

  const docData: LearningDoc = {
    week,
    quizAccuracyByCategory,
    wordsMastered,
    reflections,
    savingsRatePct: money.savingsRatePct,
    goldEarned: money.earned,
    goldSpent: money.spent,
    goldSaved: money.saved,
    fullDays,
    challengesDone,
    updatedAt: nowBrazil().iso,
  };

  const ref = doc(db, 'learning', uid);
  const currentWeek = isoWeekOf(getTodayBrazil());
  const closedWeek = isoWeekOf(addDays(mondayOfIsoWeek(currentWeek), -1));
  const writeTop = week === closedWeek;
  await setDoc(ref, {
    userId: uid,
    weeks: { [week]: { ...docData } },
    ...(writeTop ? {
      week: docData.week,
      wordsMastered: docData.wordsMastered,
      reflections: docData.reflections,
      savingsRatePct: docData.savingsRatePct,
      goldEarned: docData.goldEarned,
      goldSpent: docData.goldSpent,
      goldSaved: docData.goldSaved,
      fullDays: docData.fullDays,
      challengesDone: docData.challengesDone,
      updatedAt: docData.updatedAt,
      profile,
      quizAccuracyByCategory: deleteField(),
    } : { updatedAt: docData.updatedAt, profile }),
  }, { merge: true });
  if (writeTop) {
    await setDoc(ref, { quizAccuracyByCategory }, { merge: true });
  }
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
    ...(d.profile ? { profile: d.profile as LearningDoc['profile'] } : {}),
  };
}

export async function saveQuizProfile(uid: string, today: string): Promise<void> {
  const snap = await getDocs(query(collection(db, 'quizBank'), where('userId', '==', uid)));
  const profile = buildProfile(snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      date: String(data.date || ''),
      category: String(data.category || ''),
      subject: String(data.subject || ''),
      skill: String(data.skill || ''),
      kind: String(data.kind || ''),
      question: String(data.question || ''),
      correct: data.correct === true,
      msToAnswer: Number(data.msToAnswer) || 0,
      attempts: Number(data.attempts) || 1,
      supportLevel: typeof data.supportLevel === 'number' ? data.supportLevel : undefined,
      retryOk: data.retryOk === true,
    } satisfies ProfileItem;
  }), today);
  await setDoc(doc(db, 'learning', uid), { profile, updatedAt: today }, { merge: true });
}

export async function loadQuizBankRows(uid: string) {
  const snap = await getDocs(query(collection(db, 'quizBank'), where('userId', '==', uid)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      date: String(data.date || ''),
      category: String(data.category || ''),
      subject: String(data.subject || ''),
      skill: String(data.skill || ''),
      kind: String(data.kind || ''),
      question: String(data.question || ''),
      correct: data.correct === true,
      chosen: String(data.chosen || ''),
      hash: String(data.hash || ''),
      msToAnswer: Number(data.msToAnswer) || 0,
    };
  });
}
