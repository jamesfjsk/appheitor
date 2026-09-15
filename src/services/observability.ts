import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const STACK_MAX = 2048;

export type HealthField = 'lastCloseDay' | 'lastQuizGenerated' | 'lastPlanGenerated' | 'lastChestDate';

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
    { [field]: value ?? now.slice(0, 10), updatedAt: now },
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
