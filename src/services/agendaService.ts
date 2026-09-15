import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FAMILY_ID } from '../config/rules';
import { initialVillageDoc } from '../config/village';
import type { AgendaItem, AgendaKind } from '../types/village';
import { addDays, getTodayBrazil, nowBrazil } from '../utils/clock';
import { organizationXp, plannedAheadDays, studyPlanFor, weekOrganized } from './village/agenda';
import { claimKey, hasClaim } from './village/claims';
import { fromVillageDoc, stripUndefined } from './villageService';

function asIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return nowBrazil().iso;
}

export function fromAgendaDoc(id: string, data: Record<string, unknown>): AgendaItem {
  const kind = data.kind as AgendaKind;
  return {
    id,
    userId: String(data.userId || ''),
    familyId: String(data.familyId || FAMILY_ID),
    title: String(data.title || '').slice(0, 40),
    kind: kind || 'outro',
    date: String(data.date || ''),
    time: typeof data.time === 'string' ? data.time : undefined,
    remindMinutesBefore: typeof data.remindMinutesBefore === 'number' ? data.remindMinutesBefore : undefined,
    repeat: data.repeat === 'weekly' ? 'weekly' : 'none',
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdBy: data.createdBy === 'admin' ? 'admin' : 'child',
    plannedAheadDays: Math.max(0, Number(data.plannedAheadDays) || 0),
    doneAt: typeof data.doneAt === 'string' ? data.doneAt : undefined,
    remindedAt: typeof data.remindedAt === 'string' ? data.remindedAt : undefined,
    remindedFor: typeof data.remindedFor === 'string' ? data.remindedFor : undefined,
    studyPlanAccepted: data.studyPlanAccepted === true,
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  };
}

export function subscribeAgenda(uid: string, onChange: (items: AgendaItem[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, 'agenda'), where('userId', '==', uid)),
    (snap) => {
      const items = snap.docs.map((d) => fromAgendaDoc(d.id, d.data() as Record<string, unknown>));
      items.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
      onChange(items);
    },
    (e) => onError?.(e)
  );
}

export async function createAgendaItem(
  uid: string,
  input: {
    title: string;
    kind: AgendaKind;
    date: string;
    time?: string;
    remindMinutesBefore?: number;
    repeat?: 'none' | 'weekly';
    notes?: string;
    createdBy: 'child' | 'admin';
  }
): Promise<string> {
  const today = getTodayBrazil();
  const ref = doc(collection(db, 'agenda'));
  const now = nowBrazil().iso;
  await setDoc(ref, stripUndefined({
    userId: uid,
    familyId: FAMILY_ID,
    title: input.title.trim().slice(0, 40),
    kind: input.kind,
    date: input.date,
    time: input.time || null,
    remindMinutesBefore: input.remindMinutesBefore ?? null,
    repeat: input.repeat || 'none',
    notes: (input.notes || '').trim().slice(0, 140) || null,
    createdBy: input.createdBy,
    plannedAheadDays: plannedAheadDays(today, input.date),
    createdAt: now,
    updatedAt: now,
  }));
  return ref.id;
}

export async function updateAgendaItem(id: string, patch: Partial<AgendaItem>): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: nowBrazil().iso };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    data[k] = v === '' ? null : v;
  }
  await updateDoc(doc(db, 'agenda', id), data);
}

export async function deleteAgendaItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'agenda', id));
}

export async function markAgendaDone(uid: string, id: string): Promise<number> {
  let xp = 0;
  await runTransaction(db, async (tx) => {
    const aRef = doc(db, 'agenda', id);
    const pRef = doc(db, 'progress', uid);
    const vRef = doc(db, 'village', uid);
    const aSnap = await tx.get(aRef);
    const pSnap = await tx.get(pRef);
    const vSnap = await tx.get(vRef);
    if (!aSnap.exists()) throw new Error('Compromisso não encontrado');
    const item = fromAgendaDoc(aSnap.id, aSnap.data() as Record<string, unknown>);
    if (item.userId !== uid) throw new Error('Compromisso de outro minerador');
    if (item.doneAt) return;
    const village = vSnap.exists()
      ? fromVillageDoc(uid, vSnap.data() as Record<string, unknown>)
      : initialVillageDoc(uid, nowBrazil().iso);
    const key = claimKey('agenda', id);
    if (hasClaim(village, key)) return;
    xp = organizationXp(item);
    const today = getTodayBrazil();
    tx.update(aRef, { doneAt: today, updatedAt: nowBrazil().iso });
    const claimed = { ...village.claimed, [key]: nowBrazil().iso };
    if (vSnap.exists()) tx.update(vRef, stripUndefined({ claimed, updatedAt: nowBrazil().iso }));
    else tx.set(vRef, stripUndefined({ ...village, claimed, updatedAt: nowBrazil().iso }));
    if (pSnap.exists() && xp > 0) {
      tx.update(pRef, { totalXP: increment(xp), updatedAt: serverTimestamp() });
    }
  });
  return xp;
}

export async function acceptStudyPlan(uid: string, itemId: string): Promise<string[]> {
  const aRef = doc(db, 'agenda', itemId);
  const snap = await getDoc(aRef);
  if (!snap.exists()) throw new Error('Compromisso não encontrado');
  const item = fromAgendaDoc(snap.id, snap.data() as Record<string, unknown>);
  const days = studyPlanFor(item, getTodayBrazil());
  const created: string[] = [];
  for (const date of days) {
    const taskRef = doc(collection(db, 'tasks'));
    await setDoc(taskRef, stripUndefined({
      ownerId: uid,
      title: `Foco: ${item.title} (15 min)`,
      description: `Plano de estudo para ${item.title}`,
      xp: 10,
      gold: 0,
      period: 'afternoon',
      frequency: 'daily',
      active: true,
      status: 'pending',
      optional: true,
      origin: 'agenda',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      date,
    }));
    created.push(taskRef.id);
  }
  await updateDoc(aRef, { studyPlanAccepted: true, updatedAt: nowBrazil().iso });
  return created;
}

export async function weeklyOrganizedBonus(uid: string, week: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'agenda'), where('userId', '==', uid)));
  const items = snap.docs.map((d) => fromAgendaDoc(d.id, d.data() as Record<string, unknown>));
  if (!weekOrganized(items, week)) return false;
  let granted = false;
  await runTransaction(db, async (tx) => {
    const vRef = doc(db, 'village', uid);
    const bRef = doc(db, 'englishBase', uid);
    const vSnap = await tx.get(vRef);
    const bSnap = await tx.get(bRef);
    const village = vSnap.exists()
      ? fromVillageDoc(uid, vSnap.data() as Record<string, unknown>)
      : initialVillageDoc(uid, nowBrazil().iso);
    const key = claimKey('agenda', 'week', week);
    if (hasClaim(village, key)) return;
    const claimed = { ...village.claimed, [key]: nowBrazil().iso };
    if (vSnap.exists()) tx.update(vRef, stripUndefined({ claimed, updatedAt: nowBrazil().iso }));
    else tx.set(vRef, stripUndefined({ ...village, claimed, updatedAt: nowBrazil().iso }));
    if (bSnap.exists()) {
      tx.update(bRef, { 'materials.madeira': increment(1), updatedAt: nowBrazil().iso });
    }
    granted = true;
  });
  return granted;
}

export { addDays };
