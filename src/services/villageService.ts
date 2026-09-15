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
  initialVillageDoc,
} from '../config/village';
import { MATERIALS, initialBaseDoc } from '../config/englishBase';
import { MINER_MISSIONS_ACHIEVEMENTS } from '../config/villageAchievements';
import { fromBaseDoc } from './englishBaseService';
import { claimKey, hasClaim, levelGiftClaimKey, rareGiftForLevel } from './village/claims';
import { chestAllowed, dailyChestContents } from './village/chest';
import { canBuy, canCraft, priceOf, tradePreview } from './village/shop';
import { dueTasksOn } from './village/schedule';
import { getTodayBrazil } from '../utils/timezone';
import { getSettings } from './settingsService';
import { touchHealth } from './observability';
import { getLegacyLevelFromXP } from '../utils/levelSystem';

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
    const check = canBuy(village, gold, item, settings);
    if (!check.ok) {
      if (check.reason === 'owned') throw new Error('Você já tem este item');
      if (check.reason === 'gold') throw new Error('Gold insuficiente');
      throw new Error('Não foi possível comprar');
    }
    const price = priceOf(item, settings);
    const after = gold - price;
    if (after < 0) throw new Error('Gold insuficiente');
    const owned = village.owned.includes(itemId) ? village.owned : [...village.owned, itemId];
    const character = { ...village.character };
    if (item.slot === 'hat' || item.slot === 'cape' || item.slot === 'pet') {
      character[item.slot] = itemId;
    } else {
      character[item.slot] = itemId;
    }
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, owned, character, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ owned, character, updatedAt: nowIso() }));
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
    const check = canCraft(base.materials, village.rare, gearId, current);
    if (!check.ok) {
      if (check.reason === 'materials' || check.reason === 'rare') throw new Error('Faltam materiais');
      if (check.reason === 'already') throw new Error('Você já craftou este item');
      if (check.reason === 'order') throw new Error('Crafta a picareta anterior primeiro');
      throw new Error('Não foi possível craftar');
    }
    const materials = { ...base.materials };
    for (const m of MATERIALS) materials[m] = Math.max(0, materials[m] - (def.cost[m] ?? 0));
    const rare: VillageRare = {
      diamante: Math.max(0, village.rare.diamante - (def.rare.diamante ?? 0)),
      esmeralda: Math.max(0, village.rare.esmeralda - (def.rare.esmeralda ?? 0)),
    };
    const nextGear = { ...village.gear, [def.slot]: def.level };
    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, gear: nextGear, rare, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ gear: nextGear, rare, updatedAt: nowIso() }));
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
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()));
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
    };
  });
  const due = dueTasksOn(tasks, today).length;
  const done = doneSnap.docs.filter((d) => d.data().reverted !== true).length;

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
    contents = dailyChestContents(uid, today, village, economy);
    const gold = Number(pSnap.data()?.availableGold) || 0;
    const after = gold + contents.gold;
    const claimed = { ...village.claimed, [claimKey('daily', today)]: nowIso() };
    const rare = {
      diamante: village.rare.diamante,
      esmeralda: village.rare.esmeralda + contents.esmeralda,
    };
    const base = bSnap.exists() ? fromBaseDoc(uid, bSnap.data()) : initialBaseDoc(uid, nowIso());
    const materials = { ...base.materials };
    for (const m of MATERIALS) materials[m] += contents.materials[m] ?? 0;

    if (!vSnap.exists()) tx.set(villageRef(uid), stripUndefined({ ...village, claimed, rare, updatedAt: nowIso() }));
    else tx.update(villageRef(uid), stripUndefined({ claimed, rare, updatedAt: nowIso() }));
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
        metadata: { due, done, contents, date: today },
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
