// ========================================
// Quiz Diário: persistência em dailyQuizzes/{userId}_{date}
// O mesmo documento guarda a prova gerada e, depois, o resultado.
// ========================================

import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyQuiz, DailyQuizQuestion, DailyQuizTheme } from '../types';
import { generateDailyQuiz } from './aiDailyQuiz';
import { pickThemeForDate } from '../config/quizCurriculum';
import { DAILY_QUIZ_QUESTIONS } from '../config/rules';
import { DEFAULT_ECONOMY, DEFAULT_MODULES } from '../config/village';
import { getSettings } from './settingsService';
import type { EconomySettings, ModuleSettings } from '../types/village';
import { addDays } from '../utils/clock';
import { bumpChallenge } from './challengesService';
import { nextQuizStreak } from './village/stats';
import { reflectionOk } from './quiz/provaRules';

export const dailyQuizId = (userId: string, date: string) => `${userId}_${date}`;

export { addDays };

function fromDoc(id: string, data: Record<string, unknown>): DailyQuiz | null {
  const questions = Array.isArray(data.questions) ? (data.questions as DailyQuizQuestion[]) : [];
  const theme = data.theme as DailyQuizTheme | undefined;
  // documentos antigos (só resultado, sem prova) também são aceitos
  return {
    id,
    userId: String(data.userId ?? ''),
    date: String(data.date ?? ''),
    status: data.completed === true ? 'completed' : 'ready',
    theme: theme ?? { id: '', category: '', title: '', lesson: '', whyItMatters: '' },
    questions,
    reflectionPrompt: typeof data.reflectionPrompt === 'string' ? data.reflectionPrompt : '',
    source: data.source === 'offline' ? 'offline' : 'ai',
    generatedAt: (data.generatedAt as Timestamp | undefined)?.toDate?.() ?? new Date(0),
    completed: data.completed === true,
    score: typeof data.score === 'number' ? data.score : undefined,
    totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : undefined,
    xpEarned: typeof data.xpEarned === 'number' ? data.xpEarned : undefined,
    goldEarned: typeof data.goldEarned === 'number' ? data.goldEarned : undefined,
    answers: Array.isArray(data.answers) ? (data.answers as string[]) : undefined,
    reflection: typeof data.reflection === 'string' ? data.reflection : undefined,
    completedAt: (data.completedAt as Timestamp | undefined)?.toDate?.(),
  };
}

export async function getDailyQuiz(userId: string, date: string): Promise<DailyQuiz | null> {
  const snap = await getDoc(doc(db, 'dailyQuizzes', dailyQuizId(userId, date)));
  return snap.exists() ? fromDoc(snap.id, snap.data()) : null;
}

export function subscribeDailyQuiz(userId: string, date: string, onChange: (quiz: DailyQuiz | null) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    doc(db, 'dailyQuizzes', dailyQuizId(userId, date)),
    (snap) => onChange(snap.exists() ? fromDoc(snap.id, snap.data()) : null),
    (e) => onError?.(e)
  );
}

/** Últimos N dias (inclui hoje), do mais recente para o mais antigo. Sem índice: busca por id. */
export async function getRecentDailyQuizzes(userId: string, today: string, days = 30): Promise<DailyQuiz[]> {
  const dates = Array.from({ length: days }, (_, i) => addDays(today, -i));
  const snaps = await Promise.all(dates.map((d) => getDoc(doc(db, 'dailyQuizzes', dailyQuizId(userId, d)))));
  return snaps.filter((s) => s.exists()).map((s) => fromDoc(s.id, s.data() as Record<string, unknown>)!);
}

const inFlight = new Map<string, Promise<DailyQuiz>>();

/**
 * Garante que a prova do dia exista: se já foi gerada, devolve; senão gera e grava.
 * Chamadas simultâneas na mesma aba compartilham a mesma geração.
 */
export async function ensureDailyQuiz(userId: string, date: string, today: string, count = DAILY_QUIZ_QUESTIONS): Promise<DailyQuiz> {
  const key = dailyQuizId(userId, date);
  const existing = await getDailyQuiz(userId, date);
  if (existing && existing.questions.length > 0) return existing;
  if (existing?.completed) return existing; // registro antigo só de resultado: não regenerar

  const running = inFlight.get(key);
  if (running) return running;

  const task = (async () => {
    const quiz = await buildAndSave(userId, date, today, count);
    inFlight.delete(key);
    return quiz;
  })();
  inFlight.set(key, task);
  return task;
}

/** Descarta a prova (não concluída) e gera outra. */
export async function regenerateDailyQuiz(userId: string, date: string, today: string, count = DAILY_QUIZ_QUESTIONS): Promise<DailyQuiz> {
  const existing = await getDailyQuiz(userId, date);
  if (existing?.completed) throw new Error('Prova já concluída, não dá para regenerar.');
  return buildAndSave(userId, date, today, count);
}

