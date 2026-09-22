import { expect, run, test } from '../../english/__tests__/harness';
import {
  answersStash,
  completeQuizWrite,
  payThenComplete,
  shouldOpenReflection,
} from '../closeQuiz';
import { dilemmaOf, quizScoreOf, readRingDash, reflectionOk, wordCount } from '../provaRules';

const about = {
  prompt: 'O que você faria diferente no recreio depois desta ideia?',
  title: 'Paciência no campo',
  lesson: 'Esperar a vez no futebol ensina mais que gritar com o juiz. Paciência é deixar o outro jogar.',
};

const fairReflection = 'No recreio eu espero o amigo chutar antes de gritar com o juiz do jogo';

test('M1: se o pagamento lança, complete não roda', async () => {
  let completeCalls = 0;
  let threw = false;
  try {
    await payThenComplete(
      async () => { throw new Error('rede caiu'); },
      async () => { completeCalls += 1; },
    );
  } catch {
    threw = true;
  }
  expect(threw).toBe(true);
  expect(completeCalls).toBe(0);
});

test('M1: completeQuizWrite não grava completed se o doc já fechou', () => {
  const plan = completeQuizWrite({ completed: true }, {
    score: 5,
    totalQuestions: 8,
    xpEarned: 30,
    goldEarned: 5,
    answers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    reflection: fairReflection,
    about,
  });
  expect(plan.kind).toBe('skip');
});

test('B4: completeQuizWrite passa about e grava reflectionWords', () => {
  const pasted = 'O que você faria diferente no recreio depois desta ideia e ainda um pouco mais';
  expect(reflectionOk(pasted)).toBe(true);
  expect(reflectionOk(pasted, about)).toBe(false);
  const rejected = completeQuizWrite(undefined, {
    score: 4,
    totalQuestions: 8,
    xpEarned: 24,
    goldEarned: 4,
    answers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    reflection: pasted,
    about,
  });
  expect(rejected.kind).toBe('reject');
  expect(reflectionOk(fairReflection, about)).toBe(true);

  const plan = completeQuizWrite(undefined, {
    score: 4,
    totalQuestions: 8,
    xpEarned: 24,
    goldEarned: 4,
    answers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    reflection: fairReflection,
    about,
  });
  expect(plan.kind).toBe('write');
  if (plan.kind !== 'write') return;
  expect(plan.data.completed).toBe(true);
  expect(plan.data.awaitingReflection).toBe(false);
  expect(plan.data.reflectionWords).toBe(wordCount(fairReflection));
  expect(plan.data.reflectionWords).toBeGreaterThanOrEqual(12);
});

test('M2: answersStash não marca completed nem paga', () => {
  const stash = answersStash(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 5, 8);
  expect(stash.completed).toBe(false);
  expect(stash.awaitingReflection).toBe(true);
  expect(stash.status).toBe('ready');
  expect(stash.score).toBe(5);
  expect(stash.totalQuestions).toBe(8);
  expect(stash.answers).toHaveLength(8);
  expect(shouldOpenReflection({
    awaitingReflection: true,
    completed: false,
    answers: stash.answers,
    questions: stash.answers,
  })).toBe(true);
  expect(shouldOpenReflection({
    awaitingReflection: true,
    completed: true,
    answers: stash.answers,
    questions: stash.answers,
  })).toBe(false);
});

test('M9: dilemmaOf só aceita kind dilemma no índice 2', () => {
  expect(dilemmaOf({
    questions: [
      { kind: 'lesson', question: 'ideia' },
      { kind: 'lesson', question: 'aplicar' },
      { kind: 'knowledge', question: 'Quanto é 6 vezes 5 vezes 4?' },
    ],
    answers: ['a', 'b', '120'],
  })).toBe(null);
  expect(dilemmaOf({
    questions: [
      { kind: 'lesson', question: 'ideia' },
      { kind: 'lesson', question: 'aplicar' },
      { kind: 'lesson', question: 'O que você faria no vestiário?' },
    ],
    answers: ['a', 'b', 'Falar com o amigo'],
  })).toBe(null);
  expect(dilemmaOf({
    questions: [
      { kind: 'lesson', question: 'ideia' },
      { kind: 'lesson', question: 'aplicar' },
      { kind: 'dilemma', question: 'O que você faria no vestiário?' },
    ],
    answers: ['a', 'b', 'Falar com o amigo'],
  })?.chosen).toBe('Falar com o amigo');
});

test('M8: dilema não entra na nota', () => {
  const scored = quizScoreOf(
    [
      { kind: 'lesson', answer: 'a' },
      { kind: 'lesson', answer: 'b' },
      { kind: 'dilemma', answer: 'sábia' },
      { kind: 'knowledge', answer: '120' },
    ],
    ['a', 'errada', 'outra', '120'],
  );
  expect(scored.correct).toBe(2);
  expect(scored.total).toBe(3);
});

test('M3: anel nunca cheio enquanto travado; reduced-motion em degraus de 25%', () => {
  expect(readRingDash(0, true, true)).toBe(100);
  expect(readRingDash(0.2, true, true)).toBe(100);
  expect(readRingDash(0.3, true, true)).toBe(75);
  expect(readRingDash(0.6, true, true)).toBe(50);
  expect(readRingDash(1, true, true)).toBe(25);
  expect(readRingDash(1, false, true)).toBe(25);
  expect(readRingDash(1, true, false)).toBe(0);
  expect(readRingDash(1, false, false)).toBe(0);
});

void run();
