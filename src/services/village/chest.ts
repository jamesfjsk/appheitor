import type { Material } from '../../types/english';
import type { ChestContents, EconomySettings, VillageDoc, VillageGear } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';
import { claimKey, hasClaim } from './claims';
import { isChestTime } from './schedule';
import { createRng, seedFromString } from '../english/shuffle';

const COMMONS: Material[] = ['madeira', 'pedra', 'ferro'];

export type ChestBlockReason = 'ok' | 'hour' | 'min_due' | 'incomplete' | 'already' | 'warehouse';
export type ChestMapLook = 'locked' | 'wait' | 'ready' | 'open' | 'ruin';

export const CHEST_OPEN_MS = 1600;
export const CHEST_OPEN_REDUCED_MS = 400;

/** Sem Armazém em pé não existe Baú do Dia. */
export function warehouseHoldsChest(level: number, ruined: boolean): boolean {
  return level >= 1 && !ruined;
}

/** Como o baú aparece no mapa: cadeado, espera, brilho da hora, aberto ou ruína. */
export function chestMapLook(opts: {
  bauLevel: number;
  ruined: boolean;
  ready: boolean;
  already: boolean;
}): ChestMapLook {
  if (opts.ruined) return 'ruin';
  if (opts.bauLevel < 1) return 'locked';
  if (opts.already) return 'open';
  if (opts.ready) return 'ready';
  return 'wait';
}

/** Metade das devidas, arredondado para cima. 12 → 6; 5 → 3; 1 → 1. */
export function chestNeedDone(due: number): number {
  if (due <= 0) return 0;
  return Math.ceil(due * 0.5);
}

export function chestNeedLeft(due: number, done: number): number {
  return Math.max(0, chestNeedDone(due) - Math.max(0, done));
}

/** "Falta 1 missão" / "Faltam 6 missões", ou null se já bateu a metade. */
export function chestNeedLine(due: number, done: number): string | null {
  const left = chestNeedLeft(due, done);
  if (left <= 0) return null;
  return left === 1 ? 'Falta 1 missão' : `Faltam ${left} missões`;
}

/** Recado do baú fechado: hora e metade das missões, numa frase só. */
export function chestWaitCopy(args: {
  due: number;
  done: number;
  hourBrazil: number;
  chestOpenHour: number;
}): string | null {
  const need = chestNeedDone(args.due);
  const miss = args.done < need;
  const before = args.hourBrazil < args.chestOpenHour;
  if (!miss && !before) return null;
  const doneBit = need === 1 ? 'se 1 missão estiver feita' : `se ${need} missões estiverem feitas`;
  if (miss && before) return `Às ${args.chestOpenHour}h o baú abre, ${doneBit}.`;
  if (miss) return `O baú abre ${doneBit}.`;
  return `Às ${args.chestOpenHour}h o baú abre.`;
}

export function chestAllowed(args: {
  hourBrazil: number;
  settings: EconomySettings;
  due: number;
  done: number;
  village: Pick<VillageDoc, 'claimed'>;
  date: string;
  bauLevel: number;
}): { ok: boolean; reason: ChestBlockReason } {
  const settings = args.settings ?? DEFAULT_ECONOMY;
  if (args.bauLevel < 1) return { ok: false, reason: 'warehouse' };
  if (hasClaim(args.village, claimKey('daily', args.date))) return { ok: false, reason: 'already' };
  if (!isChestTime(args.hourBrazil, settings)) return { ok: false, reason: 'hour' };
  if (args.due < settings.minDueForChest) return { ok: false, reason: 'min_due' };
  if (args.done < chestNeedDone(args.due)) return { ok: false, reason: 'incomplete' };
  return { ok: true, reason: 'ok' };
}

function scarcest(stock: Partial<Record<Material, number>>, rng: () => number): Material {
  let best: Material = 'madeira';
  let bestQty = Number.POSITIVE_INFINITY;
  const tied: Material[] = [];
  for (const m of COMMONS) {
    const q = stock[m] ?? 0;
    if (q < bestQty) {
      bestQty = q;
      best = m;
      tied.length = 0;
      tied.push(m);
    } else if (q === bestQty) {
      tied.push(m);
    }
  }
  if (tied.length <= 1) return best;
  return tied[Math.floor(rng() * tied.length) % tied.length];
}

/**
 * Gold determinístico: min(teto, base + tochas).
 * 2 materiais do tipo mais escasso (empate: hash; ordem madeira, pedra, ferro).
 */
export function dailyChestContents(
  uid: string,
  date: string,
  village: Pick<VillageDoc, 'fullDays' | 'gear'>,
  settings: EconomySettings = DEFAULT_ECONOMY,
  stock: Partial<Record<Material, number>> = {},
  bauLevel = 0
): ChestContents {
  const [base, cap] = settings.dailyChestGold;
  const gold = Math.min(cap, base + Math.max(0, village.fullDays));
  const rng = createRng(seedFromString(`${uid}|${date}|chest`));
  const pick = scarcest(stock, rng);
  const extra = bauLevel >= 2 ? 1 : 0;
  const materials: Partial<Record<Material, number>> = { [pick]: 2 + extra };
  const gear: VillageGear = village.gear;
  if (gear.pickaxe >= 4) {
    materials[pick] = (materials[pick] ?? 0) + 2;
  } else if (gear.pickaxe >= 3) {
    materials[pick] = (materials[pick] ?? 0) + 1;
  }
  const counted = village.fullDays + 1;
  const n = bauLevel >= 3 ? 2 : Math.max(1, settings.rareEveryNDays);
  const esmeralda = counted % n === 0 ? 1 : 0;
  return { gold, materials, esmeralda };
}