async function buildAndSave(userId: string, date: string, today: string, count: number): Promise<DailyQuiz> {
  // 90 dias de memória (18/09): a lista chega da mais recente para a mais antiga, e o prompt recebe as 80 mais recentes
  const recent = await getRecentDailyQuizzes(userId, today, 90);
  const recentIds = recent.filter((q) => q.date !== date).map((q) => q.theme.id).filter(Boolean);
  const avoid = recent.flatMap((q) => q.questions.map((x) => x.question));
  const seed = pickThemeForDate(date, recentIds);
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  const generated = await generateDailyQuiz({
    seed,
    count,
    avoidQuestions: avoid.slice(0, 60),
    date,
    forceOffline: modules.aiGeneration === false,
  });

  const ref = doc(db, 'dailyQuizzes', dailyQuizId(userId, date));
  await setDoc(ref, {
    userId,
    date,
    status: 'ready',
    completed: false,
    theme: generated.theme,
    questions: generated.questions,
    reflectionPrompt: generated.reflectionPrompt,
    source: generated.source,
    generatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return {
    id: ref.id,
    userId,
    date,
    status: 'ready',
    theme: generated.theme,
    questions: generated.questions,
    reflectionPrompt: generated.reflectionPrompt,
    source: generated.source,
    generatedAt: new Date(),
    completed: false,
  };
}

export async function completeDailyQuiz(userId: string, date: string, result: {
  score: number;
  totalQuestions: number;
  xpEarned: number;
  goldEarned: number;
  answers: string[];
  reflection: string;
}): Promise<void> {
  const reflection = result.reflection.trim();
  if (!reflectionOk(reflection)) throw new Error('A reflexão ainda não está pronta.');
  await setDoc(doc(db, 'dailyQuizzes', dailyQuizId(userId, date)), {
    userId,
    date,
    status: 'completed',
    completed: true,
    score: result.score,
    totalQuestions: result.totalQuestions,
    xpEarned: result.xpEarned,
    goldEarned: result.goldEarned,
    answers: result.answers,
    reflection,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  try {
    await bumpChallenge(userId, 'quiz_correct', result.score);
  } catch (e) {
    console.warn('desafio quiz_correct', e);
  }
  if (result.score >= 8 && result.totalQuestions >= 8) {
    try {
      const { grantRare } = await import('./villageService');
      const { claimKey } = await import('./village/claims');
      await grantRare(userId, 'esmeralda', claimKey('quiz8', date));
    } catch (e) {
      console.warn('quiz 8/8 esmeralda', e);
    }
  }
  try {
    const { bumpVillage, bumpFriend } = await import('./village/statsBump');
    const yesterday = await getDailyQuiz(userId, addDays(date, -1));
    const yDate = addDays(date, -1);
    const yProg = await getDoc(doc(db, 'dailyProgress', `${userId}_${yDate}`));
    const skipped = yProg.data()?.vacation === true || yProg.data()?.paused === true;
    const vSnap = await getDoc(doc(db, 'village', userId));
    const prevStreak = Number(vSnap.data()?.stats?.quizStreak) || 0;
    const deltas: Record<string, number> = { quizzesDone: 1 };
    if (result.score >= 6) deltas.quizScore = result.score;
    if (result.score >= 8) deltas.quizPerfect = 1;
    await bumpVillage(userId, { ...deltas, reflections: 1 }, { set: { quizStreak: nextQuizStreak(prevStreak, yesterday?.completed === true, skipped) } });
    await bumpFriend(userId, 'sabio', 2);
  } catch (e) {
    console.warn('stats prova', e);
  }
}

export async function saveReflection(userId: string, date: string, reflection: string): Promise<void> {
  await updateDoc(doc(db, 'dailyQuizzes', dailyQuizId(userId, date)), { reflection: reflection.trim(), updatedAt: serverTimestamp() });
  try {
    const { bumpVillage } = await import('./village/statsBump');
    await bumpVillage(userId, { reflections: 1 });
  } catch (e) {
    console.warn('stats reflexão', e);
  }
}

/** Prova linear: gold e XP por acerto (economia v2). */
export function quizRewards(
  score: number,
  total: number,
  settings: Pick<EconomySettings, 'quizGoldPerHit' | 'quizXpPerHit'> = DEFAULT_ECONOMY
): { xp: number; gold: number } {
  const hits = Math.max(0, Math.min(score, total));
  const goldPer = settings.quizGoldPerHit ?? 2;
  const xpPer = settings.quizXpPerHit ?? 6;
  return { gold: hits * goldPer, xp: hits * xpPer };
}
