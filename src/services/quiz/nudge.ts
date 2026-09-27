import { areaNudgesFor, pickLine, DESC_LINES, FATO_LINES, SEG_LINES } from '../../data/helpLines';
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

export function resultLine(kind: 'desc' | 'seg' | 'fato', seed: number): string {
  const lines = kind === 'desc' ? DESC_LINES : kind === 'seg' ? SEG_LINES : FATO_LINES;
  return pickLine(lines, seed);
}
