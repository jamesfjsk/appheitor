import { areaNudgesFor, pickLine, DESC_LINES, FATO_LINES, SEG_LINES } from '../../data/helpLines';
import { addDays } from '../../utils/clock';
import { answerLeaksInPrompt } from './provaRules';
import { trapNamesOption } from './validateQuestion';

export interface NudgeQuestion {
  skill?: string;
  trap?: string;
  answer?: string;
}

export interface Nudge {
  text: string;
  nudge: 'trap' | 'strategy';
  lineId?: string;
}

/** O trap, se nomeia a escolhida e não entrega a resposta. Senão, uma pista da área. */
export function nudgeFor(question: NudgeQuestion, chosen: string, seed: number, recentIds: string[] = []): Nudge {
  const trap = question.trap || '';
  const answer = question.answer || '';
  if (trap && trapNamesOption(trap, chosen) && !answerLeaksInPrompt(trap, answer)) {
    return { text: trap, nudge: 'trap' };
  }
  const pool = areaNudgesFor(question.skill);
  const fresh = pool.filter((line) => !recentIds.includes(line.id));
  const list = fresh.length ? fresh : pool;
  const line = list[Math.abs(Math.trunc(seed)) % list.length];
  return { text: line.text, nudge: 'strategy', lineId: line.id };
}

export interface NudgeMemoryRow {
  id: string;
  date: string;
}

/** Guarda a data de cada fala. Uma fala nova não recarimba as antigas com hoje. */
export function rememberNudge(
  rows: readonly { id?: string; date?: string }[],
  lineId: string,
  today: string,
): NudgeMemoryRow[] {
  const since = addDays(today, -14);
  const kept: NudgeMemoryRow[] = [];
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id || typeof row.date !== 'string') continue;
    if (row.date < since || row.date > today || row.id === lineId) continue;
    kept.push({ id: row.id, date: row.date });
  }
  kept.push({ id: lineId, date: today });
  return kept.slice(-40);
}

export function nudgeIdsInWindow(rows: readonly { id?: string; date?: string }[], today: string): string[] {
  const since = addDays(today, -14);
  const ids: string[] = [];
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || typeof row.date !== 'string') continue;
    if (row.date < since || row.date > today) continue;
    ids.push(row.id);
  }
  return ids;
}

export function resultLine(kind: 'desc' | 'seg' | 'fato', seed: number): string {
  const lines = kind === 'desc' ? DESC_LINES : kind === 'seg' ? SEG_LINES : FATO_LINES;
  return pickLine(lines, seed);
}
