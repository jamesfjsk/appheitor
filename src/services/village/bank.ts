import type { EconomySettings, GoalDoc } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';
import { addDays, isoWeekOf, weekdayOf } from '../../utils/clock';
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

export function vaultGoalCap(vaultLevel: number): number {
  if (vaultLevel >= 2) return 8;
  if (vaultLevel >= 1) return 5;
  return 0;
}

/** Paciência por nível do Cofre: n1 10%, n2 20%, n3 30%. Sem teto semanal. */
export function vaultInterestPct(level: number): number {
  if (level >= 3) return 30;
  if (level >= 2) return 20;
  if (level >= 1) return 10;
  return 0;
}

export function weeklyInterest(
  goals: Array<Pick<GoalDoc, 'id' | 'status' | 'savedGold' | 'lastInterestWeek'>>,
  weekIso: string,
  _settings: Pick<EconomySettings, 'interestRatePct' | 'interestCapGold'> = DEFAULT_ECONOMY,
  vaultLevel?: number,
  depositedThisWeek: Record<string, number> = {},
): InterestLine[] {
  const ratePct = typeof vaultLevel === 'number' ? vaultInterestPct(vaultLevel) : vaultInterestPct(1);
  if (ratePct <= 0) return [];
  const rate = ratePct / 100;
  const eligible = goals.filter(
    (g) => g.status === 'open' && g.lastInterestWeek !== weekIso && (g.savedGold || 0) > 0
  );
  return eligible
    .map((g) => {
      const deposited = Math.max(0, Math.floor(depositedThisWeek[g.id] || 0));
      const savedBefore = Math.max(0, Math.floor(g.savedGold) - deposited);
      return { goalId: g.id, savedBefore, interest: Math.floor(savedBefore * rate) };
    })
    .filter((r) => r.savedBefore > 0 && r.interest > 0)
    .map((r) => ({
      goalId: r.goalId,
      interest: r.interest,
      savedBefore: r.savedBefore,
      savedAfter: r.savedBefore + r.interest,
    }));
}

/** Bônus se o gold ficar N semanas aplicadas (gold inteiro, sem teto). */
export function patienceForecast(saved: number, weeks: number, ratePct: number): number {
  const n = Math.max(0, Math.floor(weeks));
  let pile = Math.max(0, Math.floor(saved));
  if (n <= 0 || pile <= 0) return 0;
  const rate = Math.max(0, ratePct) / 100;
  if (rate <= 0) return 0;
  let bonus = 0;
  for (let i = 0; i < n; i++) {
    const add = Math.floor(pile * rate);
    if (add <= 0) break;
    bonus += add;
    pile += add;
  }
  return bonus;
}

/** Menor montinho que paga 1 gold numa semana. */
export function minGoldForBonus(ratePct: number): number {
  const rate = Math.max(0, ratePct) / 100;
  if (rate <= 0) return 0;
  return Math.ceil(1 / rate);
}

const WEEKDAY = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
const MONTH = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;

export function unlockOnAfter(today: string, weeks: number, previous?: string | null): string {
  const n = Math.max(1, Math.floor(weeks));
  const next = addDays(today, n * 7);
  if (previous && /^\d{4}-\d{2}-\d{2}$/.test(previous) && previous > next) return previous;
  return next;
}

export function canRedeemPile(
  goal: { status: string; savedGold: number; unlockOn?: string },
  today: string,
): boolean {
  if (goal.status !== 'open') return false;
  if ((goal.savedGold || 0) <= 0) return false;
  if (!goal.unlockOn) return true;
  return today >= goal.unlockOn;
}

export function redeemWaitLine(unlockOn: string, today: string): string {
  if (today >= unlockOn) return 'Já pode resgatar. O gold volta pro bolso.';
  return `Ainda rendendo. ${saqueWhen(unlockOn, today)}`;
}

/** Dia do saque, sem boletim. Sem prazo = já pode. */
export function saqueLine(unlockOn: string | undefined, today: string): string {
  if (!unlockOn || today >= unlockOn) return 'Já pode resgatar.';
  return saqueWhen(unlockOn, today);
}

function saqueWhen(unlockOn: string, today: string): string {
  const days = Math.round(
    (Date.parse(`${unlockOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000,
  );
  if (days <= 7) {
    const w = weekdayOf(unlockOn);
    const prep = w === 0 || w === 6 ? 'no' : 'na';
    return `Saque ${prep} ${WEEKDAY[w]}.`;
  }
  const d = Number(unlockOn.slice(8, 10));
  const m = Number(unlockOn.slice(5, 7)) - 1;
  return `Saque ${d} de ${MONTH[m]}.`;
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
  const savingsRatePct = earned > 0 ? Math.min(100, Math.round((saved / earned) * 100)) : 0;
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
  return Math.min(100, Math.round((saved / earned) * 100));
}
