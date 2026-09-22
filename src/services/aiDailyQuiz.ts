// ========================================
// Quiz Diário: geração da prova de um dia (ideia do dia + perguntas + reflexão)
// Roda com antecedência (em segundo plano ou pelo painel), nunca na hora de abrir.
// ========================================

import { DailyQuizQuestion, DailyQuizSanitize, DailyQuizTheme } from '../types';
import { callOpenAI, isAIConfigured, loadOfflineQuestions, sanitizeQuestions } from './aiQuiz';
import { childAgeToday } from '../config/rules';
import { QuizThemeSeed } from '../config/quizCurriculum';
import { weekdayOf } from '../utils/clock';
import { DAILY_QUIZ_MODEL, normalizeQuizText, reflectionLocalSay, touchesIdea, REFLECT_OFFTOPIC } from './quiz/provaRules';
import { buildPrompt, replacementBrief } from './quiz/dailyPrompt';
import { QUIZ_SPARE, QUIZ_VALIDATOR_ENFORCE, quizMaxTokens } from './quiz/quizTokens';
import { applyReview, parseReview, rescueDilemma, REVIEWER_MODEL, reviewBatch, reviewSystem, type QuizDuvida, type ReviewItem } from './quiz/reviewer';
import {
  canonSubject,
  fillSlotHoles,
  hashOf,
  placeIntoSlots,
  quizSlots,
  selectValidQuestions,
  SUBJECTS,
  type QuizSlot,
  type RawQuestion,
} from './quiz/validateQuestion';

export { buildPrompt } from './quiz/dailyPrompt';

export interface GeneratedDailyQuiz {
  theme: DailyQuizTheme;
  questions: DailyQuizQuestion[];
  reflectionPrompt: string;
  source: 'ai' | 'offline';
  sanitize?: DailyQuizSanitize;
  /** Saída crua da IA, para calibrar o validador. */
  raw?: unknown;
}

const LESSON_QUESTIONS = 3;

function toDaily(q: RawQuestion): DailyQuizQuestion {
  const kind =
    q.kind === 'dilemma' || q.skill === 'LIC.DILEMA'
      ? 'dilemma'
      : q.skill === 'LIC.IDEIA' || q.skill === 'LIC.APLICA' || q.kind === 'lesson'
        ? 'lesson'
        : 'knowledge';
  const explanation =
    typeof q.explanation === 'string' && q.explanation.trim()
      ? q.explanation.trim()
      : typeof q.why === 'string'
        ? q.why.trim()
        : '';
  return {
    question: String(q.question ?? '').trim(),
    options: (q.options ?? []).map((o) => String(o)),
    answer: String(q.answer ?? ''),
    explanation,
    kind,
    subject: typeof q.subject === 'string' && q.subject.trim() ? q.subject : kind === 'lesson' ? 'tema' : 'geral',
    ...(q.why ? { why: q.why } : {}),
    ...(q.trap ? { trap: q.trap } : {}),
    ...(q.skill ? { skill: q.skill } : {}),
    ...(q.bloom ? { bloom: q.bloom } : {}),
    ...(q.audioText ? { audioText: q.audioText } : {}),
    ...(q.scenario === 'futebol' ? { scenario: 'futebol' } : {}),
  };
}

function coerceQuestions(raw: unknown, count: number, avoid: string[]): DailyQuizQuestion[] {
  const base = sanitizeQuestions(raw, avoid);
  const rawArr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return base.slice(0, count).map((q, i) => {
    const match = rawArr.find((r) => typeof r.question === 'string' && r.question.trim() === q.question);
    const kind = match?.kind === 'lesson' || (!match && i < LESSON_QUESTIONS) ? 'lesson' : 'knowledge';
    const subject = typeof match?.subject === 'string' ? match.subject : kind === 'lesson' ? 'tema do dia' : 'geral';
    return { ...q, kind, subject };
  });
}

