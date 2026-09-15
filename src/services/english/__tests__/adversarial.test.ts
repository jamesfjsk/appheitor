// ========================================
// Testes adversariais da fundação: casos de borda que a revisão independente
// encontrou ou quis blindar (sala do nível 3, pré-checagem, embaralhamento,
// validadores e tokens proibidos).
// ========================================

import { expect, run, test } from './harness';
import type { NoteInfo } from '../../../types/english';
import { MERCHANT_CATALOGS, MERCHANT_ITEMS, MERCHANT_SPOTS } from '../../../config/englishBase';
import { findForbiddenTokens } from '../../../config/englishLevels';
import { buildMerchantRoom } from '../merchantRoom';
import { levenshtein, matchesInfo, missingInfos } from '../notePrecheck';
import { classifyNoteError, noteScore } from '../scoring';
import { shuffleOptions } from '../shuffle';
import { checkMerchantSentence, longestSentenceWords, merchantAllowlist, validateForge, validateLetter, validateNote, missingDeterminerAfterPreposition } from '../validators';

// ---------- sala do Comerciante, nível 3 ----------

test('nível 3 em 2000 sementes: relação sempre permitida, item nunca repete, estoque cobre o passo', () => {
  const allowed = new Map(MERCHANT_SPOTS.map((s) => [s.id, new Set(s.relations)]));
  for (let seed = 1; seed <= 2000; seed++) {
    const room = buildMerchantRoom(seed, 3, MERCHANT_SPOTS, MERCHANT_ITEMS);
    const items = room.steps.map((s) => s.item);
    if (new Set(items).size !== items.length) throw new Error(`semente ${seed}: item repetido`);
    if (room.steps.length !== 4) throw new Error(`semente ${seed}: ${room.steps.length} passos`);
    if (room.spots.length !== 6) throw new Error(`semente ${seed}: ${room.spots.length} lugares`);
    for (const step of room.steps) {
      if (!allowed.get(step.spot)?.has(step.relation)) throw new Error(`semente ${seed}: ${step.relation} em ${step.spot}`);
      if (!room.spots.some((s) => s.id === step.spot)) throw new Error(`semente ${seed}: lugar fora da sala`);
      const tray = room.items.find((it) => it.id === step.item);
      if (!tray || tray.stock < step.qty) throw new Error(`semente ${seed}: estoque de ${step.item}`);
    }
    const trayIds = room.items.map((it) => it.id);
    if (new Set(trayIds).size !== trayIds.length) throw new Error(`semente ${seed}: item repetido na bandeja`);
  }
});

// ---------- pré-checagem do Recado ----------

const swords: NoteInfo = { pt: '2 espadas', en: ['two swords', '2 swords'] };
const cave: NoteInfo = { pt: 'para a caverna', en: ['for the cave', 'in the cave'] };
const dog: NoteInfo = { pt: 'para o cachorro', en: ['for the dog', 'for my dog'] };
const torches: NoteInfo = { pt: '12 tochas', en: ['twelve torches'] };

const hardPairs: [string, NoteInfo, boolean][] = [
  ['I need 2 sword', swords, true],
  ['I need 2 sowrds', swords, true],
  ['I need two swrods', swords, true],
  ['I need two swordss', swords, false],
  ['I need TWO Swords!!!', swords, true],
  ['i need two swords', { pt: '2 espadas', en: ['2 swords', 'two swords'] }, true],
  ['I need two sowrsd', swords, false],
  ['I need swords two', swords, false],
  ['I need two big swords', swords, true],
  ['I need 3 swords', swords, false],
  ['I need two', swords, false],
  ['I need swords', swords, false],
  ['I need twelve torches', torches, true],
  ['I need 12 torch', torches, true],
  ['I need 20 torches', torches, false],
  ['It is for the cavé', cave, true],
  ['It is for the caves', cave, true],
  ['It is for a cave', cave, false],
  ['It is for the cove', cave, true],
  // Folga de 1 letra aceita cake por cave: limite assumido da pré-checagem (o juiz pega)
  ['It is for the cake', cave, true],
  ['for my dog it is', dog, true],
  ['for the dogs', dog, true],
  ['for dog', dog, false],
  ['Eu preciso de duas espadas', swords, false],
];

