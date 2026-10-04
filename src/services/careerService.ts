// Carreira no Firestore (CONTRATOS_E_CARREIRAS.md §11.3).
// careers/{uid}: a criança lê; só o pai (admin) escreve. O progresso sai das entregas aprovadas.
// Quem abre o treino seguinte é o painel do pai (syncCareer), logo depois da aprovação,
// porque a criança nunca cria documento em assignments.

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ENGENHEIRO, trainingTemplateId, type CompetencyLevel, type RankId } from '../config/careers';
import type { TrainingDef } from '../config/engenheiroTreinos';
import type { Assignment } from '../types/assignment';
import { approveAssignment } from './assignmentsService';
import { careerSnapshot, careerTowerStats, rankIndex, type CareerActivity, type ManualLevels } from './village/career';
import { bumpVillage } from './village/statsBump';

export interface CareerState {
  startedAt: string;
  rank: RankId;
  manual: ManualLevels;
  competencies: Record<string, CompetencyLevel>;
  trainingsDone: number[];
  tools: string[];
  promotions: Record<string, string>;
  celebrate?: RankId;
  /** Link do PDF do kit, posto pelo pai. Fica aqui, e não no código, porque o PDF tem direitos autorais. */
  kitPdfUrl?: string;
}

const RANKS = new Set<RankId>(['aprendiz', 'tecnico', 'engenheiro', 'inventor']);

function defined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function fromCareer(raw: Record<string, unknown> | undefined): CareerState | null {
  const e = raw?.engenheiro as Record<string, unknown> | undefined;
  if (!e || typeof e.startedAt !== 'string') return null;
  const rank = RANKS.has(e.rank as RankId) ? (e.rank as RankId) : 'aprendiz';
  const nums = (v: unknown) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n)) : []);
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);
  return {
    startedAt: e.startedAt,
    rank,
    manual: (e.manual && typeof e.manual === 'object' ? e.manual : {}) as ManualLevels,
    competencies: (e.competencies && typeof e.competencies === 'object' ? e.competencies : {}) as Record<string, CompetencyLevel>,
    trainingsDone: nums(e.trainingsDone),
    tools: strs(e.tools),
    promotions: (e.promotions && typeof e.promotions === 'object' ? e.promotions : {}) as Record<string, string>,
    celebrate: RANKS.has(e.celebrate as RankId) ? (e.celebrate as RankId) : undefined,
    kitPdfUrl: typeof e.kitPdfUrl === 'string' && /^https:\/\//.test(e.kitPdfUrl) ? e.kitPdfUrl : undefined,
  };
}

export function subscribeCareer(uid: string, onChange: (state: CareerState | null) => void): () => void {
  return onSnapshot(
    doc(db, 'careers', uid),
    (snap) => onChange(snap.exists() ? fromCareer(snap.data()) : null),
    () => onChange(null),
  );
}

export const trainingAssignmentId = (uid: string, n: number): string => `eng_${uid}_${n}`;

