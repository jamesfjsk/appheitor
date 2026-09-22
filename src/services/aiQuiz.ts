// ========================================
// Geração de perguntas de quiz com IA (OpenAI)
// Um lugar só para: prompt, modelo, timeout, validação, embaralhamento,
// cache diário e fallback offline. Usado pelo Quiz do Dia e pela Missão Surpresa.
// ========================================

import { SurpriseMissionQuestion } from '../types';
import { childAgeToday } from '../config/rules';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { answerLeaksInPrompt, optionsCollide } from './quiz/provaRules';

export type QuizTheme = 'daily' | 'english' | 'math' | 'general' | 'mixed';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface GenerateQuizOptions {
  count: number;
  theme: QuizTheme;
  difficulty: QuizDifficulty;
  /** Perguntas recentes para a IA não repetir */
  avoid?: string[];
  signal?: AbortSignal;
}

export type QuizSource = 'ai' | 'offline';

export interface GeneratedQuiz {
  questions: SurpriseMissionQuestion[];
  source: QuizSource;
}

const MODEL = 'gpt-4o-mini';
const BATCH_SIZE = 15;
const HISTORY_LIMIT = 60;

export const isAIConfigured = (): boolean => true;

const THEME_TEXT: Record<QuizTheme, string> = {
  daily:
    'mistura equilibrada: inglês contextual, animais e natureza, matemática e lógica, ciências, pensamento crítico, história e geografia, tecnologia, enigmas',
  english: 'inglês: vocabulário, gramática básica, frases do dia a dia, animais, cores, números, família, comida, objetos',
  math: 'matemática: adição, subtração, multiplicação, divisão, formas geométricas, frações simples, problemas práticos e lógica',
  general: 'conhecimentos gerais: ciências, geografia do Brasil, história, animais, corpo humano, planetas, curiosidades',
  mixed: 'mistura equilibrada de inglês, matemática e lógica, ciências, geografia, história e conhecimentos gerais',
};

const DIFFICULTY_TEXT: Record<QuizDifficulty, string> = {
  easy: 'fácil: direto ao ponto, sem pegadinhas',
  medium: 'médio: exige um pouco de raciocínio, mas adequado à idade',
  hard: 'difícil: raciocínio em mais de uma etapa, distratores plausíveis, ainda adequado à idade',
};

