// ========================================
// Arena de Inglês, A Base (seções 4.8 e 6)
//   englishPlans/{uid_date}  -> plano do dia: lease de geração, contratos por id + order, resultados
//   englishBase/{uid}        -> materiais, construções, andaime, vocabulário, dias jogados
//   englishSessions          -> uma linha por contrato concluído (game = tipo do contrato)
// XP/gold não são aplicados aqui: o serviço devolve os valores e a tela (ContractShell)
// chama adjustUserXP/adjustUserGold + createGoldTransaction, como nos outros jogos.
// ========================================

import { arrayUnion, collection, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { BaseDoc, BuildingId, Contract, ContractOutcome, ContractResult, DailyPlan, Material, MaterialCount, PlanSource, ScaffoldStage } from '../types/english';
import { BUILDINGS, MATERIALS, baseLevel, buildingCost, buildingOpensLater, canAfford, initialBaseDoc, isBuildingUnlocked, missingMaterials } from '../config/englishBase';
import { DEFAULT_ECONOMY } from '../config/village';
import { getSettings } from './settingsService';
import { MAX_MATERIAL, REWARDED_OTHER_SLOTS, applyFurnaceBonus, applyPickaxeBonus, buildXp, rewardFor } from '../config/englishRewards';
import { cracksOf, isBroken, liveBuildingLevel, ruinUseError } from './village/repair';
import { VERB_LEMMAS } from '../config/englishLevels';
import { nextScaffoldStage } from './english/scoring';
import { normalizedTokens } from './english/notePrecheck';
import { assertAiBudget, buildDailyContracts, regenerateSingle } from './englishAi';
import { prefetchAudio } from './englishTts';
import { addDays } from './dailyQuizService';
import { getTodayBrazil } from '../utils/timezone';

/** Lease de geração: outra aba só assume depois disso */
const LEASE_MS = 3 * 60_000;
const PLAN_SIZE = 5;
/** Tentativas de pegar o lease / esperar outra aba antes de desistir */
const WAIT_ATTEMPTS = 3;
/** Planos anteriores lidos na geração (nomes, gêneros, etiquetas, reserva sem repetir em 14 dias) */
const RECENT_LOOKBACK_DAYS = 15;
/** "Gerar próximos 7 dias": hoje..hoje+7 */
const UPCOMING_MAX_DAYS = 7;
const THEME_REQUEST_MAX = 30;

export const planId = (uid: string, date: string): string => `${uid}_${date}`;

export interface CompleteResult {
  xp: number;
  gold: number;
  rewarded: boolean;
  /** Material recebido, já com o bônus da Fornalha */
  materialEarned: number;
  material: Material;
  /** Construções cujo custo passou a fechar com este contrato */
  unlockedBuildings: BuildingId[];
}

// ---------- utilitários ----------

const nowIso = (): string => new Date().toISOString();
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

/** Cópia de FirestoreService.omitUndefined (função interna de lá): Firestore rejeita undefined */
function omitUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

/** omitUndefined em profundidade (resultados trazem details/correction aninhados); instâncias (FieldValue) passam intactas */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripUndefined(v)) as unknown as T;
  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    const clean = omitUndefined(value);
    return Object.fromEntries(Object.entries(clean).map(([k, v]) => [k, stripUndefined(v)])) as T;
  }
  return value;
}

const planRef = (uid: string, date: string) => doc(db, 'englishPlans', planId(uid, date));
const baseRef = (uid: string) => doc(db, 'englishBase', uid);

const hasDone = (plan: DailyPlan): boolean => Object.values(plan.contracts).some((c) => c.status === 'done');

function leaseActive(plan: DailyPlan): boolean {
  if (plan.status !== 'generating' || !plan.generatingAt) return false;
  const at = Date.parse(plan.generatingAt);
  return Number.isFinite(at) && Date.now() - at < LEASE_MS;
}

// ---------- parsers ----------

const PLAN_SOURCES: PlanSource[] = ['ai', 'offline', 'mixed'];

