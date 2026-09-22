/** Preços fixos em dólares por milhão. gpt-4o de entrada custa 6,25 vezes o mini. */

export const AI_MONTHLY_CALL_CAP = 800;

export const USD_PER_MILLION = { inputTokens: 0.4, outputTokens: 1.6, ttsChars: 15 };

const USD_INPUT_BY_MODEL: Record<string, number> = {
  'gpt-4.1-mini': 0.4,
  'gpt-4o-mini': 0.4,
  'gpt-4o': 2.5,
};

export interface CostUsage {
  inputTokens: number;
  outputTokens: number;
  ttsChars: number;
  byModel: Record<string, number>;
}

function inputRate(u: CostUsage): number {
  const entries = Object.entries(u.byModel).filter(([m]) => !m.startsWith('tts-') && !m.startsWith('gpt-4o-mini-tts'));
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total <= 0) return USD_PER_MILLION.inputTokens;
  return entries.reduce((sum, [m, n]) => sum + (USD_INPUT_BY_MODEL[m] ?? USD_PER_MILLION.inputTokens) * n, 0) / total;
}

export function estimateCostUsd(u: CostUsage): number {
  const cost =
    (u.inputTokens * inputRate(u) + u.outputTokens * USD_PER_MILLION.outputTokens + u.ttsChars * USD_PER_MILLION.ttsChars) /
    1_000_000;
  return Math.round(cost * 10_000) / 10_000;
}
