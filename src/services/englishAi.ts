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
  NoteErrorTag,
} from '../types/english';
import { CONTRACT_MATERIAL, MERCHANT_CATALOGS } from '../config/englishBase';
import { FORGE_TAG_TARGETS, LETTER_GENRES, levelFor } from '../config/englishLevels';
import { buildMerchantRoom, merchantKey, merchantLevelFromSkill, merchantStepKey, offlineSentences } from './english/merchantRoom';
import { normalize } from './english/notePrecheck';
import { buildPrompt, type BuiltPrompt } from './english/prompts';
import { createRng, mixSeed, pickOne, seedFromString } from './english/shuffle';
import { validateForge, validateLetter, validateMerchant, validateNote, type MerchantValidation, type ValidationResult } from './english/validators';
import { callOpenAI, isAIConfigured } from './aiQuiz';
import { AI_MONTHLY_CALL_CAP, currentUsageMonth, getUsage, isOverCap, textCallsOf } from './aiUsage';
import { addDays } from './dailyQuizService';
import { getTodayBrazil } from '../utils/timezone';

const AI_MODEL = 'gpt-4.1-mini';
const AI_TEMPERATURE = 0.8;
const CONTRACT_TIMEOUT_MS = 30_000; // picos de lentidão da API chegaram a 30 s na calibração
/** Chamada + 1 retentativa */
const ATTEMPTS = 2;
/** Dias de planos consultados para nomes a evitar e temas recentes */
const RECENT_NAMES_DAYS = 7;
/** Planos consultados para a etiqueta mais frequente dos Recados */
const RECENT_TAG_PLANS = 5;
const TAG_MIN_COUNT = 2;
/** Reserva não repete conteúdo usado neste período */
const OFFLINE_REPEAT_DAYS = 30;
/** Lemas conhecidos que entram no prompt (os mais vistos primeiro) */
const VOCAB_PROMPT_MAX = 80;
const YESTERDAY_MISTAKES = 2;

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
  merchantDone?: number;
  avoidMerchantSteps?: string[];
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

