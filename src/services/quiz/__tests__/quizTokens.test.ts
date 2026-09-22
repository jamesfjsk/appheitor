import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, run, test } from '../../english/__tests__/harness';
import { QUIZ_AI_MIN, QUIZ_SPARE, QUIZ_VALIDATOR_ENFORCE, quizMaxTokens } from '../quizTokens';
import { AI_MONTHLY_USD_CAP, estimateCostUsd, type CostUsage } from '../../aiCost';

test('P0.9: 8 perguntas + 3 folga pedem 4500 tokens', () => {
  expect(QUIZ_SPARE).toBe(3);
  expect(quizMaxTokens(8, 3)).toBe(4500);
  expect(quizMaxTokens(8)).toBe(4500);
});

test('pacote 6: o validador rejeita; o piso de observação continua 5', () => {
  expect(QUIZ_VALIDATOR_ENFORCE).toBe(true);
  expect(QUIZ_AI_MIN).toBe(5);
});

test('6c: teto de US$ 50 no cliente e na function, sem o teto de chamadas', () => {
  expect(AI_MONTHLY_USD_CAP).toBe(50);
  const fn = readFileSync(resolve('functions/src/index.ts'), 'utf8');
  expect(fn.includes('AI_MONTHLY_CALL_CAP')).toBe(false);
  expect(fn.includes('Teto mensal de IA: US$ 50')).toBe(true);
  expect(fn.includes('const CHAT_MAX_TOKENS = 6000')).toBe(true);
});

test('P0.7: mil tokens de entrada em gpt-4o custam 6,25 vezes o gpt-4.1-mini', () => {
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
  const a = estimateCostUsd(mini);
  const b = estimateCostUsd(big);
  expect(a > 0).toBe(true);
  expect(Math.abs(b / a - 6.25) < 0.01).toBe(true);
});

void run();
