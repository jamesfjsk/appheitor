import { normalizeQuizText } from './provaRules';
import { canonSubject, SUBJECTS, type RawQuestion } from './validateQuestion';

function text(row: Record<string, unknown>, key: string): string {
  return typeof row[key] === 'string' ? row[key].trim() : '';
}

/** Linha do banco novo traz why e trap. Linha antiga copia a explanation nos dois. */
export function reserveFromRow(row: Record<string, unknown>): RawQuestion | null {
  const question = text(row, 'question');
  const answer = text(row, 'answer');
  const options = Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === 'string') : [];
  if (!question || !answer || options.length !== 4) return null;
  const why = text(row, 'why');
  if (why) {
    const subject = text(row, 'subject');
    const skill = text(row, 'skill');
    const audioText = text(row, 'audioText');
    const scenario = text(row, 'scenario');
    const id = text(row, 'id');
    return {
      question,
      options,
      answer,
      why,
      trap: text(row, 'trap'),
      explanation: why,
      kind: 'knowledge',
      ...(subject ? { subject } : {}),
      ...(skill ? { skill } : {}),
      ...(audioText ? { audioText } : {}),
      ...(scenario === 'futebol' ? { scenario: 'futebol' as const } : {}),
      ...(id ? { id } : {}),
    };
  }
  const explanation = text(row, 'explanation');
  const mapped = canonSubject(text(row, 'category'));
  const subject = SUBJECTS.has(mapped) ? mapped : 'tema';
  return {
    question,
    options,
    answer,
    explanation,
    why: explanation,
    trap: explanation,
    subject,
    kind: 'knowledge',
  };
}

/** No máximo duas por área. A ordem do arquivo é a ordem da prova offline. */
export function pickReserveQuiz(candidates: RawQuestion[], count: number): RawQuestion[] {
  const picked: RawQuestion[] = [];
  const perArea = new Map<string, number>();
  for (const q of candidates) {
    if (picked.length >= count) break;
    const area = typeof q.subject === 'string' && q.subject ? q.subject : 'tema';
    if ((perArea.get(area) ?? 0) >= 2) continue;
    picked.push(q);
    perArea.set(area, (perArea.get(area) ?? 0) + 1);
  }
  return picked;
}

/** Sem pergunta nova que chegue, completa com as já vistas: a prova offline não sai curta nem vazia. */
export function topUpReserve(fresh: RawQuestion[], all: RawQuestion[], count: number): RawQuestion[] {
  const seen = new Set(fresh.map((q) => normalizeQuizText(String(q.question ?? ''))));
  const rest = all.filter((q) => !seen.has(normalizeQuizText(String(q.question ?? ''))));
  return pickReserveQuiz([...fresh, ...rest], count);
}
