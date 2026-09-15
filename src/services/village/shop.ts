import type { Material } from '../../types/english';
import type { CosmeticItem, VillageDoc, VillageRare, VillageSettings } from '../../types/village';
import { COSMETIC_BY_ID, DEFAULT_VILLAGE_SETTINGS, GEAR_BY_ID } from '../../config/village';

const MATERIALS: Material[] = ['madeira', 'pedra', 'ferro', 'redstone'];

export function priceOf(
  item: CosmeticItem | string,
  settings: Pick<VillageSettings, 'goldPriceMultiplier'> = DEFAULT_VILLAGE_SETTINGS
): number {
  const def = typeof item === 'string' ? COSMETIC_BY_ID[item] : item;
  if (!def) return 0;
  if (def.free) return 0;
  return Math.round(def.basePrice * settings.goldPriceMultiplier);
}

export function canBuy(
  village: Pick<VillageDoc, 'owned'>,
  gold: number,
  item: CosmeticItem | string,
  settings: Pick<VillageSettings, 'goldPriceMultiplier'> = DEFAULT_VILLAGE_SETTINGS
): { ok: boolean; reason: 'ok' | 'owned' | 'gold' | 'unknown' | 'free' } {
  const def = typeof item === 'string' ? COSMETIC_BY_ID[item] : item;
  if (!def) return { ok: false, reason: 'unknown' };
  if (def.free) return { ok: false, reason: 'free' };
  if (village.owned.includes(def.id)) return { ok: false, reason: 'owned' };
  const price = priceOf(def, settings);
  if (gold < price) return { ok: false, reason: 'gold' };
  return { ok: true, reason: 'ok' };
}

export function canCraft(
  materials: Record<Material, number>,
  rare: VillageRare,
  gearId: string,
  currentLevel = 0
): { ok: boolean; reason: 'ok' | 'unknown' | 'materials' | 'rare' | 'already' | 'order' } {
  const def = GEAR_BY_ID[gearId];
  if (!def) return { ok: false, reason: 'unknown' };
  if (def.slot === 'pickaxe') {
    if (currentLevel >= def.level) return { ok: false, reason: 'already' };
    if (currentLevel !== def.level - 1) return { ok: false, reason: 'order' };
  } else if (currentLevel >= 1) {
    return { ok: false, reason: 'already' };
  }
  for (const m of MATERIALS) {
    const need = def.cost[m] ?? 0;
    if ((materials[m] ?? 0) < need) return { ok: false, reason: 'materials' };
  }
  if ((rare.diamante ?? 0) < (def.rare.diamante ?? 0)) return { ok: false, reason: 'rare' };
  if ((rare.esmeralda ?? 0) < (def.rare.esmeralda ?? 0)) return { ok: false, reason: 'rare' };
  return { ok: true, reason: 'ok' };
}

export function tradePreview(
  from: Material,
  to: Material
): { ok: boolean; fromQty: number; toQty: number; from: Material; to: Material } {
  if (from === to) return { ok: false, fromQty: 3, toQty: 1, from, to };
  return { ok: true, fromQty: 3, toQty: 1, from, to };
}