/** Recusa gerar quando as chamadas de texto do mês passam do teto (mensagem em PT para o painel) */
export async function assertAiBudget(): Promise<void> {
  if (!isAIConfigured()) return;
  const usage = await getUsage(currentUsageMonth());
  if (usage && isOverCap(usage)) {
    throw new Error(
      `Teto mensal de IA atingido (${textCallsOf(usage)} de ${AI_MONTHLY_CALL_CAP} chamadas). A geração volta no mês que vem ou quando o teto for ampliado.`
    );
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
    brief: 'Escreva um recado para o papai. Diga que você faz a lição primeiro. Depois você joga bola.',
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
  const roomOpts = { done: input.merchantDone ?? 0, avoidSteps: [...banned] };
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

async function generateLetter(input: GenerateInput): Promise<Generated<LetterContent>> {
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

async function generateNote(input: GenerateInput): Promise<Generated<NoteContent>> {
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
    if (result) return { content: result.content, source: 'ai', problems: p };
    problems = p;
  }
  const offline = offlineFor('note', lv.level, input.seed, input.avoidOffline ?? [], (raw, level) => validateNote(raw, level));
  return { ...offline, problems: [...problems, ...offline.problems] };
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
  const lv = levelFor(input.level);
  const target = resolveForgeTarget(lv.level, input.forgeTarget, input.seed);
  let problems: string[] = [];
  if (isAIConfigured()) {
    const { result, problems: p } = await askValidated(
      (retryProblems) =>
        buildPrompt('forge', {
          level: lv.level,
          theme: themeOf(input),
          vocabKnown: input.vocabKnown,
          avoidNames: input.avoidNames,
          seed: input.seed,
          target,
          letterNames: input.letterContext?.names ?? [],
          letterItems: input.letterContext?.items ?? [],
          yesterdayMistakes: (input.retryItems ?? []).slice(0, YESTERDAY_MISTAKES),
          retryProblems,
        }),
      (raw) => validateForge(raw, lv.level, input.seed)
    );
    if (result) return { content: { ...result.content, target: result.content.target || target.label }, source: 'ai', problems: p };
    problems = p;
  }
  const offline = offlineFor('forge', lv.level, input.seed, input.avoidOffline ?? [], (raw, level) => validateForge(raw, level, input.seed));
  return { ...offline, problems: [...problems, ...offline.problems] };
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
  avoidMerchantSteps: string[];
  /** Pedido da Mesa aplicado a este dia (só para datas depois de hoje) */
  themeRequest: string | null;
}

const withinDays = (plan: DailyPlan, date: string, days: number): boolean => plan.date >= addDays(date, -days) && plan.date < date;

function contractsOf(plans: DailyPlan[], type: ContractType): Contract[] {
  return plans.flatMap((p) => p.order.map((id) => p.contracts[id]).filter((c): c is Contract => Boolean(c) && c.type === type));
}

/** Etiqueta mais frequente nos Recados dos últimos planos (>= 2 ocorrências), ou null */
function frequentTag(plans: DailyPlan[]): NoteErrorTag | null {
  const counts = new Map<NoteErrorTag, number>();
  for (const c of contractsOf(plans.slice(0, RECENT_TAG_PLANS), 'note')) {
    for (const e of c.result?.correction?.errors ?? []) counts.set(e.tag, (counts.get(e.tag) ?? 0) + 1);
  }
  let best: NoteErrorTag | null = null;
  let bestCount = 0;
  for (const [tag, n] of counts) {
    if (n > bestCount) {
      best = tag;
      bestCount = n;
    }
  }
  return bestCount >= TAG_MIN_COUNT ? best : null;
}

const isForgeItem = (v: unknown): v is ForgeItem => isRecord(v) && (v.kind === 'scramble' || v.kind === 'gap' || v.kind === 'typed');

/** Itens errados na Ferraria de ontem: details.wrongItems como índices ou como os próprios itens */
function yesterdayMistakes(plans: DailyPlan[], date: string): ForgeItem[] {
  const yesterday = plans.find((p) => p.date === addDays(date, -1));
  if (!yesterday) return [];
  const forge = contractsOf([yesterday], 'forge')[0];
  if (!forge || forge.type !== 'forge' || !forge.result) return [];
  const details = forge.result.details ?? {};
  const raw = details.wrongItems ?? details.missed ?? details.wrong;
  if (!Array.isArray(raw)) return [];
  const items: ForgeItem[] = [];
  for (const entry of raw) {
    if (typeof entry === 'number' && forge.content.items[entry]) items.push(forge.content.items[entry]);
    else if (isForgeItem(entry)) items.push(entry);
  }
  return items.slice(0, YESTERDAY_MISTAKES);
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
  const playLevel = Math.max(ctx.level, merchantLevelFromSkill(ctx.base.merchantDone, ctx.base.merchantPerfect));
  const lv = levelFor(playLevel);
  const daySeed = seedFromString(`${ctx.uid}|${ctx.date}`);
  const rng = createRng(mixSeed(daySeed, 'day'));
  const recent = ctx.recentPlans.filter((p) => p.date < ctx.date).sort((a, b) => b.date.localeCompare(a.date));
  const lastWeek = recent.filter((p) => withinDays(p, ctx.date, RECENT_NAMES_DAYS));

  const recentThemes = unique(lastWeek.flatMap((p) => Object.values(p.contracts).map((c) => c.theme)));
  const themePool = lv.vocabThemes.filter((t) => !recentThemes.includes(t));
  const pool = themePool.length ? themePool : lv.vocabThemes;
  const themeRequest = ctx.base.themeRequest && ctx.date > getTodayBrazil() ? ctx.base.themeRequest : null;
  const mainTheme = themeRequest ?? pickOne(rng, pool);
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
  const tag = frequentTag(recent);
  const forgeTarget = tag ? FORGE_TAG_TARGETS[tag] : lv.forgeTargets[dayIndex % lv.forgeTargets.length];

  const vocabKnown = Object.entries(ctx.base.vocab)
    .sort((a, b) => b[1].seen - a[1].seen || a[0].localeCompare(b[0]))
    .map(([lemma]) => lemma)
    .slice(0, VOCAB_PROMPT_MAX);
  const avoidNames = unique(contractsOf(lastWeek, 'letter').map((c) => (c.type === 'letter' ? c.content.sender : '')).filter(Boolean));
  const avoidOffline = unique(
    recent
      .filter((p) => withinDays(p, ctx.date, OFFLINE_REPEAT_DAYS))
      .flatMap((p) => Object.values(p.contracts).map((c) => offlineKey(c.type, c.content)))
      .filter(Boolean)
  );
  const avoidMerchantSteps = unique(
    contractsOf(recent, 'merchant').flatMap((c) =>
      c.type === 'merchant' ? c.content.steps.map((s) => merchantStepKey(s)) : []
    )
  );

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
    daySeed,
    specs,
    vocabKnown,
    avoidNames,
    forgeTarget,
    retryItems: yesterdayMistakes(recent, ctx.date),
    avoidOffline,
    merchantDone: ctx.base.merchantDone,
    avoidMerchantSteps,
    themeRequest,
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
      return { contract: { ...base, type: 'forge', title: target.label, content: g.content }, source: g.source, problems: g.problems };
    }
  }
}

function inputFor(day: DayContext, spec: DaySpec, date: string, seed: number, extra: Partial<GenerateInput> = {}): GenerateInput {
  return {
    level: day.level,
    theme: spec.theme,
    date,
    seed,
    vocabKnown: day.vocabKnown,
    avoidNames: day.avoidNames,
    themeRequest: day.themeRequest,
    genre: spec.genre,
    avoidOffline: day.avoidOffline,
    merchantDone: day.merchantDone,
    avoidMerchantSteps: day.avoidMerchantSteps,
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
