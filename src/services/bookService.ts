// ========================================
// Estante do Sábio (decisão 40): livros cadastrados, relatos de leitura, juiz e pagamento.
// Regras puras em village/books.ts. Aqui só Firestore e a função `openai`.
// ========================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FAMILY_ID } from '../config/rules';
import type { BookDoc, BookJudge, BookReportDoc, BookSize, BookVerdict, BookVerify } from '../types';
import { getTodayBrazil } from '../utils/clock';
import { callOpenAI } from './aiQuiz';
import {
  BOOK_GOLD_MAX,
  BOOK_JUDGE_MODEL,
  BOOK_VERIFY_MODEL,
  BOOK_XP,
  buildBookJudgePrompt,
  claimKeyForBook,
  claimKeyForBookDay,
  buildVerifyPrompt,
  goldForBook,
  normalizeBookGold,
  parseBookJudge,
  parseVerify,
  sizeForPages,
  titleKeyOf,
} from './village/books';

const omitUndefined = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as T;

const toDate = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(0));

function fromBook(id: string, d: Record<string, unknown>): BookDoc {
  const pages = Math.max(1, Math.floor(Number(d.pages) || 1));
  return {
    id,
    userId: String(d.userId || ''),
    familyId: String(d.familyId || FAMILY_ID),
    title: String(d.title || ''),
    titleKey: String(d.titleKey || titleKeyOf(String(d.title || ''))),
    pages,
    size: (d.size === 'curto' || d.size === 'medio' || d.size === 'longo' ? d.size : sizeForPages(pages)) as BookSize,
    gold: normalizeBookGold(d.gold),
    addedOn: String(d.addedOn || ''),
    addedBy: d.addedBy === 'child' ? 'child' : 'parent',
    status: d.status === 'done' ? 'done' : 'to_read',
    doneOn: typeof d.doneOn === 'string' ? d.doneOn : undefined,
    parentReply: typeof d.parentReply === 'string' && d.parentReply.trim() ? d.parentReply : undefined,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

function fromReport(id: string, d: Record<string, unknown>): BookReportDoc {
  return {
    id,
    userId: String(d.userId || ''),
    familyId: String(d.familyId || FAMILY_ID),
    bookId: String(d.bookId || ''),
    title: String(d.title || ''),
    titleKey: String(d.titleKey || ''),
    liked: ([0, 1, 2, 3].includes(Number(d.liked)) ? Number(d.liked) : 1) as 0 | 1 | 2 | 3,
    rating: typeof d.rating === 'number' ? d.rating : null,
    text: String(d.text || ''),
    words: Number(d.words) || 0,
    typedMs: Number(d.typedMs) || 0,
    pasted: d.pasted === true,
    attempt: Number(d.attempt) || 1,
    date: String(d.date || ''),
    readingDays: Number(d.readingDays) || 0,
    judge: d.judge && typeof d.judge === 'object' ? (d.judge as BookJudge) : undefined,
    verify: d.verify && typeof d.verify === 'object' ? (d.verify as BookVerify) : undefined,
    verdict: (typeof d.verdict === 'string' ? d.verdict : 'falta') as BookVerdict,
    accepted: d.accepted === true,
    needsParent: d.needsParent === true,
    flagged: d.flagged === true,
    paidGold: Number(d.paidGold) || 0,
    paidXp: Number(d.paidXp) || 0,
    parentDecision: d.parentDecision === 'approved' || d.parentDecision === 'voided' ? d.parentDecision : undefined,
    createdAt: toDate(d.createdAt),
  };
}

// ---------- leitura ----------

export function subscribeBooks(uid: string, onUpdate: (books: BookDoc[]) => void, onError?: (e: FirestoreError) => void): () => void {
  // sem orderBy: dispensa índice composto (ordena no cliente)
  const q = query(collection(db, 'books'), where('userId', '==', uid));
  return onSnapshot(q, (snap) => onUpdate(snap.docs.map((d) => fromBook(d.id, d.data())).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())), onError);
}

export function subscribeBookReports(uid: string, onUpdate: (reports: BookReportDoc[]) => void, onError?: (e: FirestoreError) => void): () => void {
  const q = query(collection(db, 'bookReports'), where('userId', '==', uid));
  return onSnapshot(q, (snap) => onUpdate(snap.docs.map((d) => fromReport(d.id, d.data())).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())), onError);
}

export async function listBooks(uid: string): Promise<BookDoc[]> {
  const snap = await getDocs(query(collection(db, 'books'), where('userId', '==', uid)));
  return snap.docs.map((d) => fromBook(d.id, d.data()));
}

