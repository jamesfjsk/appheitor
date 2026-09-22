import { expect, run, test } from './harness';
import { MERCHANT_CATALOGS } from '../../../config/englishBase';
import { buildMerchantContent, buildMerchantRoom, offlineSentences } from '../merchantRoom';
import { checkMerchantSentence, merchantAllowlist, validateForge, validateLetter, validateMerchant, validateNote } from '../validators';

// ---------- Comerciante ----------

test('frases de reserva passam no validador em 300 sementes por nível', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 300; seed++) {
      const content = buildMerchantContent(seed, level);
      const r = validateMerchant(content, level);
      if (!r.ok || r.replaced.length) throw new Error(`semente ${seed} nível ${level}: ${r.problems.join(' | ')}`);
      expect(r.content.gapped).toHaveLength(content.steps.length);
    }
  }
});

const room = buildMerchantContent(5, 1);
const step0 = room.steps[0];
const step1 = room.steps[1];
const def = (id: string) => MERCHANT_CATALOGS.items.find((i) => i.id === id);
const spotOf = (id: string) => MERCHANT_CATALOGS.spots.find((s) => s.id === id);
const relEn = (r: string): string => (r === 'next_to' ? 'next to' : r);
const noun = (s: typeof step0): string => (s.qty === 1 ? def(s.item)?.label ?? '' : def(s.item)?.plural ?? '');
const qtyWord = (s: typeof step0): string => ['', 'the', 'two', 'three'][s.qty];

test('validateMerchant aceita variação da IA e traduz; frase ruim vira a de reserva', () => {
  const good = [
    `Can you put ${qtyWord(step0)} ${noun(step0)} ${relEn(step0.relation)} the ${spotOf(step0.spot)?.label}, please?`,
    `First, put ${qtyWord(step1)} ${noun(step1)} ${relEn(step1.relation)} the ${spotOf(step1.spot)?.label}.`,
  ];
  const r = validateMerchant({ ...room, sentences: good, translation: ['Tradução 1', 'Tradução 2'] }, 1);
  expect(r.ok).toBeTruthy();
  expect(r.replaced).toEqual([]);
  expect(r.content.sentences).toEqual(good);
  expect(r.content.translation).toEqual(['Tradução 1', 'Tradução 2']);
  expect(r.content.gapped[0]).toContain('___');
  expect(r.content.gapped[0]).not.toContain(noun(step0));

  const offline = offlineSentences(room.steps, MERCHANT_CATALOGS, room.items);
  const bad = validateMerchant({ ...room, sentences: ['Put 2 things somewhere.', good[1]], translation: ['x'] }, 1);
  expect(bad.ok).toBeTruthy();
  expect(bad.replaced).toEqual([0]);
  expect(bad.content.sentences[0]).toBe(offline.sentences[0]);
  expect(bad.content.translation[0]).toBe(offline.translations[0]);
  expect(bad.content.sentences[1]).toBe(good[1]);
  expect(bad.problems.length >= 1).toBeTruthy();
  const missing = validateMerchant({ ...room, sentences: undefined, translation: undefined }, 1);
  expect(missing.replaced).toEqual([0, 1]);
  expect(missing.content.sentences).toEqual(offline.sentences);
});

test('checkMerchantSentence: 6 frases ruins reprovadas com motivo', () => {
  const allow = merchantAllowlist();
  const step = { item: 'apple', qty: 2 as const, relation: 'on' as const, spot: 'table' };
  const cases: [string, RegExp][] = [
    ['Put 2 apples on the table.', /dígito/],
    ['Put two apples under the table.', /preposição/],
    ['Put two apple on the table.', /forma errada|ausente/],
    ['Put two apples on the table next to the door.', /outro lugar|mais de uma/],
    ['Kindly place two apples on the table.', /fora da lista/],
    ['Put three apples on the table.', /quantidade/],
    ['Put two apples and the torch on the table.', /outro item/],
    ['Please put the two red apples right on the big table now, my friend.', /palavras/],
    ['', /vazia/],
  ];
  for (const [sentence, re] of cases) {
    const reason = checkMerchantSentence(sentence, step, MERCHANT_CATALOGS, allow, 10);
    if (!reason || !re.test(reason)) throw new Error(`"${sentence}": motivo ${JSON.stringify(reason)} não casa com ${re}`);
  }
  expect(checkMerchantSentence('Put two apples on the table.', step, MERCHANT_CATALOGS, allow, 10)).toBe(null);
  expect(checkMerchantSentence('Put the apple on the table.', { ...step, qty: 1 }, MERCHANT_CATALOGS, allow, 10)).toBe(null);
  expect(checkMerchantSentence('Put an apple on the table.', { ...step, qty: 1 }, MERCHANT_CATALOGS, allow, 10)).toBe(null);
});

