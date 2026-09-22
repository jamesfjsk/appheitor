import { expect, run, test } from '../../english/__tests__/harness';
import { QUIZ_THEMES } from '../../../config/quizCurriculum';
import { buildPrompt, replacementBrief } from '../dailyPrompt';
import { quizSlots } from '../validateQuestion';

const p = buildPrompt({
  seed: QUIZ_THEMES[0],
  count: 8,
  spare: 3,
  age: 10,
  weekday: 1,
  englishLevel: 1,
  avoidHashes: ['abc123'],
});

test('P0.4: prompt v3 pede 5º ano, folga, MAT.OP2 e auto-revisão', () => {
  expect(p.includes('5º ano do ensino fundamental')).toBe(true);
  expect(p.includes('AUTO-REVISÃO')).toBe(true);
  expect(p.includes('MAT.OP2')).toBe(true);
  expect(p.includes('LIC.DILEMA')).toBe(true);
  expect(p.includes('qual a capital de')).toBe(true);
  expect(p.includes('11 perguntas') || p.includes('8 valem e 3')).toBe(true);
});

test('P0.4: nível 1 de inglês entra no cartão e a numeração vai de 4) a 8)', () => {
  expect(p.includes('Nível 1') || p.includes('nível 1') || p.includes('Nível de inglês 1')).toBe(true);
  expect(p.includes('present tense only, sentences of at most 7 words')).toBe(true);
  expect(p.includes('4)')).toBe(true);
  expect(p.includes('8)')).toBe(true);
  expect(p.includes('gpt-4o')).toBe(false);
  expect(p.includes('abc123')).toBe(true);
});

test('6b: a substituição pede a posição, não um monte solto', () => {
  const holes = quizSlots(8, 1).filter((slot) => slot.skill === 'LIC.DILEMA' || slot.scenario === 'futebol');
  const text = replacementBrief(holes);
  expect(text.includes('posição')).toBe(true);
  expect(text.includes('LIC.DILEMA')).toBe(true);
  expect(text.includes('cenário de futebol')).toBe(true);
  expect(text.includes('± 2 palavras')).toBe(true);
  expect(text.includes('Faltam')).toBe(false);
  expect(text.includes('as que faltam')).toBe(false);
  expect(p.includes('cenário de futebol')).toBe(true);
  expect(p.includes('FUT.REGRA')).toBe(false);
  expect(p.includes("Depois de 'yesterday'")).toBe(true);
});

test('P0.4: o giro do weekday muda a primeira área de conhecimento', () => {
  const mon = buildPrompt({
    seed: QUIZ_THEMES[0],
    count: 8,
    spare: 3,
    age: 10,
    weekday: 1,
    englishLevel: 1,
  });
  const tue = buildPrompt({
    seed: QUIZ_THEMES[0],
    count: 8,
    spare: 3,
    age: 10,
    weekday: 2,
    englishLevel: 1,
  });
  expect(mon === tue).toBe(false);
});

void run();
