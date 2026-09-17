import type { Material } from '../../types/english';
import type { ChestContents, EconomySettings, VillageDoc, VillageGear } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';
import { claimKey, hasClaim } from './claims';
import { isChestTime } from './schedule';
import { createRng, seedFromString } from '../english/shuffle';

const COMMONS: Material[] = ['madeira', 'pedra', 'ferro'];

export type ChestBlockReason = 'ok' | 'hour' | 'min_due' | 'incomplete' | 'already';

export function chestAllowed(args: {
  hourBrazil: number;
  settings: EconomySettings;
  due: number;
  done: number;
  village: Pick<VillageDoc, 'claimed'>;
  date: string;
}): { ok: boolean; reason: ChestBlockReason } {
  const settings = args.settings ?? DEFAULT_ECONOMY;
  if (hasClaim(args.village, claimKey('daily', args.date))) return { ok: false, reason: 'already' };
  if (!isChestTime(args.hourBrazil, settings)) return { ok: false, reason: 'hour' };
  if (args.due < settings.minDueForChest) return { ok: false, reason: 'min_due' };
  if (args.done < args.due) return { ok: false, reason: 'incomplete' };
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
