import { expect, run, test } from '../../english/__tests__/harness';
import { addDays, mondayOfIsoWeek, weekRangeLabel } from '../../../utils/clock';
import { buildingLevelSum, recordsAfterWeek, seasonEndsOn, trophyOfWeek, villageGrowthStage } from '../season';
import { checkinXp, sageReplyFor, tomorrowValid } from '../checkin';
import { evaluateAchievements, progressOf, rewardHasGold, visibleAchievements } from '../achievements';
import { GAME_ACHIEVEMENTS } from '../../../data/achievements';
import { heroClickPlan, heroRoute, heroShakeTarget, heroStandPoint, heroWalkAlong, heroWalkDurationMs, lookFacing, npcHopPx, npcRoutine, npcTarget, npcTouch, npcWalk, tapPulse, DEFAULT_WALK_GRAPH } from '../npcBehavior';
import { friendTier, pickDialogue, talkPointsToday, type DialogueCtx } from '../dialogue';

test('semana ISO vira rótulo Semana de 14 a 20/09', () => {
  expect(mondayOfIsoWeek('2026-W38')).toBe('2026-09-14');
  expect(weekRangeLabel('2026-W38')).toBe('Semana de 14 a 20/09');
  expect(weekRangeLabel('2026-W01').startsWith('Semana de')).toBe(true);
});

test('seasonEndsOn e troféu da semana', () => {
  expect(seasonEndsOn('2026-09-14', 13)).toBe(addDays('2026-09-14', 13 * 7 - 1));
  expect(trophyOfWeek({ earned: 60, fullDays: 4 }, { earned: 100, fullDays: 5 })).toBe('bronze');
  expect(trophyOfWeek({ earned: 100, fullDays: 4 }, { earned: 100, fullDays: 5 })).toBe('prata');
  expect(trophyOfWeek({ earned: 120, fullDays: 5 }, { earned: 100, fullDays: 5 })).toBe('ouro');
  expect(trophyOfWeek({ earned: 120, fullDays: 4 }, { earned: 100, fullDays: 5 })).toBe('prata');
  expect(trophyOfWeek({ earned: 50, fullDays: 2 }, { earned: 100, fullDays: 5 })).toBe(null);
  const rec = recordsAfterWeek({ weekGold: 10 }, { goldEarned: 40, fullDays: 3, quizBest: 8 });
  expect(rec.weekGold).toBe(40);
  expect(rec.fullDays).toBe(3);
  expect(rec.quizBest).toBe(8);
  expect(villageGrowthStage(3)).toBe(1);
  expect(villageGrowthStage(10)).toBe(2);
  expect(villageGrowthStage(18)).toBe(3);
  expect(buildingLevelSum({ fornalha: 2, bau: 1 })).toBe(3);
});

test('check-in: 5 XP se respondeu, 0 se não; amanhã pede 3 palavras', () => {
  const ok = { water: true, stretch: false, kindness: true, screen: true, tomorrow: 'estudar prova de matemática' };
  expect(tomorrowValid('oi')).toBe(false);
  expect(tomorrowValid(ok.tomorrow)).toBe(true);
  expect(checkinXp(ok)).toBe(5);
  expect(checkinXp(null)).toBe(0);
  expect(checkinXp({ ...ok, tomorrow: 'x' })).toBe(0);
  const a = sageReplyFor(ok, '2026-09-15');
  const b = sageReplyFor(ok, '2026-09-15');
  expect(a).toBe(b);
  expect(a.length > 0).toBe(true);
});

test('conquistas: destrava no alvo e não antes; escondidas; nunca gold', () => {
  const first = GAME_ACHIEVEMENTS.find((x) => x.id === 'primeira_picaretada')!;
  expect(progressOf({ missionsDone: 0 }, first).current).toBe(0);
  expect(evaluateAchievements({ missionsDone: 0 }, {}).length).toBe(0);
  const unlocked = evaluateAchievements({ missionsDone: 1 }, {});
  expect(unlocked.some((x) => x.id === 'primeira_picaretada')).toBe(true);
  expect(evaluateAchievements({ missionsDone: 1 }, { primeira_picaretada: '2026-09-15' }).some((x) => x.id === 'primeira_picaretada')).toBe(false);
  expect(visibleAchievements({}).some((x) => x.id === 'lua_da_vila')).toBe(false);
  expect(visibleAchievements({ lua_da_vila: '2026-09-15' }).some((x) => x.id === 'lua_da_vila')).toBe(true);
  for (const ach of GAME_ACHIEVEMENTS) expect(rewardHasGold(ach)).toBe(false);
  expect('gold' in (first.reward as object) ? (first.reward as { gold?: number }).gold : undefined).toBe(undefined);
  expect(GAME_ACHIEVEMENTS.length >= 72).toBe(true);
});