test('validateMerchant rejeita estrutura errada (relação não permitida, item repetido)', () => {
  const badRelation = validateMerchant({ ...room, steps: [{ ...step0, relation: 'in', spot: 'door' }, step1], spots: [...room.spots, { id: 'door', label: 'door', image: '', relations: ['next_to', 'under'] }] }, 1);
  expect(badRelation.ok).toBeFalsy();
  const repeated = validateMerchant({ ...room, steps: [step0, { ...step1, item: step0.item }] }, 1);
  expect(repeated.ok).toBeFalsy();
});

// ---------- Carta ----------

const letterText =
  'Scout report. Name: Lucas. Position: striker. He is fast and he has a strong kick. But he is lazy. He is not a good runner. ' +
  'Price: three emeralds. Name: Rafa. Position: goalkeeper. He is tall and calm. He has big hands. Price: two emeralds. ' +
  'The game is on Saturday. We need one fast player.';

const goodLetter = {
  genre: 'scout_report',
  title: 'Scout report',
  sender: 'Coach Bruno',
  text: letterText,
  glossary: [
    { en: 'striker', pt: 'atacante' },
    { en: 'lazy', pt: 'preguiçoso' },
    { en: 'goalkeeper', pt: 'goleiro' },
    { en: 'calm', pt: 'calmo' },
    { en: 'kick', pt: 'chute' },
    { en: 'fast', pt: 'rápido' },
  ],
  questions: [
    { kind: 'decision', question: 'You need a fast player. Who do you hire?', options: ['Lucas', 'Rafa', 'The scout', 'The coach'], answer: 0, evidence: 'He is fast', explanation: 'O texto diz que Lucas é rápido.' },
    { kind: 'comprehension', question: 'Why is Lucas a problem?', options: ['He is lazy', 'He is tall', 'He is calm', 'He is slow'], answer: 0, evidence: 'But he is lazy', explanation: 'Lucas é preguiçoso.' },
    { kind: 'comprehension', question: 'How many emeralds is Rafa?', options: ['two', 'three', 'one', 'four'], answer: 0, evidence: 'Price: two emeralds', explanation: 'Rafa custa duas esmeraldas.' },
  ],
  translation: 'Relatório do olheiro...',
};
const vocabKnown = ['fast', 'big', 'game'];

test('validateLetter aceita o exemplo bom, filtra glossário conhecido e embaralha opções', () => {
  const r = validateLetter(goodLetter, 1, vocabKnown, 11);
  expect(r.ok).toBeTruthy();
  expect(r.content.questions).toHaveLength(3);
  expect(r.content.glossary.map((g) => g.en)).toEqual(['striker', 'lazy', 'goalkeeper', 'calm', 'kick']);
  const q1 = r.content.questions[0];
  expect(q1.options[q1.answer]).toBe('Lucas');
  expect(q1.options.join('|')).not.toBe('Lucas|Rafa|The scout|The coach');
  const q3 = r.content.questions[2];
  expect(q3.options[q3.answer]).toBe('two');
  expect(validateLetter(goodLetter, 1, vocabKnown, 11)).toEqual(r);
});

const withQuestions = (edit: (q: (typeof goodLetter)['questions'][number]) => (typeof goodLetter)['questions'][number]) => ({
  ...goodLetter,
  questions: [edit(goodLetter.questions[0]), edit(goodLetter.questions[1]), goodLetter.questions[2]],
});

test('validateLetter rejeita 6 casos ruins', () => {
  const longest = validateLetter(withQuestions((q) => ({ ...q, options: [`${q.options[q.answer]} for sure and more`, ...q.options.slice(1)] })), 1, vocabKnown);
  expect(longest.ok).toBeFalsy();
  expect(longest.problems.join(' ')).toContain('mais longa');

  const evidence = validateLetter(withQuestions((q) => ({ ...q, evidence: 'He is a dragon' })), 1, vocabKnown);
  expect(evidence.ok).toBeFalsy();
  expect(evidence.problems.join(' ')).toContain('evidence');

  const copy = validateLetter(withQuestions((q) => ({ ...q, question: 'What is Lucas?', options: ['lazy', 'happy', 'sad', 'hungry'], answer: 0 })), 1, vocabKnown);
  expect(copy.ok).toBeFalsy();
  expect(copy.problems.join(' ')).toContain('anti-cola');

  const forbidden = validateLetter({ ...goodLetter, text: `${letterText} He went home.` }, 1, vocabKnown);
  expect(forbidden.ok).toBeFalsy();
  expect(forbidden.problems.join(' ')).toContain('went');

  const glossary = validateLetter({ ...goodLetter, glossary: [{ en: 'dragon', pt: 'dragão' }, { en: 'castle', pt: 'castelo' }, { en: 'sword', pt: 'espada' }, { en: 'river', pt: 'rio' }] }, 1, vocabKnown);
  expect(glossary.ok).toBeFalsy();
  expect(glossary.problems.join(' ')).toContain('glossário');

  const few = validateLetter({ ...goodLetter, questions: [goodLetter.questions[0]] }, 1, vocabKnown);
  expect(few.ok).toBeFalsy();
  expect(few.problems.join(' ')).toContain('mínimo 2');

  const short = validateLetter({ ...goodLetter, text: 'Name: Lucas. He is fast.', glossary: [] }, 1, vocabKnown);
  expect(short.ok).toBeFalsy();
  expect(short.problems.join(' ')).toContain('palavras');

  const nested = validateLetter(withQuestions((q) => ({ ...q, options: ['Lucas', 'Lucas and Rafa', 'Tom', 'Bob'], answer: 0 })), 1, vocabKnown);
  expect(nested.ok).toBeFalsy();
  expect(nested.problems.join(' ')).toContain('contém outra');
});