function themeFrom(parsed: Record<string, unknown>, seed: QuizThemeSeed): DailyQuizTheme | null {
  const themeRaw = (parsed.theme ?? {}) as Record<string, unknown>;
  const lesson = typeof themeRaw.lesson === 'string' ? themeRaw.lesson.trim() : '';
  if (!lesson) return null;
  const curiosity = typeof themeRaw.curiosity === 'string' ? themeRaw.curiosity.trim() : '';
  return {
    id: seed.id,
    category: seed.category,
    title: typeof themeRaw.title === 'string' && themeRaw.title.trim() ? themeRaw.title.trim() : seed.title,
    lesson,
    whyItMatters: typeof themeRaw.whyItMatters === 'string' ? themeRaw.whyItMatters.trim() : '',
    ...(curiosity ? { curiosity } : {}),
  };
}

const REFLECTION_FALLBACK = 'O que você aprendeu hoje que pode usar amanhã?';

function reflectionOf(parsed: Record<string, unknown>): string {
  return typeof parsed.reflectionPrompt === 'string' && parsed.reflectionPrompt.trim()
    ? parsed.reflectionPrompt.trim()
    : REFLECTION_FALLBACK;
}

async function reviewApproved(questions: RawQuestion[], level: number, signal?: AbortSignal): Promise<ReviewItem[] | null> {
  if (questions.length === 0) return [];
  const user = questions
    .map((q, i) =>
      JSON.stringify({
        n: i + 1,
        question: q.question,
        options: q.options,
        answer: q.answer,
        why: q.why,
        subject: q.subject,
        skill: q.skill,
      }),
    )
    .join('\n');
  try {
    const raw = await callOpenAI(reviewSystem(level), user, 900, {
      signal,
      model: REVIEWER_MODEL,
      temperature: 0,
      timeoutMs: 45000,
    });
    return parseReview(raw);
  } catch (error) {
    console.warn('aiDailyQuiz: revisor sem resposta, vale o validador local', error);
    return null;
  }
}

function bumpDropped(into: Record<string, number>, from: Record<string, number>) {
  for (const [code, n] of Object.entries(from)) into[code] = (into[code] ?? 0) + n;
}

function discardLines(
  list: RawQuestion[],
  perQuestion: { i: number; codes: string[] }[],
  motivos: { n: number; motivo: string; question: string }[],
): string[] {
  const lines = perQuestion
    .filter((row) => row.codes.length > 0)
    .map((row) => `${row.codes.join('+')} — ${String(list[row.i]?.question ?? '').slice(0, 140)}`);
  for (const m of motivos) lines.push(`revisor: ${m.motivo} — ${m.question.slice(0, 140)}`);
  return lines;
}

