// ========================================
// Uso de IA por mês: aiUsage/{yyyy-mm}
// Contadores com increment() (chamadas, tokens, caracteres de TTS), byModel com
// chamadas por modelo e tokensByModel com entrada/saída. O teto é o custo
// estimado do mês (AI_MONTHLY_USD_CAP), igual para texto e voz.
// ========================================

import { doc, getDoc, increment, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayBrazil } from '../utils/timezone';
import { AI_MONTHLY_USD_CAP, estimateCostUsd, type TokenBucket } from './aiCost';

export { AI_MONTHLY_USD_CAP, AI_MONTHLY_USD_WARN, TTS_USD_PER_MILLION_CHARS, estimateCostUsd, usdOfModel } from './aiCost';

export interface AiUsageDoc {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  ttsChars: number;
  byModel: Record<string, number>;
  tokensByModel?: Record<string, TokenBucket>;
}

export interface UsageEntry {
  model: string;
  calls?: number;
  inputTokens?: number;
  outputTokens?: number;
  ttsChars?: number;
}

/** Modelos de voz: as chamadas deles não entram no teto */
const TTS_MODEL_PREFIXES = ['gpt-4o-mini-tts', 'tts-'];

export const usageMonthOf = (date: string): string => date.slice(0, 7);
export const currentUsageMonth = (): string => usageMonthOf(getTodayBrazil());

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function parse(data: Record<string, unknown> | undefined): AiUsageDoc | null {
  if (!data) return null;
  const byModelRaw = typeof data.byModel === 'object' && data.byModel !== null ? (data.byModel as Record<string, unknown>) : {};
  const byModel: Record<string, number> = {};
  for (const [k, v] of Object.entries(byModelRaw)) byModel[k] = num(v);
  const tokensRaw = typeof data.tokensByModel === 'object' && data.tokensByModel !== null
    ? (data.tokensByModel as Record<string, unknown>)
    : {};
  const tokensByModel: Record<string, TokenBucket> = {};
  for (const [k, v] of Object.entries(tokensRaw)) {
    if (!v || typeof v !== 'object') continue;
    const row = v as { in?: unknown; out?: unknown };
    tokensByModel[k] = { in: num(row.in), out: num(row.out) };
  }
  return {
    calls: num(data.calls),
    inputTokens: num(data.inputTokens),
    outputTokens: num(data.outputTokens),
    ttsChars: num(data.ttsChars),
    byModel,
    tokensByModel,
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
        tokensByModel: {
          [entry.model]: {
            in: increment(entry.inputTokens ?? 0),
            out: increment(entry.outputTokens ?? 0),
          },
        },
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

function isTtsModel(model: string): boolean {
  return TTS_MODEL_PREFIXES.some((p) => model.startsWith(p));
}

/** Chamadas de texto, sem a voz. O teto não usa este número. */
export function textCallsOf(u: AiUsageDoc): number {
  return Math.max(0, u.calls - voiceCallsOf(u));
}

/** Chamadas de voz gravadas em byModel. */
export function voiceCallsOf(u: AiUsageDoc): number {
  return Object.entries(u.byModel)
    .filter(([model]) => isTtsModel(model))
    .reduce((sum, [, n]) => sum + n, 0);
}

export function isOverCap(u: AiUsageDoc | null): boolean {
  return u !== null && estimateCostUsd(u) >= AI_MONTHLY_USD_CAP;
}