// ---------- Recado ----------

const goodNote = {
  brief: 'Peça ao ferreiro 2 espadas e 1 picareta e diga que a picareta é para a caverna.',
  mustInclude: [
    { pt: '2 espadas', en: ['two swords', '2 swords'] },
    { pt: '1 picareta', en: ['one pickaxe', 'a pickaxe', '1 pickaxe'] },
    { pt: 'para a caverna', en: ['for the cave', 'in the cave'] },
  ],
  templates: [],
  wordBank: ['need', 'sword', 'pickaxe', 'cave', 'for', 'have', 'want', 'torch', 'dog', 'and', 'is', 'the'],
  model: 'I need two swords and one pickaxe. The pickaxe is for the cave.',
  hint: '',
};

test('validateNote aceita o exemplo bom e completa os moldes do nível', () => {
  const r = validateNote(goodNote, 1);
  expect(r.ok).toBeTruthy();
  expect(r.content.templates.length >= 4).toBeTruthy();
  expect(r.content.wordBank).toHaveLength(12);
  expect(r.content.hint).toBe('');
  expect(r.content.mustInclude).toHaveLength(3);
});

test('validateNote rejeita 6 casos ruins e corta banco grande', () => {
  expect(validateNote({ ...goodNote, model: 'I need two swords. It is for the cave.' }, 1).ok).toBeFalsy();
  expect(validateNote({ ...goodNote, wordBank: ['need', 'sword', 'cave'] }, 1).ok).toBeFalsy();
  const digits = validateNote({ ...goodNote, wordBank: ['need', 'sword', 'pickaxe', 'cave', 'for', 'have', 'want', 'torch', '2', '1'] }, 1);
  expect(digits.ok).toBeFalsy();
  expect(digits.content.wordBank).toHaveLength(8);
  expect(validateNote({ ...goodNote, mustInclude: goodNote.mustInclude.slice(0, 2) }, 1).ok).toBeFalsy();
  const forbidden = validateNote({ ...goodNote, model: 'I went to the cave with two swords and one pickaxe.' }, 1);
  expect(forbidden.ok).toBeFalsy();
  expect(forbidden.problems.join(' ')).toContain('went');
  expect(validateNote({ ...goodNote, brief: '' }, 1).ok).toBeFalsy();
  const big = validateNote({ ...goodNote, wordBank: [...goodNote.wordBank, 'apple', 'bone', 'map', 'key', 'ball'] }, 1);
  expect(big.ok).toBeTruthy();
  expect(big.content.wordBank).toHaveLength(14);
  expect(big.content.wordBank.slice(0, 4)).toEqual(['need', 'sword', 'pickaxe', 'cave']);
  const level3 = validateNote({ ...goodNote, hint: 'Frase 1: quantidade; frase 2: para quê.' }, 3);
  expect(level3.content.hint).toContain('Frase 1');
});

// ---------- Ferraria ----------

const rule = 'Verbo primeiro, depois o objeto e o lugar.';
const goodForge = {
  target: 'Ordem do pedido',
  items: [
    { kind: 'scramble', words: ['table', 'the', 'put', 'on', 'torch', 'the'], answer: 'Put the torch on the table.', rule },
    { kind: 'scramble', words: [], answer: 'There are two swords in the chest.', rule },
    { kind: 'gap', sentence: 'There ___ two apples.', options: ['is', 'are', 'am'], answer: 1, rule: 'Com plural usamos are.' },
    { kind: 'gap', sentence: 'I have ___ apple.', options: ['a', 'an', 'the', 'an'], answer: 1, rule: 'Antes de vogal usamos an.' },
    { kind: 'typed', prompt: 'Escreva o plural de torch', sentence: 'I need two ___.', accepted: ['torches'], rule: 'Palavras em -ch ganham -es.' },
    { kind: 'typed', prompt: 'Escreva o plural de key', sentence: 'Give me three ___.', accepted: ['keys'], rule: 'Plural regular: -s.' },
  ],
};

