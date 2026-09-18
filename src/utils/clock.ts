// Relógio da Vila: uma hora só, a de Brasília.
// Módulo puro (sem Firebase, React ou import.meta.env). Testes em __tests__/clock.test.ts.

export const BRAZIL_TZ = 'America/Sao_Paulo';

export type ClockPeriod = 'morning' | 'afternoon' | 'evening';

export interface BrazilNow {
  iso: string;
  date: string;
  hour: number;
  minute: number;
  weekday: number;
  period: ClockPeriod;
  isNight: boolean;
}

export interface ClockDevOverride {
  hour?: number | null;
  date?: string | null;
}

let serverOffsetMs = 0;
let devOverride: ClockDevOverride | null = null;

const pad = (n: number): string => String(Math.trunc(n)).padStart(2, '0');

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function setServerOffsetMs(ms: number): void {
  serverOffsetMs = Number.isFinite(ms) ? ms : 0;
}

export function getServerOffsetMs(): number {
  return serverOffsetMs;
}

export function setClockDevOverride(override: ClockDevOverride | null): void {
  devOverride = override;
}

export function getClockDevOverride(): ClockDevOverride | null {
  return devOverride;
}

export function resetClockForTests(): void {
  serverOffsetMs = 0;
  devOverride = null;
}

function partsAt(ms: number): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') bag[p.type] = p.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

function ymdOf(p: { year: number; month: number; day: number }): string {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDays(date: string, n: number): string {
  if (!YMD.test(date)) throw new Error(`data ISO inválida: ${date}`);
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + n));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

/** Datas ISO `YYYY-MM-DD` anteriores a `village.launchedOn` (o dia 1 não herda ontem de teste). */
export function isBeforeLaunch(date: string, launchedOn?: string | null): boolean {
  return Boolean(launchedOn && date < launchedOn);
}

/** 0 = domingo … 6 = sábado, no calendário civil de Brasília. */
export function weekdayOf(date: string): number {
  if (!YMD.test(date)) throw new Error(`data ISO inválida: ${date}`);
  const [y, m, d] = date.split('-').map(Number);
  // 12:00 em Brasília cai em 15:00 UTC no fuso atual (sem horário de verão).
  // O Intl confirma o dia da semana no fuso certo se o DST voltar.
  const guess = Date.UTC(y, m - 1, d, 15, 0, 0);
  const p = partsAt(guess);
  const ymd = ymdOf(p);
  const instant = ymd === date ? guess : utcMsFromBrazil(date, 12, 0, 0);
  return new Date(instant).getUTCDay();
}

export function isoWeekOf(ymd: string): string {
  if (!YMD.test(ymd)) throw new Error(`data ISO inválida: ${ymd}`);
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const isoYear = date.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = Date.UTC(isoYear, 0, 4 - jan4Day + 1);
  const week = 1 + Math.round((date.getTime() - week1Monday) / 604800000);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** Segunda da semana ISO (`2026-W38` → `2026-09-14`). */
export function mondayOfIsoWeek(weekIso: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekIso);
  if (!m) throw new Error(`semana ISO inválida: ${weekIso}`);
  const y = Number(m[1]);
  const w = Number(m[2]);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = Date.UTC(y, 0, 4 - jan4Day + 1);
  const monday = new Date(week1Monday + (w - 1) * 7 * 86400000);
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

/** Rótulo do Extrato: `Semana de 14 a 20/09`. */
export function weekRangeLabel(weekIso: string): string {
  const from = mondayOfIsoWeek(weekIso);
  const to = addDays(from, 6);
  const fd = Number(from.slice(8, 10));
  const td = Number(to.slice(8, 10));
  const fm = from.slice(5, 7);
  const tm = to.slice(5, 7);
  if (fm === tm) return `Semana de ${fd} a ${td}/${tm}`;
  return `Semana de ${fd}/${fm} a ${td}/${tm}`;
}

export function periodOfHour(hour: number): ClockPeriod {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function isNightHour(hour: number): boolean {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  return h >= 18 || h < 6;
}

/** Instante UTC em que o relógio de Brasília marca date+hora. */
export function utcMsFromBrazil(date: string, hour: number, minute: number, second = 0, ms = 0): number {
  if (!YMD.test(date)) throw new Error(`data ISO inválida: ${date}`);
  const [y, mo, d] = date.split('-').map(Number);
  let guess = Date.UTC(y, mo - 1, d, hour + 3, minute, second, ms);
  for (let i = 0; i < 16; i++) {
    const p = partsAt(guess);
    const got = ymdOf(p);
    const dateDelta =
      Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(y, mo - 1, d);
    const clockDelta =
      ((p.hour - hour) * 3600 + (p.minute - minute) * 60 + (p.second - second)) * 1000;
    const delta = dateDelta + clockDelta;
    if (delta === 0 && got === date) return guess;
    guess -= delta;
  }
  return guess;
}

function applyOverride(base: BrazilNow): BrazilNow {
  if (!devOverride) return base;
  const date = devOverride.date && YMD.test(devOverride.date) ? devOverride.date : base.date;
  const hour =
    typeof devOverride.hour === 'number' && Number.isFinite(devOverride.hour)
      ? ((Math.trunc(devOverride.hour) % 24) + 24) % 24
      : base.hour;
  const minute = typeof devOverride.hour === 'number' && Number.isFinite(devOverride.hour) ? 0 : base.minute;
  return {
    ...base,
    date,
    hour,
    minute,
    weekday: weekdayOf(date),
    period: periodOfHour(hour),
    isNight: isNightHour(hour),
  };
}

export function nowBrazil(instantMs?: number): BrazilNow {
  const wall = (instantMs ?? Date.now()) + serverOffsetMs;
  const p = partsAt(wall);
  const date = ymdOf(p);
  const hour = p.hour;
  const raw: BrazilNow = {
    iso: new Date(wall).toISOString(),
    date,
    hour,
    minute: p.minute,
    weekday: weekdayOf(date),
    period: periodOfHour(hour),
    isNight: isNightHour(hour),
  };
  return applyOverride(raw);
}

export function msUntilNextMidnight(instantMs?: number): number {
  const wall = (instantMs ?? Date.now()) + serverOffsetMs;
  const date = ymdOf(partsAt(wall));
  const next = utcMsFromBrazil(addDays(date, 1), 0, 0, 0);
  return Math.max(0, next - wall);
}

export function getTodayBrazil(): string {
  return nowBrazil().date;
}

export function getYesterdayBrazil(): { date: Date; dateString: string } {
  const ymd = addDays(nowBrazil().date, -1);
  return { date: new Date(utcMsFromBrazil(ymd, 12, 0, 0)), dateString: ymd };
}

export function formatBrazilDate(date: Date): string {
  return nowBrazil(date.getTime()).date;
}

const DRIFT_WARN_MS = 2 * 60 * 1000;

export function clockDriftWarning(driftMs: number): string | null {
  if (Math.abs(driftMs) < DRIFT_WARN_MS) return null;
  const min = Math.round(Math.abs(driftMs) / 60000);
  const lado = driftMs > 0 ? 'atrasado' : 'adiantado';
  return `Relógio do computador da criança está ${min} min ${lado}; o jogo usa a hora certa`;
}
