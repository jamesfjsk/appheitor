// ========================================
// Arena de Inglês: juiz do Recado (seção 4.5)
// (a) pré-checagem local das 3 informações; (b) IA (gpt-4.1-mini, temperatura 0,2)
// devolve erros etiquetados, faltas, correção mínima e a regra em PT; (c) a nota é
// calculada em código (scoring.noteScore). judgeNote nunca rejeita: sem IA, a nota
// sai da pré-checagem e a note avisa que a correção não veio.
// ========================================

import type { NoteContent, NoteError, NoteErrorTag, NoteInfo, NoteJudgement, NoteLesson } from '../types/english';
import { NOTE_ERROR_TAGS, buildExplainPrompt, buildJudgePrompt } from './english/prompts';
import { missingInfos, wordDistance } from './english/notePrecheck';
import { isLazyNote, teachFromRecado } from './english/notePlay';
import { noteScore } from './english/scoring';
import { callOpenAI, isAIConfigured } from './aiQuiz';

const JUDGE_MODEL = 'gpt-4.1-mini';
const JUDGE_TEMPERATURE = 0.2;
const JUDGE_TIMEOUT_MS = 30_000;
const EXPLAIN_TIMEOUT_MS = 18_000;

/** Só entra se a IA não mandar a fala deste recado */
const NOTE_BY_TAG: Record<NoteErrorTag, string> = {
  plural: 'Depois de two, three... a coisa ganha s: two plates, two bags.',
  article: 'Antes de uma coisa só: a plate, an apple, the bag.',
  verb: 'Toda frase precisa do verbo certo: I do, I play, I am.',
  spelling: 'Olha a palavra em inglês, letra por letra, e escreve de novo.',
  word_order: 'Em inglês: quem faz, o verbo, o quê. I do my homework first.',
  preposition: 'Lugar e motivo: on the chair, for school, after dinner.',
  other: 'Escreve em inglês. Palavra de português no quadro não conta.',
};

export interface JudgeInput {
  text: string;
  content: NoteContent;
  level: number;
  scaffoldStage: number;
  /** Molde mostrado na tela, ou null quando o andaime já saiu */
  templateUsed: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((s) => s.length > 0) : []);
const isTag = (v: string): v is NoteErrorTag => (NOTE_ERROR_TAGS as readonly string[]).includes(v);

/** Informações obrigatórias que ainda não aparecem no texto (pré-checagem local) */
export function precheckNote(text: string, content: NoteContent): NoteInfo[] {
  return missingInfos(text, content.mustInclude);
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Correção construída em código a partir dos erros: troca cada "wrong" pelo "fix" uma vez */
function applyFixes(text: string, errors: NoteError[]): string {
  let out = text;
  for (const e of errors) {
    if (!e.wrong || e.wrong === e.fix) continue;
    out = out.replace(new RegExp(escapeRe(e.wrong), 'i'), e.fix);
  }
  return out;
}

function parseLessons(raw: unknown, infos: NoteInfo[], brief: string, written: string, missingPt: string[]): NoteLesson[] {
  const byPt = new Map<string, string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!isRecord(item)) continue;
      const pt = str(item.pt);
      const say = str(item.say);
      if (pt && say) byPt.set(pt.toLowerCase(), say);
    }
  }
  return infos.map((info) => {
    const say = byPt.get(info.pt.toLowerCase());
    if (say && !isLazyNote(say)) return { pt: info.pt, say };
    const missed = missingPt.some((m) => m.toLowerCase() === info.pt.toLowerCase());
    return {
      pt: info.pt,
      say: missed
        ? teachFromRecado(info, brief, written).say
        : `Neste recado, ${info.pt} é ${info.en[0]}.`,
    };
  });
}

function parseErrors(raw: unknown): NoteError[] {
  if (!Array.isArray(raw)) return [];
  const out: NoteError[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const wrong = str(item.wrong);
    const fix = str(item.fix);
    if (!wrong && !fix) continue;
    const tagRaw = str(item.tag);
    // Etiqueta fora do conjunto é deslize de formato da IA: "spelling" deixa a distância em letras decidir a gravidade
    const tag: NoteErrorTag = isTag(tagRaw) ? tagRaw : 'spelling';
    out.push({ wrong, fix, tag });
  }
  return out;
}