test('matchesInfo: 24 pares difíceis (acento, dígito, transposição, plural, ordem, ausência)', () => {
  for (const [text, info, expected] of hardPairs) {
    if (matchesInfo(text, info) !== expected) throw new Error(`"${text}" x ${info.en[0]}: esperado ${expected}`);
  }
  expect(missingInfos('I need 2 sowrds for my dog', [swords, dog, cave]).map((m) => m.pt)).toEqual(['para a caverna']);
});

test('levenshtein: transposição vizinha vale 1, troca dupla vale 2', () => {
  expect(levenshtein('sowrds', 'swords')).toBe(1);
  expect(levenshtein('sowrsd', 'swords')).toBe(2);
  expect(levenshtein('', 'abc')).toBe(3);
});

// ---------- nota: "other" bloqueia mesmo com fix curto ----------

test('other é bloqueante (palavra em português curta: em -> in), spelling curto continua pequeno', () => {
  expect(classifyNoteError({ wrong: 'em the cave', fix: 'in the cave', tag: 'other' })).toBe('blocking');
  expect(classifyNoteError({ wrong: 'em the cave', fix: 'in the cave', tag: 'spelling' })).toBe('small');
  expect(noteScore({ isEnglish: true, errors: [{ wrong: 'e', fix: 'and', tag: 'other' }], missing: [], corrected: '', note: '' })).toBe(1);
});

// ---------- embaralhamento ----------

test('shuffleOptions com 2 opções nunca devolve a original em 1000 sementes, qualquer answer', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    for (const answer of [0, 1]) {
      const r = shuffleOptions(['is', 'are'], answer, seed);
      if (r.options[0] === 'is') throw new Error(`semente ${seed}: ordem original`);
      if (r.options[r.answer] !== ['is', 'are'][answer]) throw new Error(`semente ${seed}: answer errado`);
    }
  }
});

// ---------- Carta ----------

const text =
  'Scout report. Name: Lucas. Position: striker. He is fast and he has a strong kick. But he is lazy. He is not a good runner. ' +
  'Price: three emeralds. Name: Rafa. Position: goalkeeper. He is tall and calm. He has big hands. Price: two emeralds. ' +
  'The game is on Saturday. We need one fast player.';
const glossary = [
  { en: 'striker', pt: 'atacante' },
  { en: 'lazy', pt: 'preguiçoso' },
  { en: 'goalkeeper', pt: 'goleiro' },
  { en: 'calm', pt: 'calmo' },
];
const q1 = { kind: 'decision', question: 'You have three emeralds and you need a fast player. Who do you hire?', options: ['Lucas', 'Rafa', 'The scout', 'The coach'], answer: 0, evidence: 'He is fast', explanation: 'x' };
const q2 = { kind: 'comprehension', question: 'Why is Lucas a problem?', options: ['He is lazy', 'He is tall', 'He is calm', 'He is slow'], answer: 0, evidence: 'But he is lazy', explanation: 'x' };
const q3 = { kind: 'comprehension', question: 'How many emeralds is Rafa?', options: ['two', 'three', 'one', 'four'], answer: 0, evidence: 'Price: two emeralds', explanation: 'x' };
const letter = { genre: 'scout_report', title: 'Scout report', sender: 'Coach', text, glossary, questions: [q1, q2, q3], translation: 'x' };

test('validateLetter aceita a pergunta de decisão da especificação (2 frases, 14 palavras)', () => {
  expect(longestSentenceWords(q1.question)).toBe(10);
  const r = validateLetter(letter, 1, [], 7);
  expect(r.ok).toBeTruthy();
  expect(r.problems).toEqual([]);
  expect(r.content.questions).toHaveLength(3);
  expect(r.content.questions[0].kind).toBe('decision');
  const tooLong = validateLetter({ ...letter, questions: [{ ...q1, question: 'You have three emeralds and you need a very fast player for the game. Who do you hire?' }, q2, q3] }, 1, []);
  expect(tooLong.content.questions).toHaveLength(2);
  expect(tooLong.problems.join(' ')).toContain('frase do enunciado');
});

