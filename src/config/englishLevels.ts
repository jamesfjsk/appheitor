// ========================================
// Arena de Inglês: cartão fixo dos níveis 1-3 (seção 2 da especificação)
// Módulo puro (sem Firebase, sem React, sem import.meta.env): roda em Node.
// A checagem de formas proibidas é por token e por lista de lemas, nunca por
// sufixo solto, para não reprovar red/bed/need/king/morning/evening.
// ========================================

import type { ForgeTarget, LetterGenre, LetterQuestionKind, NoteErrorTag } from '../types/english';

export type LevelNumber = 1 | 2 | 3;

export interface EnglishLevel {
  level: LevelNumber;
  /** Nome curto em PT para o painel */
  label: string;
  /** Gramática do nível em PT (painel dos pais) */
  grammar: string[];
  /** Cartão em inglês que entra no prompt: permitido */
  promptAllowed: string[];
  /** Cartão em inglês que entra no prompt: proibido */
  promptForbidden: string[];
  /** Formas proibidas (tokens inteiros); -ing/-ed vêm da lista de lemas */
  forbiddenTokens: string[];
  /** Tamanho máximo de uma frase (palavras) */
  maxWords: number;
  /** Faixa de palavras da Carta (gêneros letter/scout_report/dialogue) */
  letterWords: [number, number];
  glossarySize: [number, number];
  /** Tipos das 3 perguntas da Carta, na ordem pedida à IA */
  letterQuestionKinds: LetterQuestionKind[];
  /** Quantidade de frases do Recado [min, max] */
  noteSentences: [number, number];
  /** Moldes rotativos ligados à gramática do nível */
  noteTemplates: string[];
  /** Que tipo de informação cada item de mustInclude pede (inglês, vai ao prompt) */
  noteInfoKinds: [string, string, string];
  /** Temas em PT sorteados por dia */
  vocabThemes: string[];
  /** Alvos da Ferraria para a rotação sobre a gramática */
  forgeTargets: ForgeTarget[];
}

/** Números por extenso; índice = valor (0..20) */
export const NUMBER_WORDS: string[] = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

/** Lemas de verbos usados para reconhecer formas -ing e -ed */
export const VERB_LEMMAS: string[] = [
  'be', 'have', 'do', 'go', 'come', 'put', 'give', 'take', 'open', 'close', 'like', 'love', 'want', 'need',
  'play', 'run', 'jump', 'walk', 'swim', 'build', 'mine', 'eat', 'drink', 'sleep', 'read', 'write', 'look',
  'see', 'make', 'get', 'find', 'help', 'use', 'work', 'live', 'sit', 'stand', 'stop', 'start', 'wait', 'talk',
  'ask', 'tell', 'say', 'buy', 'sell', 'pay', 'bring', 'carry', 'clean', 'cook', 'cut', 'dig', 'fight', 'fix',
  'fly', 'hold', 'keep', 'kick', 'learn', 'listen', 'move', 'pick', 'pull', 'push', 'ride', 'sing', 'smile',
  'speak', 'throw', 'try', 'turn', 'visit', 'wash', 'watch', 'win', 'climb', 'dance', 'draw', 'paint', 'feel',
  'meet', 'think', 'know', 'call', 'show', 'hire', 'train', 'catch', 'hunt', 'hide', 'grow', 'fish', 'cross',
  'laugh', 'cry', 'shout', 'wear', 'sail', 'camp', 'rest', 'plant', 'water', 'feed', 'craft', 'trade', 'guard',
  'shoot', 'score', 'pass', 'jog', 'hop', 'nap', 'chop', 'drop', 'grab', 'hang', 'place',
];

/** Substantivos terminados em -ing cujo radical é um verbo da lista (não são gerúndio) */
const ING_NOUN_EXCEPTIONS = new Set(['building', 'painting', 'drawing', 'feeling', 'meeting', 'ceiling', 'clothing', 'pudding']);
/** Palavras terminadas em -ed que não são passado (bed -> be, seed -> see) */
const ED_NOUN_EXCEPTIONS = new Set(['bed', 'red', 'need', 'seed', 'feed', 'speed', 'deed', 'reed', 'shed', 'bread', 'head', 'ahead', 'indeed', 'hundred', 'weed', 'bleed']);

