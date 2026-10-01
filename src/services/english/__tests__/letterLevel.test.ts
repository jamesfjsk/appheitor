import { expect, run, test } from './harness';
import { C1_LETTERS, pickC1Letter } from '../../../data/englishC1Letters';
import {
  c1QuestionOk,
  letterAfterReviews,
  letterLevelOf,
  nextLetterLevel,
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
});

test('revisor com lixo cai no banco', () => {
  if (parseLetterReview(null) !== null) throw new Error('null');
  if (parseLetterReview({ coherence: 'alta' }) !== null) throw new Error('texto');
  if (parseLetterReview({ lixo: true }) !== null) throw new Error('lixo');
  expect(letterAfterReviews(null, null)).toBe('offline');
  expect(letterAfterReviews(parseLetterReview({ coherence: 2, oneAnswer: true, oneSentence: true, withoutReading: false }), null)).toBe('offline');
  const ok = parseLetterReview({ coherence: 4, oneAnswer: true, oneSentence: true, withoutReading: false });
  expect(letterAfterReviews(null, ok)).toBe('second');
  expect(letterAfterReviews(ok, null)).toBe('first');
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

void run();
