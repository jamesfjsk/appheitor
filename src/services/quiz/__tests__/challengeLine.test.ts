import { expect, run, test } from '../../english/__tests__/harness';
import { CHALLENGE_LINE, challengeLine } from '../challengeLine';

const today = '2026-09-25';
const row = (date: string, correct: boolean, ms: number) => ({ date, correct, msToAnswer: ms });

test('challengeLine: os dois lados de cada limite', () => {
  const fast = Array.from({ length: 12 }, (_, i) => row('2026-09-20', i < 11, 4000));
  expect(challengeLine(fast, today)).toBe(CHALLENGE_LINE);
  const few = fast.slice(0, 11);
  expect(challengeLine(few, today)).toBe(null);
  const slowHits = Array.from({ length: 12 }, (_, i) => row('2026-09-20', i < 10, 4000));
  expect(challengeLine(slowHits, today)).toBe(null);
  const slowTime = Array.from({ length: 12 }, (_, i) => row('2026-09-20', true, i < 6 ? 5000 : 8700));
  expect(challengeLine(slowTime, today)).toBe(CHALLENGE_LINE);
  const justUnder = Array.from({ length: 12 }, () => row('2026-09-11', true, 5999));
  expect(challengeLine(justUnder, today)).toBe(CHALLENGE_LINE);
  const onTheLine = Array.from({ length: 12 }, () => row('2026-09-11', true, 6000));
  expect(challengeLine(onTheLine, today)).toBe(CHALLENGE_LINE);
  const old = Array.from({ length: 12 }, () => row('2026-09-01', true, 1000));
  expect(challengeLine(old, today)).toBe(null);
});

test('o dilema não conta no acerto nem no tempo', () => {
  const scored = Array.from({ length: 12 }, () => row('2026-09-20', true, 4000));
  const onlyEleven = [
    ...scored.slice(0, 11),
    ...Array.from({ length: 6 }, () => ({ date: '2026-09-20', correct: false, msToAnswer: 20000, kind: 'dilemma' })),
  ];
  expect(challengeLine(onlyEleven, today)).toBe(null);
  const ignored = [
    ...scored,
    { date: '2026-09-20', correct: false, msToAnswer: 20000, kind: 'dilemma' },
  ];
  expect(challengeLine(ignored, today)).toBe(CHALLENGE_LINE);
});

void run();
