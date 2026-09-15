// ========================================
// Uso de IA por mês: aiUsage/{yyyy-mm}
// Contadores com increment() (chamadas, tokens, caracteres de TTS) e byModel com
// chamadas por modelo. O teto mensal (AI_MONTHLY_CALL_CAP) vale para as chamadas de
// texto: o TTS conta em ttsChars e é descontado das chamadas na hora de comparar.
// ========================================

import { doc, getDoc, increment, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayBrazil } from '../utils/timezone';

export interface AiUsageDoc {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  ttsChars: number;
  byModel: Record<string, number>;
}

export interface UsageEntry {
  model: string;
  calls?: number;
  inputTokens?: number;
  outputTokens?: number;
  ttsChars?: number;
}

/** Chamadas de texto por mês antes de recusar a geração de contratos */
export const AI_MONTHLY_CALL_CAP = 800;

/** Modelos de voz: as chamadas deles não entram no teto */
const TTS_MODEL_PREFIXES = ['gpt-4o-mini-tts', 'tts-'];

/** Tabela fixa em dólares por milhão (gpt-4.1-mini para tokens; TTS por caractere) */
const USD_PER_MILLION = { inputTokens: 0.4, outputTokens: 1.6, ttsChars: 15 };

export const usageMonthOf = (date: string): string => date.slice(0, 7);
export const currentUsageMonth = (): string => usageMonthOf(getTodayBrazil());

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function parse(data: Record<string, unknown> | undefined): AiUsageDoc | null {
  if (!data) return null;
  const byModelRaw = typeof data.byModel === 'object' && data.byModel !== null ? (data.byModel as Record<string, unknown>) : {};
  const byModel: Record<string, number> = {};
  for (const [k, v] of Object.entries(byModelRaw)) byModel[k] = num(v);
  return {
    calls: num(data.calls),
    inputTokens: num(data.inputTokens),
    outputTokens: num(data.outputTokens),
    ttsChars: num(data.ttsChars),
    byModel,
  };
}

/**
 * Soma uma chamada ao mês corrente. Nunca lança: a contabilidade não pode derrubar
 * a geração de um contrato. As chaves de byModel entram literais no setDoc (não são
 * caminhos com ponto), então "gpt-4.1-mini" fica inteiro.
 */
export async function recordUsage(entry: UsageEntry): Promise<void> {
  const calls = entry.calls ?? 1;
  try {
    await setDoc(
      doc(db, 'aiUsage', currentUsageMonth()),
      {
        calls: increment(calls),
        inputTokens: increment(entry.inputTokens ?? 0),
        outputTokens: increment(entry.outputTokens ?? 0),
        ttsChars: increment(entry.ttsChars ?? 0),
        byModel: { [entry.model]: increment(calls) },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('aiUsage: falha ao registrar uso', error);
  }
}

export function subscribeUsage(month: string, onChange: (u: AiUsageDoc | null) => void): () => void {
  return onSnapshot(
    doc(db, 'aiUsage', month),
    (snap) => onChange(parse(snap.exists() ? snap.data() : undefined)),
    () => onChange(null)
  );
}

export async function getUsage(month: string): Promise<AiUsageDoc | null> {
  const snap = await getDoc(doc(db, 'aiUsage', month));
  return parse(snap.exists() ? snap.data() : undefined);
}

/** Chamadas de texto (sem TTS), que é o que o teto mensal limita */
export function textCallsOf(u: AiUsageDoc): number {
  const tts = Object.entries(u.byModel)
    .filter(([model]) => TTS_MODEL_PREFIXES.some((p) => model.startsWith(p)))
    .reduce((sum, [, n]) => sum + n, 0);
  return Math.max(0, u.calls - tts);
}

export function isOverCap(u: AiUsageDoc | null): boolean {
  return u !== null && textCallsOf(u) >= AI_MONTHLY_CALL_CAP;
}

export function estimateCostUsd(u: AiUsageDoc): number {
  const cost =
    (u.inputTokens * USD_PER_MILLION.inputTokens + u.outputTokens * USD_PER_MILLION.outputTokens + u.ttsChars * USD_PER_MILLION.ttsChars) /
    1_000_000;
  return Math.round(cost * 10_000) / 10_000;
}
