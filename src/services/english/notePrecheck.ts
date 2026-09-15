// ========================================
// Arena de Inglês: pré-checagem local do Recado (seção 4.5a)
// Normaliza os dois lados e aceita a variante quando todos os tokens aparecem
// em ordem (com folga de 1 letra por token). Módulo puro, roda em Node.
// ========================================

import type { NoteInfo } from '../../types/english';
import { NUMBER_WORDS } from '../../config/englishLevels';

const NUMBER_MAP: Record<string, string> = Object.fromEntries(NUMBER_WORDS.map((w, i) => [w, String(i)]));

/** Palavras em -s que não são plural (tirar o s viraria outra coisa) */
const PLURAL_EXCEPTIONS = new Set([
  'is', 'this', 'yes', 'us', 'his', 'has', 'was', 'does', 'always', 'sometimes', 'bus', 'plus', 'thus', 'its',
  'as', 'because', 'gas', 'glass', 'grass', 'class', 'boss', 'across',
]);

/** Tokens com menos letras que isto exigem igualdade exata (dígitos, in/on, a/an) */
export const FUZZY_MIN_LENGTH = 4;

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Forma singular aproximada: -ies -> y, -es depois de s/x/z/ch/sh, senão tira o -s final */
export function singularize(token: string): string {
  if (token.length <= 3 || PLURAL_EXCEPTIONS.has(token) || /\d/.test(token)) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (/(s|x|z|ch|sh)es$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('ss')) return token;
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

/** Tokens normalizados: minúsculas, sem acento nem pontuação, números por extenso -> dígito, sem plural */
export function normalizedTokens(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0)
    .map((t) => NUMBER_MAP[t] ?? t)
    .map(singularize);
}

export function normalize(text: string): string {
  return normalizedTokens(text).join(' ');
}

/** Distância de edição com troca de letras vizinhas valendo 1 ("sowrd" -> "sword"), o erro de digitação mais comum da criança */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const subst = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      let best = Math.min(prev[j] + 1, cur[j - 1] + 1, subst);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, prev2[j - 2] + 1);
      cur[j] = best;
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** Igual, ou 1 letra de diferença quando o token esperado tem 4+ letras */
export function tokenMatches(expected: string, actual: string): boolean {
  if (expected === actual) return true;
  if (expected.length < FUZZY_MIN_LENGTH) return false;
  return levenshtein(expected, actual) <= 1;
}

/** Todos os tokens de `variant` aparecem em `text`, na ordem (pode haver outras palavras no meio) */
function containsInOrder(textTokens: string[], variantTokens: string[]): boolean {
  let pos = 0;
  for (const v of variantTokens) {
    let found = -1;
    for (let i = pos; i < textTokens.length; i++) {
      if (tokenMatches(v, textTokens[i])) {
        found = i;
        break;
      }
    }
    if (found < 0) return false;
    pos = found + 1;
  }
  return true;
}

/** Alguma variante em inglês da informação está no texto */
export function matchesInfo(text: string, info: NoteInfo): boolean {
  const textTokens = normalizedTokens(text);
  return info.en.some((variant) => {
    const v = normalizedTokens(variant);
    return v.length > 0 && containsInOrder(textTokens, v);
  });
}

/** Informações que faltaram, na ordem de mustInclude */
export function missingInfos(text: string, mustInclude: NoteInfo[]): NoteInfo[] {
  return mustInclude.filter((info) => !matchesInfo(text, info));
}

/** Palavras em minúsculas sem acento nem pontuação; plural e números ficam como estão */
export function plainTokens(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0);
}

/** Distância de edição em palavras (maiúscula e pontuação ignoradas); valida a correção mínima do juiz */
export function wordDistance(a: string, b: string): number {
  const x = plainTokens(a);
  const y = plainTokens(b);
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[y.length];
}