export function fromPlanDoc(id: string, data: Record<string, unknown>): DailyPlan {
  const rawContracts = isRecord(data.contracts) ? data.contracts : {};
  const contracts: Record<string, Contract> = {};
  for (const [key, value] of Object.entries(rawContracts)) {
    if (isRecord(value) && typeof value.type === 'string' && isRecord(value.content)) contracts[key] = value as unknown as Contract;
  }
  const order = strArray(data.order).filter((k) => k in contracts);
  for (const key of Object.keys(contracts)) if (!order.includes(key)) order.push(key);
  const source = data.source as PlanSource;
  return {
    id,
    userId: str(data.userId),
    date: str(data.date),
    level: num(data.level, 1),
    status: data.status === 'ready' ? 'ready' : 'generating',
    generatingAt: strOrNull(data.generatingAt),
    order,
    contracts,
    rewardedIds: strArray(data.rewardedIds),
    generatedAt: strOrNull(data.generatedAt),
    source: PLAN_SOURCES.includes(source) ? source : 'ai',
    reviewedByParent: data.reviewedByParent === true,
    themeRequest: strOrNull(data.themeRequest),
  };
}

export function fromBaseDoc(uid: string, data: Record<string, unknown>): BaseDoc {
  const initial = initialBaseDoc(uid, nowIso());
  const materials = { ...initial.materials };
  const rawMaterials = isRecord(data.materials) ? data.materials : {};
  for (const m of MATERIALS) materials[m] = Math.max(0, num(rawMaterials[m]));
  const buildings = { ...initial.buildings };
  const rawBuildings = isRecord(data.buildings) ? data.buildings : {};
  for (const b of BUILDINGS) buildings[b.id] = Math.max(0, num(rawBuildings[b.id]));
  const vocab: BaseDoc['vocab'] = {};
  const rawVocab = isRecord(data.vocab) ? data.vocab : {};
  for (const [lemma, v] of Object.entries(rawVocab)) {
    if (isRecord(v)) vocab[lemma] = { seen: num(v.seen), lastDate: str(v.lastDate) };
  }
  const stage = num(data.scaffoldStage);
  return {
    userId: uid,
    level: Math.min(3, Math.max(1, Math.round(num(data.level, 1)))),
    materials,
    buildings,
    scaffoldStage: (stage >= 2 ? 2 : stage >= 1 ? 1 : 0) as ScaffoldStage,
    noteStreak3: num(data.noteStreak3),
    vocab,
    contractsDone: num(data.contractsDone),
    daysPlayed: num(data.daysPlayed),
    streakDays: num(data.streakDays),
    lastPlayedDate: str(data.lastPlayedDate),
    themeRequest: strOrNull(data.themeRequest),
    updatedAt: str(data.updatedAt) || initial.updatedAt,
  };
}

// ---------- leitura e assinaturas ----------

export async function getPlan(uid: string, date: string): Promise<DailyPlan | null> {
  const snap = await getDoc(planRef(uid, date));
  return snap.exists() ? fromPlanDoc(snap.id, snap.data()) : null;
}

/** Base da criança; cria o documento inicial (Fornalha pela metade) quando não existe */
export async function ensureBase(uid: string): Promise<BaseDoc> {
  const ref = baseRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return fromBaseDoc(uid, snap.data());
  const initial = initialBaseDoc(uid, nowIso());
  await runTransaction(db, async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists()) tx.set(ref, initial);
  });
  const after = await getDoc(ref);
  return after.exists() ? fromBaseDoc(uid, after.data()) : initial;
}

export function subscribePlan(uid: string, date: string, onChange: (p: DailyPlan | null) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    planRef(uid, date),
    (snap) => onChange(snap.exists() ? fromPlanDoc(snap.id, snap.data()) : null),
    (e) => onError?.(e)
  );
}

const creatingBase = new Set<string>();

/** Assina a base; sem documento, entrega o estado inicial na hora e cria o doc (uma vez por aba) */
export function subscribeBase(uid: string, onChange: (b: BaseDoc) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    baseRef(uid),
    (snap) => {
      if (snap.exists()) {
        onChange(fromBaseDoc(uid, snap.data()));
        return;
      }
      onChange(initialBaseDoc(uid, nowIso()));
      // Só cria quando o servidor confirmou a ausência (o cache vazio não prova nada)
      if (snap.metadata.fromCache || creatingBase.has(uid)) return;
      creatingBase.add(uid);
      ensureBase(uid)
        .catch((e: Error) => onError?.(e))
        .finally(() => creatingBase.delete(uid));
    },
    (e) => onError?.(e)
  );
}

/** Últimos `days` planos contando de `today` para trás (inclui `today`), do mais recente ao mais antigo; por id, sem índice */
export async function getRecentPlans(uid: string, today: string, days: number): Promise<DailyPlan[]> {
  const dates = Array.from({ length: Math.max(0, days) }, (_, i) => addDays(today, -i));
  const snaps = await Promise.all(dates.map((d) => getDoc(planRef(uid, d))));
  return snaps.filter((s) => s.exists()).map((s) => fromPlanDoc(s.id, s.data() as Record<string, unknown>));
}

