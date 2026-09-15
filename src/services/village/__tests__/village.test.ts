import { expect, run, test } from '../../english/__tests__/harness';
import { DEFAULT_ECONOMY, EMPTY_GEAR, MATERIAL_BY_PERIOD } from '../../../config/village';
import { isoWeekOf } from '../../../utils/isoWeek';
import { claimKey, hasClaim } from '../claims';
import { chestAllowed, dailyChestContents } from '../chest';
import { computeTaskLoot, xpWithBoots } from '../loot';
import { defaultHabitsForNow, noticesForNow, pickLine } from '../notices';
import { dueTasksOn, isChestTime, periodAllowedAt, weekdayFromDate } from '../schedule';
import { canBuy, canCraft, priceOf, tradePreview } from '../shop';
import type { NoticeContext, ScheduleTask, VillageGear } from '../../../types/village';

const gear = (over: Partial<VillageGear> = {}): VillageGear => ({ ...EMPTY_GEAR, ...over });
const none = { morning: 0, afternoon: 0, evening: 0 };

const task = (over: Partial<ScheduleTask> & Pick<ScheduleTask, 'id'>): ScheduleTask => ({
  active: true,
  frequency: 'daily',
  period: 'morning',
  ...over,
});

test('período manhã/tarde/noite vira madeira/pedra/ferro', () => {
  expect(MATERIAL_BY_PERIOD.morning).toBe('madeira');
  expect(MATERIAL_BY_PERIOD.afternoon).toBe('pedra');
  expect(MATERIAL_BY_PERIOD.evening).toBe('ferro');
  const morning = computeTaskLoot({
    period: 'morning',
    gear: gear(),
    completionsTodayByPeriod: none,
    settings: DEFAULT_ECONOMY,
    effectsEnabled: true,
  });
  expect(morning).toEqual({ material: 'madeira', qty: 1 });
  expect(
    computeTaskLoot({
      period: 'afternoon',
      gear: gear(),
      completionsTodayByPeriod: none,
      settings: DEFAULT_ECONOMY,
      effectsEnabled: true,
    }).material
  ).toBe('pedra');
  expect(
    computeTaskLoot({
      period: 'evening',
      gear: gear(),
      completionsTodayByPeriod: none,
      settings: DEFAULT_ECONOMY,
      effectsEnabled: true,
    }).material
  ).toBe('ferro');
});

test('picaretas 1-4 em dias simulados', () => {
  const stoneFirst = computeTaskLoot({
    period: 'morning',
    gear: gear({ pickaxe: 1 }),
    completionsTodayByPeriod: none,
    settings: DEFAULT_ECONOMY,
    effectsEnabled: true,
  });
  expect(stoneFirst.qty).toBe(2);
  const stoneSecond = computeTaskLoot({
    period: 'afternoon',
    gear: gear({ pickaxe: 1 }),
    completionsTodayByPeriod: { morning: 1, afternoon: 0, evening: 0 },
    settings: DEFAULT_ECONOMY,
    effectsEnabled: true,
  });
  expect(stoneSecond.qty).toBe(1);

  const ironFirstAfternoon = computeTaskLoot({
    period: 'afternoon',
    gear: gear({ pickaxe: 2 }),
    completionsTodayByPeriod: { morning: 2, afternoon: 0, evening: 0 },
    settings: DEFAULT_ECONOMY,
    effectsEnabled: true,
  });
  expect(ironFirstAfternoon.qty).toBe(2);
  const ironSecondAfternoon = computeTaskLoot({
    period: 'afternoon',
    gear: gear({ pickaxe: 2 }),
    completionsTodayByPeriod: { morning: 2, afternoon: 1, evening: 0 },
    settings: DEFAULT_ECONOMY,
    effectsEnabled: true,
  });
  expect(ironSecondAfternoon.qty).toBe(1);

  const goldFirst = computeTaskLoot({
    period: 'evening',
    gear: gear({ pickaxe: 3 }),
    completionsTodayByPeriod: { morning: 1, afternoon: 1, evening: 0 },
    settings: DEFAULT_ECONOMY,
    effectsEnabled: true,
  });
  expect(goldFirst.qty).toBe(2);

  const diamondEvery = computeTaskLoot({
    period: 'evening',
    gear: gear({ pickaxe: 4 }),
    completionsTodayByPeriod: { morning: 2, afternoon: 2, evening: 1 },
    settings: DEFAULT_ECONOMY,
    effectsEnabled: true,
  });
  expect(diamondEvery.qty).toBe(2);
});

