import type { ClaimKind, VillageDoc, VillageRare } from '../../types/village';

/** Chave estável de concessão (uma por kind + partes). */
export function claimKey(kind: ClaimKind, ...parts: Array<string | number>): string {
  return [kind, ...parts.map((p) => String(p))].join(':');
}

/** Presente de nível: `level:<temporada>:<n>` (season 0 = ainda sem "nova fase"). */
export function levelGiftClaimKey(season: number, level: number): string {
  return claimKey('level', Math.max(0, Math.floor(Number(season) || 0)), Math.floor(level));
}

/** Raro extra nos múltiplos de 5 (esmeralda) e de 10 (diamante, inclusive 40). */
export function rareGiftForLevel(level: number): keyof VillageRare | null {
  if (level === 10 || level === 20 || level === 30 || level === 40) return 'diamante';
  if (level === 5 || level === 15 || level === 25 || level === 35) return 'esmeralda';
  return null;
}

export function hasClaim(village: Pick<VillageDoc, 'claimed'>, key: string): boolean {
  return Boolean(village.claimed && village.claimed[key]);
}
