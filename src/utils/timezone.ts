import {
  addDays,
  formatBrazilDate as clockFormatBrazilDate,
  getTodayBrazil as clockToday,
  getYesterdayBrazil as clockYesterday,
  nowBrazil,
  utcMsFromBrazil,
} from './clock';

export { addDays };

export function getBrazilDate(date: Date = new Date()): Date {
  const n = nowBrazil(date.getTime());
  return new Date(`${n.date}T${String(n.hour).padStart(2, '0')}:${String(n.minute).padStart(2, '0')}:00.000Z`);
}

export function getTodayBrazil(): string {
  return clockToday();
}

export function getBrazilDateTime(): Date {
  return getBrazilDate();
}

export function isSameDayBrazil(date1: Date, date2: Date): boolean {
  return nowBrazil(date1.getTime()).date === nowBrazil(date2.getTime()).date;
}

export function formatBrazilDate(date: Date): string {
  return clockFormatBrazilDate(date);
}

export function startOfDayBrazil(date: Date = new Date()): Date {
  const ymd = nowBrazil(date.getTime()).date;
  return new Date(utcMsFromBrazil(ymd, 0, 0, 0));
}

export function endOfDayBrazil(date: Date = new Date()): Date {
  const ymd = nowBrazil(date.getTime()).date;
  return new Date(utcMsFromBrazil(ymd, 23, 59, 59, 999));
}

export function getYesterdayBrazil(): { date: Date; dateString: string } {
  return clockYesterday();
}

export function getTodayStartBrazil(): Date {
  return startOfDayBrazil();
}
