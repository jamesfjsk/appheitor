import type { VillageDoc } from '../../types/village';
import { claimKey, hasClaim } from './claims';

export type ForgeTab = 'fire' | 'gear' | 'works';

export const FURNACE_COOK_MS = 2100;
export const FURNACE_COOK_REDUCED_MS = 400;

/** Fornalha e Ferraria são o mesmo fogo: nível 1+ e em pé abre a oficina. */
export function furnaceOpensForge(level: number, ruined: boolean): boolean {
  return level >= 1 && !ruined;
}

export function forgeStartTab(how: 'hotbar' | 'furnace' | 'fundir' | 'obras' | 'pack'): ForgeTab {
  if (how === 'furnace' || how === 'fundir') return 'fire';
  if (how === 'obras') return 'works';
  return 'gear';
}

export function burnClaimKey(date: string): string {
  return claimKey('burn', date);
}

export function burnedToday(village: Pick<VillageDoc, 'claimed'>, date: string): boolean {
  return hasClaim(village, burnClaimKey(date));
}
