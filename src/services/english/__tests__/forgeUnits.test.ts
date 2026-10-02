import { expect, run, test } from './harness';
import { UNIT_ORDER } from '../../../config/englishUnits';
import { checkForgeItem, forgeItemsFor, soleAnswer, typedAccepts } from '../forgeMolds';
import { dueReviews, noteMistakeBar, reviewQueue, weeklySeal } from '../review';
import { currentUnit, unitAfterForge, type UnitBook } from '../units';

const book = (id: string, startedOn: string): UnitBook => ({
  unit: { id, startedOn, forges: [] },
  units: {},
});

test('selo no dia 2, sem selo, e para rever', () => {
  const day1 = unitAfterForge(book('u1', '2026-10-01'), { date: '2026-10-01', first: 6, max: 6 });
  expect(day1.sealed).toBe(false);
  expect(day1.book.unit.id).toBe('u1');
  const sealed = unitAfterForge(day1.book, { date: '2026-10-02', first: 5, max: 6 });
  expect(sealed.sealed).toBe(true);
  expect(sealed.book.unit.id).toBe('u2');
  expect(sealed.book.units.u1?.sealedOn).toBe('2026-10-02');

  const weak = unitAfterForge(day1.book, { date: '2026-10-02', first: 4, max: 6 });
  expect(weak.sealed).toBe(false);
  expect(weak.book.unit.id).toBe('u1');

  let open = book('u1', '2026-10-01');
  for (let i = 0; i < 6; i++) {
    const date = `2026-10-0${i + 1}`;
    open = unitAfterForge(open, { date, first: 3, max: 6 }).book;
  }
  expect(open.unit.id).toBe('u2');
  expect(open.units.u1?.review).toBe(true);
  expect(currentUnit(null).id).toBe('u1');
});

test('10 unidades por 50 sementes passam no validador e têm uma resposta só', () => {
  const bad: string[] = [];
  for (const id of UNIT_ORDER) {
    for (let seed = 1; seed <= 50; seed++) {
      for (const day of [1, 3]) {
        const items = forgeItemsFor(id, day, seed);
        expect(items).toHaveLength(6);
        for (const item of items) {
          const problems = checkForgeItem(id, item);
          if (problems.length) bad.push(`${id} s${seed} d${day}: ${problems.join(',')}`);
          if (!soleAnswer(item)) bad.push(`${id} s${seed} duas`);
        }
      }
    }
  }
  if (bad.length) throw new Error(bad.slice(0, 12).join(' | '));
});

test('escrever aceita apóstrofo, maiúscula e does not', () => {
  const items = forgeItemsFor('u8', 2, 1);
  const typed = items.find((item) => item.kind === 'typed');
  if (!typed) throw new Error('sem escrever');
  expect(typedAccepts(typed, "Doesn't")).toBe(true);
  expect(typedAccepts(typed, 'does not')).toBe(true);
  expect(typedAccepts(typed, 'doesnt')).toBe(true);
});

test('caixas da revisão e o erro do Recado vira barra', () => {
  const bar = noteMistakeBar('I want play soccer.', 'I want to play soccer.');
  expect(bar.kind).toBe('gap');
  if (bar.kind === 'gap') expect(bar.options[bar.answer]).toBe('I want to play soccer.');
  const first = reviewQueue([], '2026-10-01', { key: 'n1', item: bar });
  expect(first[0].box).toBe(1);
  expect(first[0].due).toBe('2026-10-02');
  const second = reviewQueue(first, '2026-10-02', { key: 'n1', item: bar });
  expect(second[0].box).toBe(3);
  expect(dueReviews(second, '2026-10-02')).toHaveLength(0);
  expect(dueReviews(second, '2026-10-05')).toHaveLength(1);
  expect(weeklySeal('2026-10-01', '2026-10-08', null)).toBe(true);
  expect(weeklySeal('2026-10-01', '2026-10-08', '2026-10-08')).toBe(false);
});

void run();
