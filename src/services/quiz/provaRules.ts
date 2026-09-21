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

const FILLER = new Set([
  'que', 'para', 'porque', 'isso', 'essa', 'esse', 'uma', 'uns', 'com', 'por', 'nao', 'sim',
  'ele', 'ela', 'voce', 'como', 'mais', 'menos', 'muito', 'ainda', 'hoje', 'amanha', 'quando',
  'onde', 'qual', 'quais', 'seu', 'sua', 'meu', 'minha', 'dos', 'das', 'pelo', 'pela', 'depois',
  'antes', 'tambem', 'so', 'ja', 'eu', 'tu', 'nos', 'eles', 'elas', 'tem', 'foi', 'era', 'ser',
  'ter', 'fazer', 'vai', 'vou', 'pra', 'pro', 'aqui', 'ali', 'la', 'de', 'da', 'do', 'em', 'no',
  'na', 'os', 'as', 'um', 'ao', 'aos', 'mas', 'se', 'ou', 'e', 'o', 'a', 'te', 'me', 'lhe',
]);

export function uniqueWordCount(text: string): number {
  return new Set(normalizeQuizText(text).split(' ').filter(Boolean)).size;
}

export function contentWords(text: string): string[] {
  return normalizeQuizText(text)
    .split(' ')
    .filter((w) => w.length >= 4 && !FILLER.has(w));
}

/** Colou a pergunta ou um pedaço grande da ideia. */
export function copiesSource(text: string, source: string): boolean {
  const t = normalizeQuizText(text);
  const s = normalizeQuizText(source);
  if (t.length < 20 || s.length < 20) return false;
  const tWords = t.split(' ').filter(Boolean).length;
  const sWords = s.split(' ').filter(Boolean).length;
  if (s.includes(t) && tWords >= 8) return true;
  if (t.includes(s) && sWords >= 6) return true;
  return false;
}

/** Pelo menos uma palavra de verdade em comum com a ideia ou a pergunta. */
export function touchesIdea(text: string, about: { prompt: string; title: string; lesson: string }): boolean {
  const aboutSet = new Set([
    ...contentWords(about.prompt),
    ...contentWords(about.title),
    ...contentWords(about.lesson),
  ]);
  if (aboutSet.size === 0) return true;
  return contentWords(text).some((w) => aboutSet.has(w));
}

export const REFLECT_SHORT = 'Ainda está curto. Conta o que ficou na cabeça, com as suas palavras.';
export const REFLECT_MASH = 'Isso não é frase. Escreve de verdade, sem apertar a mesma tecla.';
export const REFLECT_COPY = 'Isso é a pergunta, não a sua resposta. Escreve com a sua boca.';
export const REFLECT_THIN = 'Tá repetindo a mesma palavra. Diz o que ficou, com palavras diferentes.';
export const REFLECT_OFFTOPIC = 'Isso não fala da ideia de hoje. Lê a pergunta de novo e responde com a sua boca.';

export function reflectionLocalSay(text: string, about: { prompt: string; title: string; lesson: string }): string | null {
  const trimmed = text.trim();
  if (wordCount(trimmed) < REFLECTION_MIN_WORDS) return REFLECT_SHORT;
  if (hasKeyMash(trimmed)) return REFLECT_MASH;
  if (hasRepeatedWord(trimmed, 4) || uniqueWordCount(trimmed) < 6) return REFLECT_THIN;
  if (contentWords(trimmed).length < 3) return REFLECT_SHORT;
  if (copiesSource(trimmed, about.prompt) || copiesSource(trimmed, about.title) || copiesSource(trimmed, about.lesson)) {
    return REFLECT_COPY;
  }
  return null;
}

export function reflectionOk(text: string, about?: { prompt: string; title: string; lesson: string }): boolean {
  if (about) return reflectionLocalSay(text, about) === null;
  const trimmed = text.trim();
  if (wordCount(trimmed) < REFLECTION_MIN_WORDS) return false;
  if (hasRepeatedWord(trimmed, 4)) return false;
  if (hasKeyMash(trimmed)) return false;
  if (uniqueWordCount(trimmed) < 6) return false;
  if (contentWords(trimmed).length < 3) return false;
  return true;
}

export function knowledgeAreasForWeekday(weekday: number): string[] {
  const n = ((weekday % 7) + 7) % 7;
  return [...KNOWLEDGE_AREAS.slice(n), ...KNOWLEDGE_AREAS.slice(0, n)];
}

/** Teto da função de voz (`functions/src/index.ts` TTS_MAX_CHARS). */
export const SPEAK_MAX_CHARS = 300;

function clipSpeak(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (stop >= 40) return slice.slice(0, stop + 1).trim();
  const sp = slice.lastIndexOf(' ');
  return (sp > 20 ? slice.slice(0, sp) : slice).trim();
}

/** Fala só a explicação. Sem nome, sem "quase" de refrão: o carimbo já diz se acertou. */
export function speakVerdict(explanation: string, maxChars = SPEAK_MAX_CHARS): string {
  return clipSpeak(explanation, maxChars);
}

/** A ideia inteira, começando pelo título, em fatias que cabem na voz. */
export function lessonSpeakText(theme: { title?: string; lesson?: string; whyItMatters?: string; curiosity?: string }): string {
  const title = (theme.title ?? '').replace(/\s+/g, ' ').trim();
  const head = title && !/[.!?]$/.test(title) ? `${title}.` : title;
  return [head, theme.lesson, theme.whyItMatters, theme.curiosity].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function speakChunks(text: string, max = SPEAK_MAX_CHARS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
  const out: string[] = [];
  let buf = '';
  const pushWords = (raw: string) => {
    let piece = '';
    for (const w of raw.split(' ')) {
      const next = piece ? `${piece} ${w}` : w;
      if (next.length <= max) {
        piece = next;
        continue;
      }
      if (piece) out.push(piece);
      piece = w.length <= max ? w : w.slice(0, max);
    }
    buf = piece;
  };
  for (const s of sentences) {
    if (s.length > max) {
      if (buf) {
        out.push(buf);
        buf = '';
      }
      pushWords(s);
      continue;
    }
    const next = buf ? `${buf} ${s}` : s;
    if (next.length <= max) buf = next;
    else {
      if (buf) out.push(buf);
      buf = s;
    }
  }
  if (buf) out.push(buf);
  return out;
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