test('npcBehavior: horários, caminhada e toque', () => {
  expect(npcRoutine('comerciante', 10).spot).toBe('morning');
  expect(npcRoutine('comerciante', 15).spot).toBe('afternoon');
  expect(npcRoutine('comerciante', 21).hidden).toBe(true);
  expect(npcRoutine('comerciante', 21).sign).toBe('volta às 7h');
  expect(npcRoutine('sabio', 22).sitting).toBe(true);
  expect(npcRoutine('sabio', 18).sitting).toBe(true);
  expect(npcRoutine('sabio', 10).sitting).toBe(false);
  const walk = npcWalk({ x: 0, y: 0 }, { x: 48, y: 0 }, 1, false);
  expect(walk.x).toBe(24);
  expect(walk.walking).toBe(true);
  expect(npcWalk({ x: 0, y: 0 }, { x: 48, y: 0 }, 0.05, false).step).toBe(0);
  expect(npcWalk({ x: 8, y: 0 }, { x: 48, y: 0 }, 0.05, false).step).toBe(1);
  const done = npcWalk({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, false);
  expect(done.walking).toBe(false);
  const still = npcWalk({ x: 0, y: 0 }, { x: 48, y: 0 }, 1, true);
  expect(still.x).toBe(48);
  const t = npcTouch(200, 100, true);
  expect(t.jump).toBe(true);
  expect(t.talking).toBe(true);
  expect(npcTouch(500, 100, false).jump).toBe(false);
  expect(npcHopPx(160, 100, false) < 0).toBe(true);
  expect(npcHopPx(500, 100, false)).toBe(0);
  expect(npcHopPx(160, 100, true)).toBe(0);
  expect(lookFacing(100, 50)).toBe(-1);
  const water = { x: 1125, y: 345, w: 145, h: 125 };
  const inWater = (p: { x: number; y: number }) => (
    p.x >= water.x && p.x < water.x + water.w && p.y >= water.y && p.y < water.y + water.h
  );
  expect(inWater(DEFAULT_WALK_GRAPH.nodes.lake)).toBe(false);
  const shore = npcTarget('comerciante', 10, {
    comerciante: { morning: { x: 1172, y: 486 }, afternoon: { x: 996, y: 228 }, night: null },
  }, { x: 838, y: 468 });
  expect(inWater(shore)).toBe(false);
  expect(shore.x).toBe(1172);
});

test('Heitor anda pelo caminho de terra, sem dash', () => {
  const bounds = { w: 1280, h: 640 };
  const from = { x: 640, y: 365 };
  const lot = { x: 147, y: 198, w: 102, h: 78 };
  const to = heroStandPoint(lot, bounds);
  const route = heroRoute(from, to);
  expect(to.y >= lot.y + lot.h).toBe(true);
  expect(route.some((p) => p.x > 380 && p.x < 480 && p.y > 320 && p.y < 380)).toBe(true);
  expect(route.length >= 3).toBe(true);
  expect(heroWalkDurationMs(400, false) >= 3000).toBe(true);
  expect(heroWalkDurationMs(400, false) <= 4000).toBe(true);
  expect(heroWalkDurationMs(400, true)).toBe(0);
  const mid = heroWalkAlong([{ x: 0, y: 0 }, { x: 100, y: 0 }], 500, 1000);
  expect(Math.abs(mid.x - 50) < 1).toBe(true);
  expect(mid.walking).toBe(true);
  const early = heroWalkAlong([{ x: 0, y: 0 }, { x: 100, y: 0 }], 250, 1000);
  expect(early.x > 18 && early.x < 32).toBe(true);
  const late = heroWalkAlong([{ x: 0, y: 0 }, { x: 100, y: 0 }], 920, 1000);
  expect(late.x > 96).toBe(true);
  expect(heroShakeTarget('build:fornalha')).toBe('fornalha');
  expect(heroShakeTarget('npc:sabio')).toBe(null);
  const far = heroClickPlan('build:fornalha', from, lot, bounds, false);
  expect(far.immediate).toBe(false);
  expect(far.durationMs >= 1000).toBe(true);
  expect(far.points.length >= 3).toBe(true);
  expect(far.shakeId).toBe('fornalha');
  expect(far.to.y >= lot.y + lot.h).toBe(true);
  const here = heroClickPlan('build:fornalha', far.to, lot, bounds, false);
  expect(here.immediate).toBe(false);
  expect(here.durationMs).toBe(180);
  expect(heroClickPlan('npc:sabio', from, { x: from.x, y: from.y - 40, w: 20, h: 40 }, bounds, false).immediate).toBe(true);
  expect(heroClickPlan('npc:ferreiro', from, { x: 78, y: 176, w: 40, h: 74 }, bounds, false).immediate).toBe(true);
  expect(heroClickPlan('character', from, lot, bounds, false).immediate).toBe(true);
  const bag = heroClickPlan('pack', from, { x: 592, y: 336, w: 48, h: 48 }, bounds, false);
  expect(bag.immediate).toBe(false);
  expect(bag.to.y >= 384).toBe(true);
  expect(heroClickPlan('build:fornalha', from, lot, bounds, true).immediate).toBe(true);
  const pulse = tapPulse(80, 200);
  expect(pulse.scale > 1).toBe(true);
  expect(tapPulse(400, 200).scale).toBe(1);

  const doors: Array<[string, { x: number; y: number; w: number; h: number }]> = [
    ['build:bau', { x: 144, y: 348, w: 105, h: 78 }],
    ['build:mesa', { x: 723, y: 234, w: 90, h: 63 }],
    ['build:cofre', { x: 472, y: 422, w: 104, h: 80 }],
    ['build:agenda', { x: 584, y: 412, w: 112, h: 92 }],
    ['build:mercado', { x: 708, y: 414, w: 112, h: 90 }],
    ['build:arena', { x: 928, y: 314, w: 196, h: 168 }],
    ['build:torre', { x: 1064, y: 48, w: 90, h: 112 }],
    ['house', { x: 938, y: 110, w: 96, h: 74 }],
    ['mine', { x: 545, y: 32, w: 210, h: 138 }],
  ];
  for (const [id, box] of doors) {
    const plan = heroClickPlan(id, from, box, bounds, false);
    expect(plan.immediate).toBe(false);
    expect(plan.to.y >= box.y + box.h).toBe(true);
    expect(plan.to.y <= 518).toBe(true);
  }
  const fence = heroClickPlan('build:cerca', from, { x: 400, y: 500, w: 480, h: 72 }, bounds, false);
  expect(fence.to.y < 500).toBe(true);
  const housePlan = heroClickPlan('house', from, { x: 938, y: 110, w: 96, h: 74 }, bounds, false);
  expect(housePlan.points.every((p) => Math.hypot(p.x - 848, p.y - 268) > 40)).toBe(true);
});

test('diálogo: prioridade, once, 14 dias e missão perdida só nesse caso', () => {
  const base: DialogueCtx = {
    hour: 10,
    weekday: 2,
    level: 3,
    tier: 0,
    fullDays: 0,
    baseLevels: {},
    yesterday: { missed: false, complete: false },
    today: { done: 0, due: 3, quizDone: false },
    firstTime: new Set(['sabio']),
  };
  const first = pickDialogue('sabio', base, [], []);
  expect(first?.id).toBe('s_first');
  const again = pickDialogue('sabio', base, ['s_first'], []);
  expect(again?.id === 's_first').toBe(false);
  const miss = pickDialogue('sabio', { ...base, yesterday: { missed: true, complete: false }, firstTime: new Set() }, [], []);
  expect(miss?.id).toBe('s_miss');
  const noMiss = pickDialogue('sabio', { ...base, firstTime: new Set() }, [], []);
  expect(noMiss?.id === 's_miss').toBe(false);
  const skip14 = pickDialogue('sabio', { ...base, firstTime: new Set() }, [], ['s_morn']);
  expect(skip14?.id === 's_morn').toBe(false);
  expect(friendTier(0)).toBe(0);
  expect(friendTier(5)).toBe(1);
  expect(friendTier(80)).toBe(5);
  expect(talkPointsToday(4, true, 2)).toBe(5);
});

void run();
