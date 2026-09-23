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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { BuildingId, Material } from '../types/english';
import type {
  EconomySettings,
  FatherNotice,
  ModuleSettings,
  NoticeType,
  VillageCharacter,
  VillageDoc,
  VillageGear,
  VillageRare,
  VillageSettings,
  NpcId,
  NpcState,
  SeasonStar,
  TrophyTier,
  VillagePlan,
  DailyCheckinAnswers,
  GameAchievement,
} from '../types/village';
import {
  CATALOG_VERSION,
  COSMETIC_BY_ID,
  COSMETICS,
  DEFAULT_ECONOMY,
  DEFAULT_MODULES,
  DEFAULT_VILLAGE_SETTINGS,
  FREE_COSMETIC_IDS,
  GEAR_BY_ID,
  cosmeticHasSprite,
  emptyNpcs,
  initialVillageDoc,
  kidName,
  villageLabel,
} from '../config/village';
import { MATERIALS, initialBaseDoc } from '../config/englishBase';
import { MINER_MISSIONS_ACHIEVEMENTS } from '../config/villageAchievements';
import { fromBaseDoc } from './englishBaseService';
import { claimKey, hasClaim, levelGiftClaimKey, levelGiftPendingKey, rareGiftForLevel } from './village/claims';
import { chestAllowed, chestNeedLeft, dailyChestContents } from './village/chest';
import { canBuy, canCraft, priceOf, tradePreview } from './village/shop';
import { dueCompletionsCount, dueTasksOn } from './village/schedule';
import { applyMaterialRepair, canRepair, isBroken, liveBuildingLevel, repairRefund, ruinUseError } from './village/repair';
import { capGold } from './village/caps';
import { getTodayBrazil, isoWeekOf, mondayOfIsoWeek, nowBrazil, addDays, weekdayOf } from '../utils/clock';
import { getSettings } from './settingsService';
import { touchHealth } from './observability';
import { getLevelFromXP } from '../utils/levelSystem';
import { roomForGameGold, listGoldTransactions } from './goldTx';
import { weeklyStatement } from './village/bank';
import { checkinXp } from './village/checkin';
import { closeSeasonState, countWeekTorches, recordsAfterWeek, trophyOfWeek } from './village/season';
import { addVillageStats } from './village/stats';
import { achievementGoldRoom, currentOf, evaluateAchievements, materialForForgeLevel, seasonAchievementIds } from './village/achievements';
import { friendTier, talkPointsToday } from './village/dialogue';
import { tierGifts } from './village/friendship';
import { levelGift } from './village/levels';
import { GAME_ACHIEVEMENT_BY_ID } from '../data/achievements';
import { NPC_QUESTS } from '../data/npcQuests';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

function omitUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripUndefined(v)) as unknown as T;
  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    const clean = omitUndefined(value);
    return Object.fromEntries(Object.entries(clean).map(([k, v]) => [k, stripUndefined(v)])) as T;
  }
  return value;
}

const nowIso = (): string => new Date().toISOString();
function isoWeekStamp(week: string): number {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}
const villageRef = (uid: string) => doc(db, 'village', uid);
const baseRef = (uid: string) => doc(db, 'englishBase', uid);
const progressRef = (uid: string) => doc(db, 'progress', uid);

async function weekTorchRows(uid: string, week: string) {
  const monday = mondayOfIsoWeek(week);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const snaps = await Promise.all(dates.map((d) => getDoc(doc(db, 'dailyProgress', `${uid}_${d}`))));
  return snaps.map((s) => {
    if (!s.exists()) return { due: 0, done: 0 };
    const d = s.data();
    return {
      due: Number(d.totalTasksAvailable) || 0,
      done: Number(d.tasksCompleted) || 0,
      vacation: d.vacation === true,
      paused: d.paused === true,
      punished: d.punished === true,
    };
  });
}

async function weekQuizBest(uid: string, week: string): Promise<number> {
  const monday = mondayOfIsoWeek(week);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const snaps = await Promise.all(dates.map((d) => getDoc(doc(db, 'dailyQuizzes', `${uid}_${d}`))));
  return snaps.reduce((best, s) => Math.max(best, Number(s.data()?.score) || 0), 0);
}

function clampPickaxe(n: number): VillageGear['pickaxe'] {
  if (n >= 4) return 4;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  if (n >= 1) return 1;
  return 0;
}

function flag01(n: number): 0 | 1 {
  return n >= 1 ? 1 : 0;
}

function parseNpcs(raw: unknown): Record<NpcId, NpcState> {
  const base = emptyNpcs();
  if (!isRecord(raw)) return base;
  const ids: NpcId[] = ['sabio', 'comerciante', 'ferreiro', 'olheiro'];
  for (const id of ids) {
    const n = raw[id];
    if (!isRecord(n)) continue;
    const quest = isRecord(n.quest) ? n.quest : {};
    base[id] = {
      points: Math.max(0, num(n.points)),
      tier: Math.max(0, num(n.tier)),
      lastTalkDate: strOrNull(n.lastTalkDate),
      seen: strArray(n.seen),
      quest: {
        chapter: Math.max(0, num(quest.chapter)),
        progress: Math.max(0, num(quest.progress)),
        doneAt: strOrNull(quest.doneAt),
      },
    };
  }
  return base;
}

function parseStars(raw: unknown): SeasonStar[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((s) => ({
      season: num(s.season),
      level: num(s.level),
      endedOn: str(s.endedOn),
    }))
    .filter((s) => s.endedOn);
}

function parseTrophies(raw: unknown): Record<string, TrophyTier> {
  if (!isRecord(raw)) return {};
  const out: Record<string, TrophyTier> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === 'bronze' || v === 'prata' || v === 'ouro') out[k] = v;
  }
  return out;
}

