import { reflectionOk, wordCount } from './provaRules';

export type QuizAbout = { prompt: string; title: string; lesson: string };

/** Paga primeiro; se o pagamento lançar, complete não roda (A2 + teste M1). */
export async function payThenComplete(
  pay: () => Promise<void>,
  complete: () => Promise<void>,
): Promise<void> {
  await pay();
  await complete();
}

export function answersStash(answers: string[], score: number, totalQuestions: number): {
  answers: string[];
  score: number;
  totalQuestions: number;
  awaitingReflection: true;
  completed: false;
  status: 'ready';
} {
  return {
    answers,
    score,
    totalQuestions,
    awaitingReflection: true,
    completed: false,
    status: 'ready',
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
    reflectionNote?: string;
  };
} {
  if (existing?.completed === true) return { kind: 'skip' };
  const reflection = result.reflection.trim();
  if (!reflectionOk(reflection, result.about)) {
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
      ...(note ? { reflectionNote: note } : {}),
    },
  };
}
