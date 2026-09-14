// ========================================
// Quiz Diário: geração da prova de um dia (ideia do dia + perguntas + reflexão)
// Roda com antecedência (em segundo plano ou pelo painel), nunca na hora de abrir.
// ========================================

import { DailyQuizQuestion, DailyQuizTheme } from '../types';
import { callOpenAI, isAIConfigured, loadOfflineQuestions, sanitizeQuestions } from './aiQuiz';
import { childAgeToday } from '../config/rules';
import { QuizThemeSeed } from '../config/quizCurriculum';

export interface GeneratedDailyQuiz {
  theme: DailyQuizTheme;
  questions: DailyQuizQuestion[];
  reflectionPrompt: string;
  source: 'ai' | 'offline';
}

const LESSON_QUESTIONS = 3;

function buildPrompt(seed: QuizThemeSeed, count: number, age: number): string {
  const knowledge = Math.max(count - LESSON_QUESTIONS, 2);
  return `Você prepara a "prova do dia" de uma criança de ${age} anos, curiosa, que gosta de futebol, lógica e ciências. Português do Brasil. Tom respeitoso, direto, sem infantilizar e sem lição de moral chata.

TEMA DO DIA: ${seed.title} (categoria: ${seed.category})
Orientação: ${seed.seed}

Monte um JSON com exatamente esta forma:
{
  "theme": {
    "title": "título curto e atraente",
    "lesson": "a ideia do dia em 90 a 130 palavras: comece com uma situação concreta ou história curta, depois explique a ideia e termine com como usar isso hoje",
    "whyItMatters": "uma frase sobre por que isso importa na vida dele"
  },
  "questions": [ ${count} perguntas ],
  "reflectionPrompt": "uma pergunta aberta e pessoal sobre o tema, para ele responder com as próprias palavras em 1 ou 2 frases"
}

Cada pergunta: {"question": "...", "options": ["...","...","...","..."], "answer": "igual a uma das options", "explanation": "1 a 2 frases que ensinam algo", "kind": "lesson" ou "knowledge", "subject": "área"}.

As ${LESSON_QUESTIONS} primeiras perguntas são "lesson", sobre a ideia do dia:
1. compreensão da ideia;
2. aplicação numa situação real da vida dele (escola, futebol, família, amigos);
3. um dilema em que uma alternativa é claramente a atitude mais sábia (as outras são tentadoras, mas piores).

As outras ${knowledge} são "knowledge", uma de cada área, nesta ordem, variando o subtema: matemática ou lógica (problema de raciocínio, não conta decorada), ciências, inglês (frase em contexto), história ou geografia${knowledge >= 5 ? ', e uma de futebol, natureza ou tecnologia' : ''}${knowledge >= 6 ? '; depois repita áreas com subtemas diferentes' : ''}.

Regras: 4 alternativas, só 1 correta; distratores plausíveis; pelo menos 2 perguntas difíceis que exijam pensar em duas etapas; nada de "qual a capital de"; sem numeração; sem repetir perguntas da lista de já usadas. Responda SOMENTE com o JSON.`;
}

function coerceQuestions(raw: unknown, count: number, avoid: string[]): DailyQuizQuestion[] {
  const base = sanitizeQuestions(raw, avoid);
  const rawArr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  // recupera kind/subject pelo texto da pergunta (sanitize devolve só os campos básicos)
  return base.slice(0, count).map((q, i) => {
    const match = rawArr.find((r) => typeof r.question === 'string' && r.question.trim() === q.question);
    const kind = match?.kind === 'lesson' || (!match && i < LESSON_QUESTIONS) ? 'lesson' : 'knowledge';
    const subject = typeof match?.subject === 'string' ? match.subject : kind === 'lesson' ? 'tema do dia' : 'geral';
    return { ...q, kind, subject };
  });
}

export async function generateDailyQuiz(opts: {
  seed: QuizThemeSeed;
  count: number;
  avoidQuestions: string[];
  signal?: AbortSignal;
}): Promise<GeneratedDailyQuiz> {
  const age = childAgeToday();
  if (isAIConfigured()) {
    try {
      const system = buildPrompt(opts.seed, opts.count, age);
      const avoidText = opts.avoidQuestions.length ? `Perguntas já usadas (não repita nem parafraseie):\n- ${opts.avoidQuestions.slice(-60).join('\n- ')}` : 'Primeira prova: capriche.';
      const parsed = (await callOpenAI(system, avoidText, 220 * opts.count + 900, opts.signal)) as Record<string, unknown>;
      const themeRaw = (parsed.theme ?? {}) as Record<string, unknown>;
      const questions = coerceQuestions(parsed.questions, opts.count, opts.avoidQuestions);
      const lesson = typeof themeRaw.lesson === 'string' ? themeRaw.lesson.trim() : '';
      if (questions.length >= Math.min(opts.count, 5) && lesson) {
        return {
          theme: {
            id: opts.seed.id,
            category: opts.seed.category,
            title: typeof themeRaw.title === 'string' && themeRaw.title.trim() ? themeRaw.title.trim() : opts.seed.title,
            lesson,
            whyItMatters: typeof themeRaw.whyItMatters === 'string' ? themeRaw.whyItMatters.trim() : '',
          },
          questions,
          reflectionPrompt: typeof parsed.reflectionPrompt === 'string' && parsed.reflectionPrompt.trim() ? parsed.reflectionPrompt.trim() : 'O que você aprendeu hoje que pode usar amanhã?',
          source: 'ai',
        };
      }
      console.warn('aiDailyQuiz: resposta incompleta da IA, usando offline', { questions: questions.length, lesson: Boolean(lesson) });
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
