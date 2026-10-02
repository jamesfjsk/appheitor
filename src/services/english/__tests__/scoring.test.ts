import { expect, run, test } from './harness';
import type { NoteError, NoteJudgement } from '../../../types/english';
import {
  applyFurnaceBonus,
  classifyNoteError,
  errorLosesMeaning,
  forgeMaterial,
  letterMaterial,
  materialFor,
  merchantMaterial,
  nextScaffoldStage,
  noteMaterial,
  noteScore,
  rewardFor,
  applyPickaxeBonus,
} from '../scoring';
import { BUILD_XP, MIN_XP, buildXp, noteHelpedMaterial } from '../../../config/englishRewards';

const judge = (errors: NoteError[], missing: string[] = [], isEnglish = true): Omit<NoteJudgement, 'score'> => ({
  isEnglish,
  errors,
  missing,
  corrected: '',
  note: '',
});

const err = (wrong: string, fix: string, tag: NoteError['tag'], meaningLost = false): NoteError => ({
  wrong,
  fix,
  tag,
  ...(meaningLost ? { meaningLost: true } : {}),
});

const noteCases: { name: string; j: Omit<NoteJudgement, 'score'>; level?: number; expected: 0 | 1 | 2 | 3 }[] = [
  { name: 'não é inglês', j: judge([], [], false), expected: 0 },
  { name: 'limpo', j: judge([]), expected: 3 },
  { name: 'faltou informação', j: judge([], ['para a caverna']), expected: 1 },
  { name: '1 plural', j: judge([err('two sword', 'two swords', 'plural')]), expected: 2 },
  { name: 'artigo + preposição', j: judge([err('a apple', 'an apple', 'article'), err('in the table', 'on the table', 'preposition')]), expected: 2 },
  { name: '3 pequenos', j: judge([err('a apple', 'an apple', 'article'), err('sword', 'swords', 'plural'), err('in', 'on', 'preposition')]), expected: 1 },
  { name: 'verbo que não muda o sentido', j: judge([err('I has', 'I have', 'verb')]), expected: 2 },
  { name: 'ordem que perde o sentido', j: judge([err('the dog for', 'for the dog', 'word_order', true)]), expected: 1 },
  { name: 'grafia com 2 letras', j: judge([err('swrod', 'sword', 'spelling')]), expected: 2 },
  { name: 'palavra em português que perde o sentido', j: judge([err('espada', 'sword', 'other', true)]), expected: 1 },
  { name: 'dígito no nível 1 é ignorado', j: judge([err('2 swords', 'two swords', 'spelling')]), level: 1, expected: 3 },
  { name: 'dígito no nível 2 conta como pequeno', j: judge([err('2 swords', 'two swords', 'spelling')]), level: 2, expected: 2 },
  { name: 'só maiúscula/pontuação é ignorado', j: judge([err('i need', 'I need', 'other'), err('swords', 'swords.', 'other')]), expected: 3 },
  { name: 'faltou informação com erro pequeno continua 1', j: judge([err('sword', 'swords', 'plural')], ['1 picareta']), expected: 1 },
];

test('noteScore: 14 casos da regra 9.5', () => {
  for (const c of noteCases) {
    const got = noteScore(c.j, c.level ?? 1);
    if (got !== c.expected) throw new Error(`${c.name}: esperado ${c.expected}, recebido ${got}`);
  }
});

const ideasOk = [
  { pt: 'quero jogar bola', ok: true },
  { pt: 'faço a lição primeiro', ok: true },
  { pt: 'espero porque a lição vem primeiro', ok: true },
];

