import { expect, run, test } from '../../english/__tests__/harness';
import { QUIZ_THEMES } from '../../../config/quizCurriculum';
import { buildPrompt, moldOfDay, replacementBrief } from '../dailyPrompt';
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

test('P1.5: o prompt escreve o ângulo e a profundidade', () => {
  const angle = QUIZ_THEMES[0].angles[1];
  const text = buildPrompt({
    seed: QUIZ_THEMES[0],
    count: 8,
    spare: 3,
    age: 10,
    weekday: 1,
    englishLevel: 1,
    angle,
    depth: 2,
  });
  expect(text.includes(angle)).toBe(true);
  expect(text.includes('Profundidade 2: aprofunde')).toBe(true);
  expect(text.includes('primeiro contato')).toBe(false);
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

test('10b-2: dois dias seguidos não repetem o molde na mesma área', () => {
  const areas = ['matemática', 'ciências', 'história ou geografia', 'inglês'];
  for (const area of areas) {
    expect(moldOfDay(area, '2026-12-07') === moldOfDay(area, '2026-12-08')).toBe(false);
    expect(moldOfDay(area, '2026-12-08', 2) === moldOfDay(area, '2026-12-09', 2)).toBe(false);
  }
  const a = buildPrompt({ seed: QUIZ_THEMES[0], count: 8, spare: 3, age: 10, weekday: 1, englishLevel: 1, date: '2026-12-07' });
  const b = buildPrompt({ seed: QUIZ_THEMES[0], count: 8, spare: 3, age: 10, weekday: 1, englishLevel: 1, date: '2026-12-08' });
  expect(a.includes('A conta de hoje segue este molde, com outra história e outros números')).toBe(true);
  expect(a.includes('abelha')).toBe(false);
  expect(a.includes('There ___ a cat on the mat')).toBe(false);
  expect(a.includes('Qual fato é verdadeiro')).toBe(true);
  expect(a === b).toBe(false);
});

void run();
