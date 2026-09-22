/** Preços fixos em dólares por milhão. A mesma tabela de functions/src/aiPrices.ts. */

export const AI_MONTHLY_USD_CAP = 50;
export const AI_MONTHLY_USD_WARN = 40;

export const MODEL_USD_PER_MILLION: Record<string, { in: number; out: number }> = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4.1-mini': { in: 0.4, out: 1.6 },
};

/** Voz: US$ por milhão de caracteres. */
export const TTS_USD_PER_MILLION_CHARS = 15;

/** Média antiga, para um mês gravado só com o total (sem tokensByModel). */
const FALLBACK_INPUT: Record<string, number> = {
  'gpt-4.1-mini': 0.4,
  'gpt-4o-mini': 0.4,
  'gpt-4o': 2.5,
};
const FALLBACK_OUTPUT = 1.6;
const FALLBACK_INPUT_RATE = 0.4;

export interface TokenBucket {
  in: number;
  out: number;
}

export interface CostUsage {
  inputTokens: number;
  outputTokens: number;
  ttsChars: number;
  byModel: Record<string, number>;
  tokensByModel?: Record<string, TokenBucket>;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function tokenSplit(u: CostUsage): boolean {
  const buckets = u.tokensByModel;
  if (!buckets) return false;
  return Object.values(buckets).some((b) => (b?.in ?? 0) > 0 || (b?.out ?? 0) > 0);
}

function fallbackInputRate(u: CostUsage): number {
  const entries = Object.entries(u.byModel).filter(([m]) => !m.startsWith('tts-') && !m.startsWith('gpt-4o-mini-tts'));
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total <= 0) return FALLBACK_INPUT_RATE;
  return entries.reduce((sum, [m, n]) => sum + (FALLBACK_INPUT[m] ?? FALLBACK_INPUT_RATE) * n, 0) / total;
}

/** Custo estimado. Com tokensByModel, usa a tabela por modelo; senão, a média antiga. */
export function estimateCostUsd(u: CostUsage): number {
  const tts = (u.ttsChars * TTS_USD_PER_MILLION_CHARS) / 1_000_000;
  if (tokenSplit(u)) {
    let cost = tts;
    for (const [model, bucket] of Object.entries(u.tokensByModel ?? {})) {
      const rate = MODEL_USD_PER_MILLION[model] ?? { in: FALLBACK_INPUT_RATE, out: FALLBACK_OUTPUT };
      cost += ((bucket?.in ?? 0) * rate.in + (bucket?.out ?? 0) * rate.out) / 1_000_000;
    }
    return round4(cost);
  }
  const cost = (u.inputTokens * fallbackInputRate(u) + u.outputTokens * FALLBACK_OUTPUT) / 1_000_000 + tts;
  return round4(cost);
}

function bucketOf(u: CostUsage, model: string): TokenBucket | undefined {
  const bags = u.tokensByModel;
  if (!bags) return undefined;
  return bags[model] ?? bags[model.replace(/_/g, '.')];
}

/** Custo de um modelo no mês, quando os tokens foram gravados separados. */
export function usdOfModel(u: CostUsage, model: string): number {
  const bucket = bucketOf(u, model);
  if (!bucket) return 0;
  const name = MODEL_USD_PER_MILLION[model] ? model : model.replace(/_/g, '.');
  const rate = MODEL_USD_PER_MILLION[name] ?? { in: FALLBACK_INPUT_RATE, out: FALLBACK_OUTPUT };
  return round4((bucket.in * rate.in + bucket.out * rate.out) / 1_000_000);
}
