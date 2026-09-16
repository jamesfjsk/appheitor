import type { BuildingId } from '../../types/english';
import type { EconomySettings, Period } from '../../types/village';
import {
  buildingCost,
  canAfford,
  MATERIAL_LABELS,
  MATERIALS,
  missingMaterials,
  type MaterialCost,
} from '../../config/englishBase';
import { crackedSentence, DEFAULT_ECONOMY } from '../../config/village';

/** Casa, Mina, Mochila e personagens não entram. */
export const BREAKABLE_LOTS: BuildingId[] = [
  'fornalha', 'bau', 'cerca', 'torre', 'mesa', 'cofre', 'agenda', 'mercado', 'campinho', 'arena',
];

export const DEFAULT_LOTS_BY_PERIOD: Record<Period, BuildingId> = {
  morning: 'fornalha',
  afternoon: 'cerca',
  evening: 'torre',
};

export function isBroken(cracks: string[] | undefined, id: string): boolean {
  return (cracks || []).includes(id);
}

export function liveBuildingLevel(
  buildings: Record<string, number> | undefined,
  cracks: string[] | undefined,
  id: string,
): number {
  if (isBroken(cracks, id)) return 0;
  return Math.max(0, buildings?.[id] || 0);
}

export function ruinUseError(id: string): Error {
  return new Error(`${crackedSentence(id)} Arruma com material ou com as missões de hoje.`);
}

const EMPTY_COST: MaterialCost = { madeira: 0, pedra: 0, ferro: 0, redstone: 0 };

/** 1 do primeiro material do custo do nível atual. Mais barato que reconstruir; sem redstone. */
export function repairMaterialCost(id: BuildingId, level: number): MaterialCost {
  const src = buildingCost(id, Math.max(1, Math.min(3, level || 1)));
  if (!src) return { ...EMPTY_COST, madeira: 1 };
  if ((src.madeira || 0) > 0) return { ...EMPTY_COST, madeira: 1 };
  if ((src.pedra || 0) > 0) return { ...EMPTY_COST, pedra: 1 };
  if ((src.ferro || 0) > 0) return { ...EMPTY_COST, ferro: 1 };
  return { ...EMPTY_COST, madeira: 1 };
}

/** Tira só esta obra das ruínas e debita o material. Sem reembolso de gold. */
export function applyMaterialRepair(
  cracks: string[],
  id: BuildingId,
  materials: MaterialCost,
  level: number,
): { cracks: string[]; materials: MaterialCost } {
  if (!BREAKABLE_LOTS.includes(id)) throw new Error('Essa obra não cai');
  if (!cracks.includes(id)) throw new Error('Essa obra não está em ruínas');
  const cost = repairMaterialCost(id, level);
  if (!canAfford(materials, cost)) {
    const miss = missingMaterials(materials, cost);
    const bits = MATERIALS.filter((m) => miss[m] > 0).map((m) => `${miss[m]} ${MATERIAL_LABELS[m].toLowerCase()}`);
    throw new Error(bits.length ? `Falta ${bits.join(', ')}` : 'Faltam materiais para arrumar');
  }
  return {
    cracks: cracks.filter((c) => c !== id),
    materials: {
      madeira: Math.max(0, (materials.madeira || 0) - cost.madeira),
      pedra: Math.max(0, (materials.pedra || 0) - cost.pedra),
      ferro: Math.max(0, (materials.ferro || 0) - cost.ferro),
      redstone: Math.max(0, (materials.redstone || 0) - cost.redstone),
    },
  };
}

export function cracksOf(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/**
 * Uma missão perdida derruba uma obra construída.
 * Prefere o lote do período; se já caiu ou não existe, pega a próxima de pé.
 */
export function cracksAfterClose(
  cracks: string[],
  missed: Array<{ period?: Period }>,
  buildings: Record<string, number> = {},
): string[] {
  const next = cracks.filter((id) => BREAKABLE_LOTS.includes(id as BuildingId));
  const built = BREAKABLE_LOTS.filter((id) => (buildings[id] || 0) >= 1);
  for (const task of missed) {
    const prefer = DEFAULT_LOTS_BY_PERIOD[task.period ?? 'morning'];
    const lot = (built.includes(prefer) && !next.includes(prefer))
      ? prefer
      : built.find((id) => !next.includes(id));
    if (!lot) break;
    next.push(lot);
  }
  return next;
}

export function canRepair(cracks: string[], dueToday: number, doneToday: number): boolean {
  return cracks.length > 0 && dueToday > 0 && doneToday >= dueToday;
}

export function repairRefund(
  penaltyOfLostDay: number,
  settings: Pick<EconomySettings, 'repairRefundPct'> = DEFAULT_ECONOMY
): number {
  const pct = Math.max(0, Math.min(100, settings.repairRefundPct ?? 50));
  return Math.floor(Math.max(0, penaltyOfLostDay) * (pct / 100));
}
