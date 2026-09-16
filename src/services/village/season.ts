import { addDays } from '../../utils/clock';
import type { TrophyTier } from '../../types/village';

export interface WeekGoldStats {
  earned: number;
  fullDays: number;
}

/** Data de término da temporada (último dia inclusive). */
export function seasonEndsOn(startedOn: string, weeks: number): string {
  const n = Math.max(1, Math.floor(weeks));
  return addDays(startedOn, n * 7 - 1);
}

/**
 * Troféu da semana: bronze ≥ 60% do gold da semana anterior;
 * prata igualou; ouro superou em 20% ou mais e teve 5 tochas.
 */
export function trophyOfWeek(thisWeek: WeekGoldStats, lastWeek: WeekGoldStats): TrophyTier | null {
  const prev = lastWeek.earned;
  const now = thisWeek.earned;
  if (now <= 0 && prev <= 0) return null;
  if (prev <= 0) return now > 0 ? 'bronze' : null;
  if (now >= prev * 1.2 && thisWeek.fullDays >= 5) return 'ouro';
  if (now >= prev) return 'prata';
  if (now >= prev * 0.6) return 'bronze';
  return null;
}

export function recordsAfterWeek(
  records: Record<string, number>,
  weekStats: { goldEarned: number; fullDays: number; quizBest?: number }
): Record<string, number> {
  const next = { ...records };
  next.weekGold = Math.max(next.weekGold || 0, weekStats.goldEarned);
  next.fullDays = Math.max(next.fullDays || 0, weekStats.fullDays);
  if (typeof weekStats.quizBest === 'number') {
    next.quizBest = Math.max(next.quizBest || 0, weekStats.quizBest);
  }
  return next;
}

/** Soma dos níveis da base: 1 clareira, 2 caminho, 3 praça. */
export function villageGrowthStage(sumLevels: number): 1 | 2 | 3 {
  if (sumLevels >= 14) return 3;
  if (sumLevels >= 7) return 2;
  return 1;
}

export function buildingLevelSum(buildings: Record<string, number> | undefined): number {
  if (!buildings) return 0;
  return Object.values(buildings).reduce((s, n) => s + Math.max(0, Number(n) || 0), 0);
}
