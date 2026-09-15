// ========================================
// Arena de Inglês: juiz do Recado (seção 4.5)
// (a) pré-checagem local das 3 informações; (b) IA (gpt-4.1-mini, temperatura 0,2)
// devolve erros etiquetados, faltas, correção mínima e a regra em PT; (c) a nota é
// calculada em código (scoring.noteScore). judgeNote nunca rejeita: sem IA, a nota
// sai da pré-checagem e a note avisa que a correção não veio.
// ========================================

import type { NoteContent, NoteError, NoteErrorTag, NoteInfo, NoteJudgement } from '../types/english';
import { NOTE_ERROR_TAGS, buildJudgePrompt } from './english/prompts';
import { missingInfos, wordDistance } from './english/notePrecheck';
import { noteScore } from './english/scoring';
import { callOpenAI, isAIConfigured } from './aiQuiz';

const JUDGE_MODEL = 'gpt-4.1-mini';
const JUDGE_TEMPERATURE = 0.2;
const JUDGE_TIMEOUT_MS = 30_000;

/** Texto padrão quando a IA não manda a regra do erro principal */
const NOTE_BY_TAG: Record<NoteErrorTag, string> = {
  plural: 'Depois de dois, três... o substantivo vai para o plural (two swords).',
  article: 'Antes de uma coisa só usamos a/an/the (a torch, an apple, the cave).',
  verb: 'Toda frase precisa de um verbo na forma certa (I need, it is, there are).',
  spelling: 'Confira a grafia da palavra em inglês, letra por letra.',
  word_order: 'Em inglês a ordem é quem faz + verbo + o quê (I need two swords).',
  preposition: 'Lugar e destino usam in/on/under/next to/for (in the cave, for the dog).',
  other: 'Escreva tudo em inglês, sem palavras em português.',
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
  const note = missingPt.length
    ? `A correção automática não veio (${reason}). Faltou dizer: ${missingPt.join('; ')}.`
    : `A correção automática não veio (${reason}). As três informações estão no texto.`;
  return { isEnglish, errors: [], missing: missingPt, corrected: text, note, score };
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
  if (!note && errors.length) note = NOTE_BY_TAG[errors[0].tag];
  if (!note && missing.length) note = `Faltou dizer: ${missing.join('; ')}.`;
  const partial = { isEnglish, errors, missing, corrected, note };
  return { ...partial, score: noteScore(partial, input.level) };
}
