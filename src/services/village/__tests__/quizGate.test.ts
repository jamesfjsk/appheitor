import { expect, run, test } from '../../english/__tests__/harness';
import { quizBlocksDest, quizGateActive, quizLockedFor, quizOpensOnRequest } from '../quizGate';

test('com prova obrigatória e Mesa caída, a Mina continua trancada e a prova abre por pedido', () => {
  const quizLocked = true;
  const mesaDown = true;
  void mesaDown;
  expect(quizGateActive(quizLocked)).toBe(true);
  expect(quizBlocksDest('mine')).toBe(true);
  expect(quizBlocksDest('npc:ferreiro')).toBe(true);
  expect(quizBlocksDest('npc:comerciante')).toBe(true);
  expect(quizBlocksDest('market')).toBe(true);
  expect(quizBlocksDest('workshop')).toBe(true);
  expect(quizBlocksDest('build:fornalha')).toBe(true);
  expect(quizBlocksDest('house')).toBe(false);
  expect(quizBlocksDest('pack')).toBe(false);
  expect(quizOpensOnRequest(1)).toBe(true);
  expect(quizOpensOnRequest(0)).toBe(false);
});

test('quizLockedFor respeita quizEnabled e completed', () => {
  expect(quizLockedFor({ quizEnabled: true, quizRequired: true, completed: false })).toBe(true);
  expect(quizLockedFor({ quizEnabled: false, quizRequired: true, completed: false })).toBe(false);
  expect(quizLockedFor({ quizEnabled: true, quizRequired: true, completed: true })).toBe(false);
  expect(quizLockedFor({ quizEnabled: true, quizRequired: false, completed: false })).toBe(false);
  expect(quizLockedFor({ quizRequired: true, completed: false })).toBe(true);
});

test('arena landmark não entra no portão da prova', () => {
  expect(quizBlocksDest('build:arena')).toBe(false);
  expect(quizBlocksDest('arena')).toBe(false);
  expect(quizBlocksDest('build:mesa')).toBe(true);
});

run();
