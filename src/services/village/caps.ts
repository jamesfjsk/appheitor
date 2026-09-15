import type { EconomySettings, GameGoldSource } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';
import type { GoldTransaction } from '../../types';

export const GAME_GOLD_SOURCES: readonly GameGoldSource[] = [
  'chest',
  'streak_chest',
  'challenge',
  'achievement',
  'goal_interest',
  'merchant_sale',
  'trophy',
  'repair',
] as const;

export function isGameGoldSource(source: string): source is GameGoldSource {
  return (GAME_GOLD_SOURCES as readonly string[]).includes(source);
}

export function gameGoldRoom(
  transactionsToday: GoldTransaction[],
  transactionsWeek: GoldTransaction[],
  settings: Pick<EconomySettings, 'gameGoldDailyCap' | 'gameGoldWeeklyCap'> = DEFAULT_ECONOMY
): { day: number; week: number; room: number } {
  const sum = (list: GoldTransaction[]) =>
    list
      .filter((t) => isGameGoldSource(t.source) && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
  const dayUsed = sum(transactionsToday);
  const weekUsed = sum(transactionsWeek);
  const day = Math.max(0, (settings.gameGoldDailyCap ?? 35) - dayUsed);
  const week = Math.max(0, (settings.gameGoldWeeklyCap ?? 100) - weekUsed);
  return { day, week, room: Math.min(day, week) };
}

export function capGold(amount: number, room: number): { paid: number; capped: boolean } {
  const want = Math.max(0, Math.floor(amount));
  const paid = Math.min(want, Math.max(0, Math.floor(room)));
  return { paid, capped: paid < want };
}