async function loadOfflineCandidates(avoid: string[]): Promise<RawQuestion[]> {
  try {
    const response = await fetch('/data/quizData.json');
    if (!response.ok) return [];
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return [];
    const skip = new Set(avoid.map((q) => normalizeQuizText(q)));
    const out: RawQuestion[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const question = typeof row.question === 'string' ? row.question.trim() : '';
      const answer = typeof row.answer === 'string' ? row.answer.trim() : '';
      const explanation = typeof row.explanation === 'string' ? row.explanation.trim() : '';
      const options = Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === 'string') : [];
      if (!question || !answer || options.length !== 4 || skip.has(normalizeQuizText(question))) continue;
      const mapped = canonSubject(typeof row.category === 'string' ? row.category : '');
      const subject = SUBJECTS.has(mapped) ? mapped : 'tema';
      out.push({
        question,
        options,
        answer,
        explanation,
        why: explanation,
        trap: explanation,
        subject,
        kind: 'knowledge',
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function callQuiz(
  system: string,
  user: string,
  tokens: number,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const parsed = (await callOpenAI(system, user, tokens, {
    signal,
    model: DAILY_QUIZ_MODEL,
    temperature: 0.2,
    timeoutMs: 100000,
  })) as Record<string, unknown> | null;
  return parsed && typeof parsed === 'object' ? parsed : null;
}

export async function generateDailyQuiz(opts: {
  seed: QuizThemeSeed;
  count: number;
  avoidQuestions: string[];
  date: string;
  signal?: AbortSignal;
  forceOffline?: boolean;
  englishLevel?: number;
}): Promise<GeneratedDailyQuiz> {
  const age = childAgeToday();
  const weekday = weekdayOf(opts.date);
  const englishLevel = opts.englishLevel ?? 1;
  const avoidHashes = opts.avoidQuestions.map(hashOf);
  const ctx = {
    englishLevel,
    avoidHashes: new Set(avoidHashes),
  };

  const offlineQuiz = async (sanitize?: DailyQuizSanitize): Promise<GeneratedDailyQuiz> => {
    const offline = await loadOfflineQuestions(opts.count, opts.avoidQuestions);
    const questions = coerceQuestions(
      offline.map((q) => ({ ...q, kind: 'knowledge', subject: 'geral' })),
      opts.count,
      opts.avoidQuestions,
    );
    return {
      theme: {
        id: opts.seed.id,
        category: opts.seed.category,
        title: opts.seed.title,
        lesson: opts.seed.seed,
        whyItMatters: 'Pensar sobre isso hoje já é um passo.',
      },
      questions,
      reflectionPrompt: REFLECTION_FALLBACK,
      source: 'offline',
      sanitize: sanitize ?? { kept: questions.length, dropped: {} },
    };
  };

  if (opts.forceOffline || !isAIConfigured()) return offlineQuiz();

  const system = buildPrompt({
    seed: opts.seed,
    count: opts.count,
    spare: QUIZ_SPARE,
    age,
    weekday,
    englishLevel,
    avoidHashes,
  });
  const asked = opts.count + QUIZ_SPARE;
  const recent = opts.avoidQuestions.slice(0, 60);
  const avoidText = recent.length
    ? `Perguntas já usadas (não repita nem parafraseie):\n- ${recent.join('\n- ')}`
    : 'Primeira prova: capriche.';
  const userOrder = `${avoidText}

O array questions tem exatamente ${asked} objetos, nesta ordem, nem mais nem menos:
1) LIC.IDEIA — a causa ou o fato da ideia, uma só resposta certa. Não pergunte "ainda é o mesmo?" nem "depende".
2) LIC.APLICA — a ideia num caso concreto. Não pergunte o que ele faria.
3) LIC.DILEMA — kind "dilemma", subject "tema". A pergunta termina em "Qual atitude é a mais justa?".
Cada opção tem de 3 a 5 palavras, e a certa não pode ser a única mais longa: se ela tem uma palavra a mais que as outras, a pergunta morre. Uma opção de 1 palavra mata a pergunta. Proibido ignorar, ignoro, fingir, finjo, criticar, critico, sair do jogo.
Matemática copia a forma da abelha: duas contas, os números escritos na pergunta. 500 g e 2 kg não fecham.
A vaga de futebol traz scenario "futebol" e ensina outra matéria. Proibido "qual é a função" e "o que acontece se".
Inglês traz audioText com a frase certa, bicho e lugar novos.
why e trap em português. O why e o trap precisam ter 16 palavras ou mais: um trap de 10 palavras mata a pergunta. O trap começa com "Quem marca", copia uma opção errada e continua até passar de 16. Modelo de trap: "Quem marca 75 parou na multiplicação dos cinco dias e esqueceu de tirar os livros que voltaram para a loja."
Conte os objetos antes de responder.`;

  let first: Record<string, unknown> | null = null;
  try {
    first = await callQuiz(system, userOrder, quizMaxTokens(opts.count, QUIZ_SPARE), opts.signal);
  } catch (error) {
    console.warn('aiDailyQuiz: falha na IA, usando offline', error);
    return offlineQuiz();
  }
  const theme = first ? themeFrom(first, opts.seed) : null;
  if (!first || !theme) return offlineQuiz();

  const dropped: Record<string, number> = {};
  const perQuestion: { i: number; codes: string[] }[] = [];
  const local = selectValidQuestions(first.questions, { ...ctx, lesson: theme.lesson }, QUIZ_VALIDATOR_ENFORCE);
  bumpDropped(dropped, local.dropped);
  perQuestion.push(...local.perQuestion);
  const review = rescueDilemma(local.kept, await reviewApproved(local.kept, englishLevel, opts.signal));
  const judged = applyReview(local.kept, review);
  const pool = judged.kept;
  const motivos = [...judged.motivos];
  const duvidas: QuizDuvida[] = [...judged.duvidas];
  const reviewLog: ReviewItem[] = review ?? [];
  let reviewFellBack = review === null;

  const slots = quizSlots(opts.count, weekday);
  let seated = placeIntoSlots(pool, slots);
  let replacement: Record<string, unknown> | null = null;
  if (seated.missing.length > 0) {
    const holes = seated.missing;
    const firstList = Array.isArray(first.questions) ? (first.questions as RawQuestion[]) : [];
    const reasons = discardLines(firstList, local.perQuestion, motivos);
    const fallen = local.perQuestion
      .filter((row) => row.codes.some((code) => code !== 'conta_nao_fecha'))
      .map((row) => String(firstList[row.i]?.question ?? '').trim())
      .filter(Boolean);
    const approved = pool.map((q) => String(q.question ?? '')).filter(Boolean);
    const user = `${replacementBrief(holes)}
Ideia do dia, já escrita. LIC.IDEIA e LIC.APLICA precisam usar uma palavra dela:
${theme.lesson}
Cada objeto traz subject, skill, kind, bloom, answer igual a uma option, why com 16 palavras em português e trap com 16 palavras ou mais. Trap curto mata a pergunta. O trap começa com "Quem marca" seguido do texto exato de uma opção errada. A opção certa não pode ser a única mais longa. Matemática em duas etapas, com os dois números na pergunta (500 g e 2 kg não fecham: escreva 500 g e 2000 g). Inglês: why em português, frase de no máximo 7 palavras. A ideia não começa com "O que é". O dilema pergunta "Qual atitude é a mais justa?", com subject "tema". Só uma opção ajuda; as outras três são omissão ou desculpa, sem "peço ajuda ao adulto".
Não devolva de novo uma pergunta que já caiu. Escreva outro enunciado.
Caíram por isto:
${reasons.slice(0, 24).join('\n') || 'o validador recusou o lote'}
Proibido repetir:
${[...fallen, ...approved, ...opts.avoidQuestions.slice(0, 30)].map((q) => `- ${q}`).join('\n')}`;
    try {
      replacement = await callQuiz(
        buildPrompt({
          seed: opts.seed,
          count: holes.length,
          spare: 0,
          age,
          weekday,
          englishLevel,
          avoidHashes,
          slots: holes,
        }),
        user,
        quizMaxTokens(holes.length, 0),
        opts.signal,
      );
    } catch (error) {
      console.warn('aiDailyQuiz: substituição falhou', error);
    }
    if (replacement) {
      const avoid = new Set(ctx.avoidHashes);
      for (const q of pool) avoid.add(hashOf(String(q.question ?? '')));
      const extra = selectValidQuestions(
        replacement.questions,
        { ...ctx, avoidHashes: avoid, lesson: theme.lesson },
        QUIZ_VALIDATOR_ENFORCE,
      );
      const offset = perQuestion.length;
      bumpDropped(dropped, extra.dropped);
      for (const row of extra.perQuestion) perQuestion.push({ i: row.i + offset, codes: row.codes });
      const extraReview = rescueDilemma(extra.kept, await reviewApproved(extra.kept, englishLevel, opts.signal));
      const extraJudged = applyReview(extra.kept, extraReview);
      seated = fillSlotHoles(seated.placed, slots, extraJudged.kept);
      motivos.push(...extraJudged.motivos);
      duvidas.push(...extraJudged.duvidas);
      if (extraReview) reviewLog.push(...extraReview);
      else reviewFellBack = true;
    }
  }

  let fromOffline = 0;
  if (seated.missing.some((slot) => slot.kind === 'knowledge')) {
    const seatedNow = seated.placed.filter((q): q is RawQuestion => q != null);
    const candidates = await loadOfflineCandidates([
      ...opts.avoidQuestions,
      ...seatedNow.map((q) => String(q.question ?? '')),
    ]);
    const passed = selectValidQuestions(candidates, ctx, true);
    const before = seatedNow.length;
    seated = fillSlotHoles(seated.placed, slots, passed.kept);
    fromOffline = seated.placed.filter((q) => q != null).length - before;
  }

  const ordered = seated.placed.filter((q): q is RawQuestion => q != null);
  if (ordered.length === 0) return offlineQuiz({ kept: 0, dropped, perQuestion, duvidas: [] });

  const questions = ordered.map((q) => toDaily(q));
  const published = new Set(questions.map((q) => q.question));
  const duvidasOut = duvidas.filter((item) => published.has(item.question));
  const aiKept = questions.length - fromOffline;
  return {
    theme,
    questions,
    reflectionPrompt: reflectionOf(first),
    source: aiKept > 0 ? 'ai' : 'offline',
    sanitize: {
      kept: questions.length,
      dropped,
      perQuestion,
      ...(reviewLog.length ? { review: reviewLog } : {}),
      ...(reviewFellBack ? { reviewFellBack: true } : {}),
      batchLog: reviewBatch(ordered, theme.lesson),
      fromOffline,
      duvidas: duvidasOut,
    },
    raw: {
      first,
      ...(replacement ? { replacement } : {}),
      slots: slots.map((slot: QuizSlot) => ({
        index: slot.index,
        skill: slot.skill,
        kind: slot.kind,
        area: slot.area,
        ...(slot.scenario ? { scenario: slot.scenario } : {}),
      })),
    },
  };
}

export interface ReflectionJudge {
  ok: boolean;
  say: string;
  source: 'local' | 'ai';
}

const JUDGE_TIMEOUT_MS = 18_000;
const REFLECT_WAIT = 'O Sábio não leu desta vez. Entrega de novo daqui a um instante.';

function clipSage(say: string): string {
  const clean = say.replace(/\s+/g, ' ').trim();
  if (clean.length <= 160) return clean;
  const slice = clean.slice(0, 160);
  const sp = slice.lastIndexOf(' ');
  return (sp > 40 ? slice.slice(0, sp) : slice).trim();
}

/**
 * A prova só conta depois desta leitura: lixo cai na hora; a IA diz se a frase
 * responde a pergunta da ideia do dia. Sem IA, o filtro local basta.
 */
export async function judgeReflection(input: {
  text: string;
  prompt: string;
  title: string;
  lesson: string;
  forceOffline?: boolean;
}): Promise<ReflectionJudge> {
  const about = { prompt: input.prompt, title: input.title, lesson: input.lesson };
  const localSay = reflectionLocalSay(input.text, about);
  if (localSay) return { ok: false, say: localSay, source: 'local' };
  const localOk = (): ReflectionJudge => {
    if (!touchesIdea(input.text, about)) return { ok: false, say: REFLECT_OFFTOPIC, source: 'local' };
    return { ok: true, say: 'O Sábio leu. A Mina abre.', source: 'local' };
  };
  if (input.forceOffline || !isAIConfigured()) return localOk();

  const lesson = input.lesson.replace(/\s+/g, ' ').trim().slice(0, 400);
  const system = `Você é o Sábio da Vila. Lê a reflexão de um menino de 10 anos (5º ano) sobre a ideia do dia.

Aceita (ok=true) se ele responde a pergunta com as próprias palavras e fala da ideia ou de como usar isso hoje (escola, casa, futebol, amigos). Tem que ter um pensamento dele.

Recusa (ok=false) se for teclado, palavras soltas, recado vazio ("foi legal", "não sei"), cópia da pergunta ou da ideia, ou se não tem a ver com o tema.

Voz: uma frase de jogo, sem ouro, sem pontos, sem o nome dele, sem "Salvar". Se recusou, diz o que falta. Se aceitou, diz só que leu.

Responda SOMENTE JSON: {"ok": true ou false, "say": "frase curta"}`;
  const user = `Ideia: ${input.title}\n${lesson}\n\nPergunta: ${input.prompt}\n\nEle escreveu: ${input.text.trim()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);
  try {
    const raw = await callOpenAI(system, user, 180, {
      signal: controller.signal,
      temperature: 0.2,
    });
    const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    if (!rec || typeof rec.ok !== 'boolean') return localOk();
    const say = clipSage(typeof rec.say === 'string' ? rec.say : rec.ok ? 'O Sábio leu. A Mina abre.' : REFLECT_WAIT);
    return { ok: rec.ok, say, source: 'ai' };
  } catch (e) {
    console.warn('judgeReflection: IA falhou, filtro local vale', e);
    return localOk();
  } finally {
    clearTimeout(timer);
  }
}
