// Plano da aprovação. Puro: a transação só escreve o que este plano manda.
// CONTRATOS_E_CARREIRAS.md §9. Carreira e conquistas ficam no 15b.

import type { AssignmentReward, AssignmentStatus } from '../../types/assignment';
import type { Material } from '../../types/english';
import { INITIAL_MATERIALS } from '../../config/englishBase';
import { claimKey } from '../village/claims';
import { assignmentReward, type RewardConfig } from './rewards';

const MATERIALS: Material[] = ['madeira', 'pedra', 'ferro', 'redstone'];

export interface ApprovalSnap {
  id: string;
  status: AssignmentStatus;
  kind: 'paid' | 'training';
  reward: AssignmentReward;
  templateId?: string;
  claimed: boolean;
  txExists: boolean;
  gold: number;
  board: string[];
  baseExists: boolean;
  progressExists: boolean;
  villageExists: boolean;
}

export interface MaterialPlan {
  /** true: criar englishBase com mapa aninhado; false: increment no doc que já existe. */
  create: boolean;
  materials: Partial<Record<Material, number>>;
}

export interface LedgerLine {
  id: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
}

export type ApprovalPlan =
  | { write: false; reason: 'not_submitted' | 'already' | 'missing_pocket' }
  | {
      write: true;
      paid: false;
      reason: 'claim_exists';
      reward: AssignmentReward;
      goldAfter: number;
      line: null;
      claim: null;
      material: null;
      board: string[];
    }
  | {
      write: true;
      paid: true;
      reward: AssignmentReward;
      goldAfter: number;
      line: LedgerLine | null;
      claim: string;
      material: MaterialPlan | null;
      board: string[];
    };

function cleanAdd(raw: Partial<Record<Material, number>> | undefined): Partial<Record<Material, number>> | undefined {
  if (!raw) return undefined;
  const out: Partial<Record<Material, number>> = {};
  for (const key of MATERIALS) {
    const n = Math.floor(Number(raw[key]) || 0);
    if (n > 0) out[key] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Mapa aninhado do doc novo: padrão do projeto mais o que a encomenda paga. Nenhuma chave tem ponto. */
export function materialsForCreate(add: Partial<Record<Material, number>> | undefined): Record<Material, number> {
  const out: Record<Material, number> = { ...INITIAL_MATERIALS };
  const extra = cleanAdd(add);
  if (!extra) return out;
  for (const key of MATERIALS) {
    const n = extra[key];
    if (n) out[key] = (out[key] || 0) + n;
  }
  return out;
}

export function approvalPlan(input: ApprovalSnap, config?: RewardConfig): ApprovalPlan {
  if (input.status === 'approved') return { write: false, reason: 'already' };
  if (input.status !== 'submitted') return { write: false, reason: 'not_submitted' };
  if (!input.progressExists || !input.villageExists) return { write: false, reason: 'missing_pocket' };

  const reward = assignmentReward(
    { kind: input.kind, reward: input.reward, templateId: input.templateId },
    config,
  );

  if (input.claimed || input.txExists) {
    return {
      write: true,
      paid: false,
      reason: 'claim_exists',
      reward,
      goldAfter: input.gold,
      line: null,
      claim: null,
      material: null,
      board: input.board,
    };
  }

  const goldAfter = input.gold + reward.gold;
  const extra = cleanAdd(reward.materials);
  const material: MaterialPlan | null = extra
    ? input.baseExists
      ? { create: false, materials: extra }
      : { create: true, materials: materialsForCreate(extra) }
    : null;

  return {
    write: true,
    paid: true,
    reward,
    goldAfter,
    line: reward.gold > 0
      ? { id: `assignment_${input.id}`, amount: reward.gold, balanceBefore: input.gold, balanceAfter: goldAfter }
      : null,
    claim: claimKey('assignment', input.id),
    material,
    board: input.board.filter((item) => item !== input.id),
  };
}
