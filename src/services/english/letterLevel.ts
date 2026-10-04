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

/** A opção da C2 está no texto, palavra por palavra, na mesma ordem. */
export function c2OptionInText(text: string, option: string): boolean {
  const phrase = option.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!phrase) return false;
  const hay = ` ${text.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ')} `;
  const words = phrase.replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return hay.includes(` ${words.join(' ')} `);
}

/** C2: três opções distintas, cada uma copiada do texto. */
export function c2OptionsOk(text: string, options: string[]): boolean {
  if (options.length !== 3) return false;
  const seen = new Set<string>();
  for (const option of options) {
    const key = option.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!key || seen.has(key)) return false;
    // Opção é um pedaço curto (lugar, coisa, ação), nunca a frase inteira
    if (key.split(' ').length > 4) return false;
    seen.add(key);
    if (!c2OptionInText(text, option)) return false;
  }
  return true;
}

export interface C2Letter {
  title: string;
  sender: string;
  text: string;
  glossary: { en: string; pt: string }[];
  questions: { question: string; options: string[]; answer: number; evidence: string; explanation: string }[];
  translation: string;
}

/** C2: 50 a 70 palavras, pergunta em português, 3 opções copiadas do texto, glossário de 4 a 6. */
export function parseC2Letter(raw: unknown): { ok: boolean; problems: string[]; letter: C2Letter | null } {
  const problems: string[] = [];
  if (!raw || typeof raw !== 'object') return { ok: false, problems: ['formato'], letter: null };
  const row = raw as Record<string, unknown>;
  const text = typeof row.text === 'string' ? row.text.trim() : '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 50 || words.length > 70) problems.push(`texto com ${words.length} palavras`);
  const questions: C2Letter['questions'] = [];
  const rawQuestions = Array.isArray(row.questions) ? row.questions : [];
  for (const item of rawQuestions.slice(0, 3)) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === 'string' ? q.question.trim() : '';
    const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).map((o) => o.trim()) : [];
    const answer = q.answer;
    const evidence = typeof q.evidence === 'string' ? q.evidence.trim() : '';
    if (!c1QuestionOk(question)) {
      problems.push(`pergunta fora do português: ${question || '(vazia)'}`);
      continue;
    }
    if (!c2OptionsOk(text, options)) {
      problems.push(`opções da C2: ${question}`);
      continue;
    }
    if (answer !== 0 && answer !== 1 && answer !== 2) {
      problems.push(`answer: ${question}`);
      continue;
    }
    if (!evidence || !text.toLowerCase().includes(evidence.toLowerCase())) {
      problems.push(`prova fora do texto: ${question}`);
      continue;
    }
    questions.push({
      question,
      options,
      answer,
      evidence,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    });
  }
  if (questions.length < 2) problems.push(`só ${questions.length} pergunta(s)`);
  const glossary = Array.isArray(row.glossary)
    ? row.glossary.flatMap((g) => {
      if (!g || typeof g !== 'object') return [];
      const rowg = g as { en?: unknown; pt?: unknown };
      if (typeof rowg.en !== 'string' || typeof rowg.pt !== 'string') return [];
      const en = rowg.en.trim();
      const inText = c2OptionInText(text, en) || text.toLowerCase().includes(en.toLowerCase());
      if (!en || !inText) return [];
      return [{ en, pt: rowg.pt.trim() }];
    }).slice(0, 6)
    : [];
  if (glossary.length < 4 || glossary.length > 6) problems.push(`glossário com ${glossary.length}`);
  const letter: C2Letter = {
    title: typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Carta',
    sender: typeof row.sender === 'string' && row.sender.trim() ? row.sender.trim() : 'Friend',
    text,
    glossary,
    questions: questions.slice(0, 2),
    translation: typeof row.translation === 'string' ? row.translation : '',
  };
  return { ok: problems.length === 0, problems, letter: problems.length === 0 ? letter : null };
}

export interface LetterReview {
  coherence: number;
  oneAnswer: boolean;
  oneSentence: boolean;
  withoutReading: boolean;
  /** A frase da prova, sozinha, mostra que a opção certa é a certa. */
  evidenceSupports: boolean;
}

export function parseLetterReview(raw: unknown): LetterReview | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const coherence = typeof row.coherence === 'number' ? row.coherence : Number.NaN;
  if (!Number.isFinite(coherence) || coherence < 1 || coherence > 5) return null;
  if (typeof row.oneAnswer !== 'boolean') return null;
  if (typeof row.oneSentence !== 'boolean') return null;
  if (typeof row.withoutReading !== 'boolean') return null;
  if (typeof row.evidenceSupports !== 'boolean') return null;
  return {
    coherence,
    oneAnswer: row.oneAnswer,
    oneSentence: row.oneSentence,
    withoutReading: row.withoutReading,
    evidenceSupports: row.evidenceSupports,
  };
}

/** Passa com coerência 4 ou mais, uma resposta, evidência numa frase, e não dá para responder sem ler. */
export function letterReviewPasses(review: LetterReview | null): boolean {
  if (!review) return false;
  return review.coherence >= 4 && review.oneAnswer && review.oneSentence && review.withoutReading === false && review.evidenceSupports === true;
}

/** Lixo nas duas leituras cai no banco. A segunda só existe se a primeira reprovou. */
export function letterAfterReviews(first: LetterReview | null, second: LetterReview | null): 'first' | 'second' | 'offline' {
  if (letterReviewPasses(first)) return 'first';
  if (letterReviewPasses(second)) return 'second';
  return 'offline';
}
