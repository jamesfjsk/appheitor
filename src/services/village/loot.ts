import type { Material } from '../../types/english';
import type { TaskLoot, TaskLootInput, VillageGear } from '../../types/village';
import { DEFAULT_ECONOMY, MATERIAL_BY_PERIOD } from '../../config/village';

const emptyPeriod = { morning: 0, afternoon: 0, evening: 0 };

/** Material e quantidade da missão (picareta soma bônus; effectsEnabled desliga o bônus). */
export function computeTaskLoot(input: TaskLootInput): TaskLoot {
  const settings = input.settings ?? DEFAULT_ECONOMY;
  const material: Material = MATERIAL_BY_PERIOD[input.period];
  const base = Math.max(0, settings.materialsPerTask);
  if (!input.effectsEnabled) return { material, qty: base };

  const byPeriod = { ...emptyPeriod, ...input.completionsTodayByPeriod };
  const totalToday = byPeriod.morning + byPeriod.afternoon + byPeriod.evening;
  const firstOfDay = totalToday === 0;
  const firstOfPeriod = (byPeriod[input.period] ?? 0) === 0;
  const pick = input.gear.pickaxe;

  let bonus = 0;
  if (pick >= 4) bonus += 1;
  else if (pick >= 2 && firstOfPeriod) bonus += 1;
  else if (pick >= 1 && firstOfDay) bonus += 1;

  return { material, qty: base + bonus };
}

/** XP da missão com botas (+20%, arredondado). */
export function xpWithBoots(xp: number, gear: VillageGear, effectsEnabled = true): number {
  if (!effectsEnabled || gear.boots !== 1) return xp;
  return Math.round(xp * 1.2);
}