/** Passados irregulares comuns (sem was/were, tratados por nível); left/read/put ficam de fora por serem ambíguos */
const IRREGULAR_PAST = [
  'went', 'had', 'got', 'saw', 'came', 'made', 'took', 'gave', 'ate', 'ran', 'said', 'told', 'found', 'bought',
  'brought', 'thought', 'knew', 'met', 'sat', 'slept', 'spoke', 'stood', 'swam', 'wore', 'won', 'wrote', 'drank',
  'built', 'began', 'broke', 'chose', 'drove', 'fell', 'felt', 'flew', 'forgot', 'grew', 'heard', 'held', 'kept',
  'lost', 'paid', 'sang', 'sent', 'sold', 'spent', 'taught', 'threw', 'understood', 'woke', 'became', 'caught',
  'dug', 'fought', 'hid', 'rode', 'shook', 'fed', 'did', "didn't",
];
/** Particípios usados no present perfect (fora do plano até o nível 6) */
const PAST_PARTICIPLES = [
  'been', 'done', 'gone', 'seen', 'eaten', 'taken', 'given', 'written', 'spoken', 'broken', 'chosen', 'driven',
  'fallen', 'flown', 'forgotten', 'grown', 'known', 'ridden', 'shaken', 'thrown', 'woken', 'worn', 'drawn',
  'drunk', 'sung', 'swum', 'begun',
];
const FUTURE_AND_MODALS = ['will', "won't", 'would', 'could', 'should', 'shall', 'might', 'gonna'];

const LEVEL1_THEMES = ['a mina', 'a base', 'o campinho de futebol', 'a fazenda', 'a cozinha', 'a loja do comerciante', 'os animais da vila', 'a caverna'];
const LEVEL2_THEMES = ['a expedição na mina', 'o time de futebol', 'a feira da vila', 'a floresta', 'a torre de vigia', 'a escola dos mineradores', 'o rio e a ponte', 'a noite na base'];
const LEVEL3_THEMES = ['a viagem ao deserto', 'o campeonato da vila', 'a mina abandonada', 'o navio no porto', 'a tempestade', 'o mercado noturno', 'a montanha de gelo', 'o dia do torneio'];