test('validateLetter: opção certa mais longa é descartada; empate no tamanho passa', () => {
  const longest = validateLetter({ ...letter, questions: [{ ...q2, options: ['He is very lazy', 'He is tall', 'He is calm', 'He is slow'] }, q1, q3] }, 1, []);
  expect(longest.content.questions).toHaveLength(2);
  expect(longest.problems.join(' ')).toContain('mais longa');
  const tie = validateLetter({ ...letter, questions: [{ ...q2, options: ['He is lazy', 'He is tall', 'He is calm', 'He is very slow'] }, q1, q3] }, 1, []);
  expect(tie.content.questions).toHaveLength(3);
});

test('validateLetter: evidence fora do texto (parafraseada ou de outra pergunta) descarta a pergunta', () => {
  const para = validateLetter({ ...letter, questions: [{ ...q2, evidence: 'Lucas is lazy' }, q1, q3] }, 1, []);
  expect(para.content.questions).toHaveLength(2);
  expect(para.problems.join(' ')).toContain('evidence');
  const spaced = validateLetter({ ...letter, questions: [{ ...q2, evidence: '  but HE is   lazy ' }, q1, q3] }, 1, []);
  expect(spaced.content.questions).toHaveLength(3);
  const twoBad = validateLetter({ ...letter, questions: [{ ...q2, evidence: 'zzz' }, { ...q1, evidence: 'yyy' }, q3] }, 1, []);
  expect(twoBad.ok).toBeFalsy();
});

test('validateLetter: glossário exige 4 válidas em qualquer nível (não o mínimo do nível)', () => {
  const lvl3Text = Array.from({ length: 12 }, () => 'The striker is lazy and the goalkeeper is calm.').join(' ');
  const r = validateLetter({ ...letter, text: lvl3Text, questions: [{ ...q2, evidence: 'The striker is lazy' }, { ...q1, evidence: 'the goalkeeper is calm' }, { ...q3, evidence: 'is calm' }] }, 3, [], 1);
  expect(r.problems.join(' ')).not.toContain('glossário');
});

// ---------- Recado ----------

test('validateNote: sem ruído em problems quando a IA não manda templates; molde ruim da IA é descartado', () => {
  const note = {
    brief: 'Peça 2 espadas e 1 picareta para a caverna.',
    mustInclude: [swords, { pt: '1 picareta', en: ['one pickaxe', 'a pickaxe'] }, cave],
    wordBank: ['need', 'sword', 'pickaxe', 'cave', 'for', 'have', 'want', 'torch', 'dog', 'and', 'is', 'the'],
    model: 'I need two swords and one pickaxe. The pickaxe is for the cave.',
    hint: '',
  };
  const r = validateNote(note, 1);
  expect(r.ok).toBeTruthy();
  expect(r.problems).toEqual([]);
  expect(r.content.templates.length >= 4).toBeTruthy();
  const bad = validateNote({ ...note, templates: ['I went to ___.', 'no blank here'] }, 1);
  expect(bad.content.templates).toEqual(r.content.templates);
  const good = validateNote({ ...note, templates: ['I need ___ for ___.'] }, 1);
  expect(good.content.templates).toEqual(['I need ___ for ___.']);
});

// ---------- Comerciante: artigo para qty 1 ----------

test('checkMerchantSentence: qty 1 exige the/a/an/one e concordância a/an', () => {
  const allow = merchantAllowlist();
  const torch = { item: 'torch', qty: 1 as const, relation: 'on' as const, spot: 'table' };
  const apple = { ...torch, item: 'apple' };
  const boots = { ...torch, item: 'boots' };
  expect(checkMerchantSentence('Put torch on the table.', torch, MERCHANT_CATALOGS, allow, 10)).toMatch(/sem the/);
  expect(checkMerchantSentence('Put a apple on the table.', apple, MERCHANT_CATALOGS, allow, 10)).toMatch(/vogal/);
  expect(checkMerchantSentence('Put an torch on the table.', torch, MERCHANT_CATALOGS, allow, 10)).toMatch(/consoante/);
  expect(checkMerchantSentence('Put a boots on the table.', boots, MERCHANT_CATALOGS, allow, 10)).toMatch(/plural/);
  expect(checkMerchantSentence('Put a big apple on the table.', apple, MERCHANT_CATALOGS, allow, 10)).toBe(null);
  expect(checkMerchantSentence('Can you put one torch on the table?', torch, MERCHANT_CATALOGS, allow, 10)).toBe(null);
  expect(checkMerchantSentence('Put the boots on the table.', boots, MERCHANT_CATALOGS, allow, 10)).toBe(null);
});

