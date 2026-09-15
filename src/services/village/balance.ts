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

const DRAIN_LABEL: Record<string, string> = {
  reward_redemption: 'Prêmios',
  shop: 'Loja',
  goal_withdraw: 'Devolveu do Cofrinho',
  task_reversal: 'Missão desfeita',
};

const SOURCE_LABEL: Record<string, string> = {
  task_completion: 'Missão',
  quiz: 'Prova',
  chest: 'Baú do Dia',
  streak_chest: 'Baú das tochas',
  challenge: 'Desafio',
  merchant_sale: 'Comerciante',
  goal_deposit: 'Guardou no Cofrinho',
  goal_withdraw: 'Devolveu do Cofrinho',
  goal_interest: 'Bônus de paciência',
  repair: 'Conserto',
  late_task: 'Missão recuperada',
  reward_redemption: 'Prêmio',
  shop: 'Loja',
  achievement: 'Conquista',
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] || source;
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
    const label = sourceLabel(t.source);
    bySource[label] = (bySource[label] || 0) + t.amount;
  }
  const spentBy: Record<string, number> = {};
  for (const t of cut) {
    if (t.amount >= 0) continue;
    if (t.type === 'saved') continue;
    const label = DRAIN_LABEL[t.source] || sourceLabel(t.source);
    spentBy[label] = (spentBy[label] || 0) + Math.abs(t.amount);
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
    spentBy,
    r7,
    rate: savingsRate(cut),
    gameGold,
    gamePct: earned > 0 ? Math.round((gameGold / earned) * 100) : 0,
  };
}
