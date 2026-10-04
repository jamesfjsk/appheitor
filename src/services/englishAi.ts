// ========================================
// Arena de Inglês: geração dos contratos por IA (seções 4.1-4.4, 4.6, 4.9)
// Liga prompts + callOpenAI + validadores + reserva. Uma chamada por contrato
// (gpt-4.1-mini, temperatura 0,8, 20 s), 1 retentativa citando os problemas do
// validador, depois a reserva (Comerciante por código; Carta, Recado e Ferraria
// pelo banco src/data/englishOfflineContracts.ts, validado do mesmo jeito).
// buildDailyContracts escolhe temas, gênero da Carta, alvo da Ferraria e o 5º contrato.
// ========================================

import type {
  BaseDoc,
  Contract,
  ContractType,
  DailyPlan,
  ForgeContent,
  ForgeItem,
  ForgeTarget,
  LetterContent,
  LetterGenre,
  MerchantContent,
  NoteContent,
} from '../types/english';
import { CONTRACT_MATERIAL, MERCHANT_CATALOGS } from '../config/englishBase';
import { FORGE_TAG_TARGETS, LETTER_GENRES, levelFor } from '../config/englishLevels';
import { forgeItemMixFor, yesterdayMistakes } from './english/prompts';
import { buildMerchantRoom, merchantKey, merchantStepKey, merchantStepsForDay, nextMerchantLevel, offlineSentences } from './english/merchantRoom';
import { normalize } from './english/notePrecheck';
import { buildPrompt, type BuiltPrompt } from './english/prompts';
import { createRng, mixSeed, pickOne, seedFromString } from './english/shuffle';
import { validateLetter, validateMerchant, validateNote, type MerchantValidation, type ValidationResult } from './english/validators';
import { callOpenAI, isAIConfigured } from './aiQuiz';
import { letterAfterReviews, letterLevelOf, parseLetterReview, c1QuestionOk, parseC2Letter, type LetterReview } from './english/letterLevel';
import { forgeItemsFor } from './english/forgeMolds';
import { unitById } from '../config/englishUnits';
import { currentUnit, dayInUnit, knownLemmas } from './english/units';
import { pickC1Letter } from '../data/englishC1Letters';
import { currentUsageMonth, getUsage, isOverCap } from './aiUsage';
import { addDays } from './dailyQuizService';
import { generationBlock, guardHost, refuseMessage } from './generationGuard';
import { readPublishedVersion, requestVersionReload } from './appUpdate';
import { getAppVersion } from './observability';

const AI_MODEL = 'gpt-4.1-mini';
const AI_TEMPERATURE = 0.8;
const CONTRACT_TIMEOUT_MS = 30_000; // picos de lentidão da API chegaram a 30 s na calibração
/** Chamada + 1 retentativa */
const ATTEMPTS = 2;
/** Dias de planos consultados para nomes a evitar e temas recentes */
const RECENT_NAMES_DAYS = 7;
/** Reserva não repete conteúdo usado neste período */
const OFFLINE_REPEAT_DAYS = 30;
/** Lemas conhecidos que entram no prompt (os mais vistos primeiro) */
const VOCAB_PROMPT_MAX = 80;

export type GeneratedSource = 'ai' | 'offline';

export interface GenerateInput {
  level: number;
  theme: string;
  date: string;
  seed: number;
  vocabKnown: string[];
  avoidNames: string[];
  /** Ferraria: nomes e itens da Carta do dia (continuidade) */
  letterContext?: { names: string[]; items: string[] };
  /** Ferraria: id (ou rótulo) do alvo do dia */
  forgeTarget?: string;
  /** Ferraria: itens errados ontem */
  retryItems?: ForgeItem[];
  /** Pedido da Mesa: substitui o tema quando presente */
  themeRequest?: string | null;
  /** Carta: gênero escolhido por buildDailyContracts (sem repetir os 2 últimos); sem ele, sorteio pela semente */
  genre?: LetterGenre;
  /** Reserva: chaves (offlineKey) dos contratos recentes, para não repetir */
  avoidOffline?: string[];
  /** Unidade aberta e o dia nela. Sem isto, a Ferraria usa a U1 no dia 1. */
  unitId?: string;
  dayInUnit?: number;
  /** Nível próprio da Carta. Sem isto, a geração trata como C1. */
  letterTier?: 1 | 2 | 3;
  merchantDone?: number;
  avoidMerchantSteps?: string[];
  /** Pedidos errados que voltam hoje. */
  preferMerchantSteps?: string[];
}

export interface GeneratedContract {
  content: Contract['content'];
  source: GeneratedSource;
  problems: string[];
}

export interface BuildContext {
  uid: string;
  date: string;
  level: number;
  base: BaseDoc;
  recentPlans: DailyPlan[];
  onProgress?: (ready: number, total: number) => void;
  /** Cada contrato assim que fica pronto (o serviço grava no plano em andamento) */
  onContract?: (contract: Contract) => void;
}

export interface BuiltPlan {
  order: string[];
  contracts: Record<string, Contract>;
  source: DailyPlan['source'];
  /** Pedido da Mesa aplicado neste plano (o serviço grava no plano e limpa na base) */
  themeRequest: string | null;
}

interface Generated<T> {
  content: T;
  source: GeneratedSource;
  problems: string[];
}

// ---------- utilitários ----------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const unique = (list: string[]): string[] => Array.from(new Set(list));

/** Dias desde 1970 (para paridade e rotação) */
const dayIndexOf = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000) || 0;