function parseNumMap(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function parseStrMap(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') out[k] = v;
  return out;
}

function parsePlan(raw: unknown): VillagePlan {
  if (!isRecord(raw)) return { date: '', order: [], focusTaskId: null };
  return {
    date: str(raw.date),
    order: strArray(raw.order),
    focusTaskId: strOrNull(raw.focusTaskId),
  };
}

export function fromVillageDoc(uid: string, data: Record<string, unknown>): VillageDoc {
  const initial = initialVillageDoc(uid, nowIso());
  const rawGear = isRecord(data.gear) ? data.gear : {};
  const rawChar = isRecord(data.character) ? data.character : {};
  const rawRare = isRecord(data.rare) ? data.rare : {};
  const rawClaimed = isRecord(data.claimed) ? data.claimed : {};
  const claimed: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawClaimed)) if (typeof v === 'string') claimed[k] = v;
  const rawHabits = isRecord(data.habits) ? data.habits : {};
  const habits: VillageDoc['habits'] = {};
  for (const [k, v] of Object.entries(rawHabits)) {
    if (isRecord(v)) habits[k] = { streak: num(v.streak), lastDate: str(v.lastDate) };
  }
  const rawRecords = isRecord(data.records) ? data.records : {};
  const records: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawRecords)) if (typeof v === 'number') records[k] = v;
  const rawShield = isRecord(data.shield) ? data.shield : {};
  return {
    userId: str(data.userId, uid),
    createdAt: str(data.createdAt, initial.createdAt),
    updatedAt: str(data.updatedAt, initial.updatedAt),
    name: str(data.name, initial.name),
    characterName: str(data.characterName, initial.characterName),
    onboardedAt: strOrNull(data.onboardedAt),
    launchedOn: strOrNull(data.launchedOn),
    launchedAt: strOrNull(data.launchedAt),
    rare: {
      diamante: Math.max(0, num(rawRare.diamante)),
      esmeralda: Math.max(0, num(rawRare.esmeralda)),
    },
    gear: {
      pickaxe: clampPickaxe(num(rawGear.pickaxe)),
      helmet: flag01(num(rawGear.helmet)),
      boots: flag01(num(rawGear.boots)),
      lamp: flag01(num(rawGear.lamp)),
      cape: flag01(num(rawGear.cape)),
    },
    character: {
      skin: str(rawChar.skin, initial.character.skin),
      hair: str(rawChar.hair, initial.character.hair),
      shirt: str(rawChar.shirt, initial.character.shirt),
      pants: str(rawChar.pants, initial.character.pants),
      hat: strOrNull(rawChar.hat),
      cape: strOrNull(rawChar.cape),
      pet: strOrNull(rawChar.pet),
    },
    owned: strArray(data.owned),
    claimed,
    shield: { helmetWeek: strOrNull(rawShield.helmetWeek) },
    fullDays: Math.max(0, num(data.fullDays)),
    fullDaysStart: strOrNull(data.fullDaysStart),
    records,
    decor: strArray(data.decor),
    noticesDismissed: strArray(data.noticesDismissed),
    habits,
    season: Math.max(0, num(data.season)),
    npcs: parseNpcs(data.npcs),
    cracks: strArray(data.cracks),
    stars: parseStars(data.stars),
    trophies: parseTrophies(data.trophies),
    plan: parsePlan(data.plan),
    newItems: strArray(data.newItems),
    stats: parseNumMap(data.stats),
    achievementsUnlocked: parseStrMap(data.achievementsUnlocked),
    newAchievements: strArray(data.newAchievements),
  };
}

export async function getVillage(uid: string): Promise<VillageDoc> {
  const snap = await getDoc(villageRef(uid));
  return snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
}

export async function ensureVillage(uid: string): Promise<VillageDoc> {
  const ref = villageRef(uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) tx.set(ref, stripUndefined(initialVillageDoc(uid, nowIso())));
  });
  return getVillage(uid);
}

export function subscribeVillage(
  uid: string,
  onChange: (v: VillageDoc) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    villageRef(uid),
    (snap) => {
      if (snap.exists()) onChange(fromVillageDoc(uid, snap.data()));
      else {
        // Sem criar o doc aqui: só o VillageProvider da criança chama ensureVillage (o painel nunca cria docs dela)
        onChange(initialVillageDoc(uid, nowIso()));
      }
    },
    (e) => onError?.(e)
  );
}

export async function completeOnboarding(
  uid: string,
  input: { characterName: string; villageName: string; character: VillageCharacter }
): Promise<void> {
  await ensureVillage(uid);
  await updateDoc(villageRef(uid), stripUndefined({
    characterName: kidName(input.characterName),
    name: villageLabel(input.villageName),
    character: input.character,
    onboardedAt: nowIso(),
    updatedAt: nowIso(),
  }));
}

export async function resetOnboarding(uid: string): Promise<void> {
  await ensureVillage(uid);
  await updateDoc(villageRef(uid), { onboardedAt: null, updatedAt: nowIso() });
}

export async function resetCharacter(uid: string): Promise<void> {
  const initial = initialVillageDoc(uid, nowIso());
  await ensureVillage(uid);
  await updateDoc(villageRef(uid), stripUndefined({
    character: initial.character,
    owned: [],
    gear: initial.gear,
    updatedAt: nowIso(),
  }));
}

function pieceAllowed(village: VillageDoc, id: string | null): boolean {
  if (!id) return true;
  if (FREE_COSMETIC_IDS.includes(id)) return true;
  return village.owned.includes(id);
}

export async function saveCharacter(uid: string, character: VillageCharacter): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined(village));
    const next = { ...character };
    const fields: Array<keyof VillageCharacter> = ['skin', 'hair', 'shirt', 'pants', 'hat', 'cape', 'pet'];
    for (const f of fields) {
      const val = next[f];
      if (typeof val === 'string' && !pieceAllowed(village, val)) {
        throw new Error('Peça ainda não comprada');
      }
    }
    tx.update(villageRef(uid), stripUndefined({ character: next, updatedAt: nowIso() }));
  });
}

export async function buyCosmetic(uid: string, itemId: string): Promise<void> {
  const item = COSMETIC_BY_ID[itemId];
  if (!item) throw new Error('Item desconhecido');
  if (!cosmeticHasSprite(itemId)) throw new Error('Este item ainda não tem sprite');
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const sSnap = await tx.get(doc(db, 'settings', 'village'));
    const mSnap = await tx.get(doc(db, 'settings', 'modules'));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const settings = {
      ...DEFAULT_VILLAGE_SETTINGS,
      ...(sSnap.exists() ? (sSnap.data() as Partial<VillageSettings>) : {}),
    };
    const modules = {
      ...DEFAULT_MODULES,
      ...(mSnap.exists() ? (mSnap.data() as Partial<ModuleSettings>) : {}),
    };
    if (!settings.shopEnabled || modules.shop === false) throw new Error('A loja da Vila está desligada');
    if (isBroken(village.cracks, 'mercado')) throw ruinUseError('mercado');
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const minerLevel = getLevelFromXP(Number(pSnap.data()?.totalXP) || 0);
    const check = canBuy(village, gold, item, settings, minerLevel);
    if (!check.ok) {
      if (check.reason === 'owned') throw new Error('Você já tem este item');
      if (check.reason === 'gold') throw new Error('Gold insuficiente');
      throw new Error('Não foi possível comprar');
    }
    const price = priceOf(item, settings);
    const after = gold - price;
    if (after < 0) throw new Error('Gold insuficiente');
    const owned = village.owned.includes(itemId) ? village.owned : [...village.owned, itemId];
    const newItems = village.newItems.includes(itemId) ? village.newItems : [...village.newItems, itemId];
    const character = { ...village.character };
    if (item.slot === 'hat' || item.slot === 'cape' || item.slot === 'pet') {
      character[item.slot] = itemId;
    } else {
      character[item.slot] = itemId;
    }
    const stats = addVillageStats(village.stats, { shopBuys: 1 });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, owned, character, newItems, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ owned, character, newItems, stats, updatedAt: nowIso() }));
    tx.update(progressRef(uid), {
      availableGold: after,
      totalGoldSpent: increment(price),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
      userId: uid,
      amount: -price,
      type: 'spent' as const,
      source: 'village_shop' as const,
      description: `Loja da Vila: ${item.label}`,
      relatedId: itemId,
      relatedTitle: item.label,
      metadata: { itemId, price, catalogVersion: CATALOG_VERSION },
      balanceBefore: gold,
      balanceAfter: after,
      createdAt: serverTimestamp(),
    }));
  });
  await settleAfter(uid, 'comerciante');
}

