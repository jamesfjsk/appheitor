import { expect, run, test } from '../../services/english/__tests__/harness';
import {
  addDays,
  isoWeekOf,
  isBeforeLaunch,
  msUntilNextMidnight,
  nowBrazil,
  periodOfHour,
  resetClockForTests,
  setServerOffsetMs,
  weekdayOf,
} from '../clock';

test('meia-noite em Brasília: 02:59:59Z ainda é o dia anterior, 03:00:00Z vira a data', () => {
  resetClockForTests();
  const before = nowBrazil(Date.parse('2026-09-16T02:59:59.000Z'));
  expect(before.date).toBe('2026-09-15');
  expect(before.hour).toBe(23);
  const after = nowBrazil(Date.parse('2026-09-16T03:00:00.000Z'));
  expect(after.date).toBe('2026-09-16');
  expect(after.hour).toBe(0);
  expect(after.hour === 24).toBe(false);
});

test('03:00Z devolve hora 0, nunca 24', () => {
  resetClockForTests();
  const n = nowBrazil(Date.parse('2026-09-16T03:00:00.000Z'));
  expect(n.hour).toBe(0);
  expect(String(n.hour)).not.toMatch(/^24/);
});

test('limites 12:00 e 18:00 dos períodos', () => {
  resetClockForTests();
  expect(periodOfHour(11)).toBe('morning');
  expect(periodOfHour(12)).toBe('afternoon');
  expect(nowBrazil(Date.parse('2026-09-15T15:00:00.000Z')).period).toBe('afternoon');
  expect(nowBrazil(Date.parse('2026-09-15T20:59:59.000Z')).period).toBe('afternoon');
  expect(nowBrazil(Date.parse('2026-09-15T21:00:00.000Z')).period).toBe('evening');
  expect(periodOfHour(18)).toBe('evening');
  expect(nowBrazil(Date.parse('2026-09-15T21:00:00.000Z')).isNight).toBe(true);
  expect(nowBrazil(Date.parse('2026-09-15T20:59:59.000Z')).isNight).toBe(false);
  expect(nowBrazil(Date.parse('2026-09-16T02:00:00.000Z')).isNight).toBe(true);
});

test('weekdayOf(2026-09-15) é terça', () => {
  expect(weekdayOf('2026-09-15')).toBe(2);
  expect(nowBrazil(Date.parse('2026-09-15T15:00:00.000Z')).weekday).toBe(2);
});

test('addDays na virada de mês e de ano', () => {
  expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  expect(addDays('2026-09-15', -1)).toBe('2026-09-14');
  expect(isoWeekOf('2025-12-29')).toBe('2026-W01');
});

test('serverOffsetMs de +3h faz today avançar quando o PC está atrasado', () => {
  resetClockForTests();
  const pc = Date.parse('2026-09-16T00:00:00.000Z');
  expect(nowBrazil(pc).date).toBe('2026-09-15');
  expect(nowBrazil(pc).hour).toBe(21);
  setServerOffsetMs(3 * 60 * 60 * 1000);
  const corrected = nowBrazil(pc);
  expect(corrected.date).toBe('2026-09-16');
  expect(corrected.hour).toBe(0);
  resetClockForTests();
});

test('msUntilNextMidnight às 23:59:30 dá 30 s', () => {
  resetClockForTests();
  const ms = Date.parse('2026-09-16T02:59:30.000Z');
  expect(msUntilNextMidnight(ms)).toBe(30_000);
});

test('isBeforeLaunch ignora o dia anterior ao lançamento', () => {
  expect(isBeforeLaunch('2026-09-17', '2026-09-18')).toBe(true);
  expect(isBeforeLaunch('2026-09-18', '2026-09-18')).toBe(false);
  expect(isBeforeLaunch('2026-09-19', '2026-09-18')).toBe(false);
  expect(isBeforeLaunch('2026-09-17', null)).toBe(false);
});

void run();
