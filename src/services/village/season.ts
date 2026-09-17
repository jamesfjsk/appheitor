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

/** Tochas da semana: dias com todas as missões, sem férias/folga/punição. */
export function countWeekTorches(
  rows: Array<{ due: number; done: number; vacation?: boolean; paused?: boolean; punished?: boolean }>,
): number {
  return rows.filter((r) => !r.vacation && !r.paused && !r.punished && r.due > 0 && r.done >= r.due).length;
}

export interface CloseSeasonInput {
  season: number;
  stars: Array<{ season: number; level: number; endedOn: string }>;
  claimed: Record<string, string>;
  newAchievements: string[];
  achievementsUnlocked: Record<string, string>;
  stats: Record<string, number>;
  today: string;
  level: number;
  resetIds: string[];
}

export type CloseSeasonResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      endedSeason: number;
      nextSeason: number;
      stars: CloseSeasonInput['stars'];
      claimed: Record<string, string>;
      newAchievements: string[];
      achievementsUnlocked: Record<string, string>;
      stats: Record<string, number>;
    };

/** Recusa se a temporada já está nas estrelas ou em claimed['season:n'].
 *  Recusa com mensagem própria se alguma estrela já tem endedOn de hoje
 *  (a temporada 2 vazia não pode fechar no mesmo dia). */
export function closeSeasonState(input: CloseSeasonInput): CloseSeasonResult {
  const endedSeason = input.season > 0 ? input.season : 1;
  const seasonKey = `season:${endedSeason}`;
  if (
    input.stars.some((s) => s.season === endedSeason)
    || input.claimed[seasonKey]
  ) {
    return { ok: false, reason: 'Esta temporada já foi fechada' };
  }
  if (input.stars.some((s) => s.endedOn === input.today)) {
    return { ok: false, reason: 'Já fechou uma temporada hoje' };
  }
  const claimed = { ...input.claimed, [seasonKey]: input.today };
  const achievementsUnlocked = { ...input.achievementsUnlocked };
  const newAchievements = input.newAchievements.filter((id) => !input.resetIds.includes(id));
  for (const id of input.resetIds) {
    delete achievementsUnlocked[id];
    delete claimed[`ach:${id}`];
  }
  return {
    ok: true,
    endedSeason,
    nextSeason: endedSeason + 1,
    stars: [...input.stars, { season: endedSeason, level: input.level, endedOn: input.today }],
    claimed,
    newAchievements,
    achievementsUnlocked,
    stats: { ...input.stats, seasonsDone: (input.stats.seasonsDone || 0) + 1, level: 0 },
  };
}