const themeOf = (input: GenerateInput): string => input.themeRequest?.trim() || input.theme;

// ---------- teto mensal ----------

/** Recusa gerar quando o custo estimado do mês passa de US$ 50. */
export async function assertAiBudget(): Promise<void> {
  if (!isAIConfigured()) return;
  const usage = await getUsage(currentUsageMonth());
  if (usage && isOverCap(usage)) {
    throw new Error('Teto mensal de IA: US$ 50');
  }
}

// ---------- chamada ----------

async function ask(prompt: BuiltPrompt): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTRACT_TIMEOUT_MS);
  try {
    const { json } = await callOpenAI(prompt.system, prompt.user, prompt.maxTokens, {
      model: AI_MODEL,
      temperature: AI_TEMPERATURE,
      withUsage: true,
      signal: controller.signal,
    });
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** Chama, valida, e na reprovação repete uma vez citando os problemas; null quando as duas falham */
async function askValidated<T>(
  build: (retryProblems?: string[]) => BuiltPrompt,
  validate: (raw: unknown) => ValidationResult<T>
): Promise<{ result: ValidationResult<T> | null; problems: string[] }> {
  let problems: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const raw = await ask(build(attempt > 0 ? problems : undefined));
      const v = validate(raw);
      if (v.ok) return { result: v, problems: [...problems, ...v.problems] };
      problems = v.problems;
    } catch (error) {
      problems = [`chamada à IA falhou: ${errorMessage(error)}`];
    }
  }
  return { result: null, problems };
}

// ---------- reserva ----------

type OfflineType = Exclude<ContractType, 'merchant'>;

/**
 * Reserva mínima embutida (nível 1, vale para qualquer nível): entra só quando a IA
 * e o banco falham, para o dia nunca ficar sem contrato.
 */
const EMERGENCY: Record<OfflineType, unknown> = {
  letter: {
    genre: 'letter',
    title: 'A torch for the cave',
    sender: 'Bram the old miner',
    text:
      'Hello friend! I am Bram, the old miner. I live next to the cave. My cave is dark and cold. I have two swords and one map, but I need a torch. There are three bats in the cave. Can you give me a torch? Thank you, my friend.',
    glossary: [
      { en: 'dark', pt: 'escuro' },
      { en: 'cold', pt: 'frio' },
      { en: 'bats', pt: 'morcegos' },
      { en: 'miner', pt: 'minerador' },
      { en: 'cave', pt: 'caverna' },
    ],
    questions: [
      {
        kind: 'decision',
        question: 'Bram is in the dark. What do you give Bram?',
        options: ['torch', 'map', 'sword', 'cake'],
        answer: 0,
        evidence: 'I need a torch',
        explanation: 'Bram diz que precisa de uma tocha.',
      },
      {
        kind: 'comprehension',
        question: 'What is in the cave?',
        options: ['the bats', 'the cows', 'the dogs', 'the cats'],
        answer: 0,
        evidence: 'There are three bats in the cave',
        explanation: 'O texto diz que há três morcegos na caverna.',
      },
      {
        kind: 'comprehension',
        question: 'How is the cave?',
        options: ['cold and dark', 'big and hot', 'small and warm', 'red and new'],
        answer: 0,
        evidence: 'My cave is dark and cold',
        explanation: 'Bram diz que a caverna é escura e fria.',
      },
    ],
    translation:
      'Olá, amigo! Eu sou Bram, o velho minerador. Eu moro ao lado da caverna. Minha caverna é escura e fria. Eu tenho duas espadas e um mapa, mas preciso de uma tocha. Há três morcegos na caverna. Você pode me dar uma tocha? Obrigado, meu amigo.',
  },
  note: {
    brief: 'Diga ao papai que faço a lição. Diga que é primeiro. Diga que jogo bola.',
    mustInclude: [
      { pt: 'faço a lição', en: ['my homework', 'the homework', 'do my homework'] },
      { pt: 'primeiro', en: ['homework first', 'do first', 'first'] },
      { pt: 'jogo bola', en: ['play soccer', 'play football', 'I play soccer'] },
    ],
    wordBank: ['do', 'homework', 'first', 'then', 'play', 'soccer', 'want', 'need', 'ball', 'dinner', 'book', 'help'],
    model: 'I do my homework first. Then I play soccer.',
    hint: '',
  },
  forge: {
    target: 'Artigos a/an/the',
    items: [
      { kind: 'gap', sentence: 'I have ___ apple.', options: ['an', 'a', 'the'], answer: 0, rule: 'Antes de vogal (a, e, i, o, u) usamos an: an apple.' },
      { kind: 'gap', sentence: 'There is ___ orange on the bed.', options: ['an', 'a', 'two'], answer: 0, rule: 'Orange começa com vogal: an orange.' },
      { kind: 'gap', sentence: 'I want ___ banana.', options: ['a', 'an', 'two'], answer: 0, rule: 'Antes de consoante usamos a: a banana.' },
      { kind: 'gap', sentence: 'There are ___ swords.', options: ['two', 'a', 'an'], answer: 0, rule: 'Swords está no plural: não leva a/an, leva um número.' },
      { kind: 'typed', prompt: 'Escreva o plural de torch', sentence: 'I need two ___.', accepted: ['torches'], rule: 'Palavras terminadas em -ch fazem o plural com -es: torches.' },
      { kind: 'typed', prompt: 'Escreva o plural de apple', sentence: 'There are three ___ in the box.', accepted: ['apples'], rule: 'Plural regular: apple + s = apples.' },
    ],
  },
};

