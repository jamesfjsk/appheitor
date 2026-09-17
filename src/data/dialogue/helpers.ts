import type { DialogueCtx, DialogueEntry } from '../../services/village/dialogue';
import type { NpcId } from '../../types/village';

/** Mesmo helper do fallback: tier 0 e prioridade 1 quando não informados. */
export function e(
  npc: NpcId,
  id: string,
  lines: string[],
  when: DialogueEntry['when'],
  extra?: Partial<DialogueEntry>
): DialogueEntry {
  return { npc, id, lines, when, tier: extra?.tier ?? 0, priority: extra?.priority ?? 1, once: extra?.once };
}

// Predicados compartilhados. Só leem campos de DialogueCtx.
export const isMorning = (c: DialogueCtx): boolean => c.hour < 12;
export const isAfternoon = (c: DialogueCtx): boolean => c.hour >= 12 && c.hour < 18;
export const isEvening = (c: DialogueCtx): boolean => c.hour >= 18;
export const isWeekend = (c: DialogueCtx): boolean => c.weekday === 0 || c.weekday === 6;
export const dayComplete = (c: DialogueCtx): boolean => c.today.due > 0 && c.today.done >= c.today.due;
export const nothingYet = (c: DialogueCtx): boolean => c.today.due > 0 && c.today.done === 0 && c.hour >= 12;
export const oneLeft = (c: DialogueCtx): boolean => c.today.due > 0 && c.today.due - c.today.done === 1;
export const lv = (c: DialogueCtx, id: string): number => c.baseLevels[id] || 0;
/** A prova só existe com a Biblioteca (mesa) nível 1; depois das 21h não vale mais cobrar. */
export const quizPending = (c: DialogueCtx): boolean => lv(c, 'mesa') >= 1 && !c.today.quizDone && c.hour < 21;
export const daysBetween = (c: DialogueCtx, min: number, max: number): boolean => c.fullDays >= min && c.fullDays <= max;
