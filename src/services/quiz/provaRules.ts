/** Regras da prova do dia v2 (decisão 26): tempo de leitura, reflexão e limpeza de pergunta. */

export const EXPLAIN_READ_MS = { min: 4000, max: 12000 };
export const LESSON_READ_MS = { min: 8000, max: 30000 };
export const REFLECTION_MIN_WORDS = 10;
export const DAILY_QUIZ_MODEL = 'gpt-4o';

const KNOWLEDGE_AREAS = ['matemática', 'ciências', 'inglês', 'história ou geografia', 'futebol'] as const;

export function normalizeQuizText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function readingMs(text: string, minMs: number, maxMs: number): number {
  const raw = Math.round((wordCount(text) / 3) * 1000);
  return Math.min(maxMs, Math.max(minMs, raw));
}

export function takeWords(text: string, count: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (count <= 0) return '';
  if (count >= words.length) return text.trim();
  return words.slice(0, count).join(' ');
}

/** Fatia os pedaços da ideia no mesmo ritmo do anel: 3 palavras por segundo. */
export function revealParts(parts: string[], p: number): string[] {
  const clean = parts.map((part) => part.trim());
  if (p >= 1) return clean;
  const counts = clean.map(wordCount);
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total === 0) return clean.map(() => '');
  let budget = Math.floor(total * Math.min(1, Math.max(0, p)));
  return clean.map((part, i) => {
    const n = counts[i];
    if (budget <= 0) return '';
    if (budget >= n) {
      budget -= n;
      return part;
    }
    const slice = takeWords(part, budget);
    budget = 0;
    return slice;
  });
}

export function answerLeaksInPrompt(question: string, answer: string): boolean {
  const q = normalizeQuizText(question);
  const a = normalizeQuizText(answer);
  if (!a || a.length < 2) return false;
  return ` ${q} `.includes(` ${a} `) || q.includes(a);
}

export function optionsCollide(options: string[]): boolean {
  const seen = new Set<string>();
  for (const option of options) {
    const n = normalizeQuizText(option);
    if (!n) continue;
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}

export function hasRepeatedWord(text: string, times: number): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  let run = 1;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1]) {
      run += 1;
      if (run >= times) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

export function hasKeyMash(text: string): boolean {
  const compact = text.replace(/\s+/g, '');
  return /(.)\1{3,}/.test(compact);
}

export function reflectionOk(text: string): boolean {
  const trimmed = text.trim();
  if (wordCount(trimmed) < REFLECTION_MIN_WORDS) return false;
  if (hasRepeatedWord(trimmed, 4)) return false;
  if (hasKeyMash(trimmed)) return false;
  return true;
}

export function knowledgeAreasForWeekday(weekday: number): string[] {
  const n = ((weekday % 7) + 7) % 7;
  return [...KNOWLEDGE_AREAS.slice(n), ...KNOWLEDGE_AREAS.slice(0, n)];
}

export function dilemmaOf(quiz: {
  questions: Array<{ kind?: string; question: string }>;
  answers?: string[];
}): { question: string; chosen: string } | null {
  let i = quiz.questions.findIndex((q, idx) => q.kind === 'lesson' && idx === 2);
  if (i < 0) i = 2;
  const q = quiz.questions[i];
  const chosen = quiz.answers?.[i]?.trim();
  if (!q || !chosen) return null;
  return { question: q.question, chosen };
}
