import { expect, run, test } from './harness';
import { C1_LETTERS, pickC1Letter } from '../../../data/englishC1Letters';
import {
  c1QuestionOk,
  c2OptionsOk,
  letterAfterReviews,
  letterLevelOf,
  nextLetterLevel,
  parseC2Letter,
  parseLetterReview,
} from '../letterLevel';

test('sem letterLevel começa na C1 e o teto do painel segura', () => {
  expect(letterLevelOf(null, 3)).toBe(1);
  expect(letterLevelOf({}, 2)).toBe(1);
  expect(letterLevelOf({ letterLevel: 3 }, 1)).toBe(1);
  expect(letterLevelOf({ letterLevel: 2 }, 3)).toBe(2);
});

test('letterLevel sobe com 3 certas e desce com 2 fracas', () => {
  expect(nextLetterLevel(1, 3, 3, 0)).toBe(2);
  expect(nextLetterLevel(2, 3, 3, 0)).toBe(3);
  expect(nextLetterLevel(1, 1, 3, 0)).toBe(1);
  expect(nextLetterLevel(2, 3, 0, 2)).toBe(1);
  expect(nextLetterLevel(1, 3, 0, 2)).toBe(1);
  expect(nextLetterLevel(2, 3, 2, 0)).toBe(2);
  expect(nextLetterLevel(3, 3, 0, 1)).toBe(3);
});

test('C1 recusa palavra de pergunta em inglês', () => {
  expect(c1QuestionOk('Onde está a mochila?')).toBeTruthy();
  expect(c1QuestionOk('Quantos morcegos há no túnel?')).toBeTruthy();
  expect(c1QuestionOk('Where is the bag?')).toBeFalsy();
  expect(c1QuestionOk('Who has the book?')).toBeFalsy();
  expect(c1QuestionOk('Can you help Mia?')).toBeFalsy();
  // 01/10, carta gerada ao vivo: pergunta de sim ou não se responde sem ler
  expect(c1QuestionOk('Você pode abrir o galpão?')).toBeFalsy();
  expect(c1QuestionOk('Para onde a caixa vai?')).toBeTruthy();
  expect(c1QuestionOk('Pelo que ele agradece?')).toBeTruthy();
});

test('revisor com lixo cai no banco', () => {
  if (parseLetterReview(null) !== null) throw new Error('null');
  if (parseLetterReview({ coherence: 'alta' }) !== null) throw new Error('texto');
  if (parseLetterReview({ lixo: true }) !== null) throw new Error('lixo');
  expect(letterAfterReviews(null, null)).toBe('offline');
  expect(letterAfterReviews(parseLetterReview({ coherence: 2, oneAnswer: true, oneSentence: true, withoutReading: false, evidenceSupports: true }), null)).toBe('offline');
  const ok = parseLetterReview({ coherence: 4, oneAnswer: true, oneSentence: true, withoutReading: false, evidenceSupports: true });
  expect(letterAfterReviews(null, ok)).toBe('second');
  expect(letterAfterReviews(ok, null)).toBe('first');
  const proof = parseLetterReview({ coherence: 5, oneAnswer: true, oneSentence: true, withoutReading: false, evidenceSupports: false });
  expect(letterAfterReviews(proof, null)).toBe('offline');
});

test('banco C1: 10 cartas, 30 a 50 palavras, pergunta sem inglês de pergunta', () => {
  expect(C1_LETTERS).toHaveLength(10);
  const ids = new Set(C1_LETTERS.map((letter) => letter.id));
  expect(ids.size).toBe(10);
  for (const letter of C1_LETTERS) {
    const n = letter.text.trim().split(/\s+/).filter(Boolean).length;
    if (n < 30 || n > 50) throw new Error(`${letter.id}: ${n} palavras`);
    if (letter.glossary.length < 3 || letter.glossary.length > 5) throw new Error(`${letter.id}: glossário`);
    for (const g of letter.glossary) {
      if (!letter.text.toLowerCase().includes(g.en.toLowerCase())) throw new Error(`${letter.id}: ${g.en} fora do texto`);
    }
    for (const q of letter.questions) {
      if (!c1QuestionOk(q.question)) throw new Error(`${letter.id}: ${q.question}`);
      if (q.options.length !== 3) throw new Error(`${letter.id}: opções`);
      if (!letter.text.includes(q.evidence)) throw new Error(`${letter.id}: evidência`);
      if (q.question.toLowerCase().includes(q.options[q.answer].toLowerCase())) throw new Error(`${letter.id}: resposta no enunciado`);
    }
  }
  expect(pickC1Letter(0).id).toBe(C1_LETTERS[0].id);
  expect(pickC1Letter(0, [C1_LETTERS[0].id]).id).not.toBe(C1_LETTERS[0].id);
});

test('C2: pergunta em português e opções copiadas do texto', () => {
  const text = [
    'Luna lost her red bag at the new field after the game.',
    'The bag is under the bench near the old gate.',
    'Come to the new field and bring a rope for the bag.',
    'The old gate is closed until the afternoon.',
    'I wait because the game starts soon and I am sorry.',
    'Please come fast and look under the bench with me.',
    'The rope is long and the bench is next to the gate.',
    'We play soccer after you find the red bag today.',
    'I am happy because you can help before dinner.',
  ].join(' ');
  const short = text.split(/\s+/).slice(0, 60).join(' ');
  expect(short.split(/\s+/).filter(Boolean).length).toBe(60);
  expect(c2OptionsOk(short, ['the new field', 'the old gate', 'under the bench'])).toBeTruthy();
  expect(c2OptionsOk(short, ['the new field', 'the kitchen', 'under the bench'])).toBeFalsy();
  const parsed = parseC2Letter({
    title: 'O campinho',
    sender: 'Luna',
    text: short,
    glossary: [
      { en: 'field', pt: 'campinho' },
      { en: 'bag', pt: 'bolsa' },
      { en: 'bench', pt: 'banco' },
      { en: 'rope', pt: 'corda' },
      { en: 'gate', pt: 'portão' },
    ],
    questions: [
      { question: 'Para onde Luna quer que você vá?', options: ['the new field', 'the old gate', 'under the bench'], answer: 0, evidence: 'Come to the new field', explanation: 'O portão está fechado.' },
      { question: 'Onde está a bolsa?', options: ['under the bench', 'the old gate', 'the new field'], answer: 0, evidence: 'The bag is under the bench', explanation: 'O portão não guarda a bolsa.' },
    ],
    translation: 'A Luna perdeu a bolsa.',
  });
  expect(parsed.ok).toBeTruthy();
  const english = parseC2Letter({
    title: 'X',
    sender: 'Luna',
    text: short,
    glossary: [
      { en: 'field', pt: 'campinho' },
      { en: 'bag', pt: 'bolsa' },
      { en: 'bench', pt: 'banco' },
      { en: 'rope', pt: 'corda' },
    ],
    questions: [
      { question: 'Where is the bag?', options: ['under the bench', 'the old gate', 'the new field'], answer: 0, evidence: 'The bag is under the bench', explanation: 'x' },
      { question: 'Onde está a bolsa?', options: ['under the bench', 'the old gate', 'the new field'], answer: 0, evidence: 'The bag is under the bench', explanation: 'x' },
    ],
    translation: 'x',
  });
  expect(english.ok).toBeFalsy();
});

void run();