// ---------- geração com lease ----------

type LeaseResult =
  | { kind: 'acquired'; token: string; previous: Record<string, number> }
  | { kind: 'ready'; plan: DailyPlan }
  | { kind: 'busy' };

function skeleton(uid: string, date: string, level: number, token: string): Record<string, unknown> {
  return {
    userId: uid,
    date,
    level,
    status: 'generating',
    generatingAt: token,
    order: [],
    contracts: {},
    rewardedIds: [],
    generatedAt: null,
    source: 'ai',
    reviewedByParent: false,
    themeRequest: null,
  };
}

/**
 * Transação do lease: cria o doc em 'generating' se não existe, assume se o lease de 3 min
 * venceu; 'busy' enquanto outra aba gera; 'ready' quando já está pronto. Com force, assume
 * mesmo pronto (regeneração), desde que nenhum contrato tenha sido concluído.
 */
async function acquireLease(uid: string, date: string, level: number, force: boolean): Promise<LeaseResult> {
  const ref = planRef(uid, date);
  return runTransaction(db, async (tx): Promise<LeaseResult> => {
    const snap = await tx.get(ref);
    const token = nowIso();
    if (!snap.exists()) {
      tx.set(ref, skeleton(uid, date, level, token));
      return { kind: 'acquired', token, previous: {} };
    }
    const plan = fromPlanDoc(snap.id, snap.data());
    if (!force) {
      if (plan.status === 'ready') return { kind: 'ready', plan };
      if (leaseActive(plan)) return { kind: 'busy' };
    } else if (hasDone(plan)) {
      throw new Error('Este plano já tem contrato concluído e não pode ser regenerado.');
    }
    // As versões antigas seguem subindo para uma tela com o contrato anterior não concluir por cima
    const previous = Object.fromEntries(Object.values(plan.contracts).map((c) => [c.id, c.version]));
    tx.update(ref, { status: 'generating', generatingAt: token, level, order: [], contracts: {}, rewardedIds: [] });
    return { kind: 'acquired', token, previous };
  });
}

async function releaseLease(uid: string, date: string, token: string): Promise<void> {
  const ref = planRef(uid, date);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().generatingAt === token) tx.update(ref, { generatingAt: null });
  });
}

/** Espera outra aba terminar: resolve com o plano pronto, ou null se o lease sumiu/venceu */
function waitForPlan(uid: string, date: string, onProgress?: (ready: number, total: number) => void): Promise<DailyPlan | null> {
  return new Promise((resolve) => {
    let done = false;
    let unsubscribe = () => {};
    const finish = (plan: DailyPlan | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(plan);
    };
    const timer = setTimeout(() => finish(null), LEASE_MS + 5_000);
    unsubscribe = onSnapshot(
      planRef(uid, date),
      (snap) => {
        if (!snap.exists()) return finish(null);
        const plan = fromPlanDoc(snap.id, snap.data());
        if (plan.status === 'ready') return finish(plan);
        onProgress?.(Object.keys(plan.contracts).length, PLAN_SIZE);
        if (!leaseActive(plan)) finish(null);
      },
      () => finish(null)
    );
  });
}

