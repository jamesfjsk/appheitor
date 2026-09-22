/** US$ por milhão. A mesma tabela de src/services/aiCost.ts (decisão 39). */

export const AI_MONTHLY_USD_CAP = 50;

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

export interface MonthUsage {
  inputTokens?: number;
  outputTokens?: number;
  ttsChars?: number;
  byModel?: Record<string, number>;
  tokensByModel?: Record<string, { in?: number; out?: number }>;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function tokenSplit(u: MonthUsage): boolean {
  const buckets = u.tokensByModel;
  if (!buckets) return false;
  return Object.values(buckets).some((b) => num(b?.in) > 0 || num(b?.out) > 0);
}

function fallbackInputRate(byModel: Record<string, number> | undefined): number {
  const entries = Object.entries(byModel ?? {}).filter(([m]) => !m.startsWith('tts-') && !m.startsWith('gpt-4o-mini-tts'));
  const total = entries.reduce((sum, [, n]) => sum + num(n), 0);
  if (total <= 0) return FALLBACK_INPUT_RATE;
  return entries.reduce((sum, [m, n]) => sum + (FALLBACK_INPUT[m] ?? FALLBACK_INPUT_RATE) * num(n), 0) / total;
}

/** Custo estimado do mês. Com tokensByModel, usa a tabela por modelo; senão, a média antiga. */
export function estimateMonthUsd(u: MonthUsage): number {
  const tts = (num(u.ttsChars) * TTS_USD_PER_MILLION_CHARS) / 1_000_000;
  if (tokenSplit(u)) {
    let cost = tts;
    for (const [model, bucket] of Object.entries(u.tokensByModel ?? {})) {
      const rate = MODEL_USD_PER_MILLION[model] ?? { in: FALLBACK_INPUT_RATE, out: FALLBACK_OUTPUT };
      cost += (num(bucket?.in) * rate.in + num(bucket?.out) * rate.out) / 1_000_000;
    }
    return round4(cost);
  }
  const cost =
    (num(u.inputTokens) * fallbackInputRate(u.byModel) + num(u.outputTokens) * FALLBACK_OUTPUT) / 1_000_000 + tts;
  return round4(cost);
}
