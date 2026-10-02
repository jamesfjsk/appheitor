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
  applyPickaxeBonus,
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

const FUNCTION_WORDS = new Set(['to', 'a', 'an', 'the']);

const wordTokens = (s: string): string[] => plain(s).split(' ').filter(Boolean);

/** A diferença entre o escrito e o conserto é só pôr ou tirar "to" ou artigo. */
function onlyFunctionWords(wrong: string, fix: string): boolean {
  const a = wordTokens(wrong);
  const b = wordTokens(fix);
  if (a.join(' ') === b.join(' ')) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const pool = [...shorter];
  const extra: string[] = [];
  for (const w of longer) {
    const i = pool.indexOf(w);
    if (i >= 0) pool.splice(i, 1);
    else extra.push(w);
  }
  return pool.length === 0 && extra.length > 0 && extra.every((w) => FUNCTION_WORDS.has(w));
}

/**
 * Artigo, ou só "to"/artigo a mais ou a menos, nunca perde o sentido (§9.5).
 * Nos outros erros vale a marca do juiz. Sem marca, o sentido fica.
 */
export function errorLosesMeaning(e: NoteError): boolean {
  if (e.tag === 'article') return false;
  if (onlyFunctionWords(e.wrong, e.fix)) return false;
  return e.meaningLost === true;
}

/**
 * §9.5: 3 = as ideias, sem erro; 2 = as ideias, com 1 ou 2 erros que não mudam o sentido;
 * 1 = faltou ideia, o sentido se perdeu, ou 3 erros ou mais; 0 = não é inglês.
 * Sem `ideas`, a falta vem de `missing` (caminho da IA caída).
 */
export function noteScore(j: Omit<NoteJudgement, 'score'>, level = 1): 0 | 1 | 2 | 3 {
  if (!j.isEnglish) return 0;
  const ideaMissing = j.ideas && j.ideas.length > 0 ? j.ideas.some((idea) => !idea.ok) : j.missing.length > 0;
  const counted = j.errors.filter((e) => classifyNoteError(e, level) !== 'ignored');
  const meaningLost = counted.some((e) => errorLosesMeaning(e));
  if (ideaMissing || meaningLost || counted.length >= 3) return 1;
  if (counted.length === 0) return 3;
  return 2;
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
