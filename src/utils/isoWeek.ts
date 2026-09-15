// Semana ISO-8601 a partir de YYYY-MM-DD (UTC). Sem Firebase/React.
// isoWeekOf('2026-09-15') -> '2026-W38'

export function isoWeekOf(ymd: string): string {
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) {
    throw new Error(`data ISO inválida: ${ymd}`);
  }
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const isoYear = date.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = Date.UTC(isoYear, 0, 4 - jan4Day + 1);
  const thursday = date.getTime();
  const week = 1 + Math.round((thursday - week1Monday) / 604800000);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