type OfflineBankModule = Record<string, unknown>;
type OfflinePicker = (type: ContractType, level: number, seed: number, avoidKeys: string[]) => unknown;

let bankModule: OfflineBankModule | null | undefined;

/**
 * O banco é construído por outra frente e pode não existir na hora de compilar:
 * import.meta.glob aceita a ausência (objeto vazio). Formas aceitas do módulo:
 * pickOfflineContract(type, level, seed, avoidKeys) ou OFFLINE_CONTRACTS[type][level] (lista
 * de conteúdos crus, no formato que o validador do tipo espera).
 */
function loadBank(): OfflineBankModule | null {
  if (bankModule !== undefined) return bankModule;
  try {
    const mods = import.meta.glob<OfflineBankModule>('../data/englishOfflineContracts.ts', { eager: true });
    bankModule = Object.values(mods)[0] ?? null;
  } catch {
    bankModule = null;
  }
  return bankModule;
}

function bankCandidates(type: OfflineType, level: number, seed: number, avoidKeys: string[]): unknown[] {
  const bank = loadBank();
  if (!bank) return [];
  if (typeof bank.pickOfflineContract === 'function') {
    const one = (bank.pickOfflineContract as OfflinePicker)(type, level, seed, avoidKeys);
    return one ? [one] : [];
  }
  const table = bank.OFFLINE_CONTRACTS ?? bank.default;
  if (!isRecord(table)) return [];
  const byType = table[type];
  let list: unknown[] = [];
  if (Array.isArray(byType)) list = byType.filter((e) => !isRecord(e) || e.level === undefined || Number(e.level) === level);
  else if (isRecord(byType)) {
    const byLevel = byType[String(level)];
    if (Array.isArray(byLevel)) list = byLevel;
  }
  return list.map((e) => (isRecord(e) && 'content' in e ? e.content : e));
}

/** Identidade de um conteúdo para a regra "sem repetir em 14 dias" (mesma função nos dois lados) */
export function offlineKey(type: ContractType, content: Contract['content']): string {
  switch (type) {
    case 'merchant':
      return merchantKey((content as MerchantContent).steps);
    case 'letter': {
      const c = content as LetterContent;
      return normalize(`${c.title} ${c.sender}`);
    }
    case 'note':
      return normalize((content as NoteContent).brief);
    case 'forge':
      return normalize((content as ForgeContent).items.map((i) => (i.kind === 'scramble' ? i.answer : i.sentence)).join(' '));
  }
}

/** Escolhe da reserva um conteúdo válido que não apareceu nos últimos 14 dias; por último a reserva embutida */
function offlineFor<T extends Contract['content']>(
  type: OfflineType,
  level: number,
  seed: number,
  avoidKeys: string[],
  validate: (raw: unknown, lv: number) => ValidationResult<T>
): Generated<T> {
  const valid = bankCandidates(type, level, seed, avoidKeys)
    .map((raw) => validate(raw, level))
    .filter((v) => v.ok);
  const fresh = valid.filter((v) => !avoidKeys.includes(offlineKey(type, v.content)));
  const pool = fresh.length ? fresh : valid;
  if (pool.length) {
    const chosen = pool[(seed >>> 0) % pool.length];
    return { content: chosen.content, source: 'offline', problems: chosen.problems };
  }
  // Nível 1 de propósito: a reserva embutida é de nível 1 e a gramática dele vale em todos
  const emergency = validate(EMERGENCY[type], 1);
  return { content: emergency.content, source: 'offline', problems: ['banco de reserva indisponível; usada a reserva embutida', ...emergency.problems] };
}

// ---------- geradores por tipo ----------

async function generateMerchant(input: GenerateInput): Promise<Generated<MerchantContent>> {
  const lv = levelFor(input.level);
  const avoid = new Set(input.avoidOffline ?? []);
  const banned = new Set((input.avoidMerchantSteps ?? []).map((k) => k.toLowerCase()));
  const roomOpts = { done: input.merchantDone ?? 0, avoidSteps: [...banned], preferSteps: input.preferMerchantSteps };
  const clashes = (room: ReturnType<typeof buildMerchantRoom>): boolean =>
    avoid.has(merchantKey(room.steps)) || room.steps.some((s) => banned.has(merchantStepKey(s)));
  let room = buildMerchantRoom(input.seed, lv.level, MERCHANT_CATALOGS.spots, MERCHANT_CATALOGS.items, roomOpts);
  for (let i = 1; i < 24 && clashes(room); i++) {
    room = buildMerchantRoom(mixSeed(input.seed, `fresh${i}`), lv.level, MERCHANT_CATALOGS.spots, MERCHANT_CATALOGS.items, roomOpts);
  }
  const offline = offlineSentences(room.steps, MERCHANT_CATALOGS, room.items);
  const fallback = validateMerchant({ ...room, sentences: offline.sentences, translation: offline.translations }, lv.level);
  if (!isAIConfigured()) return { content: fallback.content, source: 'offline', problems: fallback.problems };
  let best: MerchantValidation | null = null;
  let problems: string[] = [];
  // A estrutura vem do código e nunca reprova; a retentativa só vale quando alguma frase foi trocada
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const raw = await ask(
        buildPrompt('merchant', {
          level: lv.level,
          theme: themeOf(input),
          vocabKnown: input.vocabKnown,
          avoidNames: input.avoidNames,
          seed: input.seed,
          steps: room.steps,
          sentences: offline.sentences,
          items: room.items,
          retryProblems: attempt > 0 ? problems : undefined,
        })
      );
      const r = isRecord(raw) ? raw : {};
      const v = validateMerchant({ ...room, sentences: r.sentences, translation: r.translation }, lv.level);
      if (!best || v.replaced.length < best.replaced.length) best = v;
      if (v.ok && v.replaced.length === 0) break;
      problems = v.problems;
    } catch (error) {
      problems = [`chamada à IA falhou: ${errorMessage(error)}`];
    }
  }
  if (!best || !best.ok) return { content: fallback.content, source: 'offline', problems };
  const allReplaced = best.replaced.length >= room.steps.length;
  return { content: best.content, source: allReplaced ? 'offline' : 'ai', problems: best.problems };
}