/** Frases do contrato para a pré-busca do áudio (Comerciante por passo; Carta e Ferraria por frase) */
function audioTextsOf(contract: Contract): string[] {
  switch (contract.type) {
    case 'merchant':
      return contract.content.sentences;
    case 'letter':
      return (contract.content.text.match(/[^.!?\n]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
    case 'forge':
      return contract.content.items.map((item) => {
        if (item.kind === 'scramble') return item.answer;
        if (item.kind === 'gap') return item.sentence.replace('___', item.options[item.answer] ?? '');
        return item.sentence.replace('___', item.accepted[0] ?? '');
      });
    case 'note':
      return [];
  }
}

/** Pré-busca só para hoje e amanhã: gerar 7 dias no painel não dispara dezenas de TTS */
function prefetchPlanAudio(plan: Pick<DailyPlan, 'date' | 'contracts'>): void {
  const today = getTodayBrazil();
  if (plan.date < today || plan.date > addDays(today, 1)) return;
  prefetchAudio(Object.values(plan.contracts).flatMap(audioTextsOf));
}

/**
 * Gera os 5 contratos e fecha o plano como 'ready'. Cada contrato pronto entra no doc na
 * hora (a tela mostra "3/5"). O commit final confere o token do lease: se outra aba assumiu,
 * devolve null. Em erro, solta o lease e relança.
 */
async function generateInto(
  uid: string,
  date: string,
  token: string,
  previous: Record<string, number>,
  base: BaseDoc,
  onProgress?: (ready: number, total: number) => void
): Promise<DailyPlan | null> {
  const ref = planRef(uid, date);
  const withVersion = (c: Contract): Contract => ({ ...c, version: (previous[c.id] ?? 0) + 1 });
  // Gravações parciais em andamento: o commit final espera por elas para a transação não
  // ler o doc e vê-lo mudar antes de gravar (failed-precondition + retentativa do SDK)
  const partialWrites: Promise<void>[] = [];
  try {
    await assertAiBudget();
    const recentPlans = await getRecentPlans(uid, date, RECENT_LOOKBACK_DAYS);
    const built = await buildDailyContracts({
      uid,
      date,
      level: base.level,
      base,
      recentPlans,
      onProgress,
      onContract: (c) => {
        partialWrites.push(
          updateDoc(ref, { [`contracts.${c.id}`]: stripUndefined(withVersion(c)), order: arrayUnion(c.id) }).catch((e) =>
            console.warn('englishBase: falha ao gravar contrato parcial', e)
          )
        );
      },
    });
    await Promise.all(partialWrites);
    const contracts = Object.fromEntries(Object.entries(built.contracts).map(([id, c]) => [id, withVersion(c)]));
    const generatedAt = nowIso();
    const committed = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data().generatingAt !== token) return false;
      tx.update(ref, {
        status: 'ready',
        generatingAt: null,
        generatedAt,
        level: base.level,
        order: built.order,
        contracts: stripUndefined(contracts),
        rewardedIds: [],
        source: built.source,
        themeRequest: built.themeRequest,
      });
      return true;
    });
    if (!committed) return null;
    // O pedido da Mesa vale para um dia só: consumido, sai da base
    if (built.themeRequest && base.themeRequest === built.themeRequest) {
      await updateDoc(baseRef(uid), { themeRequest: null, updatedAt: nowIso() }).catch(() => undefined);
    }
    prefetchPlanAudio({ date, contracts });
    return {
      id: planId(uid, date),
      userId: uid,
      date,
      level: base.level,
      status: 'ready',
      generatingAt: null,
      order: built.order,
      contracts,
      rewardedIds: [],
      generatedAt,
      source: built.source,
      reviewedByParent: false,
      themeRequest: built.themeRequest,
    };
  } catch (error) {
    await releaseLease(uid, date, token).catch(() => undefined);
    throw error;
  }
}

const inFlight = new Map<string, Promise<DailyPlan>>();

async function ensurePlanInner(uid: string, date: string, onProgress?: (ready: number, total: number) => void): Promise<DailyPlan> {
  const existing = await getPlan(uid, date);
  if (existing?.status === 'ready') return existing;
  for (let attempt = 0; attempt < WAIT_ATTEMPTS; attempt++) {
    const base = await ensureBase(uid);
    const lease = await acquireLease(uid, date, base.level, false);
    if (lease.kind === 'ready') return lease.plan;
    if (lease.kind === 'busy') {
      const waited = await waitForPlan(uid, date, onProgress);
      if (waited) return waited;
      continue;
    }
    const plan = await generateInto(uid, date, lease.token, lease.previous, base, onProgress);
    if (plan) return plan;
    // Outra aba assumiu no meio: fica com o resultado dela
    const waited = await waitForPlan(uid, date, onProgress);
    if (waited) return waited;
  }
  throw new Error('Não deu para gerar o plano do dia agora. Tente de novo em instantes.');
}

/**
 * Garante o plano do dia: devolve o pronto; senão pega o lease (ou espera a aba que já
 * gera) e gera os 5 contratos. Idempotente; chamadas simultâneas na mesma aba compartilham
 * a mesma promessa.
 */