/** Nota só pela pré-checagem, quando a IA não responde: 3 infos presentes -> 2, senão 1 */
function fallbackJudgement(input: JudgeInput, missing: NoteInfo[], reason: string): NoteJudgement {
  const text = input.text.trim();
  const isEnglish = text.length > 0;
  const missingPt = missing.map((m) => m.pt);
  const score: NoteJudgement['score'] = !isEnglish ? 0 : missingPt.length === 0 ? 2 : 1;
  const first = missing[0];
  const note = first
    ? teachFromRecado(first, input.content.brief, text).say
    : `Os três pregos acenderam. A correção fina (${reason}) não veio desta vez.`;
  const lessons = parseLessons(null, input.content.mustInclude, input.content.brief, text, missingPt);
  return { isEnglish, errors: [], missing: missingPt, corrected: text, note, lessons, score };
}

/**
 * Julga o Recado: prompt do juiz + IA + validação do JSON + nota em código.
 * A correção só fica se a distância em palavras for compatível com o número de erros;
 * senão a correção é reconstruída em código aplicando os fixes.
 */
export async function judgeNote(input: JudgeInput): Promise<NoteJudgement> {
  const text = input.text.trim();
  const preMissing = precheckNote(text, input.content);
  if (!text) return fallbackJudgement(input, preMissing, 'texto vazio');
  if (!isAIConfigured()) return fallbackJudgement(input, preMissing, 'IA não configurada');

  const prompt = buildJudgePrompt({
    level: input.level,
    brief: input.content.brief,
    mustInclude: input.content.mustInclude,
    model: input.content.model,
    template: input.templateUsed,
    text,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);
  let raw: unknown;
  try {
    const { json } = await callOpenAI(prompt.system, prompt.user, prompt.maxTokens, {
      model: JUDGE_MODEL,
      temperature: JUDGE_TEMPERATURE,
      withUsage: true,
      signal: controller.signal,
    });
    raw = json;
  } catch (error) {
    console.warn('englishJudge: falha na IA', error);
    return fallbackJudgement(input, preMissing, 'falha na chamada');
  } finally {
    clearTimeout(timer);
  }

  const r = isRecord(raw) ? raw : {};
  const isEnglish = r.isEnglish !== false;
  const errors = parseErrors(r.errors);
  // Faltas: união do que a IA apontou com o que a pré-checagem não achou
  const missing = Array.from(new Set([...strArray(r.missing), ...preMissing.map((m) => m.pt)]));
  let corrected = str(r.corrected);
  if (!corrected || wordDistance(text, corrected) > errors.length + 1) corrected = applyFixes(text, errors);
  let note = str(r.note);
  if (!note || isLazyNote(note)) {
    const firstMiss = input.content.mustInclude.find((info) => missing.some((m) => m.toLowerCase() === info.pt.toLowerCase()));
    if (firstMiss) note = teachFromRecado(firstMiss, input.content.brief, text).say;
    else if (errors.length) note = NOTE_BY_TAG[errors[0].tag];
  }
  const lessons = parseLessons(r.lessons, input.content.mustInclude, input.content.brief, text, missing);
  const partial = { isEnglish, errors, missing, corrected, note, lessons };
  return { ...partial, score: noteScore(partial, input.level) };
}

/** Primeira falta: gera a fala deste recado. Não fecha a nota. */
export async function explainNoteMiss(input: {
  text: string;
  content: NoteContent;
  missing: NoteInfo[];
  level: number;
  template?: string | null;
}): Promise<{ say: string; hear: string }> {
  const first = input.missing[0];
  const fallback = first
    ? teachFromRecado(first, input.content.brief, input.text)
    : { say: 'O quadro ainda não falou o pedido. Ouve o inglês e tenta de novo.', hear: '' };
  if (!first || !isAIConfigured()) return fallback;

  const prompt = buildExplainPrompt({
    level: input.level,
    brief: input.content.brief,
    mustInclude: input.content.mustInclude,
    model: input.content.model,
    template: input.template ?? null,
    text: input.text,
    missing: input.missing,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXPLAIN_TIMEOUT_MS);
  try {
    const { json } = await callOpenAI(prompt.system, prompt.user, prompt.maxTokens, {
      model: JUDGE_MODEL,
      temperature: 0.35,
      withUsage: true,
      signal: controller.signal,
    });
    const r = isRecord(json) ? json : {};
    const say = str(r.say);
    const hear = str(r.hear) || fallback.hear;
    if (say && !isLazyNote(say) && !input.content.model.toLowerCase().includes(say.toLowerCase())) {
      return { say, hear };
    }
    if (say && !isLazyNote(say)) return { say, hear };
    return fallback;
  } catch (error) {
    console.warn('englishJudge: fala da falta não veio', error);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
