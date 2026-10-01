// Encomendas: criar, aceitar, entregar, desistir, ajustar, cancelar e aprovar.
// Gold só na aprovação do pai, uma vez (CONTRATOS_E_CARREIRAS.md §9).
// Carreira e as 8 conquistas entram no 15b.

import {
  Timestamp,
  collection,
  deleteField,
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
  type DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, storage } from '../config/firebase';
import { DEFAULT_ECONOMY } from '../config/village';
import type {
  Assignment,
  AssignmentDraft,
  AssignmentRecurrence,
  AssignmentReview,
  AssignmentStatus,
  AssignmentSubmission,
  Specialty,
} from '../types/assignment';
import type { Material } from '../types/english';
import type { Proof, ProofSpec } from '../types/proof';
import type { EconomySettings } from '../types/village';
import { getSettings } from './settingsService';
import { saveNotice } from './villageService';
import { claimKey } from './village/claims';
import { addDays, getTodayBrazil } from '../utils/clock';
import { isProjectSize, nextStatus, proofReady, type StatusReason } from './assignments/machine';
import { assignmentReward } from './assignments/rewards';
import { CAREER_REWARDS } from '../config/careers';
import { instanceDraft } from './assignments/recurrence';
import {
  limitLine,
  placaApproved,
  placaChanges,
  placaNew,
  projectLimitLine,
} from './assignments/voice';

const MATERIALS: Material[] = ['madeira', 'pedra', 'ferro', 'redstone'];
const STATUSES: ReadonlySet<AssignmentStatus> = new Set([
  'available', 'accepted', 'submitted', 'needs_changes', 'approved', 'cancelled', 'expired',
]);
const SPECIALTIES: ReadonlySet<Specialty> = new Set([
  'organizador', 'testador', 'catalogador', 'pesquisador', 'engenheiro', 'inventor',
]);

export class AssignmentError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AssignmentError';
    this.code = code;
  }
}

export interface ApprovalInput {
  note?: string;
  missing?: number[];
  photoPaths?: string[];
  competencies?: string[];
  fixedAfterFailure?: boolean;
  sawItWorking?: boolean;
  overCap?: boolean;
}

export interface ApproveOutcome {
  paid: boolean;
  gold: number;
  already: boolean;
}

function defined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => str(item)).filter(Boolean);
}

function reasonLine(reason: StatusReason, activeMax: number): string {
  if (reason === 'limite') return limitLine(activeMax);
  if (reason === 'projeto') return projectLimitLine();
  if (reason === 'prazo') return 'O prazo desta passou.';
  if (reason === 'prova') return 'Marca o que está pronto antes de chamar o pai.';
  if (reason === 'cedo') return 'O prazo desta ainda não passou.';
  return 'Essa encomenda não está nesse ponto.';
}

function rethrow(error: unknown): never {
  if (error instanceof AssignmentError) throw error;
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
  if (code.includes('permission-denied')) {
    throw new AssignmentError('regra', 'A Vila não deixou essa encomenda mudar agora.');
  }
  if (error instanceof Error) throw error;
  throw new AssignmentError('falha', 'Não deu para guardar agora.');
}

async function loadEconomy(): Promise<EconomySettings> {
  return getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
}

function dueTimestamp(dueOn: string): Timestamp {
  return Timestamp.fromDate(new Date(`${addDays(dueOn, 1)}T00:00:00.000-03:00`));
}

