import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function mergeDefaults<T extends Record<string, unknown>>(defaults: T, data: Record<string, unknown> | undefined): T {
  if (!data) return { ...defaults };
  const out: Record<string, unknown> = { ...defaults };
  for (const [k, dv] of Object.entries(defaults)) {
    const raw = data[k];
    if (raw === undefined) continue;
    if (isRecord(dv) && isRecord(raw) && !Array.isArray(dv)) {
      out[k] = mergeDefaults(dv as Record<string, unknown>, raw);
    } else {
      out[k] = raw;
    }
  }
  return out as T;
}

export async function getSettings<T extends Record<string, unknown>>(docId: string, defaults: T): Promise<T> {
  const snap = await getDoc(doc(db, 'settings', docId));
  return mergeDefaults(defaults, snap.exists() ? (snap.data() as Record<string, unknown>) : undefined);
}

export function subscribeSettings<T extends Record<string, unknown>>(
  docId: string,
  defaults: T,
  onChange: (value: T) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(db, 'settings', docId),
    (snap) => onChange(mergeDefaults(defaults, snap.exists() ? (snap.data() as Record<string, unknown>) : undefined)),
    (e) => onError?.(e)
  );
}

export async function saveSettings(docId: string, partial: Record<string, unknown>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'settings', docId), { ...clean, updatedAt: new Date().toISOString() }, { merge: true });
}