export function ensureDailyPlan(uid: string, date: string, opts?: { onProgress?: (ready: number, total: number) => void }): Promise<DailyPlan> {
  const key = planId(uid, date);
  const running = inFlight.get(key);
  if (running) return running;
  const task = ensurePlanInner(uid, date, opts?.onProgress).finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

/** Regenera um plano inteiro (nível novo ou pedido da Mesa); recusa quando há contrato concluído */
async function regeneratePlan(uid: string, date: string): Promise<DailyPlan> {
  const key = planId(uid, date);
  const running = inFlight.get(key);
  if (running) await running.catch(() => undefined);
  const task = (async () => {
    const base = await ensureBase(uid);
    const lease = await acquireLease(uid, date, base.level, true);
    if (lease.kind !== 'acquired') throw new Error('Não foi possível assumir a regeneração do plano.');
    const plan = await generateInto(uid, date, lease.token, lease.previous, base);
    if (!plan) throw new Error('Outra aba assumiu a geração deste plano.');
    return plan;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

// ---------- conclusão de contrato ----------

const VERB_SET = new Set(VERB_LEMMAS);
/** Palavras do banco que não são vocabulário novo (funcionais e números) */
const FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'and', 'but', 'or', 'for', 'in', 'on', 'under', 'next', 'to', 'of', 'with', 'at', 'from', 'is', 'are', 'am',
  'was', 'were', 'be', 'it', 'they', 'them', 'he', 'she', 'we', 'you', 'i', 'my', 'your', 'his', 'her', 'our', 'their', 'this',
  'that', 'these', 'those', 'there', 'here', 'please', 'can', 'not', 'no', 'yes', 'some', 'any', 'because', 'so', 'very', 'now',
  'then', 'also', 'too', 'do', 'does', 'me', 'us', 'him', 'how', 'many', 'what', 'where', 'who', 'why', 'when', 'must',
]);

const clampMaterial = (n: number): MaterialCount => Math.max(0, Math.min(MAX_MATERIAL, Math.floor(num(n)))) as MaterialCount;

/** Lemas que entram em vocab: glossário lido, itens pedidos pelo Comerciante, substantivos do banco usados no Recado */
function lemmasOf(contract: Contract, outcome: ContractOutcome): string[] {
  switch (contract.type) {
    case 'letter': {
      const details = outcome.details ?? {};
      const read = strArray(details.glossaryRead ?? details.glossaryHovers);
      const list = read.length ? read : contract.content.glossary.map((g) => g.en);
      return list.map((w) => w.trim().toLowerCase()).filter(Boolean);
    }
    case 'merchant':
      return contract.content.steps.map((s) => s.item);
    case 'note': {
      const used = new Set(normalizedTokens(outcome.answer ?? ''));
      return contract.content.wordBank
        .map((w) => w.trim().toLowerCase())
        .filter((w) => {
          const token = normalizedTokens(w)[0];
          return Boolean(token) && used.has(token) && !VERB_SET.has(w) && !FUNCTION_WORDS.has(w) && !/\d/.test(w);
        });
    }
    case 'forge':
      return [];
  }
}

/** Dia jogado: tochas só sobem (dia seguido soma; depois de um buraco a fileira fica e volta a subir no próximo dia seguido) */
function playedDay(base: BaseDoc, today: string): Pick<BaseDoc, 'daysPlayed' | 'streakDays' | 'lastPlayedDate'> {
  if (base.lastPlayedDate === today) return { daysPlayed: base.daysPlayed, streakDays: base.streakDays, lastPlayedDate: today };
  const consecutive = base.lastPlayedDate === addDays(today, -1) || base.streakDays === 0;
  return { daysPlayed: base.daysPlayed + 1, streakDays: consecutive ? base.streakDays + 1 : base.streakDays, lastPlayedDate: today };
}

const affordableIds = (base: BaseDoc): BuildingId[] => BUILDINGS.map((b) => b.id).filter((id) => canBuild(base, id).ok);

/**
 * Transação única da conclusão: exige plano 'ready', contrato 'open' e a mesma versão;
 * decide a vaga premiada (Recado sempre; mais os 2 primeiros outros com material > 0;
 * refazer nunca premia), soma o material (Fornalha n1 no primeiro do dia + picareta forjada, teto 3),
 * atualiza vocab, andaime, contadores e dias jogados, grava o resultado e a sessão.
 */
export async function completeContract(
  uid: string,
  date: string,
  contractId: string,
  version: number,
  outcome: ContractOutcome,
  durationSec: number
): Promise<CompleteResult> {
  const pRef = planRef(uid, date);
  const bRef = baseRef(uid);
  const sessionRef = doc(collection(db, 'englishSessions'));
  const today = getTodayBrazil();
  const finishedAt = nowIso();
  let out: CompleteResult | null = null;

  await runTransaction(db, async (tx) => {
    const [planSnap, baseSnap, vSnap] = await Promise.all([
      tx.get(pRef),
      tx.get(bRef),
      tx.get(doc(db, 'village', uid)),
    ]);
    if (!planSnap.exists()) throw new Error('Plano do dia não encontrado.');
    const plan = fromPlanDoc(planSnap.id, planSnap.data());
    if (plan.status !== 'ready') throw new Error('O plano ainda está sendo gerado.');
    const contract = plan.contracts[contractId];
    if (!contract) throw new Error('Contrato não encontrado.');
    if (contract.status !== 'open') throw new Error('Este contrato já foi concluído.');
    if (contract.version !== version) throw new Error('Este contrato foi atualizado; abra o quadro de novo.');
    const base = baseSnap.exists() ? fromBaseDoc(uid, baseSnap.data()) : initialBaseDoc(uid, finishedAt);

    const cracks = cracksOf(vSnap.data()?.cracks);
    const firstOfDay = !hasDone(plan);
    const pickaxe = Math.max(0, Math.min(4, Math.round(Number(vSnap.data()?.gear?.pickaxe) || 0)));
    const doneToday = Object.values(plan.contracts).filter((c) => c.status === 'done').length;
    const material = applyPickaxeBonus(
      applyFurnaceBonus(clampMaterial(outcome.materialEarned), liveBuildingLevel(base.buildings, cracks, 'fornalha'), firstOfDay),
      pickaxe,
      doneToday
    );
    const othersRewarded = plan.rewardedIds.filter((id) => plan.contracts[id]?.type !== 'note').length;
    const slotFree = contract.type === 'note' || othersRewarded < REWARDED_OTHER_SLOTS;
    const rewarded = material > 0 && !contract.retryUsed && slotFree;
    const { xp, gold } = rewardFor(contract.type, material, rewarded);
    const rewardedIds = rewarded && !plan.rewardedIds.includes(contractId) ? [...plan.rewardedIds, contractId] : plan.rewardedIds;
    const result: ContractResult = { ...outcome, materialEarned: material, rewarded, xp, gold, durationSec, finishedAt };

    const materials = { ...base.materials, [contract.material]: base.materials[contract.material] + material };
    // Recado no estágio 2: a "Dica" custa 1 ferro (a tela só a libera com ferro em caixa)
    if (contract.type === 'note' && outcome.details?.hintUsed === true) materials.ferro = Math.max(0, materials.ferro - 1);
    const vocab = { ...base.vocab };
    for (const lemma of new Set(lemmasOf(contract, outcome))) {
      vocab[lemma] = { seen: (vocab[lemma]?.seen ?? 0) + 1, lastDate: date };
    }
    const scaffold =
      contract.type === 'note'
        ? nextScaffoldStage(base.scaffoldStage, base.noteStreak3, outcome.correction?.score ?? outcome.score)
        : { scaffoldStage: base.scaffoldStage, noteStreak3: base.noteStreak3 };
    const nextBase: BaseDoc = {
      ...base,
      materials,
      vocab,
      ...scaffold,
      ...playedDay(base, today),
      contractsDone: base.contractsDone + 1,
      updatedAt: finishedAt,
    };
    const before = affordableIds(base);
    const unlockedBuildings = affordableIds(nextBase).filter((id) => !before.includes(id));

    tx.update(pRef, {
      [`contracts.${contractId}.status`]: 'done',
      [`contracts.${contractId}.result`]: stripUndefined(result),
      rewardedIds,
    });
    tx.set(bRef, stripUndefined(nextBase));
    // Sem o texto do Recado: a sessão guarda só números
    tx.set(sessionRef, {
      userId: uid,
      game: contract.type,
      category: contract.theme,
      date: today,
      correct: num(outcome.score),
      total: num(outcome.max),
      score: material,
      durationSec: Math.max(0, Math.round(num(durationSec))),
      xpEarned: xp,
      goldEarned: gold,
      rewarded,
      contractId,
      planDate: date,
      material: contract.material,
      version: contract.version,
      createdAt: serverTimestamp(),
    });
    out = { xp, gold, rewarded, materialEarned: material, material: contract.material, unlockedBuildings };
  });

  if (!out) throw new Error('Falha ao concluir o contrato.');
  try {
    const { bumpChallenge } = await import('./challengesService');
    await bumpChallenge(uid, 'english_contracts', 1);
  } catch (e) {
    console.warn('desafio english_contracts', e);
  }
  try {
    const { bumpVillage, bumpFriend } = await import('./village/statsBump');
    bumpVillage(uid, { contractsDone: 1 });
    bumpFriend(uid, 'comerciante', 2);
  } catch (e) {
    console.warn('stats contrato', e);
  }
  return out;
}

/** Comerciante/Carta terminados com 0 material voltam a 'open' uma vez (só por material) */
export async function redoContract(uid: string, date: string, contractId: string): Promise<void> {
  const ref = planRef(uid, date);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Plano do dia não encontrado.');
    const plan = fromPlanDoc(snap.id, snap.data());
    const contract = plan.contracts[contractId];
    if (!contract) throw new Error('Contrato não encontrado.');
    if (contract.type !== 'merchant' && contract.type !== 'letter') throw new Error('Só o Comerciante e a Carta podem ser refeitos.');
    if (contract.status !== 'done') throw new Error('Este contrato ainda está aberto.');
    if ((contract.result?.materialEarned ?? 0) > 0) throw new Error('Refazer só vale quando o contrato terminou sem material.');
    if (contract.retryUsed) throw new Error('Este contrato já foi refeito hoje.');
    tx.update(ref, {
      [`contracts.${contractId}.status`]: 'open',
      [`contracts.${contractId}.result`]: null,
      [`contracts.${contractId}.retryUsed`]: true,
    });
  });
}

