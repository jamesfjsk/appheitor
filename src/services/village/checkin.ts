import { SAGE_REPLIES } from '../../data/villageLines';
import type { DailyCheckinAnswers, DayMood } from '../../types/village';

export function tomorrowValid(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length >= 3;
}

export function checkinXp(answers: DailyCheckinAnswers | null): number {
  if (!answers) return 0;
  if (!tomorrowValid(answers.tomorrow)) return 0;
  if (!answers.mood) return 0;
  return 5;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MOOD_LINE: Record<DayMood, string> = {
  bom: 'Dia bom ontem. Hoje repete a receita.',
  normal: 'Dia normal também constrói.',
  dificil: 'Ontem foi difícil. Hoje começa do zero, sem dívida.',
};

/** Fala do Sábio na manhã seguinte. Determinística pelo seed (data). */
export function sageReplyFor(answers: DailyCheckinAnswers, seed: string): string {
  const pool = SAGE_REPLIES.length ? SAGE_REPLIES : ['Bom dia. O turno de ontem ficou registrado.'];
  const extras: string[] = [];
  if (answers.mood) extras.push(MOOD_LINE[answers.mood]);
  const note = answers.tomorrow.trim();
  if (note) extras.push(`Anotei: ${note}`);
  const all = extras.length ? [...pool, ...extras] : pool;
  const i = hashSeed(`${seed}|${answers.tomorrow}|${answers.mood || ''}`) % all.length;
  return all[i];
}
