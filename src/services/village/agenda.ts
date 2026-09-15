import { addDays, isoWeekOf, type BrazilNow } from '../../utils/clock';
import { dueTasksOn, extraVisibleOn } from './schedule';
import type { AgendaItem, Period, ScheduleTask, VillagePlan } from '../../types/village';

export type DayTimelineKind = 'mission' | 'agenda' | 'focus' | 'close';

export interface DayTimelineEntry {
  id: string;
  kind: DayTimelineKind;
  title: string;
  time?: string;
  period?: Period;
  sortMin: number;
  taskId?: string;
  agendaId?: string;
}

const PERIOD_MIN: Record<Period, number> = {
  morning: 8 * 60,
  afternoon: 12 * 60,
  evening: 18 * 60,
};

function parseHm(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

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

export function dayTimeline(
  items: AgendaItem[],
  tasks: Array<ScheduleTask & { title?: string; origin?: string; date?: string; time?: string; status?: string }>,
  plan: Pick<VillagePlan, 'date' | 'focusTaskId'> | null | undefined,
  date: string
): DayTimelineEntry[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const entries: DayTimelineEntry[] = [];
  for (const t of dueTasksOn(tasks, date)) {
    const full = byId.get(t.id);
    const time = full?.time;
    const period = (full?.period || t.period || 'morning') as Period;
    entries.push({
      id: `task:${t.id}`,
      kind: 'mission',
      title: full?.title || 'Missão',
      time,
      period,
      sortMin: parseHm(time) ?? PERIOD_MIN[period],
      taskId: t.id,
    });
  }
  for (const t of tasks) {
    if (!extraVisibleOn(t, date)) continue;
    const period = (t.period || 'afternoon') as Period;
    const focus = t.origin === 'agenda' || (plan?.date === date && plan.focusTaskId === t.id);
    entries.push({
      id: `focus:${t.id}`,
      kind: focus ? 'focus' : 'mission',
      title: t.title || 'Foco',
      time: t.time,
      period,
      sortMin: parseHm(t.time) ?? PERIOD_MIN[period],
      taskId: t.id,
    });
  }
  for (const item of occurrencesBetween(items, date, date)) {
    if (!item.title.trim()) continue;
    entries.push({
      id: `agenda:${item.id}:${item.date}`,
      kind: 'agenda',
      title: item.title,
      time: item.time,
      sortMin: parseHm(item.time) ?? (21 * 60),
      agendaId: item.id,
    });
  }
  entries.push({
    id: `close:${date}`,
    kind: 'close',
    title: 'Fechar o dia',
    time: '21:00',
    period: 'evening',
    sortMin: 21 * 60 + 1,
  });
  return entries.sort((a, b) => a.sortMin - b.sortMin || a.title.localeCompare(b.title, 'pt-BR'));
}

export function reminderDue(item: AgendaItem, now: BrazilNow): boolean {
  if (item.remindedFor && item.remindedFor === item.date) return false;
  if (item.remindedAt && item.repeat !== 'weekly') return false;
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
