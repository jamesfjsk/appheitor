// Transições da encomenda. Puro: sem Firebase e sem import.meta.env.
// CONTRATOS_E_CARREIRAS.md §6.

import type { AssignmentSize, AssignmentStatus } from '../../types/assignment';
import type { Proof, ProofSpec } from '../../types/proof';

export type AssignmentAction =
  | 'accept'
  | 'submit'
  | 'drop'
  | 'approve'
  | 'request_changes'
  | 'cancel'
  | 'expire';

export type StatusReason = 'transicao' | 'limite' | 'projeto' | 'prazo' | 'prova' | 'cedo';

export interface StatusCtx {
  kind: 'paid' | 'training';
  size?: AssignmentSize;
  /** Aceitas agora, sem contar esta. */
  activeCount: number;
  projectCount: number;
  activeMax: number;
  projectMax: number;
  today: string;
  dueOn?: string;
  proofComplete?: boolean;
}

export type StatusMove =
  | { ok: true; status: AssignmentStatus }
  | { ok: false; reason: StatusReason };

const PROJECT: ReadonlySet<AssignmentSize> = new Set(['projeto', 'grande']);

export function isProjectSize(size?: AssignmentSize): boolean {
  return Boolean(size && PROJECT.has(size));
}

function pastDue(ctx: StatusCtx): boolean {
  return Boolean(ctx.dueOn && ctx.dueOn < ctx.today);
}

export function effectiveStatus(
  a: { status: AssignmentStatus; dueOn?: string },
  today: string,
): AssignmentStatus {
  const open = a.status === 'available' || a.status === 'accepted' || a.status === 'needs_changes';
  if (open && a.dueOn && a.dueOn < today) return 'expired';
  return a.status;
}

export function proofReady(spec: ProofSpec, proof: Proof, criteriaCount: number): boolean {
  if (spec.kinds.includes('checklist')) {
    if (!proof.checklist || proof.checklist.length !== criteriaCount) return false;
    if (proof.checklist.some((mark) => mark !== true)) return false;
  }
  if (spec.kinds.includes('questions')) {
    const questions = spec.questions ?? [];
    if (questions.length === 0) return false;
    const answers = proof.answers ?? [];
    if (answers.length < questions.length) return false;
    for (let i = 0; i < questions.length; i += 1) {
      const answer = answers[i];
      if (!answer || answer.a.trim().length === 0) return false;
    }
  }
  return true;
}

export function nextStatus(current: AssignmentStatus, action: AssignmentAction, ctx: StatusCtx): StatusMove {
  if (action === 'accept') {
    if (current !== 'available' || ctx.kind !== 'paid') return { ok: false, reason: 'transicao' };
    if (pastDue(ctx)) return { ok: false, reason: 'prazo' };
    if (ctx.activeCount >= ctx.activeMax) return { ok: false, reason: 'limite' };
    if (isProjectSize(ctx.size) && ctx.projectCount >= ctx.projectMax) return { ok: false, reason: 'projeto' };
    return { ok: true, status: 'accepted' };
  }

  if (action === 'submit') {
    const fromTraining = current === 'available' && ctx.kind === 'training';
    const fromWork = current === 'accepted' || current === 'needs_changes';
    if (!fromTraining && !fromWork) return { ok: false, reason: 'transicao' };
    if (pastDue(ctx)) return { ok: false, reason: 'prazo' };
    if (ctx.proofComplete !== true) return { ok: false, reason: 'prova' };
    return { ok: true, status: 'submitted' };
  }

  if (action === 'drop') {
    if (ctx.kind !== 'paid') return { ok: false, reason: 'transicao' };
    if (current !== 'accepted' && current !== 'needs_changes') return { ok: false, reason: 'transicao' };
    return { ok: true, status: 'available' };
  }

  if (action === 'approve') {
    if (current !== 'submitted') return { ok: false, reason: 'transicao' };
    return { ok: true, status: 'approved' };
  }

  if (action === 'request_changes') {
    if (current !== 'submitted') return { ok: false, reason: 'transicao' };
    return { ok: true, status: 'needs_changes' };
  }

  if (action === 'cancel') {
    if (current === 'approved') return { ok: false, reason: 'transicao' };
    return { ok: true, status: 'cancelled' };
  }

  if (current !== 'available' && current !== 'accepted' && current !== 'needs_changes') {
    return { ok: false, reason: 'transicao' };
  }
  if (!pastDue(ctx)) return { ok: false, reason: 'cedo' };
  return { ok: true, status: 'expired' };
}

const base = (patch: Partial<StatusCtx> = {}): StatusCtx => ({
  kind: 'paid',
  activeCount: 0,
  projectCount: 0,
  activeMax: 3,
  projectMax: 1,
  today: '2026-09-29',
  proofComplete: true,
  ...patch,
});

export const statusCtx = base;
