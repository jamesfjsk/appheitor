import { addDoc, collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { HealthDoc } from '../types/village';
import { getTodayBrazil } from '../utils/clock';

const STACK_MAX = 2048;

export type HealthField =
  | 'lastCloseDay'
  | 'lastQuizGenerated'
  | 'lastPlanGenerated'
  | 'lastChestDate'
  | 'lastInterestWeek'
  | 'lastLearningWeek';

function appVersion(): string {
  try {
    return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
  } catch {
    return 'dev';
  }
}

export async function logClientError(err: unknown, route = typeof location !== 'undefined' ? location.pathname : ''): Promise<void> {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const uid = auth.currentUser?.uid ?? '';
    await addDoc(collection(db, 'clientErrors'), {
      message: String(e.message || err).slice(0, 500),
      stack: String(e.stack || '').slice(0, STACK_MAX),
      uid,
      route,
      appVersion: appVersion(),
      createdAt: new Date().toISOString(),
    });
  } catch (logErr) {
    console.warn('observability: falha ao gravar clientError', logErr);
  }
}

export async function touchHealth(uid: string, field: HealthField, value?: string): Promise<void> {
  if (!uid) return;
  const now = new Date().toISOString();
  await setDoc(
    doc(db, 'health', uid),
    { [field]: value ?? getTodayBrazil(), updatedAt: now },
    { merge: true }
  );
}

export function installErrorLog(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (ev) => {
    void logClientError(ev.error || ev.message, location.pathname);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    void logClientError(ev.reason, location.pathname);
  });
}

export function getAppVersion(): string {
  return appVersion();
}

export function subscribeHealth(uid: string, onChange: (doc: HealthDoc | null) => void): () => void {
  if (!uid) return () => undefined;
  return onSnapshot(doc(db, 'health', uid), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const d = snap.data();
    onChange({
      lastCloseDay: typeof d.lastCloseDay === 'string' ? d.lastCloseDay : null,
      lastQuizGenerated: typeof d.lastQuizGenerated === 'string' ? d.lastQuizGenerated : null,
      lastPlanGenerated: typeof d.lastPlanGenerated === 'string' ? d.lastPlanGenerated : null,
      lastChestDate: typeof d.lastChestDate === 'string' ? d.lastChestDate : null,
      lastInterestWeek: typeof d.lastInterestWeek === 'string' ? d.lastInterestWeek : null,
      lastLearningWeek: typeof d.lastLearningWeek === 'string' ? d.lastLearningWeek : null,
      clockDriftMs: typeof d.clockDriftMs === 'number' ? d.clockDriftMs : null,
      updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : '',
    });
  });
}

export interface ClientErrorRow {
  id: string;
  message: string;
  stack: string;
  uid: string;
  route: string;
  appVersion: string;
  createdAt: string;
}

export function subscribeClientErrors(uid: string, onChange: (rows: ClientErrorRow[]) => void): () => void {
  if (!uid) return () => undefined;
  return onSnapshot(
    query(collection(db, 'clientErrors'), where('uid', '==', uid)),
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            message: String(data.message || ''),
            stack: String(data.stack || ''),
            uid: String(data.uid || ''),
            route: String(data.route || ''),
            appVersion: String(data.appVersion || ''),
            createdAt: typeof data.createdAt === 'string'
              ? data.createdAt
              : data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
                ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
                : '',
          };
        })
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 20);
      onChange(rows);
    }
  );
}