// ---------- construções ----------

export function baseLevelOf(base: BaseDoc): number {
  return baseLevel(base.buildings);
}

function nextCost(id: BuildingId, nextLevel: number, multiplier = DEFAULT_ECONOMY.buildCostMultiplier) {
  return buildingCost(id, nextLevel, multiplier);
}

function levelPrereq(base: BaseDoc, nextLevel: number, id: BuildingId): string | null {
  if (id === 'cofre' || id === 'agenda' || id === 'mercado' || id === 'cerca' || id === 'fornalha' || id === 'bau') {
    return null;
  }
  if (nextLevel >= 2 && (base.buildings.fornalha < 1 || base.buildings.bau < 1 || base.buildings.cerca < 1)) {
    return 'Precisa da Fornalha, do Armazém e da Cerca no nível 1';
  }
  if (nextLevel >= 3 && (base.buildings.fornalha < 2 || base.buildings.bau < 2 || base.buildings.cerca < 2)) {
    return 'Precisa da Fornalha, do Armazém e da Cerca no nível 2';
  }
  return null;
}

/** Pode construir o próximo nível? Traz o que falta de cada material (só os > 0) */
export function canBuild(base: BaseDoc, id: BuildingId, multiplier = DEFAULT_ECONOMY.buildCostMultiplier): {
  ok: boolean;
  missing: Partial<Record<Material, number>>;
  nextLevel: number;
  unlocked: boolean;
  later: string | null;
} {
  const nextLevel = (base.buildings[id] ?? 0) + 1;
  const unlocked = isBuildingUnlocked(id, base.buildings);
  const later = buildingOpensLater(id, nextLevel) || levelPrereq(base, nextLevel, id);
  const cost = nextCost(id, nextLevel, multiplier);
  if (!cost) return { ok: false, missing: {}, nextLevel, unlocked, later };
  const gap = missingMaterials(base.materials, cost);
  const missing: Partial<Record<Material, number>> = {};
  for (const m of MATERIALS) if (gap[m] > 0) missing[m] = gap[m];
  return {
    ok: !later && unlocked && canAfford(base.materials, cost),
    missing,
    nextLevel,
    unlocked,
    later,
  };
}

