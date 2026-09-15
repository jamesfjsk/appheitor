// ========================================
// Arena de Inglês: tabelas de recompensa (seção 6 da especificação)
// Módulo puro. Materiais 0-3 por contrato; XP/gold por material só nos premiados;
// todo contrato terminado paga ao menos MIN_XP.
// ========================================

import type { ContractType, MaterialCount } from '../types/english';

export const MAX_MATERIAL = 3;
export const MIN_XP = 5;
/** Além do Recado, quantos contratos com material > 0 recebem XP/gold por dia */
export const REWARDED_OTHER_SLOTS = 2;
/** Comerciante: teto de material quando o texto completo foi mostrado */
export const MERCHANT_TEXT_SHOWN_CAP: MaterialCount = 2;
/** Ferraria (6 itens): acertos para 3 e para 2 materiais; abaixo disso 0 */
export const FORGE_THRESHOLDS = { three: 5, two: 3 };

/** XP por material 0..3 (índice = material) */
export const XP_BY_MATERIAL: Record<ContractType, [number, number, number, number]> = {
  merchant: [MIN_XP, 8, 12, 16],
  letter: [MIN_XP, 8, 12, 16],
  forge: [MIN_XP, 8, 12, 16],
  note: [MIN_XP, 10, 15, 20],
};

/** Gold por material 0..3 (índice = material) */
export const GOLD_BY_MATERIAL: Record<ContractType, [number, number, number, number]> = {
  merchant: [0, 3, 4, 5],
  letter: [0, 3, 4, 5],
  forge: [0, 3, 4, 5],
  note: [0, 4, 6, 8],
};

/** XP fixo por nível de construção (índice = nível - 1) */
export const BUILD_XP: [number, number, number] = [10, 15, 20];

const clampMaterial = (n: number): MaterialCount => Math.max(0, Math.min(MAX_MATERIAL, Math.floor(n))) as MaterialCount;

/** 3 = todos os passos; 2 = errou 1; 1 = acertou >= 1; teto 2 se o texto completo apareceu */
export function merchantMaterial(hits: number, steps: number, textShown: boolean): MaterialCount {
  if (steps <= 0) return 0;
  let m: MaterialCount = 0;
  if (hits >= steps) m = 3;
  else if (hits === steps - 1) m = 2;
  else if (hits >= 1) m = 1;
  return textShown ? (Math.min(m, MERCHANT_TEXT_SHOWN_CAP) as MaterialCount) : m;
}

/**
 * Carta: 3/2/1/0 por acertos em `total` perguntas (3, ou 2 quando a validação descartou uma).
 * evidenceOk = false só quando a decisão foi acertada sem localizar a evidência: vale meio acerto.
 */
export function letterMaterial(hits: number, evidenceOk: boolean, total = 3): MaterialCount {
  if (total <= 0) return 0;
  const points = Math.max(0, hits - (evidenceOk ? 0 : 0.5));
  return clampMaterial((points * MAX_MATERIAL) / total);
}

/** Recado: a nota 0-3 do juiz vira ferro na mesma medida */
export function noteMaterial(score: number): MaterialCount {
  return clampMaterial(score);
}

/** Ferraria: >= 5 acertos (meio ponto na 2ª tentativa) = 3; 3-4 = 2; senão 0 */
export function forgeMaterial(hits: number): MaterialCount {
  if (hits >= FORGE_THRESHOLDS.three) return 3;
  if (hits >= FORGE_THRESHOLDS.two) return 2;
  return 0;
}

export interface OutcomeParts {
  hits?: number;
  steps?: number;
  total?: number;
  textShown?: boolean;
  evidenceOk?: boolean;
  score?: number;
}

/** Despacho por tipo com as partes relevantes do resultado */
export function materialFor(type: ContractType, parts: OutcomeParts): MaterialCount {
  switch (type) {
    case 'merchant':
      return merchantMaterial(parts.hits ?? 0, parts.steps ?? parts.total ?? 0, parts.textShown ?? false);
    case 'letter':
      return letterMaterial(parts.hits ?? 0, parts.evidenceOk ?? true, parts.total ?? 3);
    case 'note':
      return noteMaterial(parts.score ?? 0);
    case 'forge':
      return forgeMaterial(parts.hits ?? 0);
  }
}

/** XP/gold do contrato; sem vaga premiada paga só o XP mínimo de tentativa */
export function rewardFor(type: ContractType, material: number, rewarded = true): { xp: number; gold: number } {
  const m = clampMaterial(material);
  if (!rewarded) return { xp: MIN_XP, gold: 0 };
  return { xp: Math.max(MIN_XP, XP_BY_MATERIAL[type][m]), gold: GOLD_BY_MATERIAL[type][m] };
}

/** XP ao subir uma construção para o nível dado (1..3) */
export function buildXp(level: number): number {
  const i = Math.min(BUILD_XP.length, Math.max(1, Math.floor(level))) - 1;
  return BUILD_XP[i];
}

/** Fornalha n1: +1 material no primeiro contrato do dia, sem passar do teto */
export function applyFurnaceBonus(material: MaterialCount, fornalhaLevel: number, firstOfDay: boolean): MaterialCount {
  if (!firstOfDay || fornalhaLevel < 1 || material <= 0) return material;
  return clampMaterial(material + 1);
}