function cleanMaterials(raw: Partial<Record<Material, number>> | undefined): Partial<Record<Material, number>> | undefined {
  if (!raw) return undefined;
  const out: Partial<Record<Material, number>> = {};
  for (const key of MATERIALS) {
    const n = Math.floor(Number(raw[key]) || 0);
    if (n > 0) out[key] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanProof(proof: Proof): Proof {
  const answers = proof.answers
    ?.map((item) => ({ q: item.q.trim(), a: item.a.trim() }))
    .filter((item) => item.q || item.a);
  return defined({
    kinds: proof.kinds,
    checklist: proof.checklist,
    answers: answers && answers.length ? answers : undefined,
    note: proof.note?.trim() || undefined,
  }) as unknown as Proof;
}

function parseProofSpec(raw: unknown): ProofSpec {
  const rec = asRecord(raw);
  const kinds = Array.isArray(rec?.kinds)
    ? rec.kinds.filter((k): k is ProofSpec['kinds'][number] => k === 'checklist' || k === 'questions' || k === 'inPerson' || k === 'photo')
    : [];
  const questions = strList(rec?.questions);
  return questions.length ? { kinds, questions } : { kinds };
}

function parseProof(raw: unknown): Proof {
  const rec = asRecord(raw);
  const spec = parseProofSpec(raw);
  const checklist = Array.isArray(rec?.checklist) ? rec.checklist.map((item) => item === true) : undefined;
  const answers = Array.isArray(rec?.answers)
    ? rec.answers.map((item) => {
      const row = asRecord(item);
      return { q: str(row?.q), a: str(row?.a) };
    }).filter((item) => item.q || item.a)
    : undefined;
  return defined({
    kinds: spec.kinds,
    checklist,
    answers,
    note: str(rec?.note) || undefined,
  }) as unknown as Proof;
}

function parseSubmissions(raw: unknown): AssignmentSubmission[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = asRecord(item);
    if (!row) return null;
    return defined({
      at: asIso(row.at) || '',
      proof: parseProof(row.proof),
      whatWentWrong: str(row.whatWentWrong) || undefined,
      whatChanged: str(row.whatChanged) || undefined,
    }) as AssignmentSubmission;
  }).filter((item): item is AssignmentSubmission => Boolean(item));
}

function parseReviews(raw: unknown): AssignmentReview[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = asRecord(item);
    if (!row) return null;
    const verdict = row.verdict;
    if (verdict !== 'approved' && verdict !== 'needs_changes' && verdict !== 'cancelled') return null;
    const missing = Array.isArray(row.missing) ? row.missing.map((n) => Math.floor(Number(n))).filter((n) => n >= 0) : undefined;
    return defined({
      at: asIso(row.at) || '',
      verdict,
      missing: missing && missing.length ? missing : undefined,
      note: str(row.note) || undefined,
      photoPaths: strList(row.photoPaths),
      competencies: strList(row.competencies),
      fixedAfterFailure: row.fixedAfterFailure === true ? true : undefined,
      sawItWorking: row.sawItWorking === true ? true : undefined,
      overCap: row.overCap === true ? true : undefined,
    }) as AssignmentReview;
  }).filter((item): item is AssignmentReview => Boolean(item));
}

export function fromAssignment(id: string, raw: DocumentData): Assignment | null {
  const status = raw.status as AssignmentStatus;
  const specialty = raw.specialty as Specialty;
  if (!STATUSES.has(status) || !SPECIALTIES.has(specialty) || !str(raw.userId) || !str(raw.title)) return null;
  const materials = cleanMaterials(asRecord(raw.reward) ? asRecord(raw.reward)?.materials as Partial<Record<Material, number>> : undefined);
  const rewardRec = asRecord(raw.reward);
  const payoutRec = asRecord(raw.payout);
  return defined({
    id,
    userId: str(raw.userId),
    kind: raw.kind === 'training' ? 'training' : 'paid',
    templateId: str(raw.templateId) || undefined,
    specialty,
    careerId: raw.careerId === 'engenheiro' ? 'engenheiro' : undefined,
    title: str(raw.title),
    story: str(raw.story) || undefined,
    deliverable: str(raw.deliverable),
    criteria: strList(raw.criteria),
    proof: parseProofSpec(raw.proof),
    size: raw.size,
    reward: {
      gold: Math.max(0, Math.round(Number(rewardRec?.gold) || 0)),
      xp: Math.max(0, Math.round(Number(rewardRec?.xp) || 0)),
      ...(materials ? { materials } : {}),
    },
    competencies: strList(raw.competencies),
    adult: raw.adult === true ? true : undefined,
    status,
    availableOn: str(raw.availableOn),
    dueOn: str(raw.dueOn) || undefined,
    recurrenceId: str(raw.recurrenceId) || undefined,
    periodKey: str(raw.periodKey) || undefined,
    createdBy: raw.createdBy === 'system' ? 'system' : 'admin',
    acceptedAt: asIso(raw.acceptedAt),
    plan: str(raw.plan) || undefined,
    submissions: parseSubmissions(raw.submissions),
    reviews: parseReviews(raw.reviews),
    drops: Math.max(0, Math.floor(Number(raw.drops) || 0)),
    payout: payoutRec ? {
      txId: str(payoutRec.txId),
      gold: Math.max(0, Math.round(Number(payoutRec.gold) || 0)),
      xp: Math.max(0, Math.round(Number(payoutRec.xp) || 0)),
      at: asIso(payoutRec.at) || '',
      ...(cleanMaterials(payoutRec.materials as Partial<Record<Material, number>>)
        ? { materials: cleanMaterials(payoutRec.materials as Partial<Record<Material, number>>) }
        : {}),
    } : undefined,
    createdAt: asIso(raw.createdAt),
    updatedAt: asIso(raw.updatedAt),
  }) as Assignment;
}

