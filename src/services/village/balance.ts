import type { GoldTransaction } from '../../types';
import { referenceIncome } from './income';
import { savingsRate } from './bank';
import { DEFAULT_ECONOMY } from '../../config/village';

const GAME_SOURCES = new Set([
  'chest',
  'streak_chest',
  'challenge',
  'achievement',
  'goal_interest',
  'merchant_sale',
  'trophy',
  'repair',
]);

export function txsLastDays(txs: GoldTransaction[], days: number, nowMs = Date.now()): GoldTransaction[] {
  const since = nowMs - days * 86400000;
  return txs.filter((t) => {
    const at = t.createdAt instanceof Date ? t.createdAt.getTime() : Date.parse(String(t.createdAt));
    return Number.isFinite(at) && at >= since;
  });
}

export function balancaTotals(cut: GoldTransaction[], fallbackR7 = DEFAULT_ECONOMY.incomeDayGold) {
  const earned = cut
    .filter((t) => t.amount > 0 && t.type !== 'saved' && t.source !== 'goal_interest')
    .reduce((s, t) => s + t.amount, 0);
  const spent = cut
    .filter((t) => t.amount < 0 && t.type !== 'saved')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const saved = cut
    .filter((t) => t.type === 'saved' && t.source === 'goal_deposit')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const bySource: Record<string, number> = {};
  for (const t of cut) {
    if (t.amount <= 0) continue;
    if (t.type === 'saved') continue;
    bySource[t.source] = (bySource[t.source] || 0) + t.amount;
  }
  const r7 = referenceIncome(cut, fallbackR7);
  const gameGold = cut
    .filter((t) => GAME_SOURCES.has(t.source) && t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  return {
    earned,
    spent,
    saved,
    bySource,
    r7,
    rate: savingsRate(cut),
    gameGold,
    gamePct: earned > 0 ? Math.round((gameGold / earned) * 100) : 0,
  };
}