export async function listBookReports(uid: string): Promise<BookReportDoc[]> {
  const snap = await getDocs(query(collection(db, 'bookReports'), where('userId', '==', uid)));
  return snap.docs.map((d) => fromReport(d.id, d.data())).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ---------- cadastro ----------

/** O pai cadastra; a criança propõe (addedBy 'child', e o gold só sai com o pai aprovando). */
export async function addBook(uid: string, input: { title: string; pages: number; addedBy: 'parent' | 'child'; gold?: number; today?: string }): Promise<string> {
  const title = input.title.trim().slice(0, 80);
  if (title.length < 3) throw new Error('Título muito curto');
  const pages = Math.max(1, Math.min(2000, Math.floor(Number(input.pages) || 0)));
  if (!pages) throw new Error('Diz quantas páginas tem');
  const titleKey = titleKeyOf(title);
  const existing = await listBooks(uid);
  if (existing.some((b) => b.titleKey === titleKey)) throw new Error('Esse livro já está na estante');
  const ref = doc(collection(db, 'books'));
  await setDoc(ref, {
    userId: uid,
    familyId: FAMILY_ID,
    title,
    titleKey,
    pages,
    size: sizeForPages(pages),
    ...(input.addedBy === 'parent' && normalizeBookGold(input.gold) ? { gold: normalizeBookGold(input.gold) } : {}),
    addedOn: input.today ?? getTodayBrazil(),
    addedBy: input.addedBy,
    status: 'to_read',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Pai define quanto o livro vale (1-100 gold); null volta ao valor pelo tamanho. */
export async function setBookGold(bookId: string, gold: number | null): Promise<void> {
  const g = gold == null ? null : normalizeBookGold(gold);
  if (gold != null && !g) throw new Error(`Valor de 1 a ${BOOK_GOLD_MAX} gold`);
  await updateDoc(doc(db, 'books', bookId), { gold: g, updatedAt: serverTimestamp() });
}

export async function setParentReply(bookId: string, reply: string): Promise<void> {
  await updateDoc(doc(db, 'books', bookId), { parentReply: reply.trim().slice(0, 240), updatedAt: serverTimestamp() });
}


// ---------- juiz ----------

export async function judgeBook(input: { title: string; pages: number; text: string; age: number; days: number; signal?: AbortSignal }): Promise<BookJudge | null> {
  const { system, user } = buildBookJudgePrompt(input);
  const raw = await callOpenAI(system, user, 700, { model: BOOK_JUDGE_MODEL, temperature: 0.2, signal: input.signal, timeoutMs: 45_000 });
  return parseBookJudge(raw, BOOK_JUDGE_MODEL);
}

export async function verifyBookAnswer(input: { title: string; question: string; expected: string; answer: string; text?: string; signal?: AbortSignal }): Promise<{ ok: boolean; motivo: string } | null> {
  const { system, user } = buildVerifyPrompt(input);
  const raw = await callOpenAI(system, user, 160, { model: BOOK_VERIFY_MODEL, temperature: 0, signal: input.signal, timeoutMs: 30_000 });
  return parseVerify(raw);
}

// ---------- relato e pagamento ----------

export interface ReportInput {
  bookId: string;
  title: string;
  titleKey: string;
  liked: 0 | 1 | 2 | 3;
  rating: number | null;
  text: string;
  words: number;
  typedMs: number;
  pasted: boolean;
  attempt: number;
  date: string;
  readingDays: number;
  judge?: BookJudge;
  verify?: BookVerify;
  verdict: BookVerdict;
  accepted: boolean;
  needsParent: boolean;
  flagged: boolean;
}

export async function saveBookReport(uid: string, input: ReportInput): Promise<string> {
  const ref = doc(collection(db, 'bookReports'));
  await setDoc(ref, omitUndefined({
    ...input,
    userId: uid,
    familyId: FAMILY_ID,
    paidGold: 0,
    paidXp: 0,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

/**
 * Paga um relato aceito: claims `book:<titleKey>` (uma vez por livro) e `bookday:<data>` (um por dia),
 * gold do livro (valor do pai ou pelo tamanho) + XP, linha no extrato, livro marcado como lido, stat booksRead.
 * Idempotente: se qualquer um dos dois claims já existe, não paga.
 */
export async function payBookReport(uid: string, reportId: string, book: Pick<BookDoc, 'id' | 'titleKey' | 'size' | 'title' | 'gold'>, date: string): Promise<{ paid: boolean; gold: number; xp: number; reason?: 'book' | 'day' }> {
  const gold = goldForBook(book);
  const xp = BOOK_XP;
  const keyBook = claimKeyForBook(book.titleKey);
  const keyDay = claimKeyForBookDay(date);
  let outcome: { paid: boolean; gold: number; xp: number; reason?: 'book' | 'day' } = { paid: false, gold, xp };
  await runTransaction(db, async (tx) => {
    const vRef = doc(db, 'village', uid);
    const pRef = doc(db, 'progress', uid);
    const bRef = doc(db, 'books', book.id);
    const rRef = doc(db, 'bookReports', reportId);
    const vSnap = await tx.get(vRef);
    const pSnap = await tx.get(pRef);
    const claimed = (vSnap.data()?.claimed || {}) as Record<string, string>;
    if (claimed[keyBook]) { outcome = { paid: false, gold, xp, reason: 'book' }; return; }
    if (claimed[keyDay]) { outcome = { paid: false, gold, xp, reason: 'day' }; return; }
    if (!vSnap.exists() || !pSnap.exists()) throw new Error('O bolso do minerador não apareceu.');
    const goldBefore = Number(pSnap.data()?.availableGold) || 0;
    const goldAfter = goldBefore + gold;
    const now = new Date().toISOString();
    tx.update(vRef, {
      [`claimed.${keyBook}`]: now,
      [`claimed.${keyDay}`]: now,
      'stats.booksRead': increment(1),
      updatedAt: serverTimestamp(),
    });
    tx.update(pRef, {
      totalXP: increment(xp),
      availableGold: goldAfter,
      totalGoldEarned: increment(gold),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'goldTransactions')), {
      userId: uid,
      amount: gold,
      type: 'earned',
      source: 'book_report',
      description: `Livro: ${book.title}`,
      metadata: { bookId: book.id, reportId, titleKey: book.titleKey, size: book.size },
      balanceBefore: goldBefore,
      balanceAfter: goldAfter,
      createdAt: serverTimestamp(),
    });
    tx.update(bRef, { status: 'done', doneOn: date, updatedAt: serverTimestamp() });
    tx.update(rRef, { paidGold: gold, paidXp: xp, accepted: true, updatedAt: serverTimestamp() });
    outcome = { paid: true, gold, xp };
  });
  return outcome;
}

/** Pai aprova um relato que o Sábio recusou (ou um livro proposto pela criança): paga pelo mesmo caminho. */
export async function parentApproveReport(uid: string, reportId: string): Promise<{ paid: boolean; gold: number; reason?: 'book' | 'day' }> {
  const rSnap = await getDoc(doc(db, 'bookReports', reportId));
  if (!rSnap.exists()) throw new Error('Relato não encontrado');
  const report = fromReport(rSnap.id, rSnap.data());
  const bSnap = await getDoc(doc(db, 'books', report.bookId));
  if (!bSnap.exists()) throw new Error('Livro não encontrado');
  const book = fromBook(bSnap.id, bSnap.data());
  const out = await payBookReport(uid, reportId, book, report.date);
  await updateDoc(doc(db, 'bookReports', reportId), { parentDecision: 'approved', needsParent: false, updatedAt: serverTimestamp() });
  return out;
}

/** Pai anula um relato pago: estorna o gold (não o XP), libera o livro e o dia. */
export async function parentVoidReport(uid: string, reportId: string): Promise<void> {
  const rSnap = await getDoc(doc(db, 'bookReports', reportId));
  if (!rSnap.exists()) throw new Error('Relato não encontrado');
  const report = fromReport(rSnap.id, rSnap.data());
  await runTransaction(db, async (tx) => {
    const vRef = doc(db, 'village', uid);
    const pRef = doc(db, 'progress', uid);
    const pSnap = await tx.get(pRef);
    const goldBefore = Number(pSnap.data()?.availableGold) || 0;
    const back = Math.min(goldBefore, report.paidGold);
    if (report.paidGold > 0) {
      tx.update(pRef, { availableGold: goldBefore - back, updatedAt: serverTimestamp() });
      tx.set(doc(collection(db, 'goldTransactions')), {
        userId: uid,
        amount: -back,
        type: 'adjustment',
        source: 'book_report',
        description: `Livro anulado: ${report.title}`,
        metadata: { reportId, titleKey: report.titleKey },
        balanceBefore: goldBefore,
        balanceAfter: goldBefore - back,
        createdAt: serverTimestamp(),
      });
    }
    tx.update(vRef, {
      [`claimed.${claimKeyForBook(report.titleKey)}`]: null,
      [`claimed.${claimKeyForBookDay(report.date)}`]: null,
      updatedAt: serverTimestamp(),
    });
    if (report.bookId) tx.update(doc(db, 'books', report.bookId), { status: 'to_read', doneOn: null, updatedAt: serverTimestamp() });
    tx.update(doc(db, 'bookReports', reportId), { parentDecision: 'voided', accepted: false, paidGold: 0, needsParent: false, updatedAt: serverTimestamp() });
  });
}