function fromRecurrence(id: string, raw: DocumentData): AssignmentRecurrence | null {
  const specialty = raw.specialty as Specialty;
  if (!SPECIALTIES.has(specialty) || !str(raw.userId) || !str(raw.title)) return null;
  const weekdays = Array.isArray(raw.weekdays)
    ? raw.weekdays.map((n) => Math.floor(Number(n))).filter((n) => n >= 0 && n <= 6)
    : [];
  const rewardRec = asRecord(raw.reward);
  return {
    id,
    userId: str(raw.userId),
    templateId: str(raw.templateId) || undefined,
    specialty,
    title: str(raw.title),
    story: str(raw.story) || undefined,
    deliverable: str(raw.deliverable),
    criteria: strList(raw.criteria),
    proof: parseProofSpec(raw.proof),
    size: raw.size === 'pequena' || raw.size === 'normal' || raw.size === 'sabado' || raw.size === 'projeto' || raw.size === 'grande'
      ? raw.size
      : 'normal',
    reward: {
      gold: Math.max(0, Math.round(Number(rewardRec?.gold) || 0)),
      xp: Math.max(0, Math.round(Number(rewardRec?.xp) || 0)),
      ...(cleanMaterials(rewardRec?.materials as Partial<Record<Material, number>> | undefined)
        ? { materials: cleanMaterials(rewardRec?.materials as Partial<Record<Material, number>>) }
        : {}),
    },
    competencies: strList(raw.competencies),
    adult: raw.adult === true ? true : undefined,
    weekdays,
    dueAfterDays: Math.max(0, Math.floor(Number(raw.dueAfterDays) || 0)),
    active: raw.active !== false,
  };
}

export function subscribeAssignments(
  uid: string,
  onChange: (rows: Assignment[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'assignments'), where('userId', '==', uid)),
    (snap) => {
      const rows = snap.docs
        .map((item) => fromAssignment(item.id, item.data()))
        .filter((item): item is Assignment => Boolean(item));
      rows.sort((a, b) => (b.availableOn || '').localeCompare(a.availableOn || ''));
      onChange(rows);
    },
    (error) => onError?.(error),
  );
}

export function subscribeRecurrences(
  uid: string,
  onChange: (rows: AssignmentRecurrence[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'assignmentRecurrences'), where('userId', '==', uid)),
    (snap) => {
      onChange(snap.docs
        .map((item) => fromRecurrence(item.id, item.data()))
        .filter((item): item is AssignmentRecurrence => Boolean(item)));
    },
    (error) => onError?.(error),
  );
}

function rewardOf(draft: AssignmentDraft) {
  return defined({
    gold: Math.max(0, Math.round(draft.reward.gold)),
    xp: Math.max(0, Math.round(draft.reward.xp)),
    materials: cleanMaterials(draft.reward.materials),
  });
}