/** Valida custo e desbloqueio, debita os materiais e sobe o nível; o XP devolvido é aplicado pela tela */
export async function buildUpgrade(uid: string, buildingId: BuildingId): Promise<{ newLevel: number; xp: number }> {
  const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as { buildCostMultiplier?: number };
  const multiplier = economy.buildCostMultiplier ?? DEFAULT_ECONOMY.buildCostMultiplier;
  const ref = baseRef(uid);
  let out: { newLevel: number; xp: number } | null = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const base = snap.exists() ? fromBaseDoc(uid, snap.data()) : initialBaseDoc(uid, nowIso());
    const vSnap = await tx.get(doc(db, 'village', uid));
    if (isBroken(cracksOf(vSnap.data()?.cracks), buildingId)) throw ruinUseError(buildingId);
    const check = canBuild(base, buildingId, multiplier);
    if (check.later) throw new Error(/^(Precisa|Em breve)/.test(check.later) ? `${check.later}.` : `Abre na ${check.later}.`);
    if (!check.unlocked) {
      if (buildingId === 'cofre') throw new Error('Construa o Armazém primeiro.');
      if (buildingId === 'cerca') throw new Error('Construa a Fornalha primeiro.');
      throw new Error('Essa construção ainda está bloqueada: suba a Fornalha e o Armazém ao nível 1 primeiro.');
    }
    const cost = nextCost(buildingId, check.nextLevel, multiplier);
    if (!cost) throw new Error('Essa construção já está no nível máximo.');
    if (!check.ok) throw new Error('Faltam materiais para construir.');
    const materials = { ...base.materials };
    for (const m of MATERIALS) materials[m] -= cost[m];
    tx.set(ref, {
      ...base,
      materials,
      buildings: { ...base.buildings, [buildingId]: check.nextLevel },
      updatedAt: nowIso(),
    });
    out = { newLevel: check.nextLevel, xp: buildXp(check.nextLevel) };
  });
  if (!out) throw new Error('Falha ao construir.');
  return out;
}

