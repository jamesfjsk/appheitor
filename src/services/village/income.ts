import type { GoldTransaction } from '../../types';

export function referenceIncome(transactions7d: GoldTransaction[], fallback: number): number {
  const earned = transactions7d
    .filter((t) => t.amount > 0 && t.type !== 'saved' && t.source !== 'goal_interest' && t.source !== 'goal_withdraw')
    .reduce((s, t) => s + t.amount, 0);
  if (transactions7d.length === 0 || earned <= 0) return Math.max(1, Math.round(fallback));
  return Math.max(1, Math.round(earned / 7));
}

export function priceForDays(r7: number, days: number): number {
  const raw = Math.max(0, r7) * Math.max(0, days);
  return Math.round(raw / 5) * 5;
}

export function daysToAfford(price: number, gold: number, r7: number): number {
  if (gold >= price) return 0;
  if (r7 <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil((price - gold) / r7);
}