export async function craftGear(uid: string, gearId: string): Promise<void> {
  const def = GEAR_BY_ID[gearId];
  if (!def) throw new Error('Equipamento desconhecido');
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    if (isBroken(village.cracks, 'fornalha')) throw ruinUseError('fornalha');
    const current = village.gear[def.slot];
    const minerLevel = getLevelFromXP(Number((await tx.get(progressRef(uid))).data()?.totalXP) || 0);
    const check = canCraft(base.materials, village.rare, gearId, current, minerLevel);
    if (!check.ok) {
      if (check.reason === 'soon') throw new Error('A Lanterna ainda não funciona');
      if (check.reason === 'materials' || check.reason === 'rare') throw new Error('Faltam materiais');
      if (check.reason === 'already') throw new Error('Você já craftou este item');
      if (check.reason === 'order') throw new Error('Crafta a picareta anterior primeiro');
      if (check.reason === 'level') throw new Error(`Nível ${check.minLevel}`);
      throw new Error('Não foi possível craftar');
    }
    const materials = { ...base.materials };
    for (const m of MATERIALS) materials[m] = Math.max(0, materials[m] - (def.cost[m] ?? 0));
    const rare: VillageRare = {
      diamante: Math.max(0, village.rare.diamante - (def.rare.diamante ?? 0)),
      esmeralda: Math.max(0, village.rare.esmeralda - (def.rare.esmeralda ?? 0)),
    };
    const nextGear = { ...village.gear, [def.slot]: def.level };
    const newItems = village.newItems.includes(gearId) ? village.newItems : [...village.newItems, gearId];
    const stats = addVillageStats(village.stats, { craftsDone: 1 });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, gear: nextGear, rare, newItems, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ gear: nextGear, rare, newItems, stats, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials, updatedAt: nowIso() }));
  });
  await settleAfter(uid, 'ferreiro');
}

export async function tradeMaterials(uid: string, from: Material, to: Material): Promise<void> {
  const preview = tradePreview(from, to);
  if (!preview.ok) throw new Error('Escolha dois materiais diferentes');
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    if (isBroken(village.cracks, 'fornalha')) throw ruinUseError('fornalha');
    if ((base.buildings.fornalha || 0) < 2) throw new Error('A Fornalha nível 2 libera a Fundição');
    if ((base.materials[from] ?? 0) < preview.fromQty) throw new Error('Faltam materiais para a troca');
    const materials = { ...base.materials };
    materials[from] -= preview.fromQty;
    materials[to] += preview.toQty;
    const stats = addVillageStats(village.stats, { tradesDone: 1, smelts: 1 });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ stats, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials, updatedAt: nowIso() }));
  });
  await settleAfter(uid, 'ferreiro');
}

export async function openDailyChest(uid: string, date: string): Promise<ReturnType<typeof dailyChestContents>> {
  const today = date || getTodayBrazil();
  const hour = nowBrazil().hour;
  const [economy, tasksSnap, doneSnap] = await Promise.all([
    getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as Promise<EconomySettings>,
    getDocs(query(collection(db, 'tasks'), where('ownerId', '==', uid))),
    getDocs(query(collection(db, 'taskCompletions'), where('userId', '==', uid), where('date', '==', today))),
  ]);
  const tasks = tasksSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      active: data.active !== false,
      frequency: data.frequency || 'daily',
      period: data.period || 'morning',
      createdAt: data.createdAt?.toDate?.() ?? null,
      optional: data.optional === true,
    };
  });
  const due = dueTasksOn(tasks, today).length;
  const done = dueCompletionsCount(tasks, today, doneSnap.docs.map((d) => ({
    taskId: String(d.data().taskId || ''),
    reverted: d.data().reverted === true,
  })));
  const goldRoom = await roomForGameGold(uid, economy, today);

  let contents = dailyChestContents(uid, today, { fullDays: 0, gear: initialVillageDoc(uid, nowIso()).gear }, economy);

  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    const liveBau = liveBuildingLevel(base.buildings, village.cracks, 'bau');
    const gate = chestAllowed({ hourBrazil: hour, settings: economy, due, done, village, date: today, bauLevel: liveBau });
    if (!gate.ok) {
      if (gate.reason === 'warehouse') {
        if (isBroken(village.cracks, 'bau')) throw ruinUseError('bau');
        throw new Error('Construa o Armazém para guardar o Baú do Dia');
      }
      if (gate.reason === 'already') throw new Error('O Baú do Dia já foi aberto');
      if (gate.reason === 'hour') throw new Error(`Abre às ${economy.chestOpenHour}h`);
      if (gate.reason === 'min_due') throw new Error('Hoje não tem missões suficientes');
      const left = chestNeedLeft(due, done);
      throw new Error(left === 1 ? 'Falta 1 missão' : `Faltam ${left} missões`);
    }
    contents = dailyChestContents(uid, today, village, economy, base.materials, liveBau);
    const cut = capGold(contents.gold, goldRoom.room);
    contents = { ...contents, gold: cut.paid };
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const after = gold + contents.gold;
    const claimed = { ...village.claimed, [claimKey('daily', today)]: nowIso() };
    const rare = {
      diamante: village.rare.diamante,
      esmeralda: village.rare.esmeralda + contents.esmeralda,
    };
    const materials = { ...base.materials };
    for (const m of MATERIALS) materials[m] += contents.materials[m] ?? 0;
    const gained: string[] = [];
    for (const m of MATERIALS) {
      if ((contents.materials[m] ?? 0) > 0) gained.push(m);
    }
    if (contents.esmeralda > 0) gained.push('esmeralda');
    const newItems = [...village.newItems];
    for (const id of gained) {
      if (!newItems.includes(id)) newItems.push(id);
    }
    const chestDeltas: Record<string, number> = { chestsOpened: 1 };
    if (contents.esmeralda > 0) chestDeltas.emeraldsEver = contents.esmeralda;
    const stats = addVillageStats(village.stats, chestDeltas);

    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, newItems, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, newItems, stats, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials, updatedAt: nowIso() }));
    if (pSnap.exists() && contents.gold > 0) {
      tx.update(progressRef(uid), {
        availableGold: after,
        totalGoldEarned: increment(contents.gold),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
        userId: uid,
        amount: contents.gold,
        type: 'earned' as const,
        source: 'chest' as const,
        description: 'Baú do Dia',
        metadata: { due, done, contents, date: today, capped: cut.capped },
        balanceBefore: gold,
        balanceAfter: after,
        createdAt: serverTimestamp(),
      }));
    }
  });
  void touchHealth(uid, 'lastChestDate', today);
  await settleAfter(uid);
  return contents;
}

