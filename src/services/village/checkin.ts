import { SAGE_REPLIES } from '../../data/villageLines';
import type { DailyCheckinAnswers } from '../../types/village';

export function tomorrowValid(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length >= 3;
}

export function checkinXp(answers: DailyCheckinAnswers | null): number {
  if (!answers) return 0;
  if (!tomorrowValid(answers.tomorrow)) return 0;
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

/** Fala do Sábio na manhã seguinte. Determinística pelo seed (data). */
export function sageReplyFor(answers: DailyCheckinAnswers, seed: string): string {
  const pool = SAGE_REPLIES.length ? SAGE_REPLIES : ['Bom dia. O turno de ontem ficou registrado.'];
  const extras: string[] = [];
  if (answers.water) extras.push('A água de ontem valeu. Hoje cava melhor.');
  if (answers.stretch) extras.push('Alongou. Costas retas, picareta firme.');
  if (answers.kindness) extras.push('Gentileza ontem. Time que se respeita joga junto.');
  if (answers.screen) extras.push('Tela apagada cedo. Cabeça descansada.');
  const note = answers.tomorrow.trim();
  if (note) extras.push(`Anotei: ${note}`);
  const all = extras.length ? [...pool, ...extras] : pool;
  const i = hashSeed(`${seed}|${answers.tomorrow}|${answers.water}`) % all.length;
  return all[i];
}
