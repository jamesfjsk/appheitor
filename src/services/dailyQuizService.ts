// ========================================
// Quiz Diário: persistência em dailyQuizzes/{userId}_{date}
// O mesmo documento guarda a prova gerada e, depois, o resultado.
// ========================================

import { collection, deleteField, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyQuiz, DailyQuizQuestion, DailyQuizSanitize, DailyQuizTheme } from '../types';
import { generateDailyQuiz } from './aiDailyQuiz';
import { DAILY_QUIZ_QUESTIONS } from '../config/rules';
import { DEFAULT_ECONOMY, DEFAULT_MODULES } from '../config/village';
import { getSettings } from './settingsService';
import type { EconomySettings, ModuleSettings } from '../types/village';
import { addDays } from '../utils/clock';
import { bumpChallenge } from './challengesService';
import { nextQuizStreak } from './village/stats';
import { perfectQuiz } from './quiz/provaRules';
import { answersStash, completeQuizWrite, type QuizAbout, type QuizTiming } from './quiz/closeQuiz';
import { quizBankDocs } from './quiz/bankWrite';
import { avoidQuestionsFromRecent, type DedupeNeedle } from './quiz/dedupe';
import { pickTheme, rotationProfileFrom, type ThemeHistoryEntry } from './quiz/rotation';

export type { QuizAbout, QuizTiming };
export { payThenComplete, answersStash, shouldOpenReflection, completeQuizWrite } from './quiz/closeQuiz';

export const dailyQuizId = (userId: string, date: string) => `${userId}_${date}`;

function readSanitize(raw: unknown): DailyQuizSanitize | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as {
    kept?: unknown;
    dropped?: unknown;
    perQuestion?: unknown;
    review?: unknown;
    batchLog?: unknown;
    fromOffline?: unknown;
    reviewFellBack?: unknown;
    duvidas?: unknown;
  };
  const dropped =
    row.dropped && typeof row.dropped === 'object'
      ? (row.dropped as Record<string, number>)
      : {};
  const perQuestion = Array.isArray(row.perQuestion)
    ? row.perQuestion.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const i = Number((item as { i?: unknown }).i);
        const codes = (item as { codes?: unknown }).codes;
        if (!Number.isInteger(i) || !Array.isArray(codes)) return [];
        return [{ i, codes: codes.filter((c): c is string => typeof c === 'string') }];
      })
    : undefined;
  const review = Array.isArray(row.review)
    ? row.review.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const n = Number((item as { n?: unknown }).n);
        const ok = (item as { ok?: unknown }).ok;
        if (!Number.isInteger(n) || typeof ok !== 'boolean') return [];
        const motivo = (item as { motivo?: unknown }).motivo;
        return [{ n, ok, motivo: typeof motivo === 'string' ? motivo : '' }];
      })
    : undefined;
  const batchLog = Array.isArray(row.batchLog) ? row.batchLog.filter((x): x is string => typeof x === 'string') : undefined;
  const duvidas = Array.isArray(row.duvidas)
    ? row.duvidas.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const n = Number((item as { n?: unknown }).n);
        const question = (item as { question?: unknown }).question;
        if (!Number.isInteger(n) || typeof question !== 'string') return [];
        const motivo = (item as { motivo?: unknown }).motivo;
        return [{ n, question, motivo: typeof motivo === 'string' ? motivo : '' }];
      })
    : undefined;
  return {
    kept: Number(row.kept) || 0,
    dropped,
    ...(perQuestion ? { perQuestion } : {}),
    ...(review && review.length ? { review } : {}),
    ...(batchLog && batchLog.length ? { batchLog } : {}),
    ...(typeof row.fromOffline === 'number' ? { fromOffline: row.fromOffline } : {}),
    ...(row.reviewFellBack === true ? { reviewFellBack: true } : {}),
    ...(duvidas ? { duvidas } : {}),
    ...(Array.isArray((raw as { rejected?: unknown }).rejected)
      ? {
          rejected: ((raw as { rejected: unknown[] }).rejected).flatMap((item) => {
            if (!item || typeof item !== 'object') return [];
            const n = Number((item as { n?: unknown }).n);
            const reasons = (item as { reasons?: unknown }).reasons;
            if (!Number.isInteger(n) || !Array.isArray(reasons)) return [];
            return [{ n, reasons: reasons.filter((c): c is string => typeof c === 'string') }];
          }),
        }
      : {}),
  };
}

