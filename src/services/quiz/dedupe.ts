import { addDays } from '../../utils/clock';
import { normalizeQuestion } from './hash';

export interface DedupeNeedle {
  date: string;
  subject: string;
  question: string;
  hash?: string;
  n?: number;
}

export function subjectKey(subject: string): string {
  return normalizeQuestion(subject).replace(/ /g, '');
}

/** Palavras de 4 letras ou mais, já normalizadas. */
export function wordsOf4(text: string): string[] {
  return normalizeQuestion(text).split(' ').filter((w) => w.length >= 4);
}

/**
 * Mesmo assunto e 70% ou mais das palavras de 4+ letras em comum.
 * A fração é a interseção dividida pelo lado maior (o mesmo corte do validador).
 */
export function nearDuplicate(
  a: { subject: string; question: string },
  b: { subject: string; question: string },
): boolean {
  if (subjectKey(a.subject) !== subjectKey(b.subject)) return false;
  const wa = wordsOf4(a.question);
  const wb = wordsOf4(b.question);
  if (wa.length === 0 || wb.length === 0) return false;
  const bag = new Set(wb);
  const hit = wa.filter((w) => bag.has(w)).length;
  return hit / Math.max(wa.length, bag.size) >= 0.7;
}

function byNewest(a: DedupeNeedle, b: DedupeNeedle): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.n ?? 0) - (a.n ?? 0);
}

export function dropRepeated<T extends { question?: string; subject?: string }>(
  kept: T[],
  bank: DedupeNeedle[],
  today: string,
): { kept: T[]; rejected: { n: number; reasons: ['repetida'] }[] } {
  const rejected: { n: number; reasons: ['repetida'] }[] = [];
  const next: T[] = [];
  kept.forEach((q, i) => {
    const question = String(q.question ?? '');
    const subject = String(q.subject ?? '');
    if (question && isRepeatedQuestion({ subject, question }, bank, today)) {
      rejected.push({ n: i + 1, reasons: ['repetida'] });
    } else {
      next.push(q);
    }
  });
  return { kept: next, rejected };
}

/** Hash igual a um dos últimos 180 dias, ou quase igual a um dos 60 mais recentes. */
export function isRepeatedQuestion(
  q: { subject: string; question: string },
  bank: DedupeNeedle[],
  today: string,
): boolean {
  const hash = normalizeQuestion(q.question);
  if (!hash) return false;
  const since = addDays(today, -180);
  const window = bank.filter((b) => b.date >= since && b.date <= today && b.question.trim());
  if (window.some((b) => (b.hash || normalizeQuestion(b.question)) === hash)) return true;
  const week = addDays(today, -7);
  if (window.some((b) => b.date >= week && sameQuestionSkeleton(q.question, b.question))) return true;
  const recent = [...window].sort(byNewest).slice(0, 60);
  return recent.some((b) => nearDuplicate(q, b));
}

export interface DatedStatement {
  date: string;
  text: string;
  n?: number;
}

/** Da mais recente para a mais antiga, no máximo `limit`. */
export function newestStatements(items: DatedStatement[], limit = 60): DatedStatement[] {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.n ?? 0) - (a.n ?? 0);
  }).slice(0, limit);
}

const SKELETON_KEEP = new Set([
  'durante', 'um', 'uma', 'o', 'a', 'os', 'as', 'de', 'do', 'da', 'em', 'no', 'na',
  'para', 'por', 'com', 'como', 'isso', 'que', 'e', 'esta', 'estao', 'afeta', 'afetam',
  'there', 'the', 'an', 'under', 'in', 'on', 'next', 'to', 'is', 'are', 'am',
  'where', 'what', 'when', 'who', 'how', 'why',
]);

/** Tira substantivos e o miolo entre o artigo e o verbo. O que muda vira "nome". */
export function questionSkeleton(text: string): string {
  return normalizeQuestion(text)
    .split(' ')
    .filter(Boolean)
    .map((word) => (SKELETON_KEEP.has(word) ? word : 'nome'))
    .join(' ');
}

function questionFrame(text: string): '' | 'afeta' | 'there' {
  const n = normalizeQuestion(text);
  if (n.includes('como isso afeta')) return 'afeta';
  if (n.startsWith('there')) return 'there';
  return '';
}

/** Mesmo esqueleto: as frases de 30/09 a 02/10 que só trocam o substantivo. */
export function sameQuestionSkeleton(a: string, b: string): boolean {
  const frame = questionFrame(a);
  if (!frame || frame !== questionFrame(b)) return false;
  return nearDuplicate(
    { subject: 'esqueleto', question: questionSkeleton(a) },
    { subject: 'esqueleto', question: questionSkeleton(b) },
  );
}

export function avoidQuestionsFromRecent(
  quizzes: { date: string; questions: string[] }[],
  limit = 60,
): string[] {
  const rows = quizzes.flatMap((quiz) => quiz.questions.map((text, i) => ({
    date: quiz.date,
    text,
    n: i + 1,
  })));
  return newestStatements(rows, limit).map((row) => row.text);
}