function c1FromBank(seed: number): LetterContent {
  const letter = pickC1Letter(seed);
  return {
    genre: 'letter',
    title: letter.title,
    sender: letter.sender,
    text: letter.text,
    glossary: letter.glossary,
    questions: letter.questions.map((q) => ({
      kind: 'comprehension' as const,
      question: q.question,
      options: [...q.options],
      answer: q.answer,
      evidence: q.evidence,
      explanation: q.explanation,
    })),
    translation: letter.translation,
  };
}

function c1FromRaw(raw: unknown, vocabKnown: string[] = []): LetterContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const text = typeof row.text === 'string' ? row.text.trim() : '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 30 || words.length > 50) return null;
  if (!Array.isArray(row.questions)) return null;
  const questions: LetterContent['questions'] = [];
  for (const item of row.questions.slice(0, 2)) {
    if (!item || typeof item !== 'object') return null;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === 'string' ? q.question.trim() : '';
    if (!c1QuestionOk(question)) return null;
    const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0) : [];
    if (options.length !== 3) return null;
    if (q.answer !== 0 && q.answer !== 1 && q.answer !== 2) return null;
    const evidence = typeof q.evidence === 'string' ? q.evidence : '';
    if (!evidence || !text.includes(evidence)) return null;
    questions.push({
      kind: 'comprehension',
      question,
      options,
      answer: q.answer,
      evidence,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    });
  }
  if (questions.length < 2) return null;
  const known = new Set(vocabKnown.map((w) => w.toLowerCase()));
  const glossary = Array.isArray(row.glossary)
    ? row.glossary.flatMap((g) => {
      if (!g || typeof g !== 'object') return [];
      const rowg = g as { en?: unknown; pt?: unknown };
      if (typeof rowg.en !== 'string' || typeof rowg.pt !== 'string') return [];
      // Glossário é palavra nova: a que ele já viu sai
      if (known.has(rowg.en.trim().toLowerCase())) return [];
      return [{ en: rowg.en, pt: rowg.pt }];
    }).slice(0, 5)
    : [];
  if (glossary.length < 3) return null;
  return {
    genre: 'letter',
    title: typeof row.title === 'string' && row.title ? row.title : 'Carta',
    sender: typeof row.sender === 'string' && row.sender ? row.sender : 'Friend',
    text,
    glossary,
    questions,
    translation: typeof row.translation === 'string' ? row.translation : '',
  };
}

async function reviewLetter(content: LetterContent): Promise<LetterReview | null> {
  if (!isAIConfigured()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTRACT_TIMEOUT_MS);
  try {
    const { json } = await callOpenAI(
      'You review a short English story for a 10-year-old. Reply with ONE JSON object only.',
      [
        `Text:\n${content.text}`,
        `Questions:\n${content.questions.map((q) => `${q.question} | certa: ${q.options[q.answer] ?? ''} | prova: ${q.evidence}`).join('\n')}`,
        'Schema: { "coherence": 4, "oneAnswer": true, "oneSentence": true, "withoutReading": false, "evidenceSupports": true }',
        'Be strict. coherence is 1 to 5 and passes at 4: 5 = every sentence serves one motive, like a real note a child would send; 4 = one small detail is extra; 3 or less = any sentence about a thing that does not serve the motive, or a list of things ("I need a sword and boots" in a note about a fair). oneAnswer is true only when each question has one right option. oneSentence is true only when the proof is a single sentence of the text. withoutReading is true when the child can answer without the story. evidenceSupports is true ONLY when the proof sentence, alone, shows that the right option is right. If the proof does not name the place, the person or the thing the question asks, evidenceSupports is false.',
      ].join('\n\n'),
      300,
      { model: 'gpt-4o', temperature: 0, withUsage: true, signal: controller.signal },
    );
    return parseLetterReview(json);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function generateC1Letter(input: GenerateInput): Promise<Generated<LetterContent>> {
  const bank = (): Generated<LetterContent> => ({
    content: c1FromBank(input.seed),
    source: 'offline',
    problems: ['revisor reprovou ou a carta não coube no C1; banco'],
  });
  if (!isAIConfigured()) return bank();
  let first: LetterContent | null = null;
  let firstReview: LetterReview | null = null;
  let second: LetterContent | null = null;
  let secondReview: LetterReview | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prompt = buildPrompt('letter', {
        level: 1,
        theme: themeOf(input),
        vocabKnown: input.vocabKnown,
        avoidNames: input.avoidNames,
        seed: input.seed + attempt,
        genre: input.genre ?? 'letter',
        letterTier: 1,
        retryProblems: attempt ? ['The previous story failed the review. Write a new one.'] : undefined,
      });
      const content = c1FromRaw(await ask(prompt), input.vocabKnown);
      const review = content ? await reviewLetter(content) : null;
      if (attempt === 0) {
        first = content;
        firstReview = review;
        if (letterAfterReviews(review, null) === 'first') break;
      } else {
        second = content;
        secondReview = review;
      }
    } catch {
      /* tenta de novo, ou cai no banco */
    }
  }
  const pick = letterAfterReviews(firstReview, secondReview);
  if (pick === 'first' && first) return { content: first, source: 'ai', problems: [] };
  if (pick === 'second' && second) return { content: second, source: 'ai', problems: [] };
  return bank();
}