function readTimings(raw: unknown): QuizTiming[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((item) => {
    if (!item || typeof item !== 'object') return { msToAnswer: 0, msReadingExplain: 0 };
    const msToAnswer = Number((item as { msToAnswer?: unknown }).msToAnswer);
    const msReadingExplain = Number((item as { msReadingExplain?: unknown }).msReadingExplain);
    return {
      msToAnswer: Number.isFinite(msToAnswer) && msToAnswer > 0 ? msToAnswer : 0,
      msReadingExplain: Number.isFinite(msReadingExplain) && msReadingExplain > 0 ? msReadingExplain : 0,
    };
  });
}

function readTheme(raw: DailyQuizTheme | undefined): DailyQuizTheme {
  const theme = raw ?? { id: '', category: '', title: '', lesson: '', whyItMatters: '' };
  const { angleIndex, depth, ...rest } = theme;
  return {
    ...rest,
    ...(angleIndex === 0 || angleIndex === 1 || angleIndex === 2 ? { angleIndex } : {}),
    ...(depth === 1 || depth === 2 || depth === 3 ? { depth } : {}),
  };
}

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
    theme: readTheme(theme),
    questions,
    reflectionPrompt: typeof data.reflectionPrompt === 'string' ? data.reflectionPrompt : '',
    source: data.source === 'offline' ? 'offline' : 'ai',
    generatedAt: (data.generatedAt as Timestamp | undefined)?.toDate?.() ?? new Date(0),
    completed: data.completed === true,
    awaitingReflection: data.awaitingReflection === true && data.completed !== true,
    score: typeof data.score === 'number' ? data.score : undefined,
    totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : undefined,
    xpEarned: typeof data.xpEarned === 'number' ? data.xpEarned : undefined,
    goldEarned: typeof data.goldEarned === 'number' ? data.goldEarned : undefined,
    answers: Array.isArray(data.answers) ? (data.answers as string[]) : undefined,
    reflection: typeof data.reflection === 'string' ? data.reflection : undefined,
    reflectionWords: typeof data.reflectionWords === 'number' ? data.reflectionWords : undefined,
    reflectionNote: typeof data.reflectionNote === 'string' ? data.reflectionNote : undefined,
    timings: readTimings(data.timings),
    completedAt: (data.completedAt as Timestamp | undefined)?.toDate?.(),
    sanitize: readSanitize(data.sanitize),
    ...(data.raw && typeof data.raw === 'object' ? { raw: data.raw } : {}),
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

async function loadQuizBankNeedles(userId: string, today: string): Promise<DedupeNeedle[]> {
  const since = addDays(today, -180);
  try {
    const snap = await getDocs(query(
      collection(db, 'quizBank'),
      where('userId', '==', userId),
      where('date', '>=', since),
      orderBy('date', 'desc'),
    ));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        date: String(data.date ?? ''),
        subject: String(data.subject ?? ''),
        question: String(data.question ?? ''),
        ...(typeof data.hash === 'string' ? { hash: data.hash } : {}),
        ...(typeof data.n === 'number' ? { n: data.n } : {}),
      };
    });
  } catch (e) {
    console.warn('quizBank leitura', e);
    return [];
  }
}