export const LEVELS: Record<LevelNumber, EnglishLevel> = {
  1: {
    level: 1,
    label: 'Nível 1',
    grammar: [
      'to be (am/is/are)', 'have/has', 'a/an/the', 'and/but', 'I/you/we + like/want/need/have + substantivo',
      'imperativos (put/give/take/open/close)', 'there is/are', 'in/on/under/next to', 'plural regular',
      'números 1-20', 'cores', 'my/your', 'perguntas com is/are/do you',
    ],
    promptAllowed: [
      'to be (am/is/are)', 'have/has', 'articles a/an/the', 'and/but',
      'I/you/we + like/want/need/have + noun', 'imperatives: put, give, take, open, close',
      'there is / there are', 'prepositions in/on/under/next to', 'regular plural (-s)',
      'numbers 1-20 written as words', 'colors', 'my/your', 'questions with is/are/do you',
      'present tense only, sentences of at most 7 words',
    ],
    promptForbidden: [
      'any past tense (was/were/did/went/played...)', 'future (will, going to)',
      "modals (must, should, could, can't)", '-ing verbs, except right after like/love',
      'third person -s (he likes)', "don't/doesn't", 'because, some/any, this/that, how many',
    ],
    forbiddenTokens: [
      'was', 'were', "wasn't", "weren't", 'did', "didn't", 'does', "doesn't", "don't", 'must', "can't", 'cannot',
      'because', ...FUTURE_AND_MODALS, ...IRREGULAR_PAST, ...PAST_PARTICIPLES,
    ],
    maxWords: 7,
    letterWords: [40, 60],
    glossarySize: [4, 6],
    letterQuestionKinds: ['decision', 'comprehension', 'comprehension'],
    noteSentences: [2, 2],
    noteTemplates: [
      'I need ___ and ___.',
      'I have ___. It is for ___.',
      'There is ___ in the ___.',
      'Please give me ___ for ___.',
      'I want ___ and ___ for ___.',
    ],
    noteInfoKinds: [
      'a quantity (1-20) plus an item, e.g. "two swords"',
      'a second quantity plus item, or a color/size of the item with "is", e.g. "one red torch"',
      'for whom or where, with for/in/on/under/next to, e.g. "for the dog", "in the cave"',
    ],
    vocabThemes: LEVEL1_THEMES,
    forgeTargets: [
      { id: 'imperative_order', label: 'Ordem do pedido (Put the X on the Y)', kind: 'order' },
      { id: 'there_is_are', label: 'There is / There are', kind: 'form' },
      { id: 'a_an_the', label: 'Artigos a/an/the', kind: 'form' },
      { id: 'plural_s', label: 'Plural regular', kind: 'form' },
      { id: 'to_be', label: 'am / is / are', kind: 'form' },
      { id: 'question_order', label: 'Ordem da pergunta (Is it...? Do you...?)', kind: 'order' },
    ],
  },
  2: {
    level: 2,
    label: 'Nível 2',
    grammar: [
      "can/can't", 'like/love + -ing', 'presente simples 3ª pessoa (-s)', "don't/doesn't", 'some/any',
      'how many', 'this/that/these/those', 'because', 'want to/need to',
    ],
    promptAllowed: [
      'everything from level 1', "can/can't", 'like/love + -ing', 'simple present third person (-s)',
      "don't/doesn't", 'some/any', 'how many', 'this/that/these/those', 'because', 'want to / need to',
      'sentences of at most 9 words',
    ],
    promptForbidden: [
      'any past tense (was/were/did/went/played...)', 'future (will, going to)', 'must/should/could/would',
      'present continuous (am/is/are + -ing)', '-ing verbs outside like/love + -ing', 'comparatives',
    ],
    forbiddenTokens: [
      'was', 'were', "wasn't", "weren't", 'did', "didn't", 'must', ...FUTURE_AND_MODALS,
      ...IRREGULAR_PAST, ...PAST_PARTICIPLES,
    ],
    maxWords: 9,
    letterWords: [60, 90],
    glossarySize: [6, 8],
    letterQuestionKinds: ['decision', 'comprehension', 'comprehension'],
    noteSentences: [2, 3],
    noteTemplates: [
      'Can you give me ___? I need ___ because ___.',
      'I want to ___ with ___. Do you have ___?',
      "I don't have ___. I need ___ for ___.",
      'How many ___ do you have? I need ___.',
      'This ___ is for ___. I like ___.',
    ],
    noteInfoKinds: [
      'a quantity (1-20) plus an item, e.g. "three keys"',
      'for whom or where, e.g. "for the team", "in the tower"',
      "a reason with because, or something the person can/can't do, e.g. \"because it is dark\"",
    ],
    vocabThemes: LEVEL2_THEMES,
    forgeTargets: [
      { id: 'third_person_s', label: 'Presente simples com -s (he likes)', kind: 'form' },
      { id: 'dont_doesnt', label: "don't / doesn't", kind: 'form' },
      { id: 'can_cant', label: "can / can't", kind: 'form' },
      { id: 'some_any', label: 'some / any', kind: 'form' },
      { id: 'question_order_2', label: 'Ordem da pergunta (How many...? Does he...?)', kind: 'order' },
      { id: 'because_order', label: 'Ordem da frase com because', kind: 'order' },
    ],
  },
  3: {
    level: 3,
    label: 'Nível 3',
    grammar: [
      'presente contínuo', 'must', 'was/were', 'advérbios de frequência', 'for + -ing', 'to + verbo (finalidade)',
      'comparativos simples',
    ],
    promptAllowed: [
      'everything from levels 1 and 2', 'present continuous (am/is/are + -ing)', 'must', 'was/were',
      'frequency adverbs (always, sometimes, never)', 'for + -ing', 'to + verb (purpose)',
      'simple comparatives (bigger, faster, more careful)', 'sentences of at most 11 words',
    ],
    promptForbidden: [
      'past tense of any verb other than was/were (did, went, played...)', 'future (will, going to)',
      'present perfect (have been/done)', 'should/could/would',
    ],
    forbiddenTokens: ['did', "didn't", ...FUTURE_AND_MODALS, ...IRREGULAR_PAST, ...PAST_PARTICIPLES],
    maxWords: 11,
    letterWords: [80, 120],
    glossarySize: [8, 10],
    letterQuestionKinds: ['decision', 'comprehension', 'inference'],
    noteSentences: [3, 3],
    noteTemplates: [
      'I am ___ now. I need ___ for ___.',
      'You must ___. There are ___ in the ___.',
      'I need ___ to ___. It is ___.',
      'There were ___ in the ___. Now I need ___.',
      'I always ___ with ___. Please give me ___.',
    ],
    noteInfoKinds: [
      'a quantity (1-20) plus an item, e.g. "five torches"',
      'a purpose with to + verb or for + -ing, e.g. "to light the cave", "for climbing"',
      'what is happening now (present continuous) or an obligation with must, e.g. "we are digging", "you must run"',
    ],
    vocabThemes: LEVEL3_THEMES,
    forgeTargets: [
      { id: 'present_continuous', label: 'Presente contínuo (is running)', kind: 'form' },
      { id: 'was_were', label: 'was / were', kind: 'form' },
      { id: 'comparatives', label: 'Comparativos (bigger, faster)', kind: 'form' },
      { id: 'adverb_position', label: 'Posição do advérbio (always, never)', kind: 'order' },
      { id: 'purpose_order', label: 'Ordem com to + verbo (finalidade)', kind: 'order' },
      { id: 'must_form', label: 'must + verbo', kind: 'form' },
    ],
  },
};