function c2FromRaw(raw: unknown, vocabKnown: string[] = []): LetterContent | null {
  const parsed = parseC2Letter(raw);
  if (!parsed.letter) return null;
  const known = new Set(vocabKnown.map((w) => w.toLowerCase()));
  const glossary = parsed.letter.glossary.filter((g) => !known.has(g.en.toLowerCase()));
  if (glossary.length < 4) return null;
  return {
    genre: 'letter',
    title: parsed.letter.title,
    sender: parsed.letter.sender,
    text: parsed.letter.text,
    glossary: glossary.slice(0, 6),
    questions: parsed.letter.questions.map((q) => ({ kind: 'comprehension' as const, ...q })),
    translation: parsed.letter.translation,
  };
}

async function generateC2Letter(input: GenerateInput): Promise<Generated<LetterContent>> {
  // Reserva da C2 é o banco C1, aprovado pelo pai: perguntas em português e carta com motivo. O banco antigo do nível 2 tem perguntas em inglês.
  const bank = (): Generated<LetterContent> => ({ content: c1FromBank(input.seed), source: 'offline', problems: [] });
  if (!isAIConfigured()) return { ...bank(), problems: ['C2 sem IA; banco do nível 2'] };
  const unit = unitById(input.unitId || 'u1');
  let first: LetterContent | null = null;
  let firstReview: LetterReview | null = null;
  let second: LetterContent | null = null;
  let secondReview: LetterReview | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prompt = buildPrompt('letter', {
        level: 2,
        theme: themeOf(input),
        vocabKnown: input.vocabKnown,
        avoidNames: input.avoidNames,
        seed: input.seed + attempt,
        genre: input.genre ?? 'letter',
        letterTier: 2,
        unitPattern: unit.lesson,
        retryProblems: attempt ? ['The previous story failed the review or the C2 shape. Write a new one, 50 to 70 words, Portuguese questions, 3 English options copied from the text.'] : undefined,
      });
      const content = c2FromRaw(await ask(prompt), input.vocabKnown);
      const review = content ? await reviewLetter(content) : null;
      if (attempt === 0) {
        first = content;
        firstReview = review;
        if (letterAfterReviews(review, null) === 'first') break;
      } else {
        second = content;
        secondReview = review;
      }
    } catch {
      /* tenta de novo, ou cai no banco */
    }
  }
  const pick = letterAfterReviews(firstReview, secondReview);
  if (pick === 'first' && first) return { content: first, source: 'ai', problems: [] };
  if (pick === 'second' && second) return { content: second, source: 'ai', problems: [] };
  return { ...bank(), problems: ['revisor reprovou a C2 ou a carta não coube; banco do nível 2'] };
}

async function generateLetter(input: GenerateInput): Promise<Generated<LetterContent>> {
  if ((input.letterTier ?? 1) === 1) return generateC1Letter(input);
  if (input.letterTier === 2) return generateC2Letter(input);
  const lv = levelFor(input.level);
  const genre = input.genre ?? pickOne(createRng(mixSeed(input.seed, 'genre')), LETTER_GENRES);
  let problems: string[] = [];
  if (isAIConfigured()) {
    const { result, problems: p } = await askValidated(
      (retryProblems) =>
        buildPrompt('letter', {
          level: lv.level,
          theme: themeOf(input),
          vocabKnown: input.vocabKnown,
          avoidNames: input.avoidNames,
          seed: input.seed,
          genre,
          retryProblems,
        }),
      (raw) => validateLetter(raw, lv.level, input.vocabKnown, input.seed)
    );
    if (result) return { content: result.content, source: 'ai', problems: p };
    problems = p;
  }
  // Reserva validada sem filtrar pelo vocabulário conhecido: o glossário dela precisa sobreviver
  const offline = offlineFor('letter', lv.level, input.seed, input.avoidOffline ?? [], (raw, level) => validateLetter(raw, level, [], input.seed));
  return { ...offline, problems: [...problems, ...offline.problems] };
}

function noteFromUnit(unit: ReturnType<typeof unitById>, which: 0 | 1): NoteContent {
  const mold = unit.notes[which];
  return {
    brief: mold.brief,
    mustInclude: mold.ideas.map((pt) => ({ pt, en: pt.split(/\s+/).slice(0, 3) })),
    templates: [mold.mold],
    wordBank: [],
    model: mold.model,
    hint: '',
  };
}

function noteKeepsPattern(unit: ReturnType<typeof unitById>, model: string): boolean {
  const text = model.toLowerCase();
  return unit.notes.some((note) => {
    const keys = note.model.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
    return keys.filter((w) => text.includes(w)).length >= 2;
  });
}

