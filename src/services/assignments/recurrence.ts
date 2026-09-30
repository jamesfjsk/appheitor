// Instância da recorrência: um id por dia. Puro.
// CONTRATOS_E_CARREIRAS.md §6.4.

import type { AssignmentRecurrence, AssignmentSize, Specialty } from '../../types/assignment';
import type { ProofSpec } from '../../types/proof';
import { addDays, weekdayOf } from '../../utils/clock';

/** 0 = domingo … 6 = sábado, no calendário de Brasília. */
export function weekdayIndex(date: string): number {
  return weekdayOf(date);
}

/** assignments/{recurrenceId}_{AAAA-MM-DD} — a mesma chamada não cria outra. */
export function instanceId(recurrenceId: string, date: string): string {
  return `${recurrenceId}_${date}`;
}

export function dueOnFor(availableOn: string, dueAfterDays: number): string {
  const days = Number.isFinite(dueAfterDays) ? Math.max(0, Math.floor(dueAfterDays)) : 0;
  return addDays(availableOn, days);
}

/** Próximo dia da semana, inclusive hoje. */
export function comingWeekday(date: string, weekday: number): string {
  const delta = (weekday - weekdayIndex(date) + 7) % 7;
  return addDays(date, delta);
}

export function recurrenceDue(weekdays: number[], date: string, active: boolean): boolean {
  if (!active) return false;
  return weekdays.includes(weekdayIndex(date));
}

export interface InstanceDraft {
  id: string;
  periodKey: string;
  availableOn: string;
  dueOn: string;
  recurrenceId: string;
  userId: string;
  templateId?: string;
  specialty: Specialty;
  title: string;
  story?: string;
  deliverable: string;
  criteria: string[];
  proof: ProofSpec;
  size: AssignmentSize;
  reward: AssignmentRecurrence['reward'];
  competencies: string[];
  adult?: boolean;
}

export function instanceDraft(rec: AssignmentRecurrence, date: string): InstanceDraft | null {
  if (!recurrenceDue(rec.weekdays, date, rec.active)) return null;
  if (!rec.userId || !rec.title || !rec.deliverable) return null;
  return {
    id: instanceId(rec.id, date),
    periodKey: date,
    availableOn: date,
    dueOn: dueOnFor(date, rec.dueAfterDays),
    recurrenceId: rec.id,
    userId: rec.userId,
    ...(rec.templateId ? { templateId: rec.templateId } : {}),
    specialty: rec.specialty,
    title: rec.title,
    ...(rec.story ? { story: rec.story } : {}),
    deliverable: rec.deliverable,
    criteria: rec.criteria,
    proof: rec.proof,
    size: rec.size,
    reward: rec.reward,
    competencies: rec.competencies,
    ...(rec.adult ? { adult: true } : {}),
  };
}