test('frases reais do Firestore, coladas inteiras', () => {
  const set30first = 'I want play soccer. I do my homework first. I wait because my homework is first.';
  const set30second = 'I want to play soccer. I do my homework first. I wait because my homework is first.';
  const set28 = "I don't want play soccer now. I do my homework first because homework is important.";
  const set29 = 'Can I wait I do now? I can because dinner is first.';
  const portugues = 'Eu quero jogar bola. Eu faço a lição primeiro. Eu espero porque a lição vem primeiro.';

  const first30 = noteScore({
    isEnglish: true,
    ideas: ideasOk,
    errors: [{ wrong: 'want play', fix: 'want to play', tag: 'verb', meaningLost: true }],
    missing: [],
    corrected: set30second,
    note: set30first,
  });
  if (first30 !== 2) throw new Error(`30/09 primeira: esperado 2, recebido ${first30}`);
  expect(errorLosesMeaning({ wrong: 'want play', fix: 'want to play', tag: 'verb', meaningLost: true })).toBeFalsy();

  const second30 = noteScore({
    isEnglish: true,
    ideas: ideasOk,
    errors: [],
    missing: [],
    corrected: set30second,
    note: set30second,
  });
  if (second30 !== 3) throw new Error(`30/09 segunda: esperado 3, recebido ${second30}`);

  const first28 = noteScore({
    isEnglish: true,
    ideas: ideasOk,
    errors: [{ wrong: 'want play', fix: 'want to play', tag: 'verb', meaningLost: true }],
    missing: [],
    corrected: "I don't want to play soccer now. I do my homework first because homework is important.",
    note: set28,
  });
  if (first28 !== 2) throw new Error(`28/09 primeira: esperado 2, recebido ${first28}`);

  const invented29 = {
    fonte: 'inventado' as const,
    text: set29,
    judgement: {
      isEnglish: true,
      ideas: [
        { pt: 'quero jogar bola', ok: false },
        { pt: 'faço a lição primeiro', ok: false },
        { pt: 'espero porque a lição vem primeiro', ok: true },
      ],
      errors: [{ wrong: 'Can I wait I do now', fix: 'I want to play soccer', tag: 'word_order' as const, meaningLost: true }],
      missing: ['quero jogar bola', 'faço a lição primeiro'],
      corrected: '',
      note: set29,
    },
  };
  expect(invented29.fonte).toBe('inventado');
  expect(invented29.text).toBe(set29);
  expect(noteScore(invented29.judgement)).toBe(1);

  expect(noteScore({ isEnglish: false, errors: [], missing: [], corrected: portugues, note: portugues })).toBe(0);
});

test('classifyNoteError por etiqueta e tamanho do fix', () => {
  expect(classifyNoteError(err('a', 'an', 'article'))).toBe('small');
  expect(classifyNoteError(err('go', 'goes', 'verb'))).toBe('blocking');
  expect(classifyNoteError(err('tourch', 'torch', 'spelling'))).toBe('small');
  expect(classifyNoteError(err('espada', 'sword', 'spelling'))).toBe('blocking');
  expect(classifyNoteError(err('2 swords', 'two swords', 'spelling'), 2)).toBe('small');
  expect(classifyNoteError(err('Sword', 'sword', 'spelling'))).toBe('ignored');
});

test('andaime: sobe a cada 2 notas 3 seguidas, nunca desce', () => {
  let s = nextScaffoldStage(0, 0, 3);
  expect(s).toEqual({ scaffoldStage: 0, noteStreak3: 1 });
  s = nextScaffoldStage(s.scaffoldStage, s.noteStreak3, 3);
  expect(s).toEqual({ scaffoldStage: 1, noteStreak3: 0 });
  s = nextScaffoldStage(s.scaffoldStage, s.noteStreak3, 2);
  expect(s).toEqual({ scaffoldStage: 1, noteStreak3: 0 });
  s = nextScaffoldStage(1, 1, 3);
  expect(s).toEqual({ scaffoldStage: 2, noteStreak3: 0 });
  s = nextScaffoldStage(2, 1, 3);
  expect(s.scaffoldStage).toBe(2);
});

test('merchantMaterial: 3 de 3 paga 3 mesmo com o texto aberto', () => {
  expect(merchantMaterial(3, 3, false)).toBe(3);
  expect(merchantMaterial(2, 3, false)).toBe(2);
  expect(merchantMaterial(1, 3, false)).toBe(1);
  expect(merchantMaterial(0, 3, false)).toBe(0);
  expect(merchantMaterial(3, 3, true)).toBe(3);
  expect(merchantMaterial(2, 2, false)).toBe(3);
  expect(merchantMaterial(1, 2, false)).toBe(2);
  expect(merchantMaterial(4, 4, false)).toBe(3);
  expect(merchantMaterial(0, 0, false)).toBe(0);
});