// ---------- Ferraria ----------

test('validateForge: scramble com words já na ordem da resposta ainda sai embaralhado', () => {
  const rule = 'Verbo primeiro.';
  const items = [
    { kind: 'scramble', words: ['put', 'the', 'torch', 'on', 'the', 'table'], answer: 'Put the torch on the table.', rule },
    { kind: 'scramble', words: ['open', 'the', 'big', 'door'], answer: 'Open the big door.', rule },
    { kind: 'scramble', words: ['Give', 'me', 'two', 'keys.'], answer: 'Give me two keys.', rule },
    { kind: 'gap', sentence: 'There ___ two apples.', options: ['is', 'are', 'am'], answer: 1, rule },
    { kind: 'typed', prompt: 'Plural de key', sentence: 'I need two ___.', accepted: ['keys'], rule },
    { kind: 'typed', prompt: 'Plural de torch', sentence: 'I need three ___.', accepted: ['torches'], rule },
  ];
  for (let seed = 1; seed <= 300; seed++) {
    const r = validateForge({ target: 'Ordem', items }, 1, seed);
    expect(r.ok).toBeTruthy();
    for (const it of r.content.items) {
      if (it.kind !== 'scramble') continue;
      const answerWords = it.answer.toLowerCase().replace(/[^a-z' ]/g, '').split(/\s+/);
      if (it.words.join(' ') === answerWords.join(' ')) throw new Error(`semente ${seed}: "${it.answer}" sem embaralhar`);
      expect([...it.words].sort()).toEqual([...answerWords].sort());
    }
  }
});

// ---------- tokens proibidos: 30 armadilhas ----------

test('findForbiddenTokens: 30 palavras armadilha passam no nível 1', () => {
  const traps = [
    'red', 'bed', 'need', 'king', 'morning', 'evening', 'seed', 'feed', 'speed', 'building',
    'ring', 'thing', 'something', 'nothing', 'string', 'bring', 'sing', 'wing', 'spring', 'during',
    'tired', 'bored', 'scared', 'hundred', 'bread', 'head', 'shed', 'sled', 'friend', 'weekend',
  ];
  const found = findForbiddenTokens(traps.join(' '), 1);
  expect(found).toEqual([]);
  expect(findForbiddenTokens('everything painting drawing meeting feeling ceiling pudding indeed agreed fried', 1)).toEqual([]);
});

test('findForbiddenTokens: going to + verbo é futuro (proibido); going to + lugar não; like going no nível 2', () => {
  expect(findForbiddenTokens('I like going to the mine.', 2)).toEqual([]);
  expect(findForbiddenTokens('I like going to swim.', 2)).toEqual(['going']);
  expect(findForbiddenTokens('We are going to the mine.', 3)).toEqual([]);
  expect(findForbiddenTokens('We are going to be late.', 3)).toEqual(['going']);
  expect(findForbiddenTokens('I am going to the mine.', 1)).toEqual(['going']);
  expect(findForbiddenTokens('He washes the dog. Wash the cat.', 1)).toEqual([]);
  expect(findForbiddenTokens("I won't go. She'd go.", 1)).toContain("won't");
  expect(findForbiddenTokens('The lost key. He fed the dog. We built it.', 1)).toEqual(['lost', 'fed', 'built']);
});

void run();

test('scramble: substantivo sem artigo depois de preposição é rejeitado', () => {
  expect(missingDeterminerAfterPreposition(['put', 'the', 'ball', 'next', 'to', 'goal'])).toBe('next to goal');
  expect(missingDeterminerAfterPreposition(['put', 'the', 'ball', 'next', 'to', 'the', 'goal'])).toBe(null);
  expect(missingDeterminerAfterPreposition(['put', 'two', 'apples', 'on', 'my', 'table'])).toBe(null);
  expect(missingDeterminerAfterPreposition(['the', 'cat', 'is', 'under', 'table'])).toBe('under table');
  expect(missingDeterminerAfterPreposition(['we', 'play', 'on', 'sunday'], 'We play on Sunday.')).toBe(null);
  expect(missingDeterminerAfterPreposition(['he', 'is', 'at', 'home'])).toBe(null);
  expect(missingDeterminerAfterPreposition(['i', 'want', 'to', 'play'])).toBe(null);
});