async function buildAndSave(userId: string, date: string, today: string, count: number): Promise<DailyQuiz> {
  const recent = await getRecentDailyQuizzes(userId, today, 90);
  const history: ThemeHistoryEntry[] = recent
    .filter((q) => q.date !== date && q.theme.id)
    .map((q) => ({
      date: q.date,
      themeId: q.theme.id,
      category: q.theme.category,
      ...(q.theme.angleIndex === 0 || q.theme.angleIndex === 1 || q.theme.angleIndex === 2
        ? { angle: q.theme.angleIndex }
        : {}),
    }));
  let profile = rotationProfileFrom(undefined);
  try {
    const learning = await getDoc(doc(db, 'learning', userId));
    profile = rotationProfileFrom(learning.data()?.profile);
  } catch (e) {
    console.warn('perfil da prova', e);
  }
  const pick = pickTheme(date, history, profile);
  const avoid = avoidQuestionsFromRecent(
    recent.map((q) => ({ date: q.date, questions: q.questions.map((x) => x.question) })),
    60,
  );
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  const bank = await loadQuizBankNeedles(userId, today);
  const generated = await generateDailyQuiz({
    seed: pick.theme,
    count,
    avoidQuestions: avoid,
    date,
    forceOffline: modules.aiGeneration === false,
    angle: pick.angle,
    depth: pick.depth,
    bank,
  });
  const theme: DailyQuizTheme = {
    ...generated.theme,
    id: pick.theme.id,
    category: pick.theme.category,
    angle: pick.angle,
    angleIndex: pick.angleIndex,
    depth: pick.depth,
  };

  const ref = doc(db, 'dailyQuizzes', dailyQuizId(userId, date));
  await setDoc(ref, {
    userId,
    date,
    status: 'ready',
    completed: false,
    theme,
    questions: generated.questions,
    reflectionPrompt: generated.reflectionPrompt,
    source: generated.source,
    ...(generated.sanitize ? { sanitize: generated.sanitize } : {}),
    ...(generated.raw ? { raw: generated.raw } : {}),
    answers: deleteField(),
    timings: deleteField(),
    score: deleteField(),
    totalQuestions: deleteField(),
    awaitingReflection: deleteField(),
    reflection: deleteField(),
    reflectionWords: deleteField(),
    reflectionNote: deleteField(),
    generatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return {
    id: ref.id,
    userId,
    date,
    status: 'ready',
    theme,
    questions: generated.questions,
    reflectionPrompt: generated.reflectionPrompt,
    source: generated.source,
    sanitize: generated.sanitize,
    ...(generated.raw ? { raw: generated.raw } : {}),
    generatedAt: new Date(),
    completed: false,
  };
}

/** 8ª pergunta: guarda as respostas sem fechar nem pagar (M2). */
export async function stashQuizAnswers(
  userId: string,
  date: string,
  answers: string[],
  score: number,
  totalQuestions: number,
  timings?: QuizTiming[],
): Promise<void> {
  await setDoc(doc(db, 'dailyQuizzes', dailyQuizId(userId, date)), {
    userId,
    date,
    ...answersStash(answers, score, totalQuestions, timings),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function completeDailyQuiz(userId: string, date: string, result: {
  score: number;
  totalQuestions: number;
  xpEarned: number;
  goldEarned: number;
  answers: string[];
  reflection: string;
  reflectionNote?: string;
  about: QuizAbout;
  timings?: QuizTiming[];
}): Promise<void> {
  const ref = doc(db, 'dailyQuizzes', dailyQuizId(userId, date));
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : undefined;
  const plan = completeQuizWrite(existing, result);
  if (plan.kind === 'skip') return;
  if (plan.kind === 'reject') throw new Error(plan.reason);
  const questions = Array.isArray(existing?.questions) ? existing.questions as DailyQuizQuestion[] : [];
  const theme = (existing?.theme ?? {}) as DailyQuizTheme;
  const timings = result.timings?.length ? result.timings : readTimings(existing?.timings);
  const bank = quizBankDocs({
    userId,
    date,
    theme,
    questions,
    answers: result.answers,
    timings,
  });
  const snaps = await Promise.all(bank.map((item) => getDoc(doc(db, 'quizBank', item.id))));
  const fresh = bank.filter((_, i) => !snaps[i].exists());
  const batch = writeBatch(db);
  batch.set(ref, {
    userId,
    date,
    ...plan.data,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  for (const item of fresh) {
    batch.set(doc(db, 'quizBank', item.id), { ...item.data, createdAt: serverTimestamp() });
  }
  await batch.commit();
  try {
    await bumpChallenge(userId, 'quiz_correct', result.score);
  } catch (e) {
    console.warn('desafio quiz_correct', e);
  }
  if (perfectQuiz(result.score, result.totalQuestions)) {
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
    if (perfectQuiz(result.score, result.totalQuestions)) deltas.quizPerfect = 1;
    await bumpVillage(userId, { ...deltas, reflections: 1 }, { set: { quizStreak: nextQuizStreak(prevStreak, yesterday?.completed === true, skipped) } });
    await bumpFriend(userId, 'sabio', 2);
  } catch (e) {
    console.warn('stats prova', e);
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