test('botas arredondam +20% de XP', () => {
  expect(xpWithBoots(10, gear({ boots: 1 }))).toBe(12);
  expect(xpWithBoots(5, gear({ boots: 1 }))).toBe(6);
  expect(xpWithBoots(1, gear({ boots: 1 }))).toBe(1);
  expect(xpWithBoots(10, gear({ boots: 0 }))).toBe(10);
  expect(xpWithBoots(10, gear({ boots: 1 }), false)).toBe(10);
});

test('dueTasksOn: daily, weekday, weekend e createdAt futuro', () => {
  // 2026-09-15 é terça
  const tue = '2026-09-15';
  const sat = '2026-09-19';
  const tasks: ScheduleTask[] = [
    task({ id: 'd', frequency: 'daily' }),
    task({ id: 'w', frequency: 'weekday' }),
    task({ id: 'e', frequency: 'weekend' }),
    task({ id: 'off', active: false }),
    task({ id: 'future', createdAt: '2026-09-16T10:00:00.000-03:00' }),
  ];
  const tueIds = dueTasksOn(tasks, tue).map((t) => t.id).sort();
  expect(tueIds).toEqual(['d', 'w']);
  const satIds = dueTasksOn(tasks, sat).map((t) => t.id).sort();
  expect(satIds).toEqual(['d', 'e', 'future']);
});

test('periodAllowedAt e isChestTime', () => {
  expect(periodAllowedAt('morning', 8)).toBe(true);
  expect(periodAllowedAt('afternoon', 11)).toBe(false);
  expect(periodAllowedAt('afternoon', 12)).toBe(true);
  expect(periodAllowedAt('evening', 17)).toBe(false);
  expect(periodAllowedAt('evening', 18)).toBe(true);
  expect(periodAllowedAt('evening', 10, { ...DEFAULT_ECONOMY, periodGating: false })).toBe(true);
  expect(isChestTime(17)).toBe(false);
  expect(isChestTime(18)).toBe(true);
  expect(weekdayFromDate('2026-09-15')).toBe(2);
});

test('baú determinístico, esmeralda a cada N dias e teto de gold', () => {
  const v0 = { fullDays: 0, gear: gear() };
  const a = dailyChestContents('uid-a', '2026-09-15', v0);
  const b = dailyChestContents('uid-a', '2026-09-15', v0);
  expect(a).toEqual(b);
  const otherDay = dailyChestContents('uid-a', '2026-09-16', v0);
  expect(JSON.stringify(otherDay) === JSON.stringify(a)).toBe(false);

  const day3 = dailyChestContents('uid-a', '2026-09-15', { fullDays: 2, gear: gear() }, DEFAULT_ECONOMY);
  expect(day3.esmeralda).toBe(1);
  const day2 = dailyChestContents('uid-a', '2026-09-15', { fullDays: 1, gear: gear() }, DEFAULT_ECONOMY);
  expect(day2.esmeralda).toBe(0);

  const capped = dailyChestContents('uid-a', '2026-09-15', v0, { ...DEFAULT_ECONOMY, dailyChestGold: [40, 50], gameGoldDailyCap: 35 });
  expect(capped.gold).toBeLessThanOrEqual(35);

  const allowed = chestAllowed({
    hourBrazil: 18,
    settings: DEFAULT_ECONOMY,
    due: 6,
    done: 6,
    village: { claimed: {} },
    date: '2026-09-15',
  });
  expect(allowed.ok).toBe(true);
  const early = chestAllowed({
    hourBrazil: 10,
    settings: DEFAULT_ECONOMY,
    due: 6,
    done: 6,
    village: { claimed: {} },
    date: '2026-09-15',
  });
  expect(early.reason).toBe('hour');
});

