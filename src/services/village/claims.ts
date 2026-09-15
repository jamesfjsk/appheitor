import type { ClaimKind, VillageDoc } from '../../types/village';

/** Chave estável de concessão (uma por kind + partes). */
export function claimKey(kind: ClaimKind, ...parts: Array<string | number>): string {
  return [kind, ...parts.map((p) => String(p))].join(':');
}

export function hasClaim(village: Pick<VillageDoc, 'claimed'>, key: string): boolean {
  return Boolean(village.claimed && village.claimed[key]);
}