export async function grantLevelGift(
  uid: string,
  level: number,
  material: 'madeira' | 'pedra' | 'ferro',
): Promise<boolean> {
  if (material !== 'madeira' && material !== 'pedra' && material !== 'ferro') {
    throw new Error('Escolha madeira, pedra ou ferro');
  }
  let granted = false;
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const key = levelGiftClaimKey(village.season, level);
    if (hasClaim(village, key)) return;
    granted = true;
    const gift = levelGift(level, village.season);
    const owned = [...village.owned];
    const newItems = [...village.newItems];
    if (gift.cosmeticId && !owned.includes(gift.cosmeticId)) {
      owned.push(gift.cosmeticId);
      if (cosmeticHasSprite(gift.cosmeticId) && !newItems.includes(gift.cosmeticId)) newItems.push(gift.cosmeticId);
    }
    const claimed = { ...village.claimed, [key]: nowIso() };
    delete claimed[levelGiftPendingKey(village.season, level)];
    if (gift.cosmeticId) claimed[claimKey('milestone', `${village.season}:${level}`)] = nowIso();
    const rareKind = rareGiftForLevel(level);
    const rare: VillageRare = {
      diamante: village.rare.diamante + (rareKind === 'diamante' ? 1 : 0),
      esmeralda: village.rare.esmeralda + (rareKind === 'esmeralda' ? 1 : 0),
    };
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    const materials = { ...base.materials, [material]: base.materials[material] + 1 };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, owned, newItems, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, owned, newItems, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), { [`materials.${material}`]: increment(1), updatedAt: nowIso() });
  });
  return granted;
}

export async function markLevelGiftPending(uid: string, level: number): Promise<void> {
  const n = Math.floor(level);
  if (!Number.isFinite(n) || n < 2) return;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    const key = levelGiftClaimKey(village.season, n);
    if (hasClaim(village, key)) return;
    const pending = levelGiftPendingKey(village.season, n);
    if (hasClaim(village, pending)) return;
    const claimed = { ...village.claimed, [pending]: nowIso() };
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, updatedAt: nowIso() }));
  });
}

export async function dismissAutoNotice(uid: string, key: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    if (village.noticesDismissed.includes(key)) return;
    const noticesDismissed = [...village.noticesDismissed, key];
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, noticesDismissed, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), { noticesDismissed, updatedAt: nowIso() });
  });
}

export async function confirmHabit(uid: string, habitId: string, date: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    const prev = village.habits[habitId];
    if (prev?.lastDate === date) return;
    const streak = prev && prev.lastDate ? prev.streak + 1 : 1;
    const habits = { ...village.habits, [habitId]: { streak, lastDate: date } };
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, habits, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ habits, updatedAt: nowIso() }));
  });
}

export async function ackNotice(noticeId: string): Promise<void> {
  await updateDoc(doc(db, 'notices', noticeId), { ackAt: nowIso() });
}

export function subscribeNotices(
  uid: string,
  onChange: (items: FatherNotice[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'notices'), where('userId', '==', uid)),
    (snap) => {
      const items: FatherNotice[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: (data.type as NoticeType) || 'recado',
          text: str(data.text),
          when: strOrNull(data.when) ?? undefined,
          until: strOrNull(data.until) ?? undefined,
          ackAt: strOrNull(data.ackAt),
        };
      });
      onChange(items);
    },
    (e) => onError?.(e)
  );
}

export async function saveNotice(
  uid: string,
  input: { id?: string; type: NoticeType; text: string; when?: string; until?: string }
): Promise<void> {
  const ref = input.id ? doc(db, 'notices', input.id) : doc(collection(db, 'notices'));
  await setDoc(ref, omitUndefined({
    userId: uid,
    type: input.type,
    text: input.text.slice(0, 90),
    when: input.when || null,
    until: input.until || null,
    ackAt: null,
    updatedAt: nowIso(),
    createdAt: nowIso(),
  }), { merge: true });
}

export async function deleteNotice(id: string): Promise<void> {
  await deleteDoc(doc(db, 'notices', id));
}

export async function closeSeason(uid: string, adminUid: string): Promise<void> {
  const today = getTodayBrazil();
  const achSnap = await getDocs(query(collection(db, 'achievements'), where('ownerId', '==', uid)));
  const packTitles = new Set(MINER_MISSIONS_ACHIEVEMENTS.map((a) => a.title));
  const packDocs = achSnap.docs.filter((d) => packTitles.has(String(d.data().title || '')));

  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(progressRef(uid));
    const vSnap = await tx.get(villageRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const progress = pSnap.data() || {};
    const totalXP = Number(progress.totalXP) || 0;
    const gold = Number(progress.availableGold) || 0;
    const level = getLevelFromXP(totalXP);
    const patch = closeSeasonState({
      season: village.season,
      stars: village.stars,
      claimed: village.claimed,
      newAchievements: village.newAchievements,
      achievementsUnlocked: village.achievementsUnlocked,
      stats: village.stats,
      today,
      level,
      resetIds: seasonAchievementIds(),
    });
    if (!patch.ok) throw new Error(patch.reason);
    tx.set(doc(collection(db, 'progressSnapshots')), {
      userId: uid,
      totalXP,
      availableGold: gold,
      streak: progress.streak || 0,
      level,
      season: patch.endedSeason,
      createdAt: serverTimestamp(),
      reason: 'Fechar temporada',
      createdBy: adminUid,
    });
    if (pSnap.exists()) {
      tx.update(progressRef(uid), { totalXP: 0, updatedAt: serverTimestamp() });
    }
    tx.set(doc(collection(db, 'xpAdjustments')), {
      userId: uid,
      amount: -totalXP,
      reason: 'Fechar temporada',
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
    const payload = {
      season: patch.nextSeason,
      stars: patch.stars,
      claimed: patch.claimed,
      achievementsUnlocked: patch.achievementsUnlocked,
      newAchievements: patch.newAchievements,
      stats: patch.stats,
      updatedAt: nowIso(),
    };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, ...payload }));
    else tx.update(villageRef(uid), stripUndefined(payload));
  });

  if (packDocs.length) {
    const batch = writeBatch(db);
    for (const d of packDocs) batch.update(d.ref, { isActive: false, updatedAt: nowIso() });
    await batch.commit();
  }
}

