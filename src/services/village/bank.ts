import type { EconomySettings, GoalDoc } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';
import { isoWeekOf } from '../../utils/clock';
import type { GoldTransaction } from '../../types';

export type DepositFail = 'amount' | 'gold' | 'closed' | 'target';

export function validateDeposit(
  goal: Pick<GoalDoc, 'status' | 'targetGold' | 'savedGold'>,
  amount: number,
  availableGold: number
): { ok: true } | { ok: false; reason: DepositFail } {
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, reason: 'amount' };
  if (goal.status !== 'open') return { ok: false, reason: 'closed' };
  if (goal.targetGold < 20) return { ok: false, reason: 'target' };
  if (amount > availableGold) return { ok: false, reason: 'gold' };
  return { ok: true };
}

export interface InterestLine {
  goalId: string;
  interest: number;
  savedBefore: number;
  savedAfter: number;
}

export function vaultInterestRatePct(vaultLevel: number): number {
  if (vaultLevel >= 3) return 12;
  if (vaultLevel >= 2) return 8;
  if (vaultLevel >= 1) return 5;
  return 0;
}

export function vaultGoalCap(vaultLevel: number): number {
  if (vaultLevel >= 2) return 2;
  if (vaultLevel >= 1) return 1;
  return 0;
}

export function weeklyInterest(
  goals: Array<Pick<GoalDoc, 'id' | 'status' | 'savedGold' | 'lastInterestWeek'>>,
  weekIso: string,
  settings: Pick<EconomySettings, 'interestRatePct' | 'interestCapGold'> = DEFAULT_ECONOMY,
  vaultLevel?: number
): InterestLine[] {
  if (vaultLevel === 0) return [];
  const fromVault = typeof vaultLevel === 'number' ? vaultInterestRatePct(vaultLevel) : null;
  const rate = Math.max(0, fromVault ?? settings.interestRatePct ?? 5) / 100;
  const cap = Math.max(0, settings.interestCapGold ?? 20);
  const eligible = goals.filter(
    (g) => g.status === 'open' && g.lastInterestWeek !== weekIso && (g.savedGold || 0) > 0
  );
  const raw = eligible.map((g) => {
    const savedBefore = Math.max(0, Math.floor(g.savedGold));
    return { goalId: g.id, savedBefore, interest: Math.floor(savedBefore * rate) };
  });
  const total = raw.reduce((s, r) => s + r.interest, 0);
  const scaled =
    total <= cap
      ? raw
      : raw.map((r) => ({
          ...r,
          interest: total === 0 ? 0 : Math.floor((r.interest * cap) / total),
        }));
  const paid = scaled.reduce((s, r) => s + r.interest, 0);
  if (paid < cap && total > cap) {
    let rest = cap - paid;
    const order = [...scaled].sort((a, b) => b.savedBefore - a.savedBefore);
    for (const row of order) {
      if (rest <= 0) break;
      const hit = scaled.find((s) => s.goalId === row.goalId);
      if (!hit) continue;
      hit.interest += 1;
      rest -= 1;
    }
  }
  return scaled
    .filter((r) => r.interest > 0)
    .map((r) => ({
      goalId: r.goalId,
      interest: r.interest,
      savedBefore: r.savedBefore,
      savedAfter: r.savedBefore + r.interest,
    }));
}

export interface WeeklyStatement {
  weekIso: string;
  earned: number;
  spent: number;
  saved: number;
  interest: number;
  savingsRatePct: number;
  bySource: Record<string, number>;
}

function brazilDateOfTx(tx: Pick<GoldTransaction, 'createdAt'>): string {
  const d = tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) if (p.type !== 'literal') bag[p.type] = p.value;
  return `${bag.year}-${bag.month}-${bag.day}`;
}

export function weeklyStatement(
  transactions: GoldTransaction[],
  weekIso: string
): WeeklyStatement {
  const inWeek = transactions.filter((t) => isoWeekOf(brazilDateOfTx(t)) === weekIso);
  let earned = 0;
  let spent = 0;
  let saved = 0;
  let interest = 0;
  const bySource: Record<string, number> = {};
  for (const t of inWeek) {
    if (t.source === 'goal_interest') {
      const meta = t.metadata as { savedBefore?: number; savedAfter?: number } | undefined;
      const n =
        typeof meta?.savedAfter === 'number' && typeof meta?.savedBefore === 'number'
          ? meta.savedAfter - meta.savedBefore
          : 0;
      interest += Math.max(0, n);
      continue;
    }
    if (t.source === 'goal_deposit') {
      saved += Math.abs(t.amount);
      continue;
    }
    if (t.amount > 0 && t.type !== 'saved') {
      earned += t.amount;
      bySource[t.source] = (bySource[t.source] ?? 0) + t.amount;
    }
    if (t.amount < 0 && t.type !== 'saved') {
      spent += Math.abs(t.amount);
    }
  }
  const savingsRatePct = earned > 0 ? Math.round((saved / earned) * 100) : 0;
  return { weekIso, earned, spent, saved, interest, savingsRatePct, bySource };
}

export function savingsRate(transactionsMonth: GoldTransaction[]): number {
  const earned = transactionsMonth
    .filter((t) => t.amount > 0 && t.type !== 'saved' && t.source !== 'goal_interest')
    .reduce((s, t) => s + t.amount, 0);
  const saved = transactionsMonth
    .filter((t) => t.source === 'goal_deposit')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  if (earned <= 0) return 0;
  return Math.round((saved / earned) * 100);
}
