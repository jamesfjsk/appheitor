import { GAME_ACHIEVEMENTS } from '../../data/achievements';
import type { GameAchievement, VillageGear, VillageStats } from '../../types/village';

const SEVEN = ['fornalha', 'bau', 'cerca', 'torre', 'mesa', 'campinho', 'cofre'] as const;

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
  void ach;
  return false;
}