function bodyOf(draft: AssignmentDraft, userId: string, today: string, createdBy: 'admin' | 'system', dueOn: string) {
  return defined({
    userId,
    kind: 'paid' as const,
    templateId: draft.templateId,
    specialty: draft.specialty,
    title: draft.title.trim(),
    story: draft.story?.trim() || undefined,
    deliverable: draft.deliverable.trim(),
    criteria: draft.criteria.map((line) => line.trim()).filter(Boolean),
    proof: defined({
      kinds: draft.proof.kinds,
      questions: draft.proof.questions?.map((q) => q.trim()).filter(Boolean),
    }),
    size: draft.size,
    reward: rewardOf(draft),
    competencies: draft.competencies,
    adult: draft.adult ? true : undefined,
    status: 'available' as const,
    availableOn: today,
    dueOn,
    dueAt: dueTimestamp(dueOn),
    createdBy,
    submissions: [],
    reviews: [],
    drops: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function postNotice(uid: string, id: string, text: string, today: string): Promise<void> {
  await saveNotice(uid, {
    id,
    type: 'recado',
    text,
    when: today,
  });
}

export async function createAssignment(uid: string, draft: AssignmentDraft, today = getTodayBrazil()): Promise<string> {
  const title = draft.title.trim();
  const deliverable = draft.deliverable.trim();
  const criteria = draft.criteria.map((line) => line.trim()).filter(Boolean);
  if (!title || !deliverable || criteria.length === 0) {
    throw new AssignmentError('vazio', 'Falta o título, a entrega ou o que precisa ficar pronto.');
  }
  if (!SPECIALTIES.has(draft.specialty)) throw new AssignmentError('vazio', 'Escolhe a especialidade.');
  const dueOn = draft.dueOn && /^\d{4}-\d{2}-\d{2}$/.test(draft.dueOn) ? draft.dueOn : today;
  const clean: AssignmentDraft = { ...draft, title, deliverable, criteria, dueOn };
  try {
    let assignmentId = '';
    if (draft.recurring && draft.weekdays && draft.weekdays.length > 0) {
      const recRef = doc(collection(db, 'assignmentRecurrences'));
      const rec: AssignmentRecurrence = {
        id: recRef.id,
        userId: uid,
        templateId: draft.templateId,
        specialty: draft.specialty,
        title,
        story: draft.story?.trim() || undefined,
        deliverable,
        criteria,
        proof: clean.proof,
        size: draft.size,
        reward: {
          gold: Math.max(0, Math.round(draft.reward.gold)),
          xp: Math.max(0, Math.round(draft.reward.xp)),
          ...(cleanMaterials(draft.reward.materials) ? { materials: cleanMaterials(draft.reward.materials) } : {}),
        },
        competencies: draft.competencies,
        adult: draft.adult,
        weekdays: draft.weekdays,
        dueAfterDays: Math.max(0, Math.floor(draft.dueAfterDays ?? 0)),
        active: true,
      };
      await setDoc(recRef, defined({
        ...rec,
        id: undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
      const todayDraft = instanceDraft(rec, today);
      if (todayDraft) {
        const existing = await getDoc(doc(db, 'assignments', todayDraft.id));
        if (existing.exists()) return todayDraft.id;
        assignmentId = todayDraft.id;
        await setDoc(doc(db, 'assignments', assignmentId), defined({
          ...bodyOf(clean, uid, today, 'system', todayDraft.dueOn),
          recurrenceId: rec.id,
          periodKey: today,
        }));
      }
    }
    if (!assignmentId) {
      const ref = doc(collection(db, 'assignments'));
      assignmentId = ref.id;
      await setDoc(ref, bodyOf(clean, uid, today, 'admin', dueOn));
    }
    await postNotice(uid, `asg_${assignmentId}_new`, placaNew(title), today);
    return assignmentId;
  } catch (error) {
    rethrow(error);
  }
}

function boardList(data: DocumentData | undefined): string[] {
  return Array.isArray(data?.active) ? data.active.filter((item): item is string => typeof item === 'string') : [];
}

function writeBoard(
  tx: { update: (ref: ReturnType<typeof doc>, data: DocumentData) => void; set: (ref: ReturnType<typeof doc>, data: DocumentData) => void },
  boardRef: ReturnType<typeof doc>,
  exists: boolean,
  uid: string,
  active: string[],
): void {
  const payload = { userId: uid, active: active.slice(0, 5), updatedAt: serverTimestamp() };
  if (exists) tx.update(boardRef, payload);
  else tx.set(boardRef, payload);
}

export async function acceptAssignment(id: string, plan?: string): Promise<void> {
  const today = getTodayBrazil();
  const economy = await loadEconomy();
  const activeMax = Math.min(economy.assignmentActiveMax ?? DEFAULT_ECONOMY.assignmentActiveMax, 5);
  const projectMax = economy.assignmentProjectMax ?? DEFAULT_ECONOMY.assignmentProjectMax;
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'assignments', id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new AssignmentError('sumiu', 'Essa encomenda não está no quadro.');
      const data = snap.data();
      const uid = str(data.userId);
      const boardRef = doc(db, 'assignmentBoards', uid);
      const boardSnap = await tx.get(boardRef);
      const others = boardList(boardSnap.data()).filter((item) => item !== id);
      const still: string[] = [];
      let projectCount = 0;
      for (const otherId of others) {
        const other = await tx.get(doc(db, 'assignments', otherId));
        if (!other.exists()) continue;
        const row = other.data();
        if (row.kind === 'training') continue;
        if (row.status !== 'accepted' && row.status !== 'needs_changes') continue;
        still.push(otherId);
        if (isProjectSize(row.size)) projectCount += 1;
      }
      const move = nextStatus(data.status, 'accept', {
        kind: data.kind === 'training' ? 'training' : 'paid',
        size: data.size,
        activeCount: still.length,
        projectCount,
        activeMax,
        projectMax,
        today,
        dueOn: str(data.dueOn) || undefined,
        proofComplete: true,
      });
      if (!move.ok) throw new AssignmentError(move.reason, reasonLine(move.reason, activeMax));
      tx.update(ref, defined({
        status: 'accepted',
        acceptedAt: Timestamp.now(),
        plan: plan?.trim() || undefined,
        updatedAt: serverTimestamp(),
      }));
      writeBoard(tx, boardRef, boardSnap.exists(), uid, [...still, id]);
    });
  } catch (error) {
    rethrow(error);
  }
}

export async function submitAssignment(
  id: string,
  proof: Proof,
  extra?: { whatWentWrong?: string; whatChanged?: string },
): Promise<void> {
  const today = getTodayBrazil();
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'assignments', id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new AssignmentError('sumiu', 'Essa encomenda não está no quadro.');
      const data = snap.data();
      const criteria = strList(data.criteria);
      const spec = parseProofSpec(data.proof);
      if (!proofReady(spec, proof, criteria.length)) {
        throw new AssignmentError('prova', reasonLine('prova', 3));
      }
      const move = nextStatus(data.status, 'submit', {
        kind: data.kind === 'training' ? 'training' : 'paid',
        size: data.size,
        activeCount: 0,
        projectCount: 0,
        activeMax: 3,
        projectMax: 1,
        today,
        dueOn: str(data.dueOn) || undefined,
        proofComplete: true,
      });
      if (!move.ok) throw new AssignmentError(move.reason, reasonLine(move.reason, 3));
      const prev = Array.isArray(data.submissions) ? data.submissions : [];
      const entry = defined({
        at: Timestamp.now(),
        proof: cleanProof(proof),
        whatWentWrong: extra?.whatWentWrong?.trim() || undefined,
        whatChanged: extra?.whatChanged?.trim() || undefined,
      });
      tx.update(ref, {
        status: 'submitted',
        submissions: [...prev, entry],
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    rethrow(error);
  }
}

export async function dropAssignment(id: string): Promise<void> {
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'assignments', id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new AssignmentError('sumiu', 'Essa encomenda não está no quadro.');
      const data = snap.data();
      const move = nextStatus(data.status, 'drop', {
        kind: data.kind === 'training' ? 'training' : 'paid',
        activeCount: 0,
        projectCount: 0,
        activeMax: 3,
        projectMax: 1,
        today: getTodayBrazil(),
        proofComplete: true,
      });
      if (!move.ok) throw new AssignmentError(move.reason, reasonLine(move.reason, 3));
      const uid = str(data.userId);
      const boardRef = doc(db, 'assignmentBoards', uid);
      const boardSnap = await tx.get(boardRef);
      tx.update(ref, {
        status: 'available',
        drops: Math.max(0, Math.floor(Number(data.drops) || 0)) + 1,
        acceptedAt: deleteField(),
        updatedAt: serverTimestamp(),
      });
      const active = boardList(boardSnap.data()).filter((item) => item !== id);
      writeBoard(tx, boardRef, boardSnap.exists(), uid, active);
    });
  } catch (error) {
    rethrow(error);
  }
}

export async function requestChanges(id: string, input: { note: string; missing?: number[] }): Promise<void> {
  const note = input.note.trim();
  if (!note) throw new AssignmentError('frase', 'Escreve uma frase curta sobre o que ainda falta.');
  const today = getTodayBrazil();
  try {
    let uid = '';
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'assignments', id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new AssignmentError('sumiu', 'Essa encomenda não está no quadro.');
      const data = snap.data();
      uid = str(data.userId);
      const move = nextStatus(data.status, 'request_changes', {
        kind: data.kind === 'training' ? 'training' : 'paid',
        activeCount: 0,
        projectCount: 0,
        activeMax: 3,
        projectMax: 1,
        today,
        proofComplete: true,
      });
      if (!move.ok) throw new AssignmentError(move.reason, 'Ela ainda não foi entregue.');
      const prev = Array.isArray(data.reviews) ? data.reviews : [];
      const missing = (input.missing ?? []).map((n) => Math.floor(n)).filter((n) => n >= 0);
      tx.update(ref, {
        status: 'needs_changes',
        reviews: [...prev, defined({
          at: Timestamp.now(),
          verdict: 'needs_changes',
          missing: missing.length ? missing : undefined,
          note,
        })],
        updatedAt: serverTimestamp(),
      });
    });
    if (uid) await postNotice(uid, `asg_${id}_fix`, placaChanges(), today);
  } catch (error) {
    rethrow(error);
  }
}

