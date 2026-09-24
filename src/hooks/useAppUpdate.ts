import { useEffect } from 'react';
import { DAY_CHANGED_EVENT } from '../contexts/ClockContext';
import { getAppVersion } from '../services/observability';
import { isAppBusy, shouldReload, subscribeAppBusy } from '../services/appUpdate';

const POLL_MS = 10 * 60 * 1000;
const IDLE_MS = 5 * 60 * 1000;
const RELOAD_KEY = 'mm_app_reload_at';

function readLastReload(): number {
  try {
    const n = Number(sessionStorage.getItem(RELOAD_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeLastReload(now: number): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    /* aba privada */
  }
}

async function fetchLatest(): Promise<string> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return '';
    const data = await res.json() as { version?: unknown };
    return typeof data.version === 'string' ? data.version : '';
  } catch {
    return '';
  }
}

/** Fora de DEV e fora do teaser: o App só monta quando o teaser não está na tela. */
export function useAppUpdate(): void {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const running = getAppVersion();
    let latest = '';
    let lastInput = Date.now();
    let idleTimer = 0;
    let dead = false;

    const tryReload = (moment: 'visible' | 'day' | 'idle') => {
      if (dead) return;
      const now = Date.now();
      if (!shouldReload({
        running,
        latest,
        moment,
        busy: isAppBusy(),
        lastReloadAt: readLastReload(),
        now,
      })) return;
      writeLastReload(now);
      console.info('app-update: recarregando', latest);
      window.location.reload();
    };

    const refresh = async () => {
      const next = await fetchLatest();
      if (dead || !next) return;
      latest = next;
    };

    const armIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => tryReload('idle'), IDLE_MS);
    };

    const onInput = () => {
      lastInput = Date.now();
      armIdle();
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refresh().then(() => tryReload('visible'));
    };

    const onDay = () => {
      void refresh().then(() => tryReload('day'));
    };

    const onBusy = () => {
      if (isAppBusy()) return;
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInput >= IDLE_MS) tryReload('idle');
      else tryReload('visible');
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(DAY_CHANGED_EVENT, onDay);
    window.addEventListener('pointerdown', onInput);
    window.addEventListener('keydown', onInput);
    const unsubBusy = subscribeAppBusy(onBusy);
    armIdle();
    const poll = window.setInterval(() => {
      void refresh().then(() => {
        if (Date.now() - lastInput >= IDLE_MS) tryReload('idle');
      });
    }, POLL_MS);
    void refresh();

    return () => {
      dead = true;
      window.clearTimeout(idleTimer);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(DAY_CHANGED_EVENT, onDay);
      window.removeEventListener('pointerdown', onInput);
      window.removeEventListener('keydown', onInput);
      unsubBusy();
    };
  }, []);
}