function buildSystemPrompt(theme: QuizTheme, difficulty: QuizDifficulty, count: number, age: number): string {
  return `Você cria perguntas de múltipla escolha, em português do Brasil, para uma criança de ${age} anos que gosta de futebol, lógica e ciências.

Tema: ${THEME_TEXT[theme]}.
Dificuldade: ${DIFFICULTY_TEXT[difficulty]}.
Quantidade: exatamente ${count} perguntas, todas diferentes entre si e variadas dentro do tema.

Regras:
- 4 alternativas por pergunta, apenas 1 correta; "answer" deve ser IGUAL a uma das alternativas.
- Distratores plausíveis, sem alternativas absurdas.
- Linguagem clara e respeitosa, sem infantilizar; sem temas sensíveis ou assustadores.
- Explicação curta (1 a 2 frases) que ensine algo.
- Sem numeração nas perguntas.
- Responda SOMENTE com JSON no formato: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":"...","explanation":"..."}]}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Mantém só perguntas bem formadas, remove duplicadas e embaralha as alternativas */
export function sanitizeQuestions(raw: unknown, avoid: string[] = []): SurpriseMissionQuestion[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(avoid.map(normalize));
  const out: SurpriseMissionQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === 'string' ? q.question.trim() : '';
    const answer = typeof q.answer === 'string' ? q.answer.trim() : '';
    const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : '';
    const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string').map((o) => o.trim()) : [];
    const unique = Array.from(new Set(options));
    if (!question || !answer || !explanation || unique.length !== 4) continue;
    if (optionsCollide(unique)) continue;
    if (answerLeaksInPrompt(question, answer)) continue;
    if (!unique.some((o) => normalize(o) === normalize(answer))) continue;
    const key = normalize(question);
    if (seen.has(key)) continue;
    seen.add(key);
    const exact = unique.find((o) => normalize(o) === normalize(answer)) ?? answer;
    out.push({ question, options: shuffle(unique), answer: exact, explanation });
  }
  return out;
}

export interface OpenAIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CallOpenAIOptions {
  signal?: AbortSignal;
  /** Modelo diferente do padrão (gpt-4o-mini) */
  model?: string;
  temperature?: number;
  /** Teto do cliente, em ms. A function também corta do lado dela. */
  timeoutMs?: number;
  /** Devolve { json, usage } em vez do JSON puro (contabilidade de tokens) */
  withUsage?: true;
}

const isAbortSignal = (v: unknown): v is AbortSignal => typeof AbortSignal !== 'undefined' && v instanceof AbortSignal;

// Chamadores antigos passam só o AbortSignal e recebem o JSON; a Arena de Inglês passa opções e recebe { json, usage }
export function callOpenAI(system: string, user: string, maxTokens: number, opts: CallOpenAIOptions & { withUsage: true }): Promise<{ json: unknown; usage: OpenAIUsage }>;
export function callOpenAI(system: string, user: string, maxTokens: number, opts?: AbortSignal | CallOpenAIOptions): Promise<unknown>;
export async function callOpenAI(system: string, user: string, maxTokens: number, opts?: AbortSignal | CallOpenAIOptions): Promise<unknown> {
  const options: CallOpenAIOptions = isAbortSignal(opts) ? { signal: opts } : opts ?? {};
  const openai = httpsCallable(functions, 'openai', options.timeoutMs ? { timeout: options.timeoutMs } : undefined);
  const payload = {
    kind: 'chat' as const,
    model: options.model ?? MODEL,
    input: { system, user, maxTokens },
    temperature: options.temperature ?? 0.9,
    withUsage: Boolean(options.withUsage),
  };
  const result = await openai(payload);
  const data = result.data as { json?: unknown; usage?: OpenAIUsage };
  if (options.withUsage) return { json: data.json, usage: data.usage ?? { inputTokens: 0, outputTokens: 0 } };
  return data.json ?? data;
}

async function generateBatch(count: number, opts: GenerateQuizOptions, avoid: string[]): Promise<SurpriseMissionQuestion[]> {
  const age = childAgeToday();
  const system = buildSystemPrompt(opts.theme, opts.difficulty, count, age);
  const avoidText = avoid.length ? `\nNão repita nem parafraseie estas perguntas já usadas:\n- ${avoid.slice(-40).join('\n- ')}` : '';
  const user = `Gere ${count} perguntas agora.${avoidText}`;
  // ~70 tokens por pergunta, com folga
  const raw = await callOpenAI(system, user, Math.min(16_000, 120 * count + 400), opts.signal);
  const list = raw && typeof raw === 'object' && 'questions' in raw ? (raw as { questions: unknown }).questions : raw;
  return sanitizeQuestions(list, avoid);
}

/**
 * Gera perguntas com a IA em lotes paralelos, completa o que faltar com uma
 * segunda tentativa e, se nada funcionar, cai para o banco offline.
 */
export async function generateQuiz(opts: GenerateQuizOptions): Promise<GeneratedQuiz> {
  const avoid = [...(opts.avoid ?? [])];
  let questions: SurpriseMissionQuestion[] = [];

  if (isAIConfigured()) {
    try {
      const batches = Math.ceil(opts.count / BATCH_SIZE);
      const sizes = Array.from({ length: batches }, (_, i) => Math.min(BATCH_SIZE, opts.count - i * BATCH_SIZE));
      const results = await Promise.allSettled(sizes.map((n) => generateBatch(n, opts, avoid)));
      for (const r of results) if (r.status === 'fulfilled') questions.push(...r.value);
      questions = sanitizeQuestions(questions, avoid); // dedupe entre lotes

      // Completa o que faltou (uma vez)
      if (questions.length < opts.count && !opts.signal?.aborted) {
        const missing = opts.count - questions.length;
        const extra = await generateBatch(Math.min(BATCH_SIZE, missing + 2), opts, [...avoid, ...questions.map((q) => q.question)]);
        questions = sanitizeQuestions([...questions, ...extra], avoid);
      }
    } catch (error) {
      console.warn('aiQuiz: falha na IA, usando banco offline', error);
    }
  }

  if (questions.length >= Math.min(opts.count, 5)) {
    return { questions: questions.slice(0, opts.count), source: 'ai' };
  }

  const offline = await loadOfflineQuestions(opts.count, avoid);
  return { questions: offline, source: 'offline' };
}

export async function loadOfflineQuestions(count: number, avoid: string[]): Promise<SurpriseMissionQuestion[]> {
  const response = await fetch('/data/quizData.json');
  if (!response.ok) throw new Error('Banco offline de perguntas indisponível');
  const data = (await response.json()) as unknown;
  const clean = sanitizeQuestions(data, avoid);
  const pool = clean.length >= count ? clean : sanitizeQuestions(data); // se o histórico esgotou o banco, libera repetição
  return shuffle(pool).slice(0, count);
}

// ---------- Cache diário e histórico (localStorage) ----------

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export interface QuizSession {
  questions: SurpriseMissionQuestion[];
  answers: string[];
  currentQuestion: number;
  source: QuizSource;
  startedAt: string;
}

const sessionKey = (kind: string, uid: string, date: string) => `quiz:${kind}:${uid}:${date}`;
const historyKey = (kind: string, uid: string) => `quiz:history:${kind}:${uid}`;

export function loadQuizSession(kind: string, uid: string, date: string): QuizSession | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(sessionKey(kind, uid, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizSession;
    return Array.isArray(parsed.questions) && parsed.questions.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveQuizSession(kind: string, uid: string, date: string, session: QuizSession): void {
  storage()?.setItem(sessionKey(kind, uid, date), JSON.stringify(session));
}

export function clearQuizSession(kind: string, uid: string, date: string): void {
  storage()?.removeItem(sessionKey(kind, uid, date));
}

export function getQuizHistory(kind: string, uid: string): string[] {
  try {
    const raw = storage()?.getItem(historyKey(kind, uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function rememberQuizQuestions(kind: string, uid: string, questions: SurpriseMissionQuestion[]): void {
  const s = storage();
  if (!s) return;
  const merged = [...getQuizHistory(kind, uid), ...questions.map((q) => q.question)].slice(-HISTORY_LIMIT);
  s.setItem(historyKey(kind, uid), JSON.stringify(merged));
}

/** "Mais tarde" do quiz do dia: não perguntar de novo hoje */
export function snoozeQuiz(kind: string, uid: string, date: string): void {
  storage()?.setItem(`quiz:snooze:${kind}:${uid}:${date}`, '1');
}
export function isQuizSnoozed(kind: string, uid: string, date: string): boolean {
  return storage()?.getItem(`quiz:snooze:${kind}:${uid}:${date}`) === '1';
}