async function generateNote(input: GenerateInput): Promise<Generated<NoteContent>> {
  const unit = unitById(input.unitId || 'u1');
  const day = input.dayInUnit ?? 1;
  if (day <= 2) {
    return { content: noteFromUnit(unit, day === 1 ? 0 : 1), source: 'offline', problems: [] };
  }
  const lv = levelFor(input.level);
  let problems: string[] = [];
  if (isAIConfigured()) {
    const { result, problems: p } = await askValidated(
      (retryProblems) =>
        buildPrompt('note', {
          level: lv.level,
          theme: themeOf(input),
          vocabKnown: input.vocabKnown,
          avoidNames: input.avoidNames,
          seed: input.seed,
          retryProblems,
        }),
      (raw) => validateNote(raw, lv.level)
    );
    if (result && noteKeepsPattern(unit, result.content.model)) return { content: result.content, source: 'ai', problems: p };
    problems = p;
  }
  return { content: noteFromUnit(unit, 0), source: 'offline', problems };
}

/** Alvo por id ou rótulo (rotação do nível ou etiqueta do Recado); sem id, rotação pela semente */
export function resolveForgeTarget(level: number, target: string | undefined, seed: number): ForgeTarget {
  const lv = levelFor(level);
  if (target) {
    const found =
      lv.forgeTargets.find((t) => t.id === target || t.label === target) ??
      Object.values(FORGE_TAG_TARGETS).find((t) => t.id === target || t.label === target);
    return found ?? { id: target, label: target, kind: 'form' };
  }
  return lv.forgeTargets[(seed >>> 0) % lv.forgeTargets.length];
}

async function generateForge(input: GenerateInput): Promise<Generated<ForgeContent>> {
  const id = input.unitId || 'u1';
  const day = input.dayInUnit ?? 1;
  const unit = unitById(id);
  const items = forgeItemsFor(id, day, input.seed);
  return {
    content: {
      target: unit.name,
      items,
      unitId: id,
      dayInUnit: day,
      lesson: {
        name: unit.name,
        text: unit.lesson,
        examples: unit.examples,
        wrong: unit.wrong,
        right: unit.right,
      },
    },
    source: 'offline',
    problems: [],
  };
}

/** Um contrato de um tipo: IA validada, retentativa e reserva. Nunca rejeita. */
export async function generateContract(type: ContractType, input: GenerateInput): Promise<GeneratedContract> {
  switch (type) {
    case 'merchant':
      return generateMerchant(input);
    case 'letter':
      return generateLetter(input);
    case 'note':
      return generateNote(input);
    case 'forge':
      return generateForge(input);
  }
}

// ---------- contexto do dia ----------

interface DaySpec {
  id: string;
  type: ContractType;
  theme: string;
  genre?: LetterGenre;
}

export interface DayContext {
  level: number;
  daySeed: number;
  specs: DaySpec[];
  vocabKnown: string[];
  avoidNames: string[];
  forgeTarget: ForgeTarget;
  retryItems: ForgeItem[];
  avoidOffline: string[];
  merchantDone: number;
  merchantLevel: 1 | 2 | 3;
  avoidMerchantSteps: string[];
  preferMerchantSteps: string[];
  letterTier: 1 | 2 | 3;
  unitId: string;
  dayInUnit: number;
  /** Sempre null. O pedido da Mesa saiu; o campo fica para os documentos antigos. */
  themeRequest: string | null;
}

const withinDays = (plan: DailyPlan, date: string, days: number): boolean => plan.date >= addDays(date, -days) && plan.date < date;

function contractsOf(plans: DailyPlan[], type: ContractType): Contract[] {
  return plans.flatMap((p) => p.order.map((id) => p.contracts[id]).filter((c): c is Contract => Boolean(c) && c.type === type));
}