/** Mesa n1: tema de amanhã (30 caracteres). Se o plano de amanhã já existe sem contrato concluído, regenera com o pedido. */
export async function setThemeRequest(uid: string, text: string | null): Promise<void> {
  const vSnap = await getDoc(doc(db, 'village', uid));
  if (isBroken(cracksOf(vSnap.data()?.cracks), 'mesa')) throw ruinUseError('mesa');
  const value = (text ?? '').trim().slice(0, THEME_REQUEST_MAX);
  const themeRequest = value || null;
  await setDoc(baseRef(uid), { userId: uid, themeRequest, updatedAt: nowIso() }, { merge: true });
  const tomorrow = addDays(getTodayBrazil(), 1);
  const plan = await getPlan(uid, tomorrow);
  if (plan && !hasDone(plan) && plan.themeRequest !== themeRequest) await regeneratePlan(uid, tomorrow);
}

// ---------- painel ----------

/** Nível 1-3; planos de hoje..hoje+7 sem contrato concluído e com outro nível são regenerados em sequência */
export async function setBaseLevel(uid: string, level: number): Promise<void> {
  const lv = Math.min(3, Math.max(1, Math.round(num(level, 1))));
  await setDoc(baseRef(uid), { userId: uid, level: lv, updatedAt: nowIso() }, { merge: true });
  const today = getTodayBrazil();
  for (let i = 0; i <= UPCOMING_MAX_DAYS; i++) {
    const date = addDays(today, i);
    const plan = await getPlan(uid, date);
    if (!plan || plan.level === lv || hasDone(plan)) continue;
    await regeneratePlan(uid, date);
  }
}

/** Regenera um contrato aberto (version + 1); o plano passa a 'mixed' quando as fontes divergem */
export async function regenerateContract(uid: string, date: string, contractId: string): Promise<void> {
  const ref = planRef(uid, date);
  const plan = await getPlan(uid, date);
  if (!plan) throw new Error('Plano não encontrado.');
  if (plan.status !== 'ready') throw new Error('O plano ainda está sendo gerado.');
  const current = plan.contracts[contractId];
  if (!current) throw new Error('Contrato não encontrado.');
  if (current.status !== 'open') throw new Error('Só contratos abertos podem ser regenerados.');
  await assertAiBudget();
  const base = await ensureBase(uid);
  const recentPlans = await getRecentPlans(uid, date, RECENT_LOOKBACK_DAYS);
  const generated = await regenerateSingle({ uid, date, level: plan.level, base, recentPlans }, plan, contractId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Plano não encontrado.');
    const fresh = fromPlanDoc(snap.id, snap.data());
    const c = fresh.contracts[contractId];
    if (!c || c.status !== 'open') throw new Error('O contrato foi concluído enquanto era regenerado.');
    const source: PlanSource = fresh.source !== 'mixed' && fresh.source !== generated.source ? 'mixed' : fresh.source;
    tx.update(ref, { [`contracts.${contractId}`]: stripUndefined(generated.contract), source });
  });
  prefetchPlanAudio({ date, contracts: { [contractId]: generated.contract } });
}

/** Garante hoje..hoje+days em sequência (máximo 7); planos prontos ficam como estão */
export async function generateUpcomingDays(uid: string, days: number, onProgress?: (done: number, total: number) => void): Promise<void> {
  const count = Math.min(UPCOMING_MAX_DAYS, Math.max(0, Math.floor(num(days))));
  const today = getTodayBrazil();
  const total = count + 1;
  onProgress?.(0, total);
  for (let i = 0; i <= count; i++) {
    await ensureDailyPlan(uid, addDays(today, i));
    onProgress?.(i + 1, total);
  }
}
