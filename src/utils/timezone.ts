const BRAZIL_TIMEZONE_OFFSET = -3;

export function getBrazilDate(date: Date = new Date()): Date {
  const utc = date.getTime();
  const brazilOffset = BRAZIL_TIMEZONE_OFFSET * 60 * 60 * 1000;
  return new Date(utc + brazilOffset);
}

export function getTodayBrazil(): string {
  const brazilDate = getBrazilDate();
  return brazilDate.toISOString().split('T')[0];
}

export function getBrazilDateTime(): Date {
  return getBrazilDate();
}

export function isSameDayBrazil(date1: Date, date2: Date): boolean {
  const d1 = getBrazilDate(date1).toISOString().split('T')[0];
  const d2 = getBrazilDate(date2).toISOString().split('T')[0];
  return d1 === d2;
}

export function formatBrazilDate(date: Date): string {
  return getBrazilDate(date).toISOString().split('T')[0];
}

export function startOfDayBrazil(date: Date = new Date()): Date {
  const brazilDate = getBrazilDate(date);
  const dateStr = brazilDate.toISOString().split('T')[0];
  const utcDate = new Date(dateStr + 'T00:00:00.000Z');
  const brazilOffset = BRAZIL_TIMEZONE_OFFSET * 60 * 60 * 1000;
  return new Date(utcDate.getTime() - brazilOffset);
}

export function endOfDayBrazil(date: Date = new Date()): Date {
  const brazilDate = getBrazilDate(date);
  const dateStr = brazilDate.toISOString().split('T')[0];
  const utcDate = new Date(dateStr + 'T23:59:59.999Z');
  const brazilOffset = BRAZIL_TIMEZONE_OFFSET * 60 * 60 * 1000;
  return new Date(utcDate.getTime() - brazilOffset);
}

export function getYesterdayBrazil(): { date: Date; dateString: string } {
  const today = getBrazilDate();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    date: yesterday,
    dateString: yesterday.toISOString().split('T')[0]
  };
}

export function getTodayStartBrazil(): Date {
  const today = getBrazilDate();
  const dateStr = today.toISOString().split('T')[0];
  const startOfDay = new Date(dateStr + 'T00:00:00.000-03:00');
  return startOfDay;
}
