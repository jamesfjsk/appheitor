import type { EconomySettings, Period } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';

export const DEFAULT_LOTS_BY_PERIOD: Record<Period, string> = {
  morning: 'fornalha',
  afternoon: 'cerca',
  evening: 'torre',
};

export function cracksAfterClose(
  cracks: string[],
  missedTaskIds: string[],
  lotsByPeriod: Record<Period, string>,
  firstMissedPeriod?: Period
): string[] {
  if (missedTaskIds.length === 0) return cracks.slice();
  const lot = lotsByPeriod[firstMissedPeriod ?? 'morning'] ?? DEFAULT_LOTS_BY_PERIOD.morning;
  if (cracks.includes(lot)) return cracks.slice();
  return [...cracks, lot];
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
