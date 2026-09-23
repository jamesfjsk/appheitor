import { normalizeQuestion } from './hash';

export interface QuizTiming {
  msToAnswer: number;
  msReadingExplain: number;
}

export interface BankSourceQuestion {
  question: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  why?: string;
  trap?: string;
  kind?: string;
  subject?: string;
  skill?: string;
  bloom?: string;
  difficulty?: 1 | 2 | 3;
}

const BLOOMS = new Set(['entender', 'aplicar', 'analisar']);
const KINDS = new Set(['lesson', 'knowledge', 'review', 'dilemma']);

/**
 * Oito docs do quizBank, prontos para o mesmo writeBatch do resultado.
 * A segunda tentativa ainda não existe: attempts 1, sem secondChoice, retryOk nem nudge.
 * supportLevel é 0 no acerto e 3 no erro; no dilema o campo não vai.
 * createdAt entra no serviço (serverTimestamp), não aqui.
 */
export function quizBankDocs(input: {
  userId: string;
  date: string;
  theme: { id?: string; category?: string; depth?: number };
  questions: BankSourceQuestion[];
  answers: string[];
  timings?: QuizTiming[];
}): { id: string; data: Record<string, unknown> }[] {
  const count = Math.min(input.questions.length, input.answers.length);
  const depth = input.theme.depth === 2 || input.theme.depth === 3 ? input.theme.depth : 1;
  const out: { id: string; data: Record<string, unknown> }[] = [];
  for (let i = 0; i < count; i++) {
    const q = input.questions[i];
    const chosen = input.answers[i] ?? '';
    const answer = typeof q.answer === 'string' ? q.answer : '';
    const kind = KINDS.has(q.kind ?? '') ? q.kind! : 'knowledge';
    const correct = chosen === answer;
    const bloom = BLOOMS.has(q.bloom ?? '') ? q.bloom : 'entender';
    const data: Record<string, unknown> = {
      userId: input.userId,
      familyId: 'heitor',
      date: input.date,
      n: i + 1,
      themeId: input.theme.id ?? '',
      category: input.theme.category || 'tema',
      subject: q.subject || (kind === 'lesson' || kind === 'dilemma' ? 'tema' : 'geral'),
      kind,
      skill: q.skill || '',
      bloom,
      depth,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
      answer,
      why: q.why || q.explanation || '',
      trap: q.trap || '',
      hash: normalizeQuestion(q.question),
      chosen,
      correct,
      attempts: 1,
    };
    if (q.difficulty === 1 || q.difficulty === 2 || q.difficulty === 3) data.difficulty = q.difficulty;
    if (kind !== 'dilemma') data.supportLevel = correct ? 0 : 3;
    const timing = input.timings?.[i];
    if (timing && timing.msToAnswer > 0) data.msToAnswer = Math.round(timing.msToAnswer);
    if (timing && timing.msReadingExplain > 0) data.msReadingExplain = Math.round(timing.msReadingExplain);
    out.push({ id: `${input.userId}_${input.date}_${i + 1}`, data });
  }
  return out;
}
