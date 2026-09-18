import { COSMETIC_BY_ID, GEAR_BY_ID, LEVEL_REWARDS } from '../../config/village';
import { rareGiftForLevel } from './claims';
import type { LevelGift } from '../../types/village';

export function levelGift(level: number, season: number): LevelGift {
  void season;
  const rare = rareGiftForLevel(level);
  const extra = LEVEL_REWARDS[level];
  const cosmeticId = extra?.cosmeticId ?? (level === 10 || level === 20 || level === 30 || level === 40 ? `milestone_${level}` : null);
  return {
    materialChoice: true,
    rare,
    cosmeticId,
  };
}

export function minLevelFor(itemId: string): number {
  const gear = GEAR_BY_ID[itemId];
  if (gear) return gear.minLevel ?? 0;
  const cos = COSMETIC_BY_ID[itemId];
  if (cos) return cos.minLevel ?? 0;
  return 0;
}
