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
import { DEFAULT_MODULES } from '../config/village';
import { getSettings } from './settingsService';
import type { ModuleSettings } from '../types/village';

export const dailyQuizId = (userId: string, date: string) => `${userId}_${date}`;

/** Soma dias a uma data YYYY-MM-DD sem depender de fuso */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

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
  const recent = await getRecentDailyQuizzes(userId, today, 45);
  const recentIds = recent.filter((q) => q.date !== date).map((q) => q.theme.id).filter(Boolean);
  const avoid = recent.flatMap((q) => q.questions.map((x) => x.question));
  const seed = pickThemeForDate(date, recentIds);
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  const generated = await generateDailyQuiz({
    seed,
    count,
    avoidQuestions: avoid,
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
}): Promise<void> {
  await setDoc(doc(db, 'dailyQuizzes', dailyQuizId(userId, date)), {
    userId,
    date,
    status: 'completed',
    completed: true,
    ...result,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveReflection(userId: string, date: string, reflection: string): Promise<void> {
  await updateDoc(doc(db, 'dailyQuizzes', dailyQuizId(userId, date)), { reflection: reflection.trim(), updatedAt: serverTimestamp() });
}

/** Prêmio por desempenho (mesmos degraus do v1, proporcionais ao total de perguntas) */
export function quizRewards(score: number, total: number): { xp: number; gold: number } {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 1) return { xp: 50, gold: 15 };
  if (pct >= 0.85) return { xp: 35, gold: 12 };
  if (pct >= 0.75) return { xp: 25, gold: 10 };
  if (pct >= 0.6) return { xp: 18, gold: 7 };
  if (pct >= 0.5) return { xp: 12, gold: 5 };
  if (pct >= 0.35) return { xp: 8, gold: 3 };
  if (pct >= 0.2) return { xp: 5, gold: 2 };
  return { xp: 2, gold: 1 };
}
