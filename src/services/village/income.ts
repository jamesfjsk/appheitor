import type { GoldTransaction } from '../../types';
import { nowBrazil } from '../../utils/clock';

function brazilDateOfTx(tx: GoldTransaction): string {
  const raw = tx.createdAt;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function ymdDiff(from: string, to: string): number {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!a || !b) return 0;
  const ms =
    Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3])) -
    Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  return Math.round(ms / 86400000);
}

export function sinceLaunch(txs: GoldTransaction[], launchedOn?: string | null): GoldTransaction[] {
  return txs.filter((t) => {
    if (t.metadata && t.metadata.launch === true) return false;
    if (!launchedOn) return true;
    const day = brazilDateOfTx(t);
    return !day || day >= launchedOn;
  });
}

export function daysSinceLaunch(launchedOn?: string | null, today?: string): number | null {
  if (!launchedOn) return null;
  return ymdDiff(launchedOn, today || nowBrazil().date);
}

export function referenceIncome(
  transactions7d: GoldTransaction[],
  fallback: number,
  opts?: { launchedOn?: string | null; today?: string }
): number {
  const launchedOn = opts?.launchedOn;
  const cut = sinceLaunch(transactions7d, launchedOn);
  if (launchedOn) {
    const days = daysSinceLaunch(launchedOn, opts?.today);
    if (days !== null && days < 7) return Math.max(1, Math.round(fallback));
  }
  const earned = cut
    .filter((t) => t.amount > 0 && t.type !== 'saved' && t.source !== 'goal_interest' && t.source !== 'goal_withdraw')
    .reduce((s, t) => s + t.amount, 0);
  if (cut.length === 0 || earned <= 0) return Math.max(1, Math.round(fallback));
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
