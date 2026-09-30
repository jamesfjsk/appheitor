import type { BankAttempt, QuizTiming } from './bankWrite';
import { reflectionReady, reflectionThemeHits, wordCount } from './provaRules';

export type { QuizTiming };

export type QuizAbout = { prompt: string; title: string; lesson: string };

export type QuizPhase = 'prompt' | 'lesson' | 'questions' | 'results';

/** Estado da mesa no começo do dia. A virada não herda a prova de ontem. */
export function freshQuizUi(): {
  current: number;
  selected: null;
  answers: string[];
  score: number;
  reward: { xp: number; gold: number };
  reflection: string;
  judgeSay: null;
  paid: false;
  phase: QuizPhase;
} {
  return {
    current: 0,
    selected: null,
    answers: [],
    score: 0,
    reward: { xp: 0, gold: 0 },
    reflection: '',
    judgeSay: null,
    paid: false,
    phase: 'prompt',
  };
}

/** Paga primeiro; se o pagamento lançar, complete não roda (A2 + teste M1). */
export async function payThenComplete(
  pay: () => Promise<void>,
  complete: () => Promise<void>,
): Promise<void> {
  await pay();
  await complete();
}

export function cleanAttempt(raw: unknown): BankAttempt {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as { second?: unknown; nudge?: unknown; audioPlayed?: unknown };
  const out: BankAttempt = {};
  if (typeof row.second === 'string' && row.second) out.second = row.second;
  if (row.nudge === 'trap' || row.nudge === 'strategy') out.nudge = row.nudge;
  if (row.audioPlayed === true) out.audioPlayed = true;
  return out;
}

export function readAttempts(raw: unknown): BankAttempt[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => cleanAttempt(item));
}

/** Recarregar antes da reflexão não pode apagar a segunda tentativa que já estava na mesa. */
export function attemptsForBank(incoming?: BankAttempt[], stored?: BankAttempt[]): BankAttempt[] | undefined {
  const n = Math.max(incoming?.length ?? 0, stored?.length ?? 0);
  if (n === 0) return undefined;
  const out: BankAttempt[] = [];
  for (let i = 0; i < n; i++) {
    const a = incoming?.[i];
    const b = stored?.[i];
    const second = a?.second || b?.second;
    const nudge = a?.nudge || b?.nudge;
    const audioPlayed = a?.audioPlayed === true || b?.audioPlayed === true;
    const row: BankAttempt = {};
    if (second) row.second = second;
    if (nudge === 'trap' || nudge === 'strategy') row.nudge = nudge;
    if (audioPlayed) row.audioPlayed = true;
    out.push(row);
  }
  return out;
}

export function answersStash(
  answers: string[],
  score: number,
  totalQuestions: number,
  timings?: QuizTiming[],
  attempts?: BankAttempt[],
): {
  answers: string[];
  score: number;
  totalQuestions: number;
  awaitingReflection: true;
  completed: false;
  status: 'ready';
  timings?: QuizTiming[];
  attempts?: BankAttempt[];
} {
  const timingsOut = timings?.map((t) => ({
    msToAnswer: t && t.msToAnswer > 0 ? t.msToAnswer : 0,
    msReadingExplain: t && t.msReadingExplain > 0 ? t.msReadingExplain : 0,
  }));
  const attemptsOut = attempts ? answers.map((_, i) => cleanAttempt(attempts[i])) : undefined;
  return {
    answers,
    score,
    totalQuestions,
    awaitingReflection: true,
    completed: false,
    status: 'ready',
    ...(timingsOut ? { timings: timingsOut } : {}),
    ...(attemptsOut ? { attempts: attemptsOut } : {}),
  };
}

export function shouldOpenReflection(quiz: {
  completed?: boolean;
  awaitingReflection?: boolean;
  answers?: string[];
  questions: unknown[];
}): boolean {
  return quiz.awaitingReflection === true
    && quiz.completed !== true
    && Array.isArray(quiz.answers)
    && quiz.answers.length === quiz.questions.length
    && quiz.questions.length > 0;
}

export function completeQuizWrite(
  existing: { completed?: boolean } | null | undefined,
  result: {
    score: number;
    totalQuestions: number;
    xpEarned: number;
    goldEarned: number;
    answers: string[];
    reflection: string;
    reflectionNote?: string;
    about: QuizAbout;
    launchedOn?: string | null;
    today?: string;
    reflectionMs?: number;
    waiveTheme?: boolean;
  },
): { kind: 'skip' } | { kind: 'reject'; reason: string } | {
  kind: 'write';
  data: {
    status: 'completed';
    completed: true;
    awaitingReflection: false;
    score: number;
    totalQuestions: number;
    xpEarned: number;
    goldEarned: number;
    answers: string[];
    reflection: string;
    reflectionWords: number;
    reflectionThemeHits: number;
    reflectionMs?: number;
    reflectionNote?: string;
  };
} {
  if (existing?.completed === true) return { kind: 'skip' };
  const reflection = result.reflection.trim();
  if (!reflectionReady(reflection, result.about, result.launchedOn, result.today, result.waiveTheme === true)) {
    return { kind: 'reject', reason: 'A reflexão ainda não está pronta.' };
  }
  const note = result.reflectionNote?.trim();
  return {
    kind: 'write',
    data: {
      status: 'completed',
      completed: true,
      awaitingReflection: false,
      score: result.score,
      totalQuestions: result.totalQuestions,
      xpEarned: result.xpEarned,
      goldEarned: result.goldEarned,
      answers: result.answers,
      reflection,
      reflectionWords: wordCount(reflection),
      reflectionThemeHits: reflectionThemeHits(reflection, result.about),
      ...(typeof result.reflectionMs === 'number' ? { reflectionMs: result.reflectionMs } : {}),
      ...(note ? { reflectionNote: note } : {}),
    },
  };
}