/** @deprecated use closeSeason */
export async function startNewSeason(uid: string, adminUid: string): Promise<void> {
  return closeSeason(uid, adminUid);
}

export async function listDayCompletions(uid: string, date: string): Promise<Array<{ taskId: string; taskTitle: string; date: string }>> {
  const snap = await getDocs(query(
    collection(db, 'taskCompletions'),
    where('userId', '==', uid),
    where('date', '==', date)
  ));
  return snap.docs
    .filter((d) => d.data().reverted !== true)
    .map((d) => ({
      taskId: String(d.data().taskId || ''),
      taskTitle: String(d.data().taskTitle || 'Missão'),
      date,
    }));
}

export { stripUndefined };

export async function grantRare(
  uid: string,
  kind: 'esmeralda' | 'diamante',
  key: string
): Promise<boolean> {
  let granted = false;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    if (hasClaim(village, key)) return;
    granted = true;
    const claimed = { ...village.claimed, [key]: nowIso() };
    const rare = {
      diamante: village.rare.diamante + (kind === 'diamante' ? 1 : 0),
      esmeralda: village.rare.esmeralda + (kind === 'esmeralda' ? 1 : 0),
    };
    const deltas: Record<string, number> = {};
    if (kind === 'esmeralda') deltas.emeraldsEver = 1;
    if (kind === 'diamante') deltas.diamondsEver = 1;
    const stats = addVillageStats(village.stats, deltas);
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, stats, updatedAt: nowIso() }));
  });
  if (granted) await settleAfter(uid);
  return granted;
}

export async function openStreakChest(uid: string): Promise<{ gold: number; diamante: number; n: number } | null> {
  const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
  const goldRoom = await roomForGameGold(uid, economy);
  let out: { gold: number; diamante: number; n: number } | null = null;
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    if (isBroken(village.cracks, 'bau')) throw ruinUseError('bau');
    const start = village.fullDaysStart || getTodayBrazil();
    const tiers = [7, 14, 21] as const;
    const n = tiers.find((t) => village.fullDays >= t && !hasClaim(village, claimKey('streak', t, start))) || 0;
    if (!n) throw new Error(village.fullDays < 7 ? 'Ainda não tem 7 tochas seguidas' : 'Esse baú das tochas já foi aberto');
    if (goldRoom.room <= 0) throw new Error('Teto de hoje atingido; abra amanhã');
    const key = claimKey('streak', n, start);
    const cut = capGold(20, goldRoom.room);
    if (cut.paid <= 0) throw new Error('Teto de hoje atingido; abra amanhã');
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const after = gold + cut.paid;
    const claimed = { ...village.claimed, [key]: nowIso() };
    const rare = { ...village.rare, diamante: village.rare.diamante + 1 };
    const extra = ['diamante'];
    const owned = [...(village.owned || [])];
    if (n >= 21) {
      const gift = COSMETICS.find((c) => !c.free && !owned.includes(c.id) && cosmeticHasSprite(c.id) && (c.basePrice || 0) === 0);
      const pick = gift || COSMETICS.find((c) => c.id.startsWith('milestone') && !owned.includes(c.id));
      if (pick && !extra.includes(pick.id)) {
        extra.push(pick.id);
        owned.push(pick.id);
      }
    }
    const newItems = [...village.newItems];
    for (const id of extra) {
      if (id.startsWith('trophy_')) continue;
      if (!newItems.includes(id)) newItems.push(id);
    }
    const stats = addVillageStats(village.stats, { streakChests: 1, diamondsEver: 1 });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, newItems, owned, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, newItems, owned, stats, updatedAt: nowIso() }));
    if (pSnap.exists()) {
      tx.update(progressRef(uid), {
        availableGold: after,
        totalGoldEarned: increment(cut.paid),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
        userId: uid,
        amount: cut.paid,
        type: 'earned' as const,
        source: 'streak_chest' as const,
        description: `Baú das ${n} tochas`,
        metadata: { n, fullDaysStart: start, capped: cut.capped },
        balanceBefore: gold,
        balanceAfter: after,
        createdAt: serverTimestamp(),
      }));
    }
    out = { gold: cut.paid, diamante: 1, n };
  });
  await settleAfter(uid);
  return out;
}

/**
 * Comerciante (decisão 42, pai em 22/09): a criança PAGA `merchantBuy.gold` e recebe `merchantBuy.materials`
 * de UM material (madeira, pedra ou ferro; redstone só na Fornalha), até `dailyCap` compras por dia.
 * Gold é o que vale: não existe mais vender material por gold.
 */
export async function buyMaterials(uid: string, material: Material, lots: number): Promise<{ gold: number; qty: number }> {
  if (material === 'redstone') throw new Error('Redstone só na Fornalha');
  const n = Math.floor(lots);
  if (n < 1) throw new Error('Escolha quantos lotes comprar');
  const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
  const buy = economy.merchantBuy;
  const today = getTodayBrazil();
  const cap = buy.dailyCap || 2;
  let out = { gold: 0, qty: 0 };
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    if (isBroken(village.cracks, 'mercado')) throw ruinUseError('mercado');
    let used = 0;
    for (let i = 1; i <= cap; i += 1) {
      if (hasClaim(village, claimKey('merchant', today, i))) used += 1;
    }
    if (used + n > cap) throw new Error(`Só ${cap} compras por dia`);
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    const price = n * buy.gold;
    const gold = Number(pSnap.data()?.availableGold) || 0;
    if (gold < price) throw new Error('Gold insuficiente');
    const qty = n * buy.materials;
    const after = gold - price;
    const materials = { ...base.materials, [material]: (base.materials[material] ?? 0) + qty };
    const claimed = { ...village.claimed };
    for (let i = 1; i <= n; i += 1) claimed[claimKey('merchant', today, used + i)] = nowIso();
    const stats = addVillageStats(village.stats, { merchantBuys: qty });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, stats, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials, updatedAt: nowIso() }));
    tx.update(progressRef(uid), {
      availableGold: after,
      totalGoldSpent: increment(price),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
      userId: uid,
      amount: -price,
      type: 'spent' as const,
      source: 'merchant_buy' as const,
      description: `Comprou ${qty} ${material} do Comerciante`,
      metadata: { material, lots: n, qty },
      balanceBefore: gold,
      balanceAfter: after,
      createdAt: serverTimestamp(),
    }));
    out = { gold: price, qty };
  });
  await settleAfter(uid);
  return out;
}

