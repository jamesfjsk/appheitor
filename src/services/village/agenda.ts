import { addDays, isoWeekOf, type BrazilNow } from '../../utils/clock';
import type { AgendaItem } from '../../types/village';

export function occurrencesBetween(items: AgendaItem[], from: string, to: string): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const item of items) {
    if (item.repeat === 'weekly') {
      let cursor = item.date;
      if (cursor > to) continue;
      while (cursor < from) cursor = addDays(cursor, 7);
      while (cursor <= to) {
        out.push({ ...item, date: cursor });
        cursor = addDays(cursor, 7);
      }
    } else if (item.date >= from && item.date <= to) {
      out.push(item);
    }
  }
  return out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}

export function nextEvents(items: AgendaItem[], today: string, n: number): AgendaItem[] {
  return occurrencesBetween(items, today, addDays(today, 366))
    .filter((i) => !i.doneAt)
    .slice(0, Math.max(0, n));
}

export function reminderDue(item: AgendaItem, now: BrazilNow): boolean {
  if (item.remindedAt) return false;
  const minutes = item.remindMinutesBefore ?? 0;
  if (!item.time) {
    const prev = addDays(item.date, -1);
    return now.date > prev || (now.date === prev && now.hour >= 19);
  }
  const [h, m] = item.time.split(':').map(Number);
  const eventMin = h * 60 + m - minutes;
  const dayShift = eventMin < 0 ? -1 : 0;
  const targetDate = addDays(item.date, dayShift);
  const targetMin = ((eventMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const targetH = Math.floor(targetMin / 60);
  const targetM = targetMin % 60;
  if (now.date > targetDate) return true;
  if (now.date < targetDate) return false;
  return now.hour > targetH || (now.hour === targetH && now.minute >= targetM);
}

export function studyPlanFor(item: Pick<AgendaItem, 'kind' | 'date' | 'title'>, today: string): string[] {
  if (item.kind !== 'prova' && item.kind !== 'trabalho') return [];
  const days: string[] = [];
  for (const offset of [3, 2, 1]) {
    const d = addDays(item.date, -offset);
    if (d >= today && d < item.date) days.push(d);
  }
  return days;
}

export function organizationXp(item: Pick<AgendaItem, 'plannedAheadDays'>): number {
  return item.plannedAheadDays >= 2 ? 10 : 5;
}

export function weekOrganized(items: AgendaItem[], weekIso: string): boolean {
  const inWeek = items.filter((i) => isoWeekOf(i.date) === weekIso);
  if (inWeek.length === 0) return false;
  return inWeek.every((i) => Boolean(i.doneAt));
}

export function plannedAheadDays(createdOn: string, eventDate: string): number {
  const a = Date.parse(`${createdOn}T00:00:00Z`);
  const b = Date.parse(`${eventDate}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86400000));
}
