import type { EconomySettings, Period, ScheduleTask } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';

/** 0=domingo … 6=sábado, a partir de YYYY-MM-DD no fuso do Brasil. */
export function weekdayFromDate(date: string): number {
  const t = Date.parse(`${date}T12:00:00.000-03:00`);
  if (!Number.isFinite(t)) throw new Error(`data inválida: ${date}`);
  return new Date(t).getUTCDay();
}

function createdAtMs(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

/** Missões devidas na data (frequência, ativa, createdAt até o fim do dia). */
export function dueTasksOn(tasks: readonly ScheduleTask[], date: string): ScheduleTask[] {
  const dow = weekdayFromDate(date);
  const dayEnd = Date.parse(`${date}T23:59:59.999-03:00`);
  return tasks.filter((task) => {
    if (task.active === false) return false;
    const created = createdAtMs(task.createdAt);
    if (created != null && Number.isFinite(dayEnd) && created > dayEnd) return false;
    if (task.frequency === 'weekday') return dow >= 1 && dow <= 5;
    if (task.frequency === 'weekend') return dow === 0 || dow === 6;
    return true;
  });
}

export function periodAllowedAt(
  period: Period,
  hourBrazil: number,
  settings: Pick<EconomySettings, 'periodGating' | 'periodStartHours'> = DEFAULT_ECONOMY
): boolean {
  if (!settings.periodGating) return true;
  if (period === 'morning') return true;
  if (period === 'afternoon') return hourBrazil >= settings.periodStartHours.afternoon;
  return hourBrazil >= settings.periodStartHours.evening;
}

export function isChestTime(
  hourBrazil: number,
  settings: Pick<EconomySettings, 'chestOpenHour'> = DEFAULT_ECONOMY
): boolean {
  return hourBrazil >= settings.chestOpenHour;
}

export function periodFromHour(hourBrazil: number): Period {
  if (hourBrazil >= 18) return 'evening';
  if (hourBrazil >= 12) return 'afternoon';
  return 'morning';
}