test('validateForge aceita o exemplo bom, embaralha scramble/opções e refaz words', () => {
  const r = validateForge(goodForge, 1, 21);
  expect(r.ok).toBeTruthy();
  expect(r.content.items).toHaveLength(6);
  const s0 = r.content.items[0];
  const s1 = r.content.items[1];
  if (s0.kind !== 'scramble' || s1.kind !== 'scramble') throw new Error('scramble esperado');
  expect(s0.words.join(' ')).not.toBe('put the torch on the table');
  expect([...s0.words].sort()).toEqual(['on', 'put', 'table', 'the', 'the', 'torch']);
  expect([...s1.words].sort()).toEqual(['are', 'chest', 'in', 'swords', 'the', 'there', 'two']);
  const g0 = r.content.items[2];
  const g1 = r.content.items[3];
  if (g0.kind !== 'gap' || g1.kind !== 'gap') throw new Error('gap esperado');
  expect(g0.options[g0.answer]).toBe('are');
  expect(g0.options.join('|')).not.toBe('is|are|am');
  expect(g1.options).toHaveLength(3);
  expect(g1.options[g1.answer]).toBe('an');
  const t0 = r.content.items[4];
  if (t0.kind !== 'typed') throw new Error('typed esperado');
  expect(t0.accepted).toEqual(['torches']);
  expect(validateForge(goodForge, 1, 21)).toEqual(r);
});

test('scramble nunca sai na ordem da resposta em 500 sementes', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const r = validateForge(goodForge, 1, seed);
    for (const item of r.content.items) {
      if (item.kind === 'scramble' && item.words.join(' ') === item.answer.toLowerCase().replace(/[.!?]/g, '')) {
        throw new Error(`semente ${seed}: scramble igual à resposta`);
      }
    }
  }
});

test('validateForge rejeita 6 casos ruins', () => {
  const replace = (i: number, item: unknown) => ({ ...goodForge, items: goodForge.items.map((it, j) => (j === i ? item : it)) });
  expect(validateForge({ ...goodForge, items: goodForge.items.slice(0, 5) }, 1).ok).toBeFalsy();
  const banned = validateForge(replace(0, { kind: 'scramble', words: [], answer: 'Please put the torch on the table.', rule }), 1);
  expect(banned.ok).toBeFalsy();
  expect(banned.problems.join(' ')).toContain('please');
  expect(validateForge(replace(0, { kind: 'scramble', words: [], answer: 'Put the torch.', rule }), 1).ok).toBeFalsy();
  expect(validateForge(replace(2, { kind: 'gap', sentence: 'There ___ two apples.', options: ['is', 'are', 'are'], answer: 1, rule }), 1).ok).toBeFalsy();
  expect(validateForge(replace(4, { kind: 'typed', prompt: 'Escreva', sentence: 'I need two ___.', accepted: [], rule }), 1).ok).toBeFalsy();
  const repeated = validateForge(replace(1, goodForge.items[0]), 1);
  expect(repeated.ok).toBeFalsy();
  expect(repeated.problems.join(' ')).toContain('repetida');
  const forbidden = validateForge(replace(0, { kind: 'scramble', words: [], answer: 'He went to the table.', rule }), 1);
  expect(forbidden.ok).toBeFalsy();
  expect(forbidden.problems.join(' ')).toContain('went');
  expect(validateForge(replace(2, { kind: 'gap', sentence: 'There are two apples.', options: ['is', 'are', 'am'], answer: 1, rule }), 1).ok).toBeFalsy();
});

test('F1 (22/09): a bandeja com itens extras depois da 3ª entrega passa no validador', () => {
  for (const level of [1, 2, 3]) {
    for (const done of [3, 4, 6, 9]) {
      const room = buildMerchantRoom(7, level, undefined, undefined, { done });
      const { sentences, translations } = offlineSentences(room.steps, MERCHANT_CATALOGS, room.items);
      const r = validateMerchant({ spots: room.spots, items: room.items, steps: room.steps, sentences, translation: translations }, level);
      if (!r.ok) throw new Error(`nível ${level} done ${done}: ${r.problems.join('; ')}`);
      expect(room.items.length).toBeGreaterThanOrEqual(room.steps.length + 2);
      expect(r.content.sentences.length).toBe(room.steps.length);
    }
  }
  const base = buildMerchantContent(7, 1);
  const extra = (id: string) => ({ ...base.items[0], id });
  const tooMany = validateMerchant({ ...base, items: [...base.items, extra('x1'), extra('x2'), extra('x3')] }, 1);
  expect(tooMany.ok).toBe(false);
});

void run();
