// Nível próprio da Carta (§9.4). Sem o campo, começa na C1. Nunca passa do teto do painel.

export type LetterTier = 1 | 2 | 3;

export const LETTER_MOTIVES = [
  { id: 'help', pt: 'pedido de ajuda' },
  { id: 'invite', pt: 'convite' },
  { id: 'danger', pt: 'aviso de perigo' },
  { id: 'lost', pt: 'achado e perdido' },
  { id: 'path', pt: 'caminho até um lugar' },
  { id: 'game', pt: 'notícia de um jogo' },
  { id: 'list', pt: 'lista para uma tarefa' },
  { id: 'thanks', pt: 'agradecimento' },
] as const;

export type LetterMotiveId = (typeof LETTER_MOTIVES)[number]['id'];

const EN_QUESTION = /\b(what|where|who|which|why|how|is|are|do|does|did|can|could)\b/i;

export function letterCeiling(panelLevel: number): LetterTier {
  const n = Number.isFinite(panelLevel) ? Math.min(3, Math.max(1, Math.round(panelLevel))) : 1;
  return n as LetterTier;
}

/** Sem `letterLevel`, a Carta começa na C1, e nunca acima do teto do painel. */
export function letterLevelOf(base: { letterLevel?: number } | null | undefined, panelLevel: number): LetterTier {
  const cap = letterCeiling(panelLevel);
  const raw = base?.letterLevel;
  if (raw !== 1 && raw !== 2 && raw !== 3) return 1;
  return Math.min(raw, cap) as LetterTier;
}

/**
 * Sobe com 3 cartas seguidas certas de primeira. Desce com 2 seguidas com no máximo 1 certa.
 * O teto é o nível do painel.
 */
export function nextLetterLevel(
  level: LetterTier,
  ceiling: number,
  perfectStreak: number,
  weakStreak: number,
): LetterTier {
  const cap = letterCeiling(ceiling);
  const current = Math.min(letterLevelOf({ letterLevel: level }, cap), cap) as LetterTier;
  if (weakStreak >= 2) return Math.max(1, current - 1) as LetterTier;
  if (perfectStreak >= 3) return Math.min(cap, current + 1) as LetterTier;
  return current;
}

export function motiveFor(seed: number): (typeof LETTER_MOTIVES)[number] {
  const i = Math.abs(Math.trunc(seed)) % LETTER_MOTIVES.length;
  return LETTER_MOTIVES[i];
}

/** Pergunta de informação, que só se responde lendo. "Você pode...?" com "Sim" não serve. */
const PT_QUESTION_START = /^(onde|o que|quem|quando|quantos|quantas|qual|quais|por que|como|para onde|para que|de onde|pelo que|com quem|em que)(?![a-zà-ú])/i;

/** C1: pergunta em português, sem palavra de pergunta em inglês, e de informação (sem sim ou não). */
export function c1QuestionOk(question: string): boolean {
  const q = question.trim();
  return q.length > 0 && !EN_QUESTION.test(q) && PT_QUESTION_START.test(q);
}

export interface LetterReview {
  coherence: number;
  oneAnswer: boolean;
  oneSentence: boolean;
  withoutReading: boolean;
}

export function parseLetterReview(raw: unknown): LetterReview | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const coherence = typeof row.coherence === 'number' ? row.coherence : Number.NaN;
  if (!Number.isFinite(coherence) || coherence < 1 || coherence > 5) return null;
  if (typeof row.oneAnswer !== 'boolean') return null;
  if (typeof row.oneSentence !== 'boolean') return null;
  if (typeof row.withoutReading !== 'boolean') return null;
  return {
    coherence,
    oneAnswer: row.oneAnswer,
    oneSentence: row.oneSentence,
    withoutReading: row.withoutReading,
  };
}

/** Passa com coerência 4 ou mais, uma resposta, evidência numa frase, e não dá para responder sem ler. */
export function letterReviewPasses(review: LetterReview | null): boolean {
  if (!review) return false;
  return review.coherence >= 4 && review.oneAnswer && review.oneSentence && review.withoutReading === false;
}

/** Lixo nas duas leituras cai no banco. A segunda só existe se a primeira reprovou. */
export function letterAfterReviews(first: LetterReview | null, second: LetterReview | null): 'first' | 'second' | 'offline' {
  if (letterReviewPasses(first)) return 'first';
  if (letterReviewPasses(second)) return 'second';
  return 'offline';
}
