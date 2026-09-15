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
import type { Material } from '../types/english';
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
} from '../types/village';
import {
  CATALOG_VERSION,
  COSMETIC_BY_ID,
  DEFAULT_ECONOMY,
  DEFAULT_MODULES,
  DEFAULT_VILLAGE_SETTINGS,
  FREE_COSMETIC_IDS,
  GEAR_BY_ID,
  cosmeticHasSprite,
  emptyNpcs,
  initialVillageDoc,
} from '../config/village';
import { MATERIALS, initialBaseDoc } from '../config/englishBase';
import { MINER_MISSIONS_ACHIEVEMENTS } from '../config/villageAchievements';
import { fromBaseDoc } from './englishBaseService';
import { claimKey, hasClaim, levelGiftClaimKey, rareGiftForLevel } from './village/claims';
import { chestAllowed, dailyChestContents } from './village/chest';
import { canBuy, canCraft, priceOf, tradePreview } from './village/shop';
import { dueCompletionsCount, dueTasksOn } from './village/schedule';
import { canRepair, repairRefund } from './village/repair';
import { capGold } from './village/caps';
import { getTodayBrazil, nowBrazil } from '../utils/clock';
import { getSettings } from './settingsService';
import { touchHealth } from './observability';
import { getLegacyLevelFromXP, getLevelFromXP } from '../utils/levelSystem';
import { roomForGameGold } from './goldTx';

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
const villageRef = (uid: string) => doc(db, 'village', uid);
const baseRef = (uid: string) => doc(db, 'englishBase', uid);
const progressRef = (uid: string) => doc(db, 'progress', uid);

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
    characterName: input.characterName.trim() || 'Heitor',
    name: input.villageName.trim() || 'Vila do Heitor',
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
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, owned, character, newItems, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ owned, character, newItems, updatedAt: nowIso() }));
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
}

export async function craftGear(uid: string, gearId: string): Promise<void> {
  const def = GEAR_BY_ID[gearId];
  if (!def) throw new Error('Equipamento desconhecido');
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
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
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, gear: nextGear, rare, newItems, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ gear: nextGear, rare, newItems, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials, updatedAt: nowIso() }));
  });
}

export async function tradeMaterials(uid: string, from: Material, to: Material): Promise<void> {
  const preview = tradePreview(from, to);
  if (!preview.ok) throw new Error('Escolha dois materiais diferentes');
  await runTransaction(db, async (tx) => {
    const bSnap = await tx.get(baseRef(uid));
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    if ((base.buildings.fornalha || 0) < 2) throw new Error('A Fornalha nível 2 libera a Fundição');
    if ((base.materials[from] ?? 0) < preview.fromQty) throw new Error('Faltam materiais para a troca');
    const materials = { ...base.materials };
    materials[from] -= preview.fromQty;
    materials[to] += preview.toQty;
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials, updatedAt: nowIso() }));
  });
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
    const gate = chestAllowed({ hourBrazil: hour, settings: economy, due, done, village, date: today });
    if (!gate.ok) {
      if (gate.reason === 'already') throw new Error('O Baú do Dia já foi aberto');
      if (gate.reason === 'hour') throw new Error(`Abre às ${economy.chestOpenHour}h`);
      if (gate.reason === 'min_due') throw new Error('Hoje não tem missões suficientes');
      throw new Error(`Faltam ${due - done} missões`);
    }
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    contents = dailyChestContents(uid, today, village, economy, base.materials, base.buildings.bau || 0);
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

    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, newItems, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, newItems, updatedAt: nowIso() }));
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
        metadata: { due, done, contents, date: today, capped: cut.paid < (economy.dailyChestGold[0] + village.fullDays) },
        balanceBefore: gold,
        balanceAfter: after,
        createdAt: serverTimestamp(),
      }));
    }
  });
  void touchHealth(uid, 'lastChestDate', today);
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
    const claimed = { ...village.claimed, [key]: nowIso() };
    const rareKind = rareGiftForLevel(level);
    const rare: VillageRare = {
      diamante: village.rare.diamante + (rareKind === 'diamante' ? 1 : 0),
      esmeralda: village.rare.esmeralda + (rareKind === 'esmeralda' ? 1 : 0),
    };
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    const materials = { ...base.materials, [material]: base.materials[material] + 1 };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), { [`materials.${material}`]: increment(1), updatedAt: nowIso() });
  });
  return granted;
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

