// Três grupos de ganho. Puro.
// CONTRATOS_E_CARREIRAS.md §4.5.

import type { GoldTransaction } from '../../types';

export type IncomeGroup = 'life' | 'assignment' | 'play' | 'aside';

export const INCOME_GROUP: Record<GoldTransaction['source'], IncomeGroup> = {
  task_completion: 'life',
  late_task: 'life',
  task_reversal: 'life',
  chest: 'life',
  streak_chest: 'life',
  repair: 'life',
  assignment: 'assignment',
  quiz: 'play',
  english_game: 'play',
  achievement: 'play',
  challenge: 'play',
  book_report: 'play',
  daily_penalty: 'aside',
  goal_interest: 'aside',
  reward_redemption: 'aside',
  daily_bonus: 'aside',
  admin_adjustment: 'aside',
  birthday: 'aside',
  surprise_mission: 'aside',
  redemption_refund: 'aside',
  village_shop: 'aside',
  level_gift: 'aside',
  goal_deposit: 'aside',
  goal_withdraw: 'aside',
  goal_achieved: 'aside',
  merchant_sale: 'aside',
  merchant_buy: 'aside',
  trophy: 'aside',
};

export function incomeBucket(source: string): IncomeGroup {
  if (Object.prototype.hasOwnProperty.call(INCOME_GROUP, source)) {
    return INCOME_GROUP[source as GoldTransaction['source']];
  }
  return 'aside';
}

export interface WeekIncome {
  life: number;
  assignment: number;
  play: number;
  penalty: number;
  interest: number;
}

export function weekIncome(rows: Array<{ source: string; amount: number }>): WeekIncome {
  const out: WeekIncome = { life: 0, assignment: 0, play: 0, penalty: 0, interest: 0 };
  for (const row of rows) {
    const bucket = incomeBucket(row.source);
    if (bucket === 'life') out.life += row.amount;
    else if (bucket === 'assignment') out.assignment += row.amount;
    else if (bucket === 'play') out.play += row.amount;
    if (row.source === 'daily_penalty') out.penalty += row.amount;
    if (row.source === 'goal_interest') out.interest += row.amount;
  }
  return out;
}

export function gamesOutearnedMissions(income: WeekIncome): boolean {
  return income.play > income.life;
}
