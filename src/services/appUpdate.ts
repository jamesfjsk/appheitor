/** Recarrega a aba quando o site publicado é mais novo. Sem Firebase. */

const RELOAD_GAP_MS = 10 * 60 * 1000;

const MOMENTS = new Set(['visible', 'day', 'idle']);

const busyKeys = new Set<string>();
const busyListeners = new Set<() => void>();

/** Versão publicada em /version.json. Vazio se a rede falhar ou o arquivo não existir. */
export async function readPublishedVersion(): Promise<string> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!res.ok) return '';
    const data = await res.json() as { version?: unknown };
    return typeof data.version === 'string' ? data.version : '';
  } catch {
    return '';
  }
}

/**
 * A versão publicada já é outra. Recarrega na hora se a tela não está ocupada.
 * O intervalo de 10 minutos de `shouldReload` não vale aqui.
 */
export function versionReloadPlan(input: { running: string; latest: string; busy: boolean }): 'now' | 'wait' | 'skip' {
  if (!input.latest || input.latest === input.running || input.running === 'dev') return 'skip';
  return input.busy ? 'wait' : 'now';
}

let pendingLatest = '';

function flushVersionReload(): void {
  if (!pendingLatest || isAppBusy()) return;
  if (typeof window === 'undefined') return;
  const latest = pendingLatest;
  pendingLatest = '';
  console.info('app-update: recarregando', latest);
  window.location.reload();
}

/** Pede o recarregamento assim que a versão diverge. Se a prova ou a Estante estão abertas, espera soltar. */
export function requestVersionReload(latest: string, running: string): void {
  const plan = versionReloadPlan({ running, latest, busy: isAppBusy() });
  if (plan === 'skip') return;
  pendingLatest = latest;
  if (plan === 'now') flushVersionReload();
}

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

let notifyTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Avisa depois do tique. As telas soltam a chave na limpeza do efeito e marcam de novo no efeito
 * seguinte, no mesmo commit do React (troca de fase da prova, cada tecla na Estante). Avisar na hora
 * deixava o app "livre" nesse intervalo e podia recarregar no meio da prova ou do texto.
 */
function notifyBusy(): void {
  if (notifyTimer !== null) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    busyListeners.forEach((fn) => fn());
    flushVersionReload();
  }, 0);
}

export function setAppBusy(key: string, on: boolean): void {
  const had = busyKeys.has(key);
  if (on) busyKeys.add(key);
  else busyKeys.delete(key);
  if (busyKeys.has(key) === had) return;
  notifyBusy();
}

export function isAppBusy(): boolean {
  return busyKeys.size > 0;
}

export function subscribeAppBusy(fn: () => void): () => void {
  busyListeners.add(fn);
  return () => busyListeners.delete(fn);
}
