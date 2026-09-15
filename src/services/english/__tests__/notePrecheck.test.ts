import { expect, run, test } from './harness';
import { levenshtein, matchesInfo, missingInfos, normalize, singularize, tokenMatches, wordDistance } from '../notePrecheck';

test('normalize: minúsculas, sem acento/pontuação, número por extenso vira dígito, plural sai', () => {
  expect(normalize('Two Swords!')).toBe('2 sword');
  expect(normalize('  I need TWENTY torches, please. ')).toBe('i need 20 torch please');
  expect(normalize('maçã e ação')).toBe('maca e acao');
  expect(normalize("Don't stop the boxes")).toBe('dont stop the box');
  expect(normalize('This is his glass')).toBe('this is his glass');
  expect(singularize('cherries')).toBe('cherry');
  expect(singularize('keys')).toBe('key');
});

test('levenshtein e tokenMatches (curtos exigem igualdade)', () => {
  expect(levenshtein('sword', 'sword')).toBe(0);
  expect(levenshtein('sword', 'swordz')).toBe(1);
  expect(levenshtein('sword', 'sowrd')).toBe(1);
  expect(levenshtein('abcd', 'badc')).toBe(2);
  expect(levenshtein('sword', 'swrd')).toBe(1);
  expect(tokenMatches('sword', 'swordz')).toBeTruthy();
  expect(tokenMatches('2', '3')).toBeFalsy();
  expect(tokenMatches('in', 'on')).toBeFalsy();
  expect(tokenMatches('cave', 'cav')).toBeTruthy();
});

const swords = { pt: '2 espadas', en: ['two swords', '2 swords'] };
const pickaxe = { pt: '1 picareta', en: ['one pickaxe', 'a pickaxe'] };
const cave = { pt: 'para a caverna', en: ['for the cave', 'in the cave'] };

const pairs: [string, boolean][] = [
  ['I need two swords', true],
  ['I need 2 swords', true],
  ['I need 2 sword', true],
  ['i need TWO SWORDS.', true],
  ['I need two swordz', true],
  ['I need three swords', false],
  ['I need swords two', false],
  ['I need two big swords', true],
  ['I need two', false],
  ['', false],
];

test('matchesInfo: tabela de pares (variantes, dígito, plural, erro de 1 letra, ordem)', () => {
  for (const [text, expected] of pairs) {
    expect(matchesInfo(text, swords)).toBe(expected);
  }
});

test('matchesInfo: acento e artigo', () => {
  expect(matchesInfo('Coloque a maçã', { pt: 'maçã', en: ['maca'] })).toBeTruthy();
  expect(matchesInfo('It is for the cave.', cave)).toBeTruthy();
  expect(matchesInfo('I have a torch in the cave', cave)).toBeTruthy();
  expect(matchesInfo('It is for my cave.', cave)).toBeFalsy();
  expect(matchesInfo('I need two torches', { pt: '2 tochas', en: ['two torch'] })).toBeTruthy();
});

test('missingInfos devolve o que faltou, na ordem', () => {
  const all = [swords, pickaxe, cave];
  expect(missingInfos('I need two swords and one pickaxe. The pickaxe is for the cave.', all)).toEqual([]);
  expect(missingInfos('I need two swords. It is for the cave.', all)).toEqual([pickaxe]);
  expect(missingInfos('Hello', all)).toEqual(all);
  expect(missingInfos('I need a pickaxe', all).map((m) => m.pt)).toEqual(['2 espadas', 'para a caverna']);
});

test('wordDistance conta palavras trocadas, ignora maiúscula e pontuação', () => {
  expect(wordDistance('I need two sword.', 'I need two swords.')).toBe(1);
  expect(wordDistance('i need two swords', 'I need two swords!')).toBe(0);
  expect(wordDistance('need two swords', 'I need two swords')).toBe(1);
  expect(wordDistance('I want the sword for dog', 'I want the sword for the dog')).toBe(1);
});

void run();