export async function repairLot(uid: string, date: string): Promise<number> {
  const today = getTodayBrazil();
  const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
  const [tasksSnap, doneSnap, dailySnap, goldRoom] = await Promise.all([
    getDocs(query(collection(db, 'tasks'), where('ownerId', '==', uid))),
    getDocs(query(collection(db, 'taskCompletions'), where('userId', '==', uid), where('date', '==', today))),
    getDoc(doc(db, 'dailyProgress', `${uid}_${date}`)),
    roomForGameGold(uid, economy),
  ]);
  const tasks = tasksSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      active: data.active !== false,
      frequency: data.frequency || 'daily',
      period: data.period || 'morning',
      createdAt: data.createdAt?.toDate?.() ?? null,
      optional: data.optional === true,
    };
  });
  const due = dueTasksOn(tasks, today).length;
  const done = dueCompletionsCount(tasks, today, doneSnap.docs.map((d) => ({
    taskId: String(d.data().taskId || ''),
    reverted: d.data().reverted === true,
  })));
  const penalty = Number(dailySnap.data()?.goldPenalty) || 0;
  let refunded = 0;
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const key = claimKey('repair', date);
    if (hasClaim(village, key)) throw new Error('Esse conserto já foi feito');
    if (!canRepair(village.cracks, due, done)) throw new Error('Faça todas as missões de hoje para consertar');
    const want = repairRefund(penalty, economy);
    const cut = capGold(want, goldRoom.room);
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const after = gold + cut.paid;
    const claimed = { ...village.claimed, [key]: nowIso() };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, cracks: [], claimed, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ cracks: [], claimed, updatedAt: nowIso() }));
    if (pSnap.exists() && cut.paid > 0) {
      tx.update(progressRef(uid), {
        availableGold: after,
        totalGoldEarned: increment(cut.paid),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
        userId: uid,
        amount: cut.paid,
        type: 'refund' as const,
        source: 'repair' as const,
        description: 'Conserto do lote',
        metadata: { date, capped: cut.capped },
        balanceBefore: gold,
        balanceAfter: after,
        createdAt: serverTimestamp(),
      }));
    }
    tx.set(doc(db, 'dailyProgress', `${uid}_${today}`), { repaired: true, updatedAt: serverTimestamp() }, { merge: true });
    refunded = cut.paid;
  });
  return refunded;
}

/** Arruma só esta obra pagando material. Sem reembolso de gold. */
export async function repairBuilding(uid: string, id: BuildingId): Promise<void> {
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    const level = Math.max(1, base.buildings?.[id] || 1);
    const next = applyMaterialRepair(village.cracks || [], id, base.materials, level);
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, cracks: next.cracks, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ cracks: next.cracks, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials: next.materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials: next.materials, updatedAt: nowIso() }));
  });
}

export async function seeItems(uid: string, ids?: string[]): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    const next = ids?.length ? village.newItems.filter((id) => !ids.includes(id)) : [];
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, newItems: next, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), { newItems: next, updatedAt: nowIso() });
  });
}

export async function burnWood(uid: string): Promise<void> {
  const today = getTodayBrazil();
  const key = claimKey('burn', today);
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    if (isBroken(village.cracks, 'fornalha')) throw ruinUseError('fornalha');
    if ((base.buildings.fornalha || 0) < 3) throw new Error('A Queima abre na Fornalha nível 3');
    if (hasClaim(village, key)) throw new Error('A queima de hoje já foi feita');
    if ((base.materials.madeira || 0) < 5) throw new Error('Faltam 5 madeira');
    const materials = { ...base.materials, madeira: base.materials.madeira - 5, redstone: (base.materials.redstone || 0) + 1 };
    const claimed = { ...village.claimed, [key]: nowIso() };
    const stats = addVillageStats(village.stats, { burns: 1 });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), { claimed, stats, updatedAt: nowIso() });
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), { materials, updatedAt: nowIso() });
  });
  await settleAfter(uid);
}

export async function savePlan(uid: string, plan: VillagePlan): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    const first = village.plan.date !== plan.date;
    const next = {
      date: plan.date,
      order: [],
      focusTaskId: plan.focusTaskId,
    };
    const stats = first
      ? { ...village.stats, plansSaved: (village.stats.plansSaved || 0) + 1 }
      : village.stats;
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, plan: next, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ plan: next, stats, updatedAt: nowIso() }));
  });
  await settleAfter(uid);
}

export async function submitCheckin(uid: string, date: string, answers: DailyCheckinAnswers): Promise<number> {
  const xp = checkinXp(answers);
  if (xp <= 0) throw new Error('Diga como foi o dia e escreva o amanhã em pelo menos três palavras');
  await runTransaction(db, async (tx) => {
    const dailyRef = doc(db, 'dailyProgress', `${uid}_${date}`);
    const dailySnap = await tx.get(dailyRef);
    const existing = dailySnap.exists() ? dailySnap.data().checkin : null;
    if (existing) throw new Error('O dia já foi fechado');
    const pSnap = await tx.get(progressRef(uid));
    const vSnap = await tx.get(villageRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const checkin = {
      mood: answers.mood,
      tomorrow: answers.tomorrow.trim(),
      at: nowIso(),
    };
    tx.set(dailyRef, {
      userId: uid,
      date,
      checkin,
      updatedAt: serverTimestamp(),
      createdAt: dailySnap.exists() ? dailySnap.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    }, { merge: true });
    if (pSnap.exists()) tx.update(progressRef(uid), { totalXP: increment(xp), updatedAt: serverTimestamp() });
    const stats = { ...village.stats, checkins: (village.stats.checkins || 0) + 1 };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ stats, updatedAt: nowIso() }));
  });
  await settleAfter(uid);
  return xp;
}

export async function ensureWeekRecords(uid: string): Promise<void> {
  const today = getTodayBrazil();
  if (weekdayOf(today) !== 1) return;
  const prevMonday = addDays(mondayOfIsoWeek(isoWeekOf(today)), -7);
  const week = isoWeekOf(prevMonday);
  const sunday = addDays(prevMonday, 6);
  const key = `week:${week}`;
  const vSnap0 = await getDoc(villageRef(uid));
  const village0 = vSnap0.exists() ? fromVillageDoc(uid, vSnap0.data()) : initialVillageDoc(uid, nowIso());
  if (hasClaim(village0, key)) return;
  const launchedOn = typeof vSnap0.data()?.launchedOn === 'string' ? String(vSnap0.data()?.launchedOn) : '';
  if (launchedOn && sunday < launchedOn) return;
  const txs = (await listGoldTransactions(uid, 800)).filter((t) => !t.metadata?.launch);
  const gold = weeklyStatement(txs, week);
  const rows = await weekTorchRows(uid, week);
  const quizBest = await weekQuizBest(uid, week);
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    if (hasClaim(village, key)) return;
    const claimed = { ...village.claimed, [key]: nowIso() };
    const records = recordsAfterWeek(village.records, {
      goldEarned: gold.earned,
      fullDays: countWeekTorches(rows),
      quizBest,
    });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, records, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, records, updatedAt: nowIso() }));
  });
}

