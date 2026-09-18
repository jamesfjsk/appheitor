export const BRAZIL_TZ = 'America/Sao_Paulo';

const pad = (n: number): string => String(Math.trunc(n)).padStart(2, '0');

export function nowBrazil(instantMs = Date.now()): { date: string; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(instantMs))) {
    if (p.type !== 'literal') bag[p.type] = p.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return { date: `${bag.year}-${pad(Number(bag.month))}-${pad(Number(bag.day))}`, hour, minute: Number(bag.minute) };
}