test('letterMaterial: por acertos, decisão sem evidência vale meio', () => {
  expect(letterMaterial(3, true)).toBe(3);
  expect(letterMaterial(2, true)).toBe(2);
  expect(letterMaterial(1, true)).toBe(1);
  expect(letterMaterial(0, true)).toBe(0);
  expect(letterMaterial(3, false)).toBe(2);
  expect(letterMaterial(1, false)).toBe(0);
  expect(letterMaterial(2, true, 2)).toBe(3);
  expect(letterMaterial(1, true, 2)).toBe(1);
});

test('forgeMaterial e noteMaterial', () => {
  expect(forgeMaterial(6)).toBe(3);
  expect(forgeMaterial(5)).toBe(3);
  expect(forgeMaterial(4.5)).toBe(2);
  expect(forgeMaterial(3)).toBe(2);
  expect(forgeMaterial(2)).toBe(0);
  expect(noteMaterial(3)).toBe(3);
  expect(noteMaterial(2)).toBe(2);
  expect(noteMaterial(1)).toBe(0);
  expect(noteMaterial(0)).toBe(0);
  expect(noteMaterial(7)).toBe(3);
  expect(noteHelpedMaterial(3, false)).toBe(3);
  expect(noteHelpedMaterial(3, true)).toBe(2);
  expect(noteHelpedMaterial(1, true)).toBe(0);
});

test('materialFor despacha por tipo', () => {
  expect(materialFor('merchant', { hits: 2, steps: 2, textShown: true })).toBe(3);
  expect(materialFor('letter', { hits: 3, evidenceOk: true })).toBe(3);
  expect(materialFor('note', { score: 2 })).toBe(2);
  expect(materialFor('forge', { hits: 5 })).toBe(3);
});

test('rewardFor: tabelas de XP/gold, mínimo 5 XP, não premiado só tentativa', () => {
  expect(rewardFor('merchant', 1)).toEqual({ xp: 8, gold: 2 }); // gold pela metade desde 18/09
  expect(rewardFor('letter', 2)).toEqual({ xp: 12, gold: 2 });
  expect(rewardFor('forge', 3)).toEqual({ xp: 16, gold: 3 });
  expect(rewardFor('note', 1)).toEqual({ xp: 10, gold: 2 });
  expect(rewardFor('note', 2)).toEqual({ xp: 15, gold: 3 });
  expect(rewardFor('note', 3)).toEqual({ xp: 20, gold: 4 });
  expect(rewardFor('merchant', 0)).toEqual({ xp: MIN_XP, gold: 0 });
  expect(rewardFor('letter', 3, false)).toEqual({ xp: MIN_XP, gold: 0 });
});

test('buildXp 0 (construir não paga XP) e bônus da Fornalha com teto 3', () => {
  expect(BUILD_XP).toEqual([0, 0, 0]);
  expect(buildXp(1)).toBe(0);
  expect(buildXp(2)).toBe(0);
  expect(buildXp(3)).toBe(0);
  expect(buildXp(9)).toBe(0);
  expect(applyFurnaceBonus(2, 1, true)).toBe(3);
  expect(applyFurnaceBonus(3, 1, true)).toBe(3);
  expect(applyFurnaceBonus(2, 0, true)).toBe(2);
  expect(applyFurnaceBonus(2, 1, false)).toBe(2);
  expect(applyFurnaceBonus(0, 1, true)).toBe(0);
  expect(applyPickaxeBonus(2, 0, 0)).toBe(2);
  expect(applyPickaxeBonus(2, 1, 0)).toBe(3);
  expect(applyPickaxeBonus(2, 1, 1)).toBe(2);
  expect(applyPickaxeBonus(2, 2, 1)).toBe(3);
  expect(applyPickaxeBonus(2, 2, 2)).toBe(2);
  expect(applyPickaxeBonus(2, 3, 4)).toBe(3);
  expect(applyPickaxeBonus(3, 4, 0)).toBe(3);
  expect(applyPickaxeBonus(0, 4, 0)).toBe(0);
});

void run();
