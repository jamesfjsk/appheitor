// Encomenda (Assignment). "Contrato" continua sendo só da Mina.
// CONTRATOS_E_CARREIRAS.md §8. Timestamps do Firestore viram ISO na leitura.

import type { Material } from './english';
import type { Proof, ProofSpec } from './proof';

export type AssignmentKind = 'paid' | 'training';

export type Specialty =
  | 'organizador'
  | 'testador'
  | 'catalogador'
  | 'pesquisador'
  | 'engenheiro'
  | 'inventor';

export type AssignmentSize = 'pequena' | 'normal' | 'sabado' | 'projeto' | 'grande';

export type AssignmentStatus =
  | 'available'
  | 'accepted'
  | 'submitted'
  | 'needs_changes'
  | 'approved'
  | 'cancelled'
  | 'expired';

export interface AssignmentReward {
  gold: number;
  xp: number;
  materials?: Partial<Record<Material, number>>;
}

export interface AssignmentSubmission {
  at: string;
  proof: Proof;
  whatWentWrong?: string;
  whatChanged?: string;
  hintsUsed?: number;
}

export interface AssignmentReview {
  at: string;
  verdict: 'approved' | 'needs_changes' | 'cancelled';
  missing?: number[];
  note?: string;
  photoPaths?: string[];
  competencies?: string[];
  fixedAfterFailure?: boolean;
  sawItWorking?: boolean;
  overCap?: boolean;
}

export interface AssignmentPayout {
  txId: string;
  gold: number;
  xp: number;
  materials?: Partial<Record<Material, number>>;
  at: string;
}

export interface Assignment {
  id: string;
  userId: string;
  kind: AssignmentKind;
  templateId?: string;
  specialty: Specialty;
  careerId?: 'engenheiro';
  title: string;
  story?: string;
  deliverable: string;
  criteria: string[];
  proof: ProofSpec;
  size?: AssignmentSize;
  reward: AssignmentReward;
  competencies: string[];
  adult?: boolean;
  status: AssignmentStatus;
  availableOn: string;
  dueOn?: string;
  recurrenceId?: string;
  periodKey?: string;
  createdBy: 'admin' | 'system';
  acceptedAt?: string;
  plan?: string;
  submissions: AssignmentSubmission[];
  reviews: AssignmentReview[];
  drops: number;
  payout?: AssignmentPayout;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentRecurrence {
  id: string;
  userId: string;
  templateId?: string;
  specialty: Specialty;
  title: string;
  story?: string;
  deliverable: string;
  criteria: string[];
  proof: ProofSpec;
  size: AssignmentSize;
  reward: AssignmentReward;
  competencies: string[];
  adult?: boolean;
  weekdays: number[];
  dueAfterDays: number;
  active: boolean;
}

export interface AssignmentDraft {
  templateId?: string;
  specialty: Specialty;
  title: string;
  story?: string;
  deliverable: string;
  criteria: string[];
  proof: ProofSpec;
  size: AssignmentSize;
  reward: AssignmentReward;
  competencies: string[];
  adult?: boolean;
  dueOn?: string;
  weekdays?: number[];
  dueAfterDays?: number;
  recurring?: boolean;
}
