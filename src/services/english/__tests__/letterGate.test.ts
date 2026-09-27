import { expect, run, test } from './harness';
import { letterAskEmpty, letterGateMs, letterQuestionStep } from '../letterGate';

test('letterGateMs: 10, 60 e 100 palavras', () => {
  expect(letterGateMs(10)).toBe(12000);
  expect(letterGateMs(60)).toBe(36000);
  expect(letterGateMs(100)).toBe(45000);
});

test('letterQuestionStep: a frase certa abre; uma errada não; duas erradas marcam a certa', () => {
  const closed = letterAskEmpty();
  const found = letterQuestionStep(closed, 2, true, 2);
  expect(found.open).toBe(true);
  expect(found.mark).toBe('found');
  const once = letterQuestionStep(closed, 0, false, 2);
  expect(once.open).toBe(false);
  expect(once.struck).toEqual([0]);
  const twice = letterQuestionStep(once, 1, false, 2);
  expect(twice.open).toBe(true);
  expect(twice.mark).toBe('shown');
  expect(twice.showId).toBe(2);
});

void run();
