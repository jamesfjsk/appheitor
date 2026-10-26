// Revisão espaçada na prova (26/10/2026): quando a IA e o banco de reserva não fecham as 8 perguntas
// (de 20 a 23/10 a prova saiu com 6, 5 e 4), entram perguntas que ele já respondeu há 30 dias ou mais,
// primeiro as que ele errou. Puro: recebe as linhas do quizBank dele.
import { addDays } from '../../utils/clock';
import { normalizeQuestion } from './hash';
import { reserveFromRow } from './reserveFromRow';
import type { RawQuestion } from './validateQuestion';

export const REVIEW_MIN_DAYS = 30;

export interface BankRow {
  date?: unknown;
  question?: unknown;
  options?: unknown;
  answer?: unknown;
  why?: unknown;
  trap?: unknown;
  subject?: unknown;
  skill?: unknown;
  kind?: unknown;
  correct?: unknown;
  hash?: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Perguntas para revisar: respondidas há REVIEW_MIN_DAYS dias ou mais, sem ter caído de novo nesse meio tempo,
 * fora das que estão em `exclude`. Só conhecimento (a lição e o dilema dependem da ideia do dia).
 * Ordem: as que ele errou, da mais antiga para a mais nova; depois as que ele acertou, da mais antiga.
 */
export function reviewCandidates(rows: BankRow[], today: string, exclude: string[] = []): RawQuestion[] {
  const cutoff = addDays(today, -REVIEW_MIN_DAYS);
  const hashOf = (r: BankRow) => str(r.hash) || normalizeQuestion(str(r.question));
  const blocked = new Set(exclude.map((t) => normalizeQuestion(t)));
  for (const r of rows) if (str(r.date) > cutoff) blocked.add(hashOf(r));

  const latest = new Map<string, BankRow>();
  for (const r of rows) {
    const h = hashOf(r);
    const kind = str(r.kind) || 'knowledge';
    if (!h || blocked.has(h) || kind === 'lesson' || kind === 'dilemma') continue;
    if (str(r.date) > cutoff) continue;
    const prev = latest.get(h);
    if (!prev || str(prev.date) < str(r.date)) latest.set(h, r);
  }

  const sorted = [...latest.values()].sort((a, b) => {
    const wa = a.correct === false ? 0 : 1;
    const wb = b.correct === false ? 0 : 1;
    if (wa !== wb) return wa - wb;
    return str(a.date).localeCompare(str(b.date));
  });

  const out: RawQuestion[] = [];
  for (const r of sorted) {
    const q = reserveFromRow(r as Record<string, unknown>);
    if (!q || !q.options?.includes(String(q.answer))) continue;
    out.push(q);
  }
  return out;
}