test('claimKey estável', () => {
  expect(claimKey('daily', '2026-09-15')).toBe('daily:2026-09-15');
  expect(claimKey('level', 10)).toBe('level:10');
  expect(claimKey('streak', 7, '2026-09-01')).toBe('streak:7:2026-09-01');
  expect(hasClaim({ claimed: { 'daily:2026-09-15': 'iso' } }, 'daily:2026-09-15')).toBe(true);
  expect(hasClaim({ claimed: {} }, 'daily:2026-09-15')).toBe(false);
});

test('priceOf com multiplicador e canCraft recusa sem ferro', () => {
  expect(priceOf('hat_cap')).toBe(30);
  expect(priceOf('hat_cap', { goldPriceMultiplier: 2 })).toBe(60);
  expect(priceOf('skin_1')).toBe(0);
  const mats = { madeira: 10, pedra: 10, ferro: 0, redstone: 10 };
  const rare = { diamante: 0, esmeralda: 0 };
  expect(canCraft(mats, rare, 'pickaxe_iron', 1).ok).toBe(false);
  expect(canCraft(mats, rare, 'pickaxe_iron', 1).reason).toBe('materials');
  expect(canCraft({ ...mats, ferro: 8 }, rare, 'pickaxe_iron', 1).ok).toBe(true);
  expect(canBuy({ owned: [] }, 10, 'hat_cap').reason).toBe('gold');
  expect(canBuy({ owned: [] }, 30, 'hat_cap').ok).toBe(true);
  expect(tradePreview('madeira', 'pedra')).toEqual({ ok: true, fromQty: 3, toQty: 1, from: 'madeira', to: 'pedra' });
  expect(tradePreview('ferro', 'ferro').ok).toBe(false);
});

test('isoWeekOf em viradas de ano', () => {
  expect(isoWeekOf('2026-09-15')).toBe('2026-W38');
  expect(isoWeekOf('2026-01-01')).toBe('2026-W01');
  expect(isoWeekOf('2025-12-29')).toBe('2026-W01');
  expect(isoWeekOf('2024-12-30')).toBe('2025-W01');
});

test('noticesForNow e habitsForNow e pickLine sem repetir 14 dias', () => {
  const ctx: NoticeContext = {
    due: 6,
    done: 4,
    minDueForChest: 3,
    chestOpenHour: 18,
    birthdayMmDd: '09-18',
    gold: 10,
    nearestReward: { title: 'Noite de pizza', costGold: 28 },
    avgGoldPerDay: 9,
    tomorrowQuizTitle: 'Honestidade',
    pauseDates: [],
    vacation: false,
    fatherNotices: [{ id: 'n1', type: 'recado', text: 'Treino às 16h' }],
    dismissed: [],
  };
  const day = noticesForNow(ctx, '2026-09-15', 10);
  expect(day[0].kind).toBe('father');
  expect(day.some((i) => i.text.includes('Baú do Dia'))).toBe(true);
  const night = noticesForNow(ctx, '2026-09-15', 22);
  expect(night.some((i) => i.text.startsWith('Amanhã:'))).toBe(true);
  expect(night.some((i) => i.text.includes('Baú'))).toBe(false);

  const morningHabits = defaultHabitsForNow('2026-09-15', 9);
  expect(morningHabits.some((h) => h.id === 'alongar' || h.id === 'agua')).toBe(true);
  const late = defaultHabitsForNow('2026-09-15', 22);
  expect(late.map((h) => h.id)).toEqual(['sono']);

  const lines = Array.from({ length: 5 }, (_, i) => ({ id: `l${i}`, text: `fala ${i}` }));
  const recent = ['l0', 'l1', 'l2', 'l3'];
  expect(pickLine(lines, recent).id).toBe('l4');
  expect(pickLine(lines, ['l0', 'l1', 'l2', 'l3', 'l4']).id).toBe('l0');
});

void run();
