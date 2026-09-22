import { GAME_ACHIEVEMENTS } from '../../data/achievements';
import { COSMETIC_BY_ID } from '../../config/village';
import { MATERIAL_LABELS } from '../../config/englishBase';
import type { Material } from '../../types/english';
import type { AchievementTier, GameAchievement, VillageGear, VillageStats } from '../../types/village';

/** As obras que existem na cena (o Campinho saiu na decisão 8): `base_completa` conta só estas. */
export const BASE_BUILDINGS = ['fornalha', 'bau', 'cerca', 'torre', 'mesa', 'cofre'] as const;
const SEVEN = BASE_BUILDINGS;

export const TIER_LABEL: Record<AchievementTier, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', exclusiva: 'Exclusiva' };

/** Material que a conquista de jogo paga: sobe com a Ferraria (fornalha) — 0-1 madeira, 2 pedra, 3 ferro. */
export function materialForForgeLevel(level: number): Material {
  if (level >= 3) return 'ferro';
  if (level >= 2) return 'pedra';
  return 'madeira';
}

/** Quanto gold de conquista ainda cabe na semana (`achievementGoldCap`); a chave da semana zera o contador. */
export function achievementGoldRoom(stats: VillageStats, weekStamp: number, cap: number): number {
  const sameWeek = (Number(stats.achGoldWeekKey) || 0) === weekStamp;
  const used = sameWeek ? Number(stats.achGoldWeek) || 0 : 0;
  return Math.max(0, cap - used);
}

/** O prêmio por extenso, como o cartão mostra: "+30 XP · 3 gold", "+75 XP · 2 pedra", "+150 XP · 1 esmeralda". */
export function rewardLine(ach: GameAchievement, forgeLevel = 0): string {
  const r = ach.reward;
  const parts = [`+${r.xp} XP`];
  if (r.gold) parts.push(`${r.gold} gold`);
  if (r.material) parts.push(`${r.material} ${MATERIAL_LABELS[materialForForgeLevel(forgeLevel)].toLowerCase()}`);
  if (r.rare) parts.push(`1 ${r.rare}`);
  if (r.cosmetic) parts.push(COSMETIC_BY_ID[r.cosmetic]?.label ?? 'cosmético');
  return parts.join(' · ');
}

/** Número do degrau para trios ("Mão na massa 10/50/100"): o alvo, quando o título termina com ele. */
export function stepOf(ach: GameAchievement): number | null {
  return ach.title.endsWith(` ${ach.target}`) ? ach.target : null;
}

export interface AchContext {
  stats: VillageStats;
  buildings?: Record<string, number>;
  gear?: VillageGear;
  npcTiers?: Record<string, number>;
  level?: number;
  owned?: string[];
}

export function progressOf(stats: VillageStats, ach: GameAchievement, ctx?: Omit<AchContext, 'stats'>): { current: number; target: number } {
  return { current: currentOf(ach, { stats, ...ctx }), target: ach.target };
}

export function currentOf(ach: GameAchievement, ctx: AchContext): number {
  const { stats } = ctx;
  const s = ach.stat;
  if (s === 'level') return ctx.level ?? stats.level ?? 0;
  if (s.startsWith('building:')) {
    const id = s.slice('building:'.length);
    return ctx.buildings?.[id] ?? stats[s] ?? 0;
  }
  if (s === 'buildingsMin') {
    const b = ctx.buildings || {};
    return Math.min(...SEVEN.map((id) => b[id] ?? 0));
  }
  if (s === 'pickaxe') return ctx.gear?.pickaxe ?? stats.pickaxe ?? 0;
  if (s === 'helmet' || s === 'boots' || s === 'lamp' || s === 'cape') {
    return Number(ctx.gear?.[s] ?? stats[s] ?? 0);
  }
  if (s === 'gearAll') {
    const g = ctx.gear;
    if (!g) return stats.gearAll ?? 0;
    return g.pickaxe >= 4 && g.helmet && g.boots && g.lamp && g.cape ? 1 : 0;
  }
  if (s.startsWith('npcTier:')) {
    const id = s.slice('npcTier:'.length);
    return ctx.npcTiers?.[id] ?? stats[s] ?? 0;
  }
  if (s === 'npcTiersMin') {
    const t = ctx.npcTiers || {};
    return Math.min(t.sabio ?? 0, t.comerciante ?? 0, t.ferreiro ?? 0, t.olheiro ?? 0);
  }
  if (s === 'milestonesOwned') {
    const owned = ctx.owned || [];
    return ['milestone_10', 'milestone_20', 'milestone_30', 'milestone_40'].filter((id) => owned.includes(id)).length;
  }
  return Number(stats[s]) || 0;
}

export function evaluateAchievements(stats: VillageStats, unlocked: Record<string, string>, ctx?: Omit<AchContext, 'stats'>): GameAchievement[] {
  const bag: AchContext = { stats, ...ctx };
  return GAME_ACHIEVEMENTS.filter((ach) => !unlocked[ach.id] && currentOf(ach, bag) >= ach.target);
}

export function visibleAchievements(unlocked: Record<string, string>): GameAchievement[] {
  return GAME_ACHIEVEMENTS.filter((ach) => !ach.hidden || Boolean(unlocked[ach.id]));
}

export function almostThere(stats: VillageStats, unlocked: Record<string, string>, ctx?: Omit<AchContext, 'stats'>, n = 3): GameAchievement[] {
  const bag: AchContext = { stats, ...ctx };
  return visibleAchievements(unlocked)
    .filter((ach) => !unlocked[ach.id])
    .map((ach) => ({ ach, cur: currentOf(ach, bag) }))
    .filter((x) => x.cur > 0 && x.cur < x.ach.target)
    .sort((a, b) => (b.cur / b.ach.target) - (a.cur / a.ach.target))
    .slice(0, n)
    .map((x) => x.ach);
}

export function seasonAchievementIds(): string[] {
  return GAME_ACHIEVEMENTS.filter((a) => a.resetOnSeason).map((a) => a.id);
}

export function rewardHasGold(ach: GameAchievement): boolean {
  return (ach.reward.gold || 0) > 0;
}
