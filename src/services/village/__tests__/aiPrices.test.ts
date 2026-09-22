import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, run, test } from '../../english/__tests__/harness';
import {
  AI_MONTHLY_USD_CAP,
  AI_MONTHLY_USD_WARN,
  MODEL_USD_PER_MILLION,
  TTS_USD_PER_MILLION_CHARS,
  estimateCostUsd,
  type CostUsage,
} from '../../aiCost';
import {
  AI_MONTHLY_USD_CAP as FN_CAP,
  MODEL_USD_PER_MILLION as FN_TABLE,
  TTS_USD_PER_MILLION_CHARS as FN_TTS,
  estimateMonthUsd,
} from '../../../../functions/src/aiPrices';

test('6c: a tabela do cliente é a da função', () => {
  expect(AI_MONTHLY_USD_CAP).toBe(50);
  expect(AI_MONTHLY_USD_WARN).toBe(40);
  expect(FN_CAP).toBe(AI_MONTHLY_USD_CAP);
  expect(MODEL_USD_PER_MILLION['gpt-4o'].in).toBe(2.5);
  expect(MODEL_USD_PER_MILLION['gpt-4o'].out).toBe(10);
  expect(MODEL_USD_PER_MILLION['gpt-4o-mini'].in).toBe(0.15);
  expect(MODEL_USD_PER_MILLION['gpt-4o-mini'].out).toBe(0.6);
  expect(MODEL_USD_PER_MILLION['gpt-4.1-mini'].in).toBe(0.4);
  expect(MODEL_USD_PER_MILLION['gpt-4.1-mini'].out).toBe(1.6);
  expect(TTS_USD_PER_MILLION_CHARS).toBe(15);
  expect(FN_TABLE['gpt-4o'].in).toBe(MODEL_USD_PER_MILLION['gpt-4o'].in);
  expect(FN_TABLE['gpt-4o'].out).toBe(MODEL_USD_PER_MILLION['gpt-4o'].out);
  expect(FN_TABLE['gpt-4o-mini'].in).toBe(MODEL_USD_PER_MILLION['gpt-4o-mini'].in);
  expect(FN_TABLE['gpt-4o-mini'].out).toBe(MODEL_USD_PER_MILLION['gpt-4o-mini'].out);
  expect(FN_TABLE['gpt-4.1-mini'].in).toBe(MODEL_USD_PER_MILLION['gpt-4.1-mini'].in);
  expect(FN_TABLE['gpt-4.1-mini'].out).toBe(MODEL_USD_PER_MILLION['gpt-4.1-mini'].out);
  expect(FN_TTS).toBe(TTS_USD_PER_MILLION_CHARS);
  const src = readFileSync(resolve('functions/src/aiPrices.ts'), 'utf8');
  expect(src.includes("gpt-4o': { in: 2.5, out: 10 }")).toBe(true);
  expect(src.includes("gpt-4o-mini': { in: 0.15, out: 0.6 }")).toBe(true);
  expect(src.includes("gpt-4.1-mini': { in: 0.4, out: 1.6 }")).toBe(true);
  expect(src.includes('TTS_USD_PER_MILLION_CHARS = 15')).toBe(true);
});

test('6c: 1000 tokens de entrada em gpt-4o custam 6,25 vezes o gpt-4.1-mini', () => {
  const mini: CostUsage = {
    inputTokens: 1000,
    outputTokens: 0,
    ttsChars: 0,
    byModel: {},
    tokensByModel: { 'gpt-4.1-mini': { in: 1000, out: 0 } },
  };
  const big: CostUsage = {
    inputTokens: 1000,
    outputTokens: 0,
    ttsChars: 0,
    byModel: {},
    tokensByModel: { 'gpt-4o': { in: 1000, out: 0 } },
  };
  expect(Math.abs(estimateCostUsd(big) / estimateCostUsd(mini) - 6.25) < 0.01).toBe(true);
  expect(estimateMonthUsd(big)).toBe(estimateCostUsd(big));
  expect(estimateMonthUsd(mini)).toBe(estimateCostUsd(mini));
});

test('6c: o teto olha o custo, e a voz entra na conta', () => {
  const quiet: CostUsage = {
    inputTokens: 0,
    outputTokens: 0,
    ttsChars: 0,
    byModel: { 'gpt-4o': 900 },
    tokensByModel: { 'gpt-4o': { in: 1000, out: 0 } },
  };
  expect(estimateCostUsd(quiet) >= AI_MONTHLY_USD_CAP).toBe(false);
  const loud: CostUsage = {
    inputTokens: 0,
    outputTokens: 0,
    ttsChars: 1_000_000,
    byModel: {},
    tokensByModel: { 'gpt-4o': { in: 20_000_000, out: 0 } },
  };
  expect(estimateCostUsd(loud) >= 50).toBe(true);
  expect(estimateCostUsd(loud) >= AI_MONTHLY_USD_CAP).toBe(true);
  const voice: CostUsage = {
    inputTokens: 0,
    outputTokens: 0,
    ttsChars: 2_000_000,
    byModel: { 'gpt-4o-mini-tts': 3 },
  };
  expect(estimateCostUsd(voice)).toBe(30);
  expect(estimateMonthUsd(voice)).toBe(30);
});

void run();
