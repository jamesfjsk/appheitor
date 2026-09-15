import { expect, run, test } from './harness';
import type { NoteError, NoteJudgement } from '../../../types/english';
import {
  applyFurnaceBonus,
  classifyNoteError,
  forgeMaterial,
  letterMaterial,
  materialFor,
  merchantMaterial,
  nextScaffoldStage,
  noteMaterial,
  noteScore,
  rewardFor,
} from '../scoring';
import { BUILD_XP, MIN_XP, buildXp } from '../../../config/englishRewards';

const judge = (errors: NoteError[], missing: string[] = [], isEnglish = true): Omit<NoteJudgement, 'score'> => ({
  isEnglish,
  errors,
  missing,
  corrected: '',
  note: '',
});

const err = (wrong: string, fix: string, tag: NoteError['tag']): NoteError => ({ wrong, fix, tag });

const noteCases: { name: string; j: Omit<NoteJudgement, 'score'>; level?: number; expected: 0 | 1 | 2 | 3 }[] = [
  { name: 'não é inglês', j: judge([], [], false), expected: 0 },
  { name: 'limpo', j: judge([]), expected: 3 },
  { name: 'faltou informação', j: judge([], ['para a caverna']), expected: 1 },
  { name: '1 plural', j: judge([err('two sword', 'two swords', 'plural')]), expected: 2 },
  { name: 'artigo + preposição', j: judge([err('a apple', 'an apple', 'article'), err('in the table', 'on the table', 'preposition')]), expected: 2 },
  { name: '3 pequenos', j: judge([err('a apple', 'an apple', 'article'), err('sword', 'swords', 'plural'), err('in', 'on', 'preposition')]), expected: 1 },
  { name: 'verbo errado', j: judge([err('I has', 'I have', 'verb')]), expected: 1 },
  { name: 'ordem muda o sentido', j: judge([err('the dog for', 'for the dog', 'word_order')]), expected: 1 },
  { name: 'grafia com 2 letras', j: judge([err('swrod', 'sword', 'spelling')]), expected: 2 },
  { name: 'palavra em português (other, fix grande)', j: judge([err('espada', 'sword', 'other')]), expected: 1 },
  { name: 'dígito no nível 1 é ignorado', j: judge([err('2 swords', 'two swords', 'spelling')]), level: 1, expected: 3 },
  { name: 'dígito no nível 2 conta como pequeno', j: judge([err('2 swords', 'two swords', 'spelling')]), level: 2, expected: 2 },
  { name: 'só maiúscula/pontuação é ignorado', j: judge([err('i need', 'I need', 'other'), err('swords', 'swords.', 'other')]), expected: 3 },
  { name: 'faltou informação com erro pequeno continua 1', j: judge([err('sword', 'swords', 'plural')], ['1 picareta']), expected: 1 },
];

test('noteScore: 14 casos da regra 4.5(c)', () => {
  for (const c of noteCases) {
    const got = noteScore(c.j, c.level ?? 1);
    if (got !== c.expected) throw new Error(`${c.name}: esperado ${c.expected}, recebido ${got}`);
  }
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

test('merchantMaterial: 3/2/1/0 e teto 2 com texto mostrado', () => {
  expect(merchantMaterial(3, 3, false)).toBe(3);
  expect(merchantMaterial(2, 3, false)).toBe(2);
  expect(merchantMaterial(1, 3, false)).toBe(1);
  expect(merchantMaterial(0, 3, false)).toBe(0);
  expect(merchantMaterial(3, 3, true)).toBe(2);
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
  expect(noteMaterial(0)).toBe(0);
  expect(noteMaterial(7)).toBe(3);
});

test('materialFor despacha por tipo', () => {
  expect(materialFor('merchant', { hits: 2, steps: 2, textShown: true })).toBe(2);
  expect(materialFor('letter', { hits: 3, evidenceOk: true })).toBe(3);
  expect(materialFor('note', { score: 2 })).toBe(2);
  expect(materialFor('forge', { hits: 5 })).toBe(3);
});

test('rewardFor: tabelas de XP/gold, mínimo 5 XP, não premiado só tentativa', () => {
  expect(rewardFor('merchant', 1)).toEqual({ xp: 8, gold: 3 });
  expect(rewardFor('letter', 2)).toEqual({ xp: 12, gold: 4 });
  expect(rewardFor('forge', 3)).toEqual({ xp: 16, gold: 5 });
  expect(rewardFor('note', 1)).toEqual({ xp: 10, gold: 4 });
  expect(rewardFor('note', 2)).toEqual({ xp: 15, gold: 6 });
  expect(rewardFor('note', 3)).toEqual({ xp: 20, gold: 8 });
  expect(rewardFor('merchant', 0)).toEqual({ xp: MIN_XP, gold: 0 });
  expect(rewardFor('letter', 3, false)).toEqual({ xp: MIN_XP, gold: 0 });
});

test('buildXp 10/15/20 e bônus da Fornalha com teto 3', () => {
  expect(BUILD_XP).toEqual([10, 15, 20]);
  expect(buildXp(1)).toBe(10);
  expect(buildXp(2)).toBe(15);
  expect(buildXp(3)).toBe(20);
  expect(buildXp(9)).toBe(20);
  expect(applyFurnaceBonus(2, 1, true)).toBe(3);
  expect(applyFurnaceBonus(3, 1, true)).toBe(3);
  expect(applyFurnaceBonus(2, 0, true)).toBe(2);
  expect(applyFurnaceBonus(2, 1, false)).toBe(2);
  expect(applyFurnaceBonus(0, 1, true)).toBe(0);
});

void run();