function trainingBody(uid: string, t: TrainingDef, today: string) {
  const asks = t.deliveryQuestion ? [t.deliveryQuestion] : undefined;
  return defined({
    userId: uid,
    kind: 'training' as const,
    templateId: trainingTemplateId(t.n),
    specialty: 'engenheiro' as const,
    careerId: 'engenheiro' as const,
    title: `Treino ${t.n}: ${t.title}`,
    deliverable: 'Mostrar ao pai funcionando.',
    criteria: t.worksWhen,
    proof: defined({ kinds: asks ? ['inPerson', 'questions'] : ['inPerson'], questions: asks }),
    reward: { gold: 0, xp: t.xp, materials: { redstone: 1 } },
    competencies: t.competencies,
    status: 'available' as const,
    availableOn: today,
    createdBy: 'system' as const,
    submissions: [],
    reviews: [],
    drops: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** O pai começa a carreira: nasce o Laboratório e o treino 1. */
export async function startCareer(uid: string, today: string): Promise<void> {
  const ref = doc(db, 'careers', uid);
  const snap = await getDoc(ref);
  if (!fromCareer(snap.data())) {
    await setDoc(ref, {
      userId: uid,
      engenheiro: {
        startedAt: today,
        rank: 'aprendiz',
        manual: {},
        competencies: {},
        trainingsDone: [],
        tools: [],
        promotions: { aprendiz: today },
        updatedAt: serverTimestamp(),
      },
    }, { merge: true });
  }
  await ensureTraining(uid, 1, today);
}

async function ensureTraining(uid: string, n: number, today: string): Promise<void> {
  const t = ENGENHEIRO.trainings.find((x) => x.n === n);
  if (!t) return;
  const ref = doc(db, 'assignments', trainingAssignmentId(uid, n));
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, trainingBody(uid, t, today));
}

/** Entregas aprovadas que contam para a carreira, com as competências que o pai marcou. */
export function activitiesOf(rows: Assignment[]): CareerActivity[] {
  return rows
    .filter((r) => r.status === 'approved' && (r.careerId === 'engenheiro' || (r.kind === 'paid' && r.specialty === 'engenheiro')))
    .map((r) => {
      const review = [...r.reviews].reverse().find((rv) => rv.verdict === 'approved');
      return {
        id: r.id,
        kind: r.kind,
        templateId: r.templateId,
        competencies: review?.competencies?.length ? review.competencies : r.competencies,
        fixedAfterFailure: review?.fixedAfterFailure,
      };
    });
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Painel do pai: recalcula a carreira e abre os treinos liberados. Idempotente.
 * Devolve o título novo quando houve promoção.
 */
export async function syncCareer(uid: string, rows: Assignment[], state: CareerState, today: string): Promise<RankId | null> {
  const snap = careerSnapshot(ENGENHEIRO, activitiesOf(rows), state.manual, state.rank);
  const existing = new Set(rows.map((r) => r.id));
  for (const n of snap.unlocked) {
    if (!existing.has(trainingAssignmentId(uid, n))) await ensureTraining(uid, n, today);
  }
  const rose = rankIndex(snap.rank) > rankIndex(state.rank) ? snap.rank : null;
  const changed = rose
    || !same(snap.competencies, state.competencies)
    || !same(snap.trainingsDone, state.trainingsDone)
    || !same(snap.tools, state.tools);
  const acts = activitiesOf(rows);
  await bumpVillage(uid, {}, {
    set: careerTowerStats({
      approvedPaid: acts.filter((a) => a.kind === 'paid').length,
      fixed: acts.filter((a) => a.fixedAfterFailure).length,
      trainings: snap.trainingsDone,
      projects: snap.counters.projects,
      projectFixed: acts.filter((a) => a.kind === 'paid' && a.fixedAfterFailure).length,
      rank: snap.rank,
    }),
  });
  if (!changed) return null;
  await updateDoc(doc(db, 'careers', uid), defined({
    'engenheiro.rank': snap.rank,
    'engenheiro.competencies': snap.competencies,
    'engenheiro.trainingsDone': snap.trainingsDone,
    'engenheiro.tools': snap.tools,
    'engenheiro.celebrate': rose ?? undefined,
    [`engenheiro.promotions.${snap.rank}`]: rose ? today : undefined,
    'engenheiro.updatedAt': serverTimestamp(),
  }));
  return rose;
}

/** O pai guarda o link do PDF do kit. Vazio apaga. */
export async function setKitPdfUrl(uid: string, url: string): Promise<void> {
  const clean = url.trim();
  if (clean && !/^https:\/\//.test(clean)) throw new Error('O link precisa começar com https://');
  await updateDoc(doc(db, 'careers', uid), {
    'engenheiro.kitPdfUrl': clean || null,
    'engenheiro.updatedAt': serverTimestamp(),
  });
}

/** O pai ajusta uma competência que viu fora do app. "nenhum" apaga. */
export async function setManualLevel(uid: string, competencyId: string, level: CompetencyLevel | 'nenhum' | null): Promise<void> {
  await updateDoc(doc(db, 'careers', uid), {
    [`engenheiro.manual.${competencyId}`]: level ?? 'nenhum',
    'engenheiro.updatedAt': serverTimestamp(),
  });
}

/** Treino feito antes de o Laboratório abrir: o pai confirma e ele recebe XP e redstone pela aprovação normal. */
export async function markTrainingDoneOffApp(uid: string, n: number, today: string): Promise<void> {
  const t = ENGENHEIRO.trainings.find((x) => x.n === n);
  if (!t) throw new Error('Treino não encontrado.');
  const id = trainingAssignmentId(uid, n);
  const ref = doc(db, 'assignments', id);
  const snap = await getDoc(ref);
  const status = snap.exists() ? String(snap.data().status) : '';
  if (status === 'approved') return;
  const submission = {
    at: Timestamp.now(),
    proof: defined({
      kinds: t.deliveryQuestion ? ['inPerson', 'questions'] : ['inPerson'],
      answers: t.deliveryQuestion ? [{ q: t.deliveryQuestion, a: 'Mostrou ao pai fora do app.' }] : undefined,
      note: 'Feito fora do app, com o pai.',
    }),
  };
  if (!snap.exists()) {
    await setDoc(ref, { ...trainingBody(uid, t, today), status: 'submitted', submissions: [submission] });
  } else if (status !== 'submitted') {
    const prev = Array.isArray(snap.data().submissions) ? snap.data().submissions : [];
    await updateDoc(ref, { status: 'submitted', submissions: [...prev, submission], updatedAt: serverTimestamp() });
  }
  await approveAssignment(uid, id, { competencies: t.competencies, note: 'Feito fora do app.', sawItWorking: true });
}