/** Nomes próprios da Carta (remetente, falantes do diálogo, maiúsculas fora do início da frase) */
function letterContextOf(contract: Contract | null): { names: string[]; items: string[] } {
  if (!contract || contract.type !== 'letter') return { names: [], items: [] };
  const c = contract.content;
  const names = new Set<string>();
  if (c.sender) names.add(c.sender);
  for (const sentence of c.text.split(/[.!?\n]+/)) {
    const words = sentence.trim().split(/\s+/);
    words.forEach((w, i) => {
      const clean = w.replace(/[^A-Za-z']/g, '');
      const speaker = i === 0 && w.endsWith(':');
      if ((i > 0 || speaker) && /^[A-Z][a-z]{2,}$/.test(clean)) names.add(clean);
    });
  }
  return { names: [...names].slice(0, 5), items: c.glossary.map((g) => g.en).slice(0, 6) };
}

/** Escolhas do dia: temas, gênero da Carta, alvo da Ferraria, 5º contrato, vocabulário e nomes a evitar */
export function dayContextFor(ctx: Pick<BuildContext, 'uid' | 'date' | 'level' | 'base' | 'recentPlans'>): DayContext {
  // Só o nível do painel. O do Comerciante levava todos os contratos ao nível 3 (30/09).
  const lv = levelFor(ctx.level);
  const daySeed = seedFromString(`${ctx.uid}|${ctx.date}`);
  const rng = createRng(mixSeed(daySeed, 'day'));
  const recent = ctx.recentPlans.filter((p) => p.date < ctx.date).sort((a, b) => b.date.localeCompare(a.date));
  const lastWeek = recent.filter((p) => withinDays(p, ctx.date, RECENT_NAMES_DAYS));

  const recentThemes = unique(lastWeek.flatMap((p) => Object.values(p.contracts).map((c) => c.theme)));
  const themePool = lv.vocabThemes.filter((t) => !recentThemes.includes(t));
  const pool = themePool.length ? themePool : lv.vocabThemes;
  const mainTheme = pickOne(rng, pool);
  const secondPool = pool.filter((t) => t !== mainTheme);
  const secondTheme = secondPool.length ? pickOne(rng, secondPool) : mainTheme;

  const lastGenres = contractsOf(recent, 'letter')
    .slice(0, 2)
    .map((c) => (c.type === 'letter' ? c.content.genre : null))
    .filter((g): g is LetterGenre => g !== null);
  const genrePool = LETTER_GENRES.filter((g) => !lastGenres.includes(g));
  const genre1 = pickOne(rng, genrePool.length ? genrePool : LETTER_GENRES);
  const genre2Pool = genrePool.filter((g) => g !== genre1);
  const genre2 = genre2Pool.length ? pickOne(rng, genre2Pool) : genre1;

  const dayIndex = dayIndexOf(ctx.date);
  const openUnit = unitById(currentUnit(ctx.base, ctx.date).id);
  const forgeTarget: ForgeTarget = { id: openUnit.id, label: openUnit.name, kind: 'form' };

  const vocabKnown = knownLemmas(ctx.base.vocab).slice(0, VOCAB_PROMPT_MAX);
  const avoidNames = unique(contractsOf(lastWeek, 'letter').map((c) => (c.type === 'letter' ? c.content.sender : '')).filter(Boolean));
  const avoidOffline = unique(
    recent
      .filter((p) => withinDays(p, ctx.date, OFFLINE_REPEAT_DAYS))
      .flatMap((p) => Object.values(p.contracts).map((c) => offlineKey(c.type, c.content)))
      .filter(Boolean)
  );
  const merchantRows = recent.flatMap((p) =>
    Object.values(p.contracts).flatMap((c) =>
      c.type === 'merchant' && c.status === 'done' && c.result
        ? [{ date: p.date, keys: c.content.steps.map((s) => merchantStepKey(s)), score: Number(c.result.score) || 0, max: Number(c.result.max) || 0 }]
        : [],
    ),
  );
  const merchantSplit = merchantStepsForDay(merchantRows, ctx.date);
  const avoidMerchantSteps = merchantSplit.avoid;

  // O 5º contrato alterna por paridade do dia: segundo Comerciante ou segunda Carta com outro tema
  const fifth: DaySpec = dayIndex % 2 === 0 ? { id: 'c5', type: 'merchant', theme: secondTheme } : { id: 'c5', type: 'letter', theme: secondTheme, genre: genre2 };
  const specs: DaySpec[] = [
    { id: 'c1', type: 'note', theme: mainTheme },
    { id: 'c2', type: 'merchant', theme: mainTheme },
    { id: 'c3', type: 'letter', theme: mainTheme, genre: genre1 },
    { id: 'c4', type: 'forge', theme: mainTheme },
    fifth,
  ];
  return {
    level: lv.level,
    letterTier: letterLevelOf(ctx.base, lv.level),
    unitId: currentUnit(ctx.base, ctx.date).id,
    dayInUnit: dayInUnit(currentUnit(ctx.base, ctx.date), ctx.date),
    daySeed,
    specs,
    vocabKnown,
    avoidNames,
    forgeTarget,
    retryItems: yesterdayMistakes(recent, ctx.date, forgeItemMixFor(lv.level, forgeTarget.kind)),
    avoidOffline,
    merchantDone: ctx.base.merchantDone,
    merchantLevel: nextMerchantLevel({
      stored: ctx.base.merchantLevel,
      ceiling: lv.level,
      done: ctx.base.merchantDone,
      perfect: ctx.base.merchantPerfect,
      weakStreak: ctx.base.merchantWeakStreak ?? 0,
      halfOrLess: false,
    }).level,
    avoidMerchantSteps,
    preferMerchantSteps: merchantSplit.due,
    themeRequest: null,
  };
}

interface GeneratedFull {
  contract: Contract;
  source: GeneratedSource;
  problems: string[];
}

async function generateFor(spec: DaySpec, input: GenerateInput, target: ForgeTarget, version: number): Promise<GeneratedFull> {
  const base = {
    id: spec.id,
    level: input.level,
    material: CONTRACT_MATERIAL[spec.type],
    theme: spec.theme,
    version,
    status: 'open' as const,
    result: null,
    retryUsed: false,
  };
  switch (spec.type) {
    case 'merchant': {
      const g = await generateMerchant(input);
      return { contract: { ...base, type: 'merchant', title: 'Entrega do comerciante', content: g.content }, source: g.source, problems: g.problems };
    }
    case 'letter': {
      const g = await generateLetter(input);
      return { contract: { ...base, type: 'letter', title: g.content.title || 'Carta', content: g.content }, source: g.source, problems: g.problems };
    }
    case 'note': {
      const g = await generateNote(input);
      return { contract: { ...base, type: 'note', title: 'Recado do dia', content: g.content }, source: g.source, problems: g.problems };
    }
    case 'forge': {
      const g = await generateForge(input);
      // O rótulo "Ferraria" já aparece acima do título no quadro, na casca e no resultado
      return { contract: { ...base, type: 'forge', title: g.content.target || target.label, content: g.content }, source: g.source, problems: g.problems };
    }
  }
}

function levelOfContract(day: DayContext, spec: DaySpec): number {
  if (spec.type === 'merchant') return day.merchantLevel;
  if (spec.type === 'letter') return day.letterTier;
  return unitById(day.unitId).level;
}

function inputFor(day: DayContext, spec: DaySpec, date: string, seed: number, extra: Partial<GenerateInput> = {}): GenerateInput {
  return {
    level: levelOfContract(day, spec),
    theme: spec.theme,
    date,
    seed,
    vocabKnown: day.vocabKnown,
    avoidNames: day.avoidNames,
    themeRequest: day.themeRequest,
    genre: spec.genre,
    letterTier: day.letterTier,
    unitId: day.unitId,
    dayInUnit: day.dayInUnit,
    avoidOffline: day.avoidOffline,
    merchantDone: day.merchantDone,
    avoidMerchantSteps: day.avoidMerchantSteps,
    preferMerchantSteps: day.preferMerchantSteps,
    ...extra,
  };
}

const planSource = (sources: GeneratedSource[]): DailyPlan['source'] => {
  if (sources.every((s) => s === 'ai')) return 'ai';
  if (sources.every((s) => s === 'offline')) return 'offline';
  return 'mixed';
};

/**
 * Os 5 contratos do dia. Recado, Comerciante, Carta e o 5º saem em paralelo; a Ferraria
 * parte assim que a Carta chega, porque recebe os nomes e itens dela (continuidade).
 * Cada contrato pronto dispara onProgress/onContract. Lança só pelo teto mensal.
 */
export async function buildDailyContracts(ctx: BuildContext): Promise<BuiltPlan> {
  const running = getAppVersion();
  const latest = await readPublishedVersion();
  const dev = Boolean(import.meta.env.DEV);
  const block = generationBlock({ running, latest, dev, uid: ctx.uid, hostname: guardHost() });
  if (block) {
    console.warn('plano: esta aba não gera', { running, latest, dev, uid: ctx.uid, block });
    if (block === 'version') requestVersionReload(latest, running);
    throw new Error(refuseMessage(block));
  }
  await assertAiBudget();
  const day = dayContextFor(ctx);
  const total = day.specs.length;
  let ready = 0;
  const contracts: Record<string, Contract> = {};
  const sources: GeneratedSource[] = [];

  const run = async (spec: DaySpec, extra: Partial<GenerateInput> = {}): Promise<Contract> => {
    const seed = mixSeed(day.daySeed, spec.id);
    let g: GeneratedFull;
    try {
      g = await generateFor(spec, inputFor(day, spec, ctx.date, seed, extra), day.forgeTarget, 1);
    } catch (error) {
      // generateFor cai na reserva sozinho; isto cobre uma falha inesperada (ex.: banco malformado)
      console.warn(`englishAi: falha inesperada no contrato ${spec.id}`, error);
      g = await generateFor(spec, inputFor(day, spec, ctx.date, seed, { ...extra, avoidOffline: [] }), day.forgeTarget, 1);
    }
    if (g.problems.length) console.info(`englishAi: ${ctx.date} ${spec.id} (${g.source})`, g.problems);
    contracts[g.contract.id] = g.contract;
    sources.push(g.source);
    ready++;
    ctx.onProgress?.(ready, total);
    ctx.onContract?.(g.contract);
    return g.contract;
  };

  const letterSpec = day.specs.find((s) => s.id === 'c3') as DaySpec;
  const forgeSpec = day.specs.find((s) => s.id === 'c4') as DaySpec;
  const forgeExtra: Partial<GenerateInput> = { forgeTarget: day.forgeTarget.id, retryItems: day.retryItems };
  const letterTask = run(letterSpec);
  const forgeTask = letterTask.then(
    (letter) => run(forgeSpec, { ...forgeExtra, letterContext: letterContextOf(letter) }),
    () => run(forgeSpec, forgeExtra)
  );
  const otherTasks = day.specs.filter((s) => s.id !== 'c3' && s.id !== 'c4').map((s) => run(s));
  await Promise.all([letterTask, forgeTask, ...otherTasks]);
  return { order: day.specs.map((s) => s.id), contracts, source: planSource(sources), themeRequest: day.themeRequest };
}

/**
 * Regenera um contrato do plano (painel): mesmo tipo e tema, semente nova pela versão,
 * gênero diferente na Carta; a Ferraria recebe a Carta atual do plano. Não checa o teto
 * (quem chama checa com assertAiBudget).
 */
export async function regenerateSingle(
  ctx: Pick<BuildContext, 'uid' | 'date' | 'level' | 'base' | 'recentPlans'>,
  plan: DailyPlan,
  contractId: string
): Promise<GeneratedFull> {
  const old = plan.contracts[contractId];
  if (!old) throw new Error('Contrato não encontrado no plano.');
  const day = dayContextFor(ctx);
  const version = old.version + 1;
  const seed = mixSeed(day.daySeed, `${contractId}|v${version}`);
  const spec: DaySpec = { id: contractId, type: old.type, theme: old.theme };
  if (old.type === 'letter') {
    const others = LETTER_GENRES.filter((g) => g !== old.content.genre);
    spec.genre = pickOne(createRng(seed), others);
  }
  const letter = Object.values(plan.contracts).find((c) => c.type === 'letter') ?? null;
  const extra: Partial<GenerateInput> =
    old.type === 'forge' ? { forgeTarget: day.forgeTarget.id, retryItems: day.retryItems, letterContext: letterContextOf(letter) } : {};
  return generateFor(spec, inputFor(day, spec, ctx.date, seed, extra), day.forgeTarget, version);
}