export async function claimTrophy(uid: string, week: string): Promise<TrophyTier> {
  const now = nowBrazil();
  const sat = addDays(mondayOfIsoWeek(week), 5);
  if (now.date < sat || (now.date === sat && now.hour < 18)) {
    throw new Error('O troféu abre sábado à noite');
  }
  const txs = await listGoldTransactions(uid, 800);
  const thisW = weeklyStatement(txs, week);
  const lastW = weeklyStatement(txs, isoWeekOf(addDays(mondayOfIsoWeek(week), -1)));
  const rows = await weekTorchRows(uid, week);
  const fullDays = countWeekTorches(rows);
  const quizBest = await weekQuizBest(uid, week);
  const tier = trophyOfWeek(
    { earned: thisW.earned, fullDays },
    { earned: lastW.earned, fullDays: 0 }
  );
  if (!tier) throw new Error('Esta semana ainda não rendeu troféu');
  const key = claimKey('trophy', week);
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    if (hasClaim(village, key)) throw new Error('Troféu já reivindicado');
    const claimed = { ...village.claimed, [key]: nowIso() };
    const trophies = { ...village.trophies, [week]: tier };
    const rare = { ...village.rare };
    if (tier === 'ouro') rare.esmeralda += 1;
    const records = recordsAfterWeek(village.records, {
      goldEarned: thisW.earned,
      fullDays,
      quizBest,
    });
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, trophies, rare, records, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, trophies, rare, records, updatedAt: nowIso() }));
  });
  return tier;
}

export async function settleAfter(uid: string, npc?: NpcId): Promise<void> {
  try {
    await applyVillageStats(uid, {});
  } catch (e) {
    console.warn('settleAfter stats', e);
  }
  if (!npc) return;
  try {
    await talkToNpc(uid, npc, getTodayBrazil(), 2);
  } catch (e) {
    console.warn('settleAfter talk', e);
  }
}

export async function completeNight(uid: string, date: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    const key = `night:${date}`;
    if (hasClaim(village, key)) return;
    if ((village.stats.nightComplete || 0) >= 1) return;
    const claimed = { ...village.claimed, [key]: nowIso() };
    const stats = addVillageStats(village.stats, { nightComplete: 1 });
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, stats, updatedAt: nowIso() }));
  });
  await settleAfter(uid);
}

export async function applyVillageStats(
  uid: string,
  deltas: Record<string, number>,
  extra?: { level?: number; buildings?: Record<string, number>; npcTiers?: Record<string, number>; owned?: string[]; set?: Record<string, number> }
): Promise<string[]> {
  const unlocked: string[] = [];
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const stats = addVillageStats(village.stats, deltas);
    if (extra?.set) {
      for (const [k, v] of Object.entries(extra.set)) stats[k] = Math.max(0, v);
    }
    const weekStamp = isoWeekStamp(isoWeekOf(getTodayBrazil()));
    if ((Number(village.stats.contractsWeekKey) || 0) !== weekStamp) {
      stats.contractsWeek = Number(deltas.contractsWeek) || 0;
      stats.contractsWeekKey = weekStamp;
    }
    const level = extra?.level ?? getLevelFromXP(Number(pSnap.data()?.totalXP) || 0);
    const buildings = extra?.buildings ?? (bSnap.data()?.buildings as Record<string, number> | undefined);
    const npcTiers = extra?.npcTiers ?? Object.fromEntries(
      Object.entries(village.npcs).map(([id, n]) => [id, n.tier])
    );
    const fresh = evaluateAchievements(stats, village.achievementsUnlocked, {
      level,
      buildings,
      gear: village.gear,
      npcTiers,
      owned: extra?.owned ?? village.owned,
    });
    const achievementsUnlocked = { ...village.achievementsUnlocked };
    const newAchievements = [...village.newAchievements];
    const claimed = { ...village.claimed };
    const rare = { ...village.rare };
    const owned = [...village.owned];
    let xpGain = 0;
    const mats: Record<string, number> = {};
    const matId = materialForForgeLevel(Number(buildings?.fornalha) || 0); // decisão 38: material do nível da Ferraria
    let goldWanted = 0;
    const goldTitles: string[] = [];
    for (const ach of fresh) {
      const ck = claimKey('ach', ach.id);
      if (claimed[ck]) continue;
      claimed[ck] = nowIso();
      achievementsUnlocked[ach.id] = getTodayBrazil();
      if (!newAchievements.includes(ach.id)) newAchievements.push(ach.id);
      unlocked.push(ach.id);
      const def = GAME_ACHIEVEMENT_BY_ID[ach.id] ?? ach;
      xpGain += def.reward.xp || 0;
      if (def.reward.material) mats[matId] = (mats[matId] || 0) + def.reward.material;
      if (def.reward.gold) { goldWanted += def.reward.gold; goldTitles.push(def.title); }
      if (def.reward.rare === 'esmeralda') rare.esmeralda += 1;
      if (def.reward.rare === 'diamante') rare.diamante += 1;
      if (def.reward.cosmetic && !owned.includes(def.reward.cosmetic)) owned.push(def.reward.cosmetic);
    }
    // gold de vida real (decisão 38) dentro do teto semanal achievementGoldCap; o que passa do teto não fica devendo
    let goldGain = 0;
    if (goldWanted > 0) {
      const eSnap = await tx.get(doc(db, 'settings', 'economy'));
      const cap = Number(eSnap.data()?.achievementGoldCap);
      const room = achievementGoldRoom(stats, weekStamp, Number.isFinite(cap) && cap >= 0 ? cap : DEFAULT_ECONOMY.achievementGoldCap);
      goldGain = Math.min(goldWanted, room);
      if ((Number(stats.achGoldWeekKey) || 0) !== weekStamp) { stats.achGoldWeek = 0; stats.achGoldWeekKey = weekStamp; }
      stats.achGoldWeek = (Number(stats.achGoldWeek) || 0) + goldGain;
    }
    let npcs = village.npcs;
    const bag = { stats, level, buildings, gear: village.gear, npcTiers, owned };
    const dummy = (stat: string): GameAchievement => ({
      id: '_', category: 'amizade', tier: 'bronze', title: '', description: '', icon: '', stat, target: 1, reward: { xp: 0 },
    });
    for (const npc of (['sabio', 'comerciante', 'ferreiro', 'olheiro'] as NpcId[])) {
      const state = npcs[npc];
      const q = NPC_QUESTS[npc][state.quest.chapter];
      if (!q) continue;
      if ((state.tier || 0) < q.chapter) continue;
      if (currentOf(dummy(q.stat), bag) < q.target) continue;
      const prevTier = state.tier || 0;
      const points = state.points + 5;
      const nextTier = friendTier(points);
      for (const g of tierGifts(npc, prevTier, nextTier, claimed)) {
        claimed[g.key] = nowIso();
        if (g.rare === 'diamante') {
          rare.diamante += 1;
          stats.diamondsEver = (Number(stats.diamondsEver) || 0) + 1;
        } else {
          rare.esmeralda += 1;
          stats.emeraldsEver = (Number(stats.emeraldsEver) || 0) + 1;
        }
      }
      npcs = {
        ...npcs,
        [npc]: {
          ...state,
          points,
          tier: nextTier,
          quest: { chapter: Math.min(5, state.quest.chapter + 1), progress: 0, doneAt: getTodayBrazil() },
        },
      };
      xpGain += 10;
    }
    if (!vSnap.exists()) {
      tx.set(villageRef(uid), stripUndefined({ ...village, stats, achievementsUnlocked, newAchievements, claimed, rare, owned, npcs, updatedAt: nowIso() }));
    } else {
      tx.update(villageRef(uid), stripUndefined({ stats, achievementsUnlocked, newAchievements, claimed, rare, owned, npcs, updatedAt: nowIso() }));
    }
    if (pSnap.exists() && (xpGain > 0 || goldGain > 0)) {
      const goldBefore = Number(pSnap.data()?.availableGold) || 0;
      tx.update(progressRef(uid), {
        ...(xpGain > 0 ? { totalXP: increment(xpGain) } : {}),
        ...(goldGain > 0 ? { availableGold: increment(goldGain), totalGoldEarned: increment(goldGain) } : {}),
        updatedAt: serverTimestamp(),
      });
      if (goldGain > 0) {
        tx.set(doc(collection(db, 'goldTransactions')), {
          userId: uid,
          amount: goldGain,
          type: 'earned',
          source: 'achievement',
          description: `Conquista: ${goldTitles.join(', ')}`,
          metadata: { achievements: unlocked, wanted: goldWanted, capped: goldWanted - goldGain },
          balanceBefore: goldBefore,
          balanceAfter: goldBefore + goldGain,
          createdAt: serverTimestamp(),
        });
      }
    }
    const matEntries = Object.entries(mats).filter(([, n]) => n > 0);
    if (bSnap.exists() && matEntries.length) {
      const upd: Record<string, unknown> = { updatedAt: nowIso() };
      for (const [m, n] of matEntries) upd[`materials.${m}`] = increment(n);
      tx.update(baseRef(uid), upd);
    }
  });
  return unlocked;
}