export const LETTER_GENRES: LetterGenre[] = ['letter', 'scout_report', 'dialogue', 'notice', 'list'];

/** Gêneros curtos têm faixa própria, igual em todos os níveis */
export const LETTER_GENRE_WORDS: Partial<Record<LetterGenre, [number, number]>> = {
  notice: [25, 45],
  list: [30, 50],
};

/** Etiqueta de erro do Recado -> alvo da Ferraria */
export const FORGE_TAG_TARGETS: Record<NoteErrorTag, ForgeTarget> = {
  plural: { id: 'tag_plural', label: 'Plural', kind: 'form' },
  article: { id: 'tag_article', label: 'Artigos a/an/the', kind: 'form' },
  verb: { id: 'tag_verb', label: 'Forma do verbo', kind: 'form' },
  spelling: { id: 'tag_spelling', label: 'Grafia', kind: 'form' },
  word_order: { id: 'tag_word_order', label: 'Ordem das palavras', kind: 'order' },
  preposition: { id: 'tag_preposition', label: 'Preposições (in/on/under/next to)', kind: 'form' },
  other: { id: 'tag_other', label: 'Frases completas', kind: 'order' },
};

/** Nível válido (1..3) a partir de qualquer número */
export function levelFor(n: number): EnglishLevel {
  const clamped = Number.isFinite(n) ? Math.min(3, Math.max(1, Math.round(n))) : 1;
  return LEVELS[clamped as LevelNumber];
}

export function letterWordRange(level: number, genre: LetterGenre): [number, number] {
  return LETTER_GENRE_WORDS[genre] ?? levelFor(level).letterWords;
}

/** Palavras em minúsculas, apóstrofo preservado (can't), resto descartado */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .split(/[^a-z']+/)
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .filter((t) => t.length > 0);
}

const VERB_SET = new Set(VERB_LEMMAS);

/** Lema de uma forma -ing quando o radical é verbo da lista; null caso contrário */
export function ingLemma(token: string): string | null {
  if (token.length < 5 || !token.endsWith('ing') || ING_NOUN_EXCEPTIONS.has(token)) return null;
  const stem = token.slice(0, -3);
  const candidates = [stem, `${stem}e`];
  if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) candidates.push(stem.slice(0, -1));
  return candidates.find((c) => VERB_SET.has(c)) ?? null;
}

/** Lema de uma forma -ed quando o radical é verbo da lista; null caso contrário */
export function edLemma(token: string): string | null {
  if (token.length < 4 || !token.endsWith('ed') || ED_NOUN_EXCEPTIONS.has(token)) return null;
  const stem = token.slice(0, -2);
  const candidates = [stem, `${stem}e`];
  if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) candidates.push(stem.slice(0, -1));
  if (token.endsWith('ied')) candidates.push(`${token.slice(0, -3)}y`);
  return candidates.filter((c) => c.length >= 3).find((c) => VERB_SET.has(c)) ?? null;
}

const ING_LICENSERS = new Set(['like', 'likes', 'love', 'loves']);

/**
 * Token proibido no nível. prev/next/afterNext dão o contexto: -ing é liberado depois de
 * like/love (níveis 1-2; no 3 é livre); "going to" + verbo (futuro) é proibido em todos os
 * níveis, mas "going to the mine" (movimento) não, para não reprovar like + -ing nem o
 * presente contínuo do nível 3.
 */
export function isTokenForbidden(token: string, level: number, prev?: string, next?: string, afterNext?: string): boolean {
  const lv = levelFor(level);
  const t = token.toLowerCase().replace(/[‘’]/g, "'");
  if (lv.forbiddenTokens.includes(t)) return true;
  if (t === 'going' && next === 'to' && afterNext !== undefined && VERB_SET.has(afterNext)) return true;
  if (edLemma(t)) return true;
  if (lv.level < 3 && ingLemma(t) && !(prev && ING_LICENSERS.has(prev))) return true;
  return false;
}

/** Tokens proibidos do texto, sem repetição, na ordem em que aparecem */
export function findForbiddenTokens(text: string, level: number): string[] {
  const tokens = tokenize(text);
  const found: string[] = [];
  tokens.forEach((t, i) => {
    if (isTokenForbidden(t, level, tokens[i - 1], tokens[i + 1], tokens[i + 2]) && !found.includes(t)) found.push(t);
  });
  return found;
}
