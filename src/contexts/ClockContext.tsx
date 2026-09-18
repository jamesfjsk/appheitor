import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import {
  msUntilNextMidnight,
  nowBrazil,
  setClockDevOverride,
  setServerOffsetMs,
  type BrazilNow,
  type ClockPeriod,
} from '../utils/clock';

export const DAY_CHANGED_EVENT = 'dayChanged';

export interface ClockContextValue {
  today: string;
  hour: number;
  minute: number;
  weekday: number;
  period: ClockPeriod;
  isNight: boolean;
  isDev: boolean;
  iso: string;
  driftMs: number;
  now: BrazilNow;
}

const ClockContext = createContext<ClockContextValue | undefined>(undefined);

function readDevOverride(): { hour?: number | null; date?: string | null } | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const rawH = params.get('h');
  const rawD = params.get('d');
  const hour = rawH !== null && rawH !== '' ? Number(rawH) : null;
  const date = rawD && /^\d{4}-\d{2}-\d{2}$/.test(rawD) ? rawD : null;
  if ((hour === null || !Number.isFinite(hour)) && !date) return null;
  return {
    hour: hour !== null && Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : null,
    date,
  };
}

async function pingServerClock(uid: string): Promise<number> {
  const ref = doc(db, 'health', uid);
  await setDoc(ref, { clockPing: serverTimestamp() }, { merge: true });
  const snap = await getDoc(ref);
  const ping = snap.data()?.clockPing;
  const serverMs = ping instanceof Timestamp ? ping.toMillis() : 0;
  if (!serverMs) return 0;
  const offset = serverMs - Date.now();
  setServerOffsetMs(offset);
  await setDoc(
    ref,
    { clockDriftMs: Math.round(offset), updatedAt: nowBrazil().iso },
    { merge: true }
  );
  return offset;
}

export const ClockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [now, setNow] = useState<BrazilNow>(() => nowBrazil());
  const [driftMs, setDriftMs] = useState(0);
  const prevDate = useRef(now.date);
  const isDev = Boolean(import.meta.env.DEV);

  const tick = useCallback(() => {
    setNow(nowBrazil());
  }, []);

  useEffect(() => {
    const apply = () => {
      setClockDevOverride(readDevOverride());
      tick();
    };
    apply();
    window.addEventListener('popstate', apply);
    window.addEventListener('clock-override', apply);
    return () => {
      window.removeEventListener('popstate', apply);
      window.removeEventListener('clock-override', apply);
      setClockDevOverride(null);
    };
  }, [tick]);

  useEffect(() => {
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [tick]);

  useEffect(() => {
    const wait = Math.min(Math.max(50, msUntilNextMidnight() + 80), 60_000);
    const id = window.setTimeout(tick, wait);
    return () => window.clearTimeout(id);
  }, [now.date, now.hour, now.minute, tick]);

  useEffect(() => {
    if (prevDate.current === now.date) return;
    const from = prevDate.current;
    prevDate.current = now.date;
    window.dispatchEvent(new CustomEvent(DAY_CHANGED_EVENT, { detail: { from, to: now.date } }));
  }, [now.date]);

  useEffect(() => {
    if (!user?.userId || user.role !== 'child') return;
    let cancelled = false;
    void pingServerClock(user.userId)
      .then((offset) => {
        if (cancelled) return;
        setDriftMs(offset);
        tick();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.userId, user?.role, tick]);

  const value = useMemo<ClockContextValue>(
    () => ({
      today: now.date,
      hour: now.hour,
      minute: now.minute,
      weekday: now.weekday,
      period: now.period,
      isNight: now.isNight,
      isDev,
      iso: now.iso,
      driftMs,
      now,
    }),
    [now, isDev, driftMs]
  );

  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useClock(): ClockContextValue {
  const ctx = useContext(ClockContext);
  if (!ctx) {
    const n = nowBrazil();
    return {
      today: n.date,
      hour: n.hour,
      minute: n.minute,
      weekday: n.weekday,
      period: n.period,
      isNight: n.isNight,
      isDev: Boolean(import.meta.env.DEV),
      iso: n.iso,
      driftMs: 0,
      now: n,
    };
  }
  return ctx;
}
