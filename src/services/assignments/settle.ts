// Aprovação num armazenamento falso: paga uma vez.
// Espelha CONTRATOS_E_CARREIRAS.md §9, sem Firebase.
// Carreira e conquistas ficam no 15b.

import type { AssignmentStatus } from '../../types/assignment';
import { assignmentReward, type RewardConfig } from './rewards';

export interface SettleState {
  status: AssignmentStatus;
  kind: 'paid' | 'training';
  reward: { gold: number; xp: number };
  templateId?: string;
  claimed: boolean;
  txExists: boolean;
  gold: number;
  txs: Array<{ id: string; amount: number; balanceBefore: number; balanceAfter: number }>;
}

export type SettleResult =
  | { wrote: false; reason: 'not_submitted' | 'already' }
  | { wrote: true; paid: false; reason: 'claim_exists' }
  | { wrote: true; paid: true; gold: number };

export function settleApproval(
  state: SettleState,
  id: string,
  config?: RewardConfig,
): { state: SettleState; result: SettleResult } {
  if (state.status === 'approved') {
    return { state, result: { wrote: false, reason: 'already' } };
  }
  if (state.status !== 'submitted') {
    return { state, result: { wrote: false, reason: 'not_submitted' } };
  }

  const txId = `assignment_${id}`;
  if (state.claimed || state.txExists) {
    return {
      state: { ...state, status: 'approved' },
      result: { wrote: true, paid: false, reason: 'claim_exists' },
    };
  }

  const pay = assignmentReward(state, config);
  const next: SettleState = {
    ...state,
    status: 'approved',
    claimed: true,
    gold: state.gold + pay.gold,
    txs: state.txs,
    txExists: state.txExists,
  };
  if (pay.gold > 0) {
    next.txs = [
      ...state.txs,
      { id: txId, amount: pay.gold, balanceBefore: state.gold, balanceAfter: state.gold + pay.gold },
    ];
    next.txExists = true;
  }
  return { state: next, result: { wrote: true, paid: true, gold: pay.gold } };
}