export async function cancelAssignment(id: string, note?: string): Promise<void> {
  const today = getTodayBrazil();
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'assignments', id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new AssignmentError('sumiu', 'Essa encomenda não está no quadro.');
      const data = snap.data();
      const move = nextStatus(data.status, 'cancel', {
        kind: data.kind === 'training' ? 'training' : 'paid',
        activeCount: 0,
        projectCount: 0,
        activeMax: 3,
        projectMax: 1,
        today,
        proofComplete: true,
      });
      if (!move.ok) throw new AssignmentError(move.reason, 'Encomenda concluída não se cancela.');
      const uid = str(data.userId);
      const boardRef = doc(db, 'assignmentBoards', uid);
      const boardSnap = await tx.get(boardRef);
      const prev = Array.isArray(data.reviews) ? data.reviews : [];
      tx.update(ref, {
        status: 'cancelled',
        reviews: [...prev, defined({
          at: Timestamp.now(),
          verdict: 'cancelled',
          note: note?.trim() || undefined,
        })],
        updatedAt: serverTimestamp(),
      });
      if (uid) {
        const active = boardList(boardSnap.data()).filter((item) => item !== id);
        writeBoard(tx, boardRef, boardSnap.exists(), uid, active);
      }
    });
  } catch (error) {
    rethrow(error);
  }
}

