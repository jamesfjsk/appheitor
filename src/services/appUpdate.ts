/** Recarrega a aba quando o site publicado é mais novo. Sem Firebase. */

const RELOAD_GAP_MS = 10 * 60 * 1000;

const MOMENTS = new Set(['visible', 'day', 'idle']);

const busyKeys = new Set<string>();
const busyListeners = new Set<() => void>();

export function shouldReload(input: {
  running: string;
  latest: string;
  moment: string;
  busy: boolean;
  lastReloadAt: number;
  now: number;
}): boolean {
  if (!input.latest || input.latest === input.running) return false;
  if (input.running === 'dev') return false;
  if (input.busy) return false;
  if (!MOMENTS.has(input.moment)) return false;
  if (input.now - input.lastReloadAt < RELOAD_GAP_MS) return false;
  return true;
}

export function setAppBusy(key: string, on: boolean): void {
  const had = busyKeys.has(key);
  if (on) busyKeys.add(key);
  else busyKeys.delete(key);
  if (busyKeys.has(key) === had) return;
  busyListeners.forEach((fn) => fn());
}

export function isAppBusy(): boolean {
  return busyKeys.size > 0;
}

export function subscribeAppBusy(fn: () => void): () => void {
  busyListeners.add(fn);
  return () => busyListeners.delete(fn);
}
