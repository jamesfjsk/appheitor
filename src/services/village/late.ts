import type { EconomySettings } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';

export function lateWindow(
  hourBrazil: number,
  settings: Pick<EconomySettings, 'lateMissionUntilHour'> = DEFAULT_ECONOMY
): boolean {
  return hourBrazil < (settings.lateMissionUntilHour ?? 12);
}

export function lateTaskReward(
  task: { gold: number; xp: number },
  settings: Pick<EconomySettings, 'lateMissionGoldPct'> = DEFAULT_ECONOMY
): { gold: number; xp: number; material: 0 } {
  const pct = Math.max(0, Math.min(100, settings.lateMissionGoldPct ?? 50));
  return {
    gold: Math.floor(Math.max(0, task.gold) * (pct / 100)),
    xp: Math.max(0, Math.floor(task.xp)),
    material: 0,
  };
}