export async function startNewSeason(uid: string, adminUid: string): Promise<void> {
  const achSnap = await getDocs(query(collection(db, 'achievements'), where('ownerId', '==', uid)));
  const packTitles = new Set(MINER_MISSIONS_ACHIEVEMENTS.map((a) => a.title));
  const packAlreadyActive = achSnap.docs.some((d) => {
    const data = d.data();
    return data.isActive !== false && packTitles.has(String(data.title || ''));
  });
  if (packAlreadyActive) throw new Error('A fase Miner Missions já está ativa.');
  const activeTitles = achSnap.docs
    .filter((d) => d.data().isActive !== false)
    .map((d) => String(d.data().title || ''))
    .filter(Boolean);

  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(progressRef(uid));
    const vSnap = await tx.get(villageRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    const progress = pSnap.data() || {};
    const totalXP = Number(progress.totalXP) || 0;
    tx.set(doc(collection(db, 'progressSnapshots')), {
      userId: uid,
      totalXP,
      streak: progress.streak || 0,
      level: getLegacyLevelFromXP(totalXP),
      achievements: activeTitles,
      createdAt: serverTimestamp(),
      reason: 'Nova fase: Miner Missions',
    });
    if (pSnap.exists()) {
      tx.update(progressRef(uid), { totalXP: 0, updatedAt: serverTimestamp() });
    }
    tx.set(doc(collection(db, 'xpAdjustments')), {
      userId: uid,
      amount: -totalXP,
      reason: 'Nova fase: Miner Missions',
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
    const nextSeason = village.season > 0 ? village.season + 1 : 1;
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, season: nextSeason, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), { season: nextSeason, updatedAt: nowIso() });
  });

  const batch = writeBatch(db);
  for (const d of achSnap.docs) {
    batch.update(d.ref, { isActive: false, updatedAt: nowIso() });
  }
  for (const a of MINER_MISSIONS_ACHIEVEMENTS) {
    const ref = doc(collection(db, 'achievements'));
    batch.set(ref, {
      ...a,
      ownerId: uid,
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
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
    if (!snap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, updatedAt: nowIso() }));
  });
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
    const trophy = n >= 21 ? 'trophy_ouro' : n >= 14 ? 'trophy_prata' : 'trophy_bronze';
    const extra = ['diamante', trophy];
    const newItems = [...village.newItems];
    for (const id of extra) {
      if (!newItems.includes(id)) newItems.push(id);
    }
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, newItems, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, newItems, updatedAt: nowIso() }));
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
  return out;
}

export async function sellMaterials(uid: string, material: Material, lots: number): Promise<number> {
  if (material === 'redstone') throw new Error('Redstone não se vende');
  const n = Math.floor(lots);
  if (n < 1) throw new Error('Escolha quantos lotes vender');
  const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
  const buy = economy.merchantBuy;
  const today = getTodayBrazil();
  const goldRoom = await roomForGameGold(uid, economy);
  let paid = 0;
  await runTransaction(db, async (tx) => {
    const vSnap = await tx.get(villageRef(uid));
    const pSnap = await tx.get(progressRef(uid));
    const bSnap = await tx.get(baseRef(uid));
    const village = vSnap.exists() ? fromVillageDoc(uid, vSnap.data()) : initialVillageDoc(uid, nowIso());
    let used = 0;
    for (let i = 1; i <= (buy.dailyCap || 2); i += 1) {
      if (hasClaim(village, claimKey('merchant', today, i))) used += 1;
    }
    if (used + n > (buy.dailyCap || 2)) throw new Error('Só 2 vendas por dia');
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    const need = n * buy.materials;
    if ((base.materials[material] ?? 0) < need) throw new Error('Falta material');
    const want = n * buy.gold;
    const cut = capGold(want, goldRoom.room);
    if (cut.paid <= 0) throw new Error('Teto de hoje atingido; venda amanhã');
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const after = gold + cut.paid;
    const materials = { ...base.materials, [material]: base.materials[material] - need };
    const claimed = { ...village.claimed };
    for (let i = 1; i <= n; i += 1) claimed[claimKey('merchant', today, used + i)] = nowIso();
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, updatedAt: nowIso() }));
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), stripUndefined({ materials, updatedAt: nowIso() }));
    if (pSnap.exists() && cut.paid > 0) {
      tx.update(progressRef(uid), {
        availableGold: after,
        totalGoldEarned: increment(cut.paid),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
        userId: uid,
        amount: cut.paid,
        type: 'earned' as const,
        source: 'merchant_sale' as const,
        description: `Vendeu ${need} ${material}`,
        metadata: { material, lots: n, capped: cut.capped },
        balanceBefore: gold,
        balanceAfter: after,
        createdAt: serverTimestamp(),
      }));
    }
    paid = cut.paid;
  });
  return paid;
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
    if ((base.buildings.fornalha || 0) < 3) throw new Error('A Queima abre na Fornalha nível 3');
    if (hasClaim(village, key)) throw new Error('A queima de hoje já foi feita');
    if ((base.materials.madeira || 0) < 5) throw new Error('Faltam 5 madeira');
    const materials = { ...base.materials, madeira: base.materials.madeira - 5, redstone: (base.materials.redstone || 0) + 1 };
    const claimed = { ...village.claimed, [key]: nowIso() };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), { claimed, updatedAt: nowIso() });
    if (!bSnap.exists()) tx.set(baseRef(uid), stripUndefined({ ...base, materials, updatedAt: nowIso() }));
    else tx.update(baseRef(uid), { materials, updatedAt: nowIso() });
  });
}