export async function seeAchievements(uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(villageRef(uid));
    const village = snap.exists() ? fromVillageDoc(uid, snap.data()) : initialVillageDoc(uid, nowIso());
    if (!village.newAchievements.length) return;
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, newAchievements: [], updatedAt: nowIso() }));
    else tx.update(villageRef(uid), { newAchievements: [], updatedAt: nowIso() });
  });
}

export async function talkToNpc(uid: string, npc: NpcId, date: string, domainBonus = 0, seenId?: string): Promise<{ points: number; tier: number; leveled: boolean }> {
  let out = { points: 0, tier: 0, leveled: false };
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const state = village.npcs[npc];
    const first = state.lastTalkDate !== date;
    const already = first ? 0 : Number((village.stats[`talks_${npc}_${date}`] || 0));
    const add = talkPointsToday(already, first, domainBonus) - already;
    const points = state.points + add;
    const tier = friendTier(points);
    const leveled = tier > state.tier;
    const seen = seenId && !state.seen.includes(seenId) ? [...state.seen, seenId].slice(-80) : state.seen;
    const npcs = {
      ...village.npcs,
      [npc]: {
        ...state,
        points,
        tier,
        lastTalkDate: date,
        seen,
      },
    };
    const stats = {
      ...village.stats,
      npcTalks: (village.stats.npcTalks || 0) + (first ? 1 : 0),
      [`talks_${npc}_${date}`]: already + add,
    };
    const talkedToday = (['sabio', 'comerciante', 'ferreiro', 'olheiro'] as NpcId[]).filter((id) => {
      if (id === npc) return true;
      return village.npcs[id].lastTalkDate === date;
    }).length;
    if (talkedToday >= 4) stats.talksSameDay = Math.max(Number(stats.talksSameDay) || 0, 1);
    const rare = { ...village.rare };
    const owned = [...village.owned];
    const claimed = { ...village.claimed };
    for (const g of tierGifts(npc, state.tier, tier, claimed)) {
      claimed[g.key] = nowIso();
      if (g.rare === 'diamante') {
        rare.diamante += 1;
        stats.diamondsEver = (Number(stats.diamondsEver) || 0) + 1;
      } else {
        rare.esmeralda += 1;
        stats.emeraldsEver = (Number(stats.emeraldsEver) || 0) + 1;
      }
    }
    out = { points, tier, leveled };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, npcs, stats, rare, owned, claimed, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ npcs, stats, rare, owned, claimed, updatedAt: nowIso() }));
  });
  try {
    await applyVillageStats(uid, {});
  } catch (e) {
    console.warn('talkToNpc stats', e);
  }
  return out;
}

export async function completeNpcQuest(uid: string, npc: NpcId): Promise<void> {
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const state = village.npcs[npc];
    const prevTier = state.tier || 0;
    const points = state.points + 5;
    const nextTier = friendTier(points);
    const claimed = { ...village.claimed };
    const rare = { ...village.rare };
    const stats = { ...village.stats };
    for (const g of tierGifts(npc, prevTier, nextTier, claimed)) {
      claimed[g.key] = nowIso();
      if (g.rare === 'diamante') {
        rare.diamante += 1;
        stats.diamondsEver = (Number(stats.diamondsEver) || 0) + 1;
      } else {
        rare.esmeralda += 1;
        stats.emeraldsEver = (Number(stats.emeraldsEver) || 0) + 1;
      }
    }
    const nextChapter = Math.min(5, state.quest.chapter + 1);
    const npcs = {
      ...village.npcs,
      [npc]: {
        ...state,
        points,
        tier: nextTier,
        quest: { chapter: nextChapter, progress: 0, doneAt: getTodayBrazil() },
      },
    };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, npcs, claimed, rare, stats, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ npcs, claimed, rare, stats, updatedAt: nowIso() }));
    if (pSnap.exists()) tx.update(progressRef(uid), { totalXP: increment(10), updatedAt: serverTimestamp() });
  });
  await settleAfter(uid);
}
