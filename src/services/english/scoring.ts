// ========================================
// Arena de Inglês: nota do Recado (seção 4.5c), materiais por tipo e andaime
// Módulo puro. As tabelas de material/XP moram em config/englishRewards.ts e são
// reexportadas aqui para quem só conhece o módulo de pontuação.
// ========================================

import type { NoteError, NoteJudgement, ScaffoldStage } from '../../types/english';
import { NUMBER_WORDS } from '../../config/englishLevels';
import { levenshtein } from './notePrecheck';

export {
  merchantMaterial,
  letterMaterial,
  forgeMaterial,
  noteMaterial,
  materialFor,
  rewardFor,
  applyFurnaceBonus,
} from '../../config/englishRewards';

export type NoteErrorSeverity = 'ignored' | 'small' | 'blocking';

/** Grafia/outro com fix de até esta distância em letras é erro pequeno */
export const SMALL_FIX_MAX_LETTERS = 2;
/** Notas 3 seguidas necessárias para subir um estágio do andaime */
export const SCAFFOLD_STEP = 2;

const NUMBER_MAP: Record<string, string> = Object.fromEntries(NUMBER_WORDS.map((w, i) => [w, String(i)]));

/** Minúsculas, sem pontuação, espaços únicos (maiúscula e pontuação nunca contam); acentos ficam */
const plain = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'À-ÿ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const digitsAsWords = (s: string): string =>
  plain(s)
    .split(' ')
    .map((t) => NUMBER_MAP[t] ?? t)
    .join(' ');

/**
 * Pequeno: artigo, plural, preposição, grafia com fix de até 2 letras (seção 4.5c).
 * Bloqueante: verbo ausente/errado, ordem que muda o sentido, grafia maior e "other"
 * (o juiz usa "other" para palavra em português, que a especificação trata como bloqueante;
 * a distância não serve para reconhecer "em" -> "in").
 * Ignorado: só maiúscula/pontuação; no nível 1, dígito no lugar do número por extenso.
 */
export function classifyNoteError(e: NoteError, level = 1): NoteErrorSeverity {
  const w = plain(e.wrong);
  const f = plain(e.fix);
  if (w === f) return 'ignored';
  // Só dígito x número por extenso: nível 1 aceita; nos outros é erro pequeno
  if (digitsAsWords(w) === digitsAsWords(f)) return level <= 1 ? 'ignored' : 'small';
  switch (e.tag) {
    case 'article':
    case 'plural':
    case 'preposition':
      return 'small';
    case 'verb':
    case 'word_order':
    case 'other':
      return 'blocking';
    case 'spelling':
      return levenshtein(w, f) <= SMALL_FIX_MAX_LETTERS ? 'small' : 'blocking';
  }
}

/** 0 = não é inglês; 1 = faltou informação, erro bloqueante ou 3+ pequenos; 2 = 1-2 pequenos; 3 = limpo */
export function noteScore(j: Omit<NoteJudgement, 'score'>, level = 1): 0 | 1 | 2 | 3 {
  if (!j.isEnglish) return 0;
  const severities = j.errors.map((e) => classifyNoteError(e, level)).filter((s) => s !== 'ignored');
  if (j.missing.length > 0 || severities.includes('blocking')) return 1;
  if (severities.length === 0) return 3;
  return severities.length <= 2 ? 2 : 1;
}

/** Sobe um estágio a cada 2 notas 3 seguidas (0 -> 1 -> 2); qualquer nota menor zera a sequência */
export function nextScaffoldStage(
  stage: ScaffoldStage,
  noteStreak3: number,
  score: number
): { scaffoldStage: ScaffoldStage; noteStreak3: number } {
  if (score < 3) return { scaffoldStage: stage, noteStreak3: 0 };
  const streak = noteStreak3 + 1;
  if (streak >= SCAFFOLD_STEP && stage < 2) return { scaffoldStage: (stage + 1) as ScaffoldStage, noteStreak3: 0 };
  return { scaffoldStage: stage, noteStreak3: streak };
}
