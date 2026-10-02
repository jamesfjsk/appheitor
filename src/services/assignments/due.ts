// Prazo da encomenda. Puro.
// dueAt é o começo do dia seguinte a dueOn, em São Paulo (a regra usa request.time < dueAt).

import { addDays } from '../../utils/clock';

/**
 * Ajuste pedido renova o prazo quando o atual já passou ou vence hoje.
 * O pai escolhe; sem escolha, ou com um dia que não é depois de hoje, fica amanhã.
 * Prazo ainda no futuro não muda.
 */
export function nextDueOn(current: string | undefined, today: string, chosen?: string): string | null {
  if (!current || current > today) return null;
  if (chosen && /^\d{4}-\d{2}-\d{2}$/.test(chosen) && chosen > today) return chosen;
  return addDays(today, 1);
}

export function dueAtIso(dueOn: string): string {
  return `${addDays(dueOn, 1)}T00:00:00.000-03:00`;
}

/** A entrega nova passa quando o instante do pedido é anterior ao dueAt. */
export function submitInTime(requestIso: string, dueAt: string): boolean {
  const request = Date.parse(requestIso);
  const due = Date.parse(dueAt);
  if (!Number.isFinite(request) || !Number.isFinite(due)) return false;
  return request < due;
}

/** Semanas de prazo, no mínimo 1. O teto do projeto é 1 D por semana. */
export function deadlineWeeks(availableOn: string | undefined, dueOn: string | undefined): number {
  if (!availableOn || !dueOn) return 1;
  const start = Date.parse(`${availableOn}T12:00:00.000Z`);
  const end = Date.parse(`${dueOn}T12:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  const days = Math.round((end - start) / 86400000);
  return Math.max(1, Math.ceil(days / 7));
}
