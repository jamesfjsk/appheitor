/** Soma deltas em village.stats dentro da transação do evento. */

export function addVillageStats(
  stats: Record<string, number>,
  deltas: Record<string, number>,
): Record<string, number> {
  const next = { ...stats };
  for (const [key, value] of Object.entries(deltas)) {
    if (!value) continue;
    next[key] = Math.max(0, (Number(next[key]) || 0) + value);
  }
  return next;
}

export function nextQuizStreak(prev: number, yesterdayCompleted: boolean, skipped = false): number {
  return yesterdayCompleted || skipped ? Math.max(0, prev) + 1 : 1;
}

export function skipDayPenalty(opts: {
  vacation: boolean;
  paused: boolean;
  punished: boolean;
  enabled: boolean;
}): boolean {
  return !opts.enabled || opts.vacation || opts.paused || opts.punished;
}
