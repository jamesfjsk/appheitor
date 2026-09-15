import type { Material } from '../../types/english';
import type { ChestContents, EconomySettings, VillageDoc, VillageGear } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';
import { claimKey, hasClaim } from './claims';
import { isChestTime } from './schedule';
import { createRng, randInt, seedFromString } from '../english/shuffle';

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

/**
 * Conteúdo determinístico do Baú do Dia (hash uid+data).
 * Esmeralda a cada N dias completos, contando o dia atual (fullDays + 1).
 */
export function dailyChestContents(
  uid: string,
  date: string,
  village: Pick<VillageDoc, 'fullDays' | 'gear'>,
  settings: EconomySettings = DEFAULT_ECONOMY
): ChestContents {
  const rng = createRng(seedFromString(`${uid}|${date}|chest`));
  const [minG, maxG] = settings.dailyChestGold;
  let gold = randInt(rng, minG, maxG);
  gold = Math.min(gold, settings.gameGoldDailyCap);

  const materials: Partial<Record<Material, number>> = {};
  const add = (m: Material, n: number) => {
    materials[m] = (materials[m] ?? 0) + n;
  };
  add(COMMONS[Math.floor(rng() * COMMONS.length)], 1);
  add(COMMONS[Math.floor(rng() * COMMONS.length)], 1);

  const gear: VillageGear = village.gear;
  if (gear.pickaxe >= 3) add(COMMONS[Math.floor(rng() * COMMONS.length)], 1);

  const counted = village.fullDays + 1;
  const n = Math.max(1, settings.rareEveryNDays);
  const esmeralda = counted % n === 0 ? 1 : 0;

  return { gold, materials, esmeralda };
}
