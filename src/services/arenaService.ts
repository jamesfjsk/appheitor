// Arena (25/10/2026): prêmio das partidas de xadrez e o registro para o painel do pai.
// Vitória contra o robô paga XP e, a partir do Minerador, um material; nunca gold.
// Até PAID_WINS_PER_DAY vitórias pagas por dia (claimed xadrez:vitoria:<data>:<n>).
import { addDoc, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { initialBaseDoc } from '../config/englishBase';
import { initialVillageDoc } from '../config/village';
import { fromBaseDoc } from './englishBaseService';
import { fromVillageDoc } from './villageService';
import { claimKey, hasClaim } from './village/claims';
import { PAID_WINS_PER_DAY, winReward, type Side } from './arena/chessGame';
import { getLevelFromXP } from '../utils/levelSystem';
import { bumpVillage } from './village/statsBump';
import type { Material } from '../types/english';

export interface ChessPay {
  paid: boolean;
  xp: number;
  material: Material | null;
  /** vitórias pagas que ainda restam hoje */
  left: number;
}

export interface ChessGameLog {
  mode: 'bot' | 'pai' | 'escola';
  level: number;
  result: 'win' | 'loss' | 'draw' | 'resign';
  color: Side;
  moves: number;
  date: string;
}

export async function logChessGame(uid: string, game: ChessGameLog, paid = false): Promise<void> {
  await addDoc(collection(db, 'arenaLog'), {
    userId: uid,
    game: 'xadrez',
    mode: game.mode,
    level: game.level,
    result: game.result,
    color: game.color,
    moves: game.moves,
    date: game.date,
    paid,
    createdAt: serverTimestamp(),
  });
}

/** Escola do Sábio: a lição paga 10 XP e 1 pedra, o desafio 5 XP; cada um só na primeira vez. */
export async function payChessSchool(uid: string, kind: 'licao' | 'desafio', id: string): Promise<{ paid: boolean; xp: number }> {
  if (!uid) throw new Error('Entre com a conta da criança para jogar.');
  const xp = kind === 'licao' ? 10 : 5;
  const key = claimKey('xadrez', kind, id);
  const vRef = doc(db, 'village', uid);
  const bRef = doc(db, 'englishBase', uid);
  const pRef = doc(db, 'progress', uid);
  const now = new Date().toISOString();
  let paid = false;
  let totalXP = 0;
  await runTransaction(db, async (tx) => {
    const [vSnap, bSnap, pSnap] = await Promise.all([tx.get(vRef), tx.get(bRef), tx.get(pRef)]);
    const village = vSnap.exists() ? fromVillageDoc(uid, (vSnap.data() || {}) as Record<string, unknown>) : initialVillageDoc(uid, now);
    if (hasClaim(village, key)) return;
    const claimed = { ...village.claimed, [key]: now };
    if (vSnap.exists()) tx.update(vRef, { claimed, updatedAt: now });
    else tx.set(vRef, { ...village, claimed, updatedAt: now });
    if (kind === 'licao') {
      const base = bSnap.exists() ? fromBaseDoc(uid, (bSnap.data() || {}) as Record<string, unknown>) : initialBaseDoc(uid, now);
      const materials = { ...base.materials, pedra: (base.materials.pedra ?? 0) + 1 };
      if (bSnap.exists()) tx.update(bRef, { materials, updatedAt: now });
      else tx.set(bRef, { ...base, materials, updatedAt: now });
    }
    if (pSnap.exists()) {
      totalXP = (Number(pSnap.data()?.totalXP) || 0) + xp;
      tx.update(pRef, { totalXP, level: getLevelFromXP(totalXP), updatedAt: serverTimestamp() });
    }
    paid = true;
  });
  if (paid && totalXP) await bumpVillage(uid, {}, { level: getLevelFromXP(totalXP) }).catch(() => undefined);
  return { paid, xp: paid ? xp : 0 };
}

/** Partida com o pai: vitória 30 XP e 1 redstone, empate 15, derrota 10 (jogou com o pai). Uma vez por partida. */
export async function payChessPai(
  uid: string,
  n: number,
  result: 'win' | 'loss' | 'draw',
  color: Side,
  moves: number,
): Promise<{ paid: boolean; xp: number; material: Material | null }> {
  if (!uid || !n) return { paid: false, xp: 0, material: null };
  const xp = result === 'win' ? 30 : result === 'draw' ? 15 : 10;
  const material: Material | null = result === 'win' ? 'redstone' : null;
  const key = claimKey('xadrez', 'pai', n);
  const vRef = doc(db, 'village', uid);
  const bRef = doc(db, 'englishBase', uid);
  const pRef = doc(db, 'progress', uid);
  const now = new Date().toISOString();
  let paid = false;
  let totalXP = 0;
  await runTransaction(db, async (tx) => {
    const [vSnap, bSnap, pSnap] = await Promise.all([tx.get(vRef), tx.get(bRef), tx.get(pRef)]);
    const village = vSnap.exists() ? fromVillageDoc(uid, (vSnap.data() || {}) as Record<string, unknown>) : initialVillageDoc(uid, now);
    if (hasClaim(village, key)) return;
    const claimed = { ...village.claimed, [key]: now };
    if (vSnap.exists()) tx.update(vRef, { claimed, updatedAt: now });
    else tx.set(vRef, { ...village, claimed, updatedAt: now });
    if (material) {
      const base = bSnap.exists() ? fromBaseDoc(uid, (bSnap.data() || {}) as Record<string, unknown>) : initialBaseDoc(uid, now);
      const materials = { ...base.materials, [material]: (base.materials[material] ?? 0) + 1 };
      if (bSnap.exists()) tx.update(bRef, { materials, updatedAt: now });
      else tx.set(bRef, { ...base, materials, updatedAt: now });
    }
    if (pSnap.exists()) {
      totalXP = (Number(pSnap.data()?.totalXP) || 0) + xp;
      tx.update(pRef, { totalXP, level: getLevelFromXP(totalXP), updatedAt: serverTimestamp() });
    }
    paid = true;
  });
  if (paid) {
    await logChessGame(uid, { mode: 'pai', level: 0, result, color, moves, date: now.slice(0, 10) }, true).catch(() => undefined);
    if (totalXP) await bumpVillage(uid, {}, { level: getLevelFromXP(totalXP) }).catch(() => undefined);
  }
  return { paid, xp: paid ? xp : 0, material: paid ? material : null };
}

/** Paga a vitória contra o robô (se ainda couber hoje) e registra a partida. */
export async function payChessWin(uid: string, levelId: number, date: string, color: Side, moves: number): Promise<ChessPay> {
  if (!uid) throw new Error('Entre com a conta da criança para jogar.');
  const reward = winReward(levelId);
  const vRef = doc(db, 'village', uid);
  const bRef = doc(db, 'englishBase', uid);
  const pRef = doc(db, 'progress', uid);
  const now = new Date().toISOString();
  let out: ChessPay = { paid: false, xp: 0, material: null, left: 0 };
  let totalXP = 0;

  await runTransaction(db, async (tx) => {
    const [vSnap, bSnap, pSnap] = await Promise.all([tx.get(vRef), tx.get(bRef), tx.get(pRef)]);
    const village = vSnap.exists() ? fromVillageDoc(uid, (vSnap.data() || {}) as Record<string, unknown>) : initialVillageDoc(uid, now);
    const keys = Array.from({ length: PAID_WINS_PER_DAY }, (_, i) => claimKey('xadrez', 'vitoria', date, i + 1));
    const free = keys.find((k) => !hasClaim(village, k));
    if (!free) {
      out = { paid: false, xp: 0, material: null, left: 0 };
      return;
    }
    const claimed = { ...village.claimed, [free]: now };
    if (vSnap.exists()) tx.update(vRef, { claimed, updatedAt: now });
    else tx.set(vRef, { ...village, claimed, updatedAt: now });
    if (reward.material) {
      const base = bSnap.exists() ? fromBaseDoc(uid, (bSnap.data() || {}) as Record<string, unknown>) : initialBaseDoc(uid, now);
      const materials = { ...base.materials, [reward.material]: (base.materials[reward.material] ?? 0) + 1 };
      if (bSnap.exists()) tx.update(bRef, { materials, updatedAt: now });
      else tx.set(bRef, { ...base, materials, updatedAt: now });
    }
    if (pSnap.exists()) {
      totalXP = (Number(pSnap.data()?.totalXP) || 0) + reward.xp;
      tx.update(pRef, { totalXP, level: getLevelFromXP(totalXP), updatedAt: serverTimestamp() });
    }
    out = { paid: true, xp: reward.xp, material: reward.material, left: keys.length - keys.indexOf(free) - 1 };
  });

  await logChessGame(uid, { mode: 'bot', level: levelId, result: 'win', color, moves, date }, out.paid);
  if (out.paid && totalXP) await bumpVillage(uid, {}, { level: getLevelFromXP(totalXP) }).catch(() => undefined);
  return out;
}
