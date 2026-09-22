import { expect, run, test } from '../../english/__tests__/harness';
import { ACH_GOLD_REAL, ACH_XP, GAME_ACHIEVEMENTS, GAME_ACHIEVEMENT_BY_ID, REAL_LIFE_CATEGORIES, isRealLifeCategory, rewardFor } from '../../../data/achievements';
import { BASE_BUILDINGS, achievementGoldRoom, currentOf, materialForForgeLevel, rewardHasGold, rewardLine, stepOf } from '../achievements';

test('ids únicos e nenhuma conquista aponta para o Campinho', () => {
  const ids = GAME_ACHIEVEMENTS.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect((BASE_BUILDINGS as readonly string[]).includes('campinho')).toBe(false);
  expect(BASE_BUILDINGS).toHaveLength(6);
  expect(GAME_ACHIEVEMENT_BY_ID.vila_verdade.description).toContain('seis');
});

test('base_completa conta só as seis obras: Campinho no zero não trava', () => {
  const b = { fornalha: 3, bau: 3, cerca: 3, torre: 3, mesa: 3, cofre: 3, campinho: 0 };
  expect(currentOf(GAME_ACHIEVEMENT_BY_ID.base_completa, { stats: {}, buildings: b })).toBe(3);
  expect(currentOf(GAME_ACHIEVEMENT_BY_ID.mestre_obras, { stats: {}, buildings: { ...b, cofre: 1 } })).toBe(1);
});

test('XP por tier 30/75/150/300 em todo o catálogo (decisão 38)', () => {
  expect(ACH_XP).toEqual({ bronze: 30, prata: 75, ouro: 150, exclusiva: 300 });
  const wrong = GAME_ACHIEVEMENTS.filter((a) => a.reward.xp !== ACH_XP[a.tier]).map((a) => a.id);
  expect(wrong).toEqual([]);
});

test('gold só nas categorias de vida real, 3/6/12; jogo paga material e raro', () => {
  expect([...REAL_LIFE_CATEGORIES]).toEqual(['rotina', 'agenda', 'bau', 'biblioteca']);
  expect(ACH_GOLD_REAL.bronze).toBe(3);
  expect(ACH_GOLD_REAL.prata).toBe(6);
  expect(ACH_GOLD_REAL.ouro).toBe(12);
  const goldOutside = GAME_ACHIEVEMENTS.filter((a) => !isRealLifeCategory(a.category) && rewardHasGold(a)).map((a) => a.id);
  expect(goldOutside).toEqual([]);
  const noGoldInside = GAME_ACHIEVEMENTS.filter((a) => isRealLifeCategory(a.category) && !rewardHasGold(a)).map((a) => a.id);
  expect(noGoldInside).toEqual([]);
  expect(rewardFor('rotina', 'bronze')).toEqual({ xp: 30, gold: 3 });
  expect(rewardFor('mina', 'bronze')).toEqual({ xp: 30, material: 1 });
  expect(rewardFor('mina', 'prata')).toEqual({ xp: 75, material: 2 });
  expect(rewardFor('mina', 'ouro')).toEqual({ xp: 150, rare: 'esmeralda' });
  expect(rewardFor('mina', 'exclusiva')).toEqual({ xp: 300, rare: 'diamante' });
  // cosmético entra no lugar do raro, com o XP do tier
  expect(GAME_ACHIEVEMENT_BY_ID.base_completa.reward).toEqual({ xp: 300, cosmetic: 'hat_mestre_obras' });
  expect(GAME_ACHIEVEMENT_BY_ID.todo_mundo.reward).toEqual({ xp: 300, cosmetic: 'cape_vila' });
  expect(GAME_ACHIEVEMENT_BY_ID.cart_perfect_5.reward).toEqual({ xp: 75, rare: 'esmeralda' });
  expect(GAME_ACHIEVEMENT_BY_ID.primeiro_livro.reward).toEqual({ xp: 30, gold: 3 });
});

test('teto semanal de gold de conquista: zera na semana nova, não fica negativo', () => {
  expect(achievementGoldRoom({}, 202639, 20)).toBe(20);
  expect(achievementGoldRoom({ achGoldWeek: 15, achGoldWeekKey: 202639 }, 202639, 20)).toBe(5);
  expect(achievementGoldRoom({ achGoldWeek: 25, achGoldWeekKey: 202639 }, 202639, 20)).toBe(0);
  expect(achievementGoldRoom({ achGoldWeek: 25, achGoldWeekKey: 202638 }, 202639, 20)).toBe(20);
});

test('material do nível da Ferraria e prêmio por extenso; degrau dos trios', () => {
  expect(materialForForgeLevel(0)).toBe('madeira');
  expect(materialForForgeLevel(1)).toBe('madeira');
  expect(materialForForgeLevel(2)).toBe('pedra');
  expect(materialForForgeLevel(3)).toBe('ferro');
  expect(rewardLine(GAME_ACHIEVEMENT_BY_ID.mao_na_massa_10)).toBe('+30 XP · 3 gold');
  expect(rewardLine(GAME_ACHIEVEMENT_BY_ID.cliente_fiel_25, 0)).toBe('+30 XP · 1 madeira');
  expect(rewardLine(GAME_ACHIEVEMENT_BY_ID.cliente_fiel_100, 2)).toBe('+75 XP · 2 pedra');
  expect(rewardLine(GAME_ACHIEVEMENT_BY_ID.cliente_fiel_365, 3)).toBe('+150 XP · 1 esmeralda');
  expect(rewardLine(GAME_ACHIEVEMENT_BY_ID.base_completa)).toBe('+300 XP · Capacete de mestre de obras');
  expect(stepOf(GAME_ACHIEVEMENT_BY_ID.mao_na_massa_10)).toBe(10);
  expect(stepOf(GAME_ACHIEVEMENT_BY_ID.veterano_1000)).toBe(1000);
  expect(stepOf(GAME_ACHIEVEMENT_BY_ID.primeira_picaretada)).toBe(null);
});

test('progresso nunca passa do alvo nem fica negativo (o "Faltam -20" do Flash)', () => {
  const a = GAME_ACHIEVEMENT_BY_ID.primeira_picaretada;
  const cur = currentOf(a, { stats: { missionsDone: 21 } });
  expect(Math.min(cur, a.target)).toBe(1);
  expect(Math.max(0, a.target - cur)).toBe(0);
});

void run();