export async function approveAssignment(uid: string, id: string, review: ApprovalInput): Promise<ApproveOutcome> {
  const outcome: ApproveOutcome = { paid: false, gold: 0, already: false };
  try {
    await runTransaction(db, async (tx) => {
      const aRef = doc(db, 'assignments', id);
      const pRef = doc(db, 'progress', uid);
      const vRef = doc(db, 'village', uid);
      const bRef = doc(db, 'englishBase', uid);
      const boardRef = doc(db, 'assignmentBoards', uid);
      const gRef = doc(db, 'goldTransactions', `assignment_${id}`);
      const aSnap = await tx.get(aRef);
      const pSnap = await tx.get(pRef);
      const vSnap = await tx.get(vRef);
      const bSnap = await tx.get(bRef);
      const boardSnap = await tx.get(boardRef);
      const gSnap = await tx.get(gRef);
      if (!aSnap.exists()) throw new AssignmentError('sumiu', 'Essa encomenda não está no quadro.');
      const data = aSnap.data();
      if (str(data.userId) !== uid) throw new AssignmentError('sumiu', 'Essa encomenda é de outro minerador.');
      if (data.status === 'approved') {
        outcome.already = true;
        return;
      }
      if (data.status !== 'submitted') return;
      const key = claimKey('assignment', id);
      const claimed = (vSnap.data()?.claimed || {}) as Record<string, unknown>;
      if (claimed[key] || gSnap.exists()) {
        tx.update(aRef, { status: 'approved', updatedAt: serverTimestamp() });
        outcome.already = true;
        return;
      }
      if (!pSnap.exists() || !vSnap.exists()) {
        throw new AssignmentError('bolso', 'O bolso do minerador não apareceu.');
      }
      const pay = assignmentReward({
        kind: data.kind === 'training' ? 'training' : 'paid',
        templateId: str(data.templateId) || undefined,
        reward: {
          gold: Math.max(0, Math.round(Number(asRecord(data.reward)?.gold) || 0)),
          xp: Math.max(0, Math.round(Number(asRecord(data.reward)?.xp) || 0)),
          materials: cleanMaterials(asRecord(data.reward)?.materials as Partial<Record<Material, number>> | undefined),
        },
      }, CAREER_REWARDS);
      const goldBefore = Math.max(0, Math.round(Number(pSnap.data()?.availableGold) || 0));
      const goldAfter = goldBefore + pay.gold;
      const prev = Array.isArray(data.reviews) ? data.reviews : [];
      const missing = (review.missing ?? []).map((n) => Math.floor(n)).filter((n) => n >= 0);
      const competencies = (review.competencies ?? []).map((item) => item.trim()).filter(Boolean);
      const photos = (review.photoPaths ?? []).map((item) => item.trim()).filter(Boolean);
      const entry = defined({
        at: Timestamp.now(),
        verdict: 'approved' as const,
        missing: missing.length ? missing : undefined,
        note: review.note?.trim() || undefined,
        photoPaths: photos.length ? photos : undefined,
        competencies: competencies.length ? competencies : undefined,
        fixedAfterFailure: review.fixedAfterFailure ? true : undefined,
        sawItWorking: review.sawItWorking ? true : undefined,
        overCap: review.overCap ? true : undefined,
      });
      const payout = defined({
        txId: `assignment_${id}`,
        gold: pay.gold,
        xp: pay.xp,
        materials: pay.materials,
        at: Timestamp.now(),
      });
      tx.update(aRef, {
        status: 'approved',
        payout,
        reviews: [...prev, entry],
        updatedAt: serverTimestamp(),
      });
      const progressPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (pay.gold > 0) {
        progressPatch.availableGold = goldAfter;
        progressPatch.totalGoldEarned = increment(pay.gold);
      }
      if (pay.xp > 0) progressPatch.totalXP = increment(pay.xp);
      if (pay.gold > 0 || pay.xp > 0) tx.update(pRef, progressPatch);
      if (pay.gold > 0) {
        tx.set(gRef, defined({
          userId: uid,
          amount: pay.gold,
          type: 'earned',
          source: 'assignment',
          description: `Encomenda: ${str(data.title)}`,
          relatedId: id,
          relatedTitle: str(data.title),
          balanceBefore: goldBefore,
          balanceAfter: goldAfter,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid,
        }));
      }
      tx.update(vRef, {
        [`claimed.${key}`]: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      if (pay.materials) {
        const mats: Record<string, unknown> = { updatedAt: serverTimestamp() };
        for (const [name, qty] of Object.entries(pay.materials)) {
          if (qty > 0) mats[`materials.${name}`] = increment(qty);
        }
        if (bSnap.exists()) tx.update(bRef, mats);
        else tx.set(bRef, { userId: uid, ...mats }, { merge: true });
      }
      const active = boardList(boardSnap.data()).filter((item) => item !== id);
      if (boardSnap.exists() || active.length > 0) {
        writeBoard(tx, boardRef, boardSnap.exists(), uid, active);
      }
      outcome.paid = true;
      outcome.gold = pay.gold;
    });
    if (outcome.paid && uid) {
      const text = outcome.gold > 0 ? placaApproved(outcome.gold) : 'Entrega aprovada.';
      await postNotice(uid, `asg_${id}_ok`, text, getTodayBrazil());
    }
    return outcome;
  } catch (error) {
    rethrow(error);
  }
}

export async function uploadProofPhoto(uid: string, assignmentId: string, file: File, index: number): Promise<string> {
  if (!file.type.startsWith('image/')) throw new AssignmentError('foto', 'A foto precisa ser uma imagem.');
  if (file.size > 3 * 1024 * 1024) throw new AssignmentError('foto', 'A foto passou de 3 MB.');
  const path = `proofs/${uid}/assignments/${assignmentId}/${index}.jpg`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

export async function setRecurrenceActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'assignmentRecurrences', id), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function spawnRecurrences(uid: string, date: string): Promise<{ created: string[]; expired: string[] }> {
  const created: string[] = [];
  const expired: string[] = [];
  const recSnap = await getDocs(query(collection(db, 'assignmentRecurrences'), where('userId', '==', uid)));
  for (const item of recSnap.docs) {
    const rec = fromRecurrence(item.id, item.data());
    if (!rec || !rec.active) continue;
    const draft = instanceDraft(rec, date);
    if (!draft) continue;
    const ref = doc(db, 'assignments', draft.id);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    await setDoc(ref, defined({
      userId: draft.userId,
      kind: 'paid',
      templateId: draft.templateId,
      specialty: draft.specialty,
      title: draft.title,
      story: draft.story,
      deliverable: draft.deliverable,
      criteria: draft.criteria,
      proof: draft.proof,
      size: draft.size,
      reward: draft.reward,
      competencies: draft.competencies,
      adult: draft.adult ? true : undefined,
      status: 'available',
      availableOn: draft.availableOn,
      dueOn: draft.dueOn,
      dueAt: dueTimestamp(draft.dueOn),
      recurrenceId: draft.recurrenceId,
      periodKey: draft.periodKey,
      createdBy: 'system',
      submissions: [],
      reviews: [],
      drops: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await postNotice(uid, `asg_${draft.id}_new`, placaNew(draft.title), date);
    created.push(draft.id);
  }
  const openSnap = await getDocs(query(collection(db, 'assignments'), where('userId', '==', uid)));
  for (const item of openSnap.docs) {
    const data = item.data();
    const status = data.status;
    if (status !== 'available' && status !== 'accepted' && status !== 'needs_changes') continue;
    const dueOn = str(data.dueOn);
    if (!dueOn || dueOn >= date) continue;
    await updateDoc(item.ref, { status: 'expired', updatedAt: serverTimestamp() });
    const boardRef = doc(db, 'assignmentBoards', uid);
    const boardSnap = await getDoc(boardRef);
    if (boardSnap.exists()) {
      const active = boardList(boardSnap.data()).filter((row) => row !== item.id);
      await updateDoc(boardRef, { userId: uid, active, updatedAt: serverTimestamp() });
    }
    expired.push(item.id);
  }
  return { created, expired };
}

export async function generateAssignmentsNow(uid: string): Promise<{ created: string[]; expired: string[]; via: 'server' | 'device' }> {
  try {
    const call = httpsCallable<Record<string, never>, { created?: string[]; expired?: string[] }>(functions, 'generateAssignmentsNow');
    const res = await call({});
    return {
      created: res.data.created ?? [],
      expired: res.data.expired ?? [],
      via: 'server',
    };
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
    if (!code.includes('not-found') && !code.includes('unavailable')) rethrow(error);
    const local = await spawnRecurrences(uid, getTodayBrazil());
    return { ...local, via: 'device' };
  }
}
