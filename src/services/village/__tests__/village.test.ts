import { expect, run, test } from '../../english/__tests__/harness';
import { DEFAULT_ECONOMY, DISTRICT_ICONS, EMPTY_GEAR, houseSprite, houseTier, houseTitle, LOT_SCENE_LABEL, MATERIAL_BY_PERIOD, SCENE_PROPS } from '../../../config/village';
import { isoWeekOf } from '../../../utils/isoWeek';
import { getLevelFromXP, getLevelTitle, getXPForLevel } from '../../../utils/levelSystem';
import { claimKey, hasClaim, levelGiftClaimKey, rareGiftForLevel } from '../claims';
import { chestAllowed, dailyChestContents } from '../chest';
import { computeTaskLoot, xpWithBoots } from '../loot';
import { defaultHabitsForNow, noticesForNow, pickLine } from '../notices';
import { dueTasksOn, isChestTime, nextFullDays, periodAllowedAt, rangeCoversDate, weekdayFromDate } from '../schedule';
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

test('nextFullDays: soma no dia completo, zera no perdido, não mexe sem missão devida/folga/punição', () => {
  const base = { fullDays: 3, fullDaysStart: '2026-09-12', date: '2026-09-15', skip: false };
  expect(nextFullDays({ ...base, due: 6, done: 6 })).toEqual({ fullDays: 4, fullDaysStart: '2026-09-12', changed: true });
  expect(nextFullDays({ ...base, due: 6, done: 5 })).toEqual({ fullDays: 0, fullDaysStart: null, changed: true });
  expect(nextFullDays({ ...base, due: 0, done: 0 })).toEqual({ fullDays: 3, fullDaysStart: '2026-09-12', changed: false });
  expect(nextFullDays({ ...base, due: 6, done: 0, skip: true })).toEqual({ fullDays: 3, fullDaysStart: '2026-09-12', changed: false });
  expect(nextFullDays({ ...base, fullDays: 0, fullDaysStart: null, due: 2, done: 2 })).toEqual({ fullDays: 1, fullDaysStart: '2026-09-15', changed: true });
});

test('rangeCoversDate compara no fuso do Brasil', () => {
  // punição ativada terça 21h de Brasília (= quarta 00h UTC) cobre a terça
  const start = Date.parse('2026-09-15T21:00:00.000-03:00');
  const end = Date.parse('2026-09-22T21:00:00.000-03:00');
  expect(rangeCoversDate(start, end, '2026-09-15')).toBe(true);
  expect(rangeCoversDate(start, end, '2026-09-14')).toBe(false);
  expect(rangeCoversDate(start, end, '2026-09-22')).toBe(true);
  expect(rangeCoversDate(start, end, '2026-09-23')).toBe(false);
  expect(rangeCoversDate(start, end, 'data-ruim')).toBe(false);
});

