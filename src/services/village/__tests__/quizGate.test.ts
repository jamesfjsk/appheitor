import { expect, run, test } from '../../english/__tests__/harness';
import { quizBlocksDest, quizDoneToday, quizGateActive, quizLockedFor, quizOpensOnRequest } from '../quizGate';

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

test('a prova de ontem, ainda na aba que virou a meia-noite, não conta como feita hoje', () => {
  expect(quizDoneToday({ completed: true, date: '2026-09-18' }, '2026-09-19')).toBe(false);
  expect(quizDoneToday({ completed: true, date: '2026-09-19' }, '2026-09-19')).toBe(true);
  expect(quizDoneToday({ completed: false, date: '2026-09-19' }, '2026-09-19')).toBe(false);
  expect(quizDoneToday(null, '2026-09-19')).toBe(false);
});

run();
