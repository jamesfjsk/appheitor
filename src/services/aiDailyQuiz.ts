// ========================================
// Quiz Diário: geração da prova de um dia (ideia do dia + perguntas + reflexão)
// Roda com antecedência (em segundo plano ou pelo painel), nunca na hora de abrir.
// ========================================

import { DailyQuizQuestion, DailyQuizTheme } from '../types';
import { callOpenAI, isAIConfigured, loadOfflineQuestions, sanitizeQuestions } from './aiQuiz';
import { childAgeToday } from '../config/rules';
import { QuizThemeSeed } from '../config/quizCurriculum';
import { weekdayOf } from '../utils/clock';
import { DAILY_QUIZ_MODEL } from './quiz/provaRules';
import { buildPrompt } from './quiz/dailyPrompt';

export { buildPrompt } from './quiz/dailyPrompt';

export interface GeneratedDailyQuiz {
  theme: DailyQuizTheme;
  questions: DailyQuizQuestion[];
  reflectionPrompt: string;
  source: 'ai' | 'offline';
}

const LESSON_QUESTIONS = 3;

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

async function askAi(
  seed: QuizThemeSeed,
  count: number,
  age: number,
  weekday: number,
  avoid: string[],
  signal?: AbortSignal,
): Promise<{ theme: DailyQuizTheme; questions: DailyQuizQuestion[]; reflectionPrompt: string } | null> {
  const system = buildPrompt(seed, count, age, weekday);
  const recent = avoid.slice(0, 60);
  const avoidText = recent.length
    ? `Perguntas já usadas (não repita nem parafraseie):\n- ${recent.join('\n- ')}`
    : 'Primeira prova: capriche.';
  const parsed = (await callOpenAI(system, avoidText, 260 * count + 1100, {
    signal,
    model: DAILY_QUIZ_MODEL,
    temperature: 0.7,
  })) as Record<string, unknown>;
  const theme = themeFrom(parsed, seed);
  const questions = coerceQuestions(parsed.questions, count, avoid);
  if (!theme || questions.length < Math.min(count, 5)) return null;
  return {
    theme,
    questions,
    reflectionPrompt:
      typeof parsed.reflectionPrompt === 'string' && parsed.reflectionPrompt.trim()
        ? parsed.reflectionPrompt.trim()
        : 'O que você aprendeu hoje que pode usar amanhã?',
  };
}

export async function generateDailyQuiz(opts: {
  seed: QuizThemeSeed;
  count: number;
  avoidQuestions: string[];
  date: string;
  signal?: AbortSignal;
  forceOffline?: boolean;
}): Promise<GeneratedDailyQuiz> {
  const age = childAgeToday();
  const weekday = weekdayOf(opts.date);
  if (!opts.forceOffline && isAIConfigured()) {
    try {
      let got = await askAi(opts.seed, opts.count, age, weekday, opts.avoidQuestions, opts.signal);
      if (!got || got.questions.length < 5) {
        const extraAvoid = [...opts.avoidQuestions, ...(got?.questions.map((q) => q.question) ?? [])];
        const again = await askAi(opts.seed, opts.count, age, weekday, extraAvoid, opts.signal);
        if (again && again.questions.length >= 5) got = again;
      }
      if (got && got.questions.length >= 5) {
        return { ...got, source: 'ai' };
      }
      console.warn('aiDailyQuiz: resposta incompleta da IA, usando offline', { n: got?.questions.length ?? 0 });
    } catch (error) {
      console.warn('aiDailyQuiz: falha na IA, usando offline', error);
    }
  }

  const offline = await loadOfflineQuestions(opts.count, opts.avoidQuestions);
  return {
    theme: {
      id: opts.seed.id,
      category: opts.seed.category,
      title: opts.seed.title,
      lesson: opts.seed.seed,
      whyItMatters: 'Pensar sobre isso hoje já é um passo.',
    },
    questions: offline.map((q) => ({ ...q, kind: 'knowledge' as const, subject: 'geral' })),
    reflectionPrompt: 'O que você aprendeu hoje que pode usar amanhã?',
    source: 'offline',
  };
}