test('baú: gold = base + tochas até o teto; 2 do material mais escasso; esmeralda a cada N', () => {
  const v0 = { fullDays: 0, gear: gear() };
  const a = dailyChestContents('uid-a', '2026-09-15', v0);
  const b = dailyChestContents('uid-a', '2026-09-15', v0);
  expect(a).toEqual(b);
  expect(a.gold).toBe(10);

  const withTorches = dailyChestContents('uid-a', '2026-09-15', { fullDays: 3, gear: gear() });
  expect(withTorches.gold).toBe(13);

  const capped = dailyChestContents('uid-a', '2026-09-15', { fullDays: 20, gear: gear() });
  expect(capped.gold).toBe(15);

  const day3 = dailyChestContents('uid-a', '2026-09-15', { fullDays: 2, gear: gear() }, DEFAULT_ECONOMY);
  expect(day3.esmeralda).toBe(1);
  const day2 = dailyChestContents('uid-a', '2026-09-15', { fullDays: 1, gear: gear() }, DEFAULT_ECONOMY);
  expect(day2.esmeralda).toBe(0);

  const scarce = dailyChestContents(
    'uid-a',
    '2026-09-15',
    v0,
    DEFAULT_ECONOMY,
    { madeira: 8, pedra: 1, ferro: 5 }
  );
  expect(scarce.materials.pedra).toBe(2);

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

test('curva nova e chave de presente por temporada', () => {
  expect(getXPForLevel(1)).toBe(0);
  expect(getXPForLevel(2)).toBe(60);
  expect(getXPForLevel(3)).toBe(130);
  expect(getXPForLevel(5)).toBe(300);
  expect(getXPForLevel(10)).toBe(900);
  expect(getXPForLevel(20)).toBe(2850);
  expect(getXPForLevel(30)).toBe(5800);
  expect(getXPForLevel(40)).toBe(9750);
  expect(getLevelFromXP(0)).toBe(1);
  expect(getLevelFromXP(59)).toBe(1);
  expect(getLevelFromXP(60)).toBe(2);
  expect(getLevelFromXP(129)).toBe(2);
  expect(getLevelFromXP(130)).toBe(3);
  expect(getLevelFromXP(9750)).toBe(40);
  expect(getLevelFromXP(20000)).toBe(40);
  expect(getLevelTitle(1)).toBe('Novato da Mina');
  expect(getLevelTitle(5)).toBe('Aprendiz da Mina');
  expect(getLevelTitle(10)).toBe('Minerador de Madeira');
  expect(getLevelTitle(40)).toBe('Lenda da Mina');
  expect(levelGiftClaimKey(0, 2)).toBe('level:0:2');
  expect(levelGiftClaimKey(1, 2)).toBe('level:1:2');
  expect(levelGiftClaimKey(2, 10)).toBe('level:2:10');
  expect(rareGiftForLevel(4)).toBe(null);
  expect(rareGiftForLevel(5)).toBe('esmeralda');
  expect(rareGiftForLevel(10)).toBe('diamante');
  expect(rareGiftForLevel(40)).toBe('diamante');
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
  expect(tradePreview('madeira', 'redstone').ok).toBe(false);
  expect(canBuy({ owned: [] }, 30, 'hat_cap', undefined, 1).reason).toBe('level');
  expect(canCraft({ madeira: 10, pedra: 10, ferro: 8, redstone: 10 }, rare, 'pickaxe_iron', 1, 5).reason).toBe('level');
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

  const morningHabits = defaultHabitsForNow('2026-09-16', 9);
  expect(morningHabits).toHaveLength(1);
  expect(['agua', 'postura', 'alongar']).toContain(morningHabits[0].id);
  const tuesday = defaultHabitsForNow('2026-09-15', 9);
  expect(tuesday.map((h) => h.id)).toEqual(['gentileza']);
  const late = defaultHabitsForNow('2026-09-15', 22);
  expect(late.map((h) => h.id)).toEqual(['sono']);

  const lines = Array.from({ length: 5 }, (_, i) => ({ id: `l${i}`, text: `fala ${i}` }));
  const recent = ['l0', 'l1', 'l2', 'l3'];
  expect(pickLine(lines, recent).id).toBe('l4');
  expect(pickLine(lines, ['l0', 'l1', 'l2', 'l3', 'l4']).id).toBe('l0');
});

test('casa cresce por temporada e os ícones da grade não se repetem', () => {
  expect(houseTier(0)).toBe(1);
  expect(houseTier(1)).toBe(1);
  expect(houseSprite(2)).toBe('/assets/village/buildings/casa-2.png');
  expect(houseTitle(3)).toBe('Sobrado');
  expect(houseTitle(9)).toBe('Sobrado');
  expect(DISTRICT_ICONS.house).toBe('/assets/village/buildings/casa-1.png');
  expect(DISTRICT_ICONS.pack).toBe('/assets/village/items/mochila.png');
  expect(DISTRICT_ICONS.bank).toBe('/assets/village/buildings/cofre-1.png');
  expect(DISTRICT_ICONS.arena).toBe('/assets/english/ui/sword.webp');
  expect(new Set(Object.values(DISTRICT_ICONS)).size).toBe(Object.keys(DISTRICT_ICONS).length);
  expect(SCENE_PROPS.map((p) => p.id).sort()).toEqual(['arena', 'pack']);
  expect(LOT_SCENE_LABEL.fornalha).toBe('Ferraria');
  expect(LOT_SCENE_LABEL.mesa).toBe('Biblioteca');
  expect(LOT_SCENE_LABEL.cofre).toBe('Cofre');
  expect(LOT_SCENE_LABEL.agenda).toBe('Agenda');
  expect(LOT_SCENE_LABEL.mercado).toBe('Mercado');
});

void run();
