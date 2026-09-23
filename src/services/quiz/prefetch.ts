/** A prova de amanhã só começa depois da de hoje estar gravada. */

export async function prepareTodayThenTomorrow(opts: {
  needsToday: boolean;
  prepare: () => Promise<unknown>;
  prefetchTomorrow: () => Promise<unknown>;
}): Promise<void> {
  if (opts.needsToday) await opts.prepare();
  await opts.prefetchTomorrow();
}
