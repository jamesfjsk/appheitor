// Xadrez da Arena (25/10/2026). Puro: regras pelo chess.js, textos em português, níveis e prêmio.
// O robô roda num Web Worker (chessBot.ts); aqui só o que dá para testar sem navegador.
import type { Chess, Move } from 'chess.js';
import type { Material } from '../../types/english';

export type Side = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface BotLevel {
  id: 1 | 2 | 3 | 4;
  name: string;
  who: string;
  image: string;
  line: string;
  /** nível do js-chess-engine (1 a 5) */
  engine: number;
  /** parte dos lances jogada ao acaso (o Aprendiz erra de propósito) */
  random: number;
  xp: number;
  material: Material | null;
}

export const BOT_LEVELS: BotLevel[] = [
  { id: 1, name: 'Aprendiz', who: 'Gato da Vila', image: '/assets/village/pets/gato.png', line: 'Mexe sem pensar muito. Bom para treinar.', engine: 1, random: 0.5, xp: 5, material: null },
  { id: 2, name: 'Minerador', who: 'Minerador', image: '/assets/village/char/miner-iso.png', line: 'Pega peça solta. Cuidado com o que deixa sem proteção.', engine: 1, random: 0, xp: 10, material: 'pedra' },
  { id: 3, name: 'Capataz', who: 'Capataz', image: '/assets/village/npc/olheiro-iso.png', line: 'Pensa antes de mexer. Já é uma partida de verdade.', engine: 2, random: 0, xp: 20, material: 'ferro' },
  { id: 4, name: 'Mestre', who: 'Sábio', image: '/assets/village/npc/sabio-iso.png', line: 'O mais difícil da Vila. Ganhar dele é para poucos.', engine: 4, random: 0, xp: 35, material: 'redstone' },
];

export const levelById = (id: number): BotLevel => BOT_LEVELS.find((l) => l.id === id) ?? BOT_LEVELS[0];

/** Vitórias que pagam por dia, somando todos os níveis. */
export const PAID_WINS_PER_DAY = 3;

export const pieceImage = (color: Side, type: PieceType): string => `/assets/arena/pieces/${color}${type}.png`;

export const PIECE_NAME: Record<PieceType, string> = {
  p: 'peão',
  n: 'cavalo',
  b: 'bispo',
  r: 'torre',
  q: 'dama',
  k: 'rei',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Cavalo para f3", "Bispo pega o peão em e5", "Roque pequeno". Xeque e promoção no fim. */
export function moveLine(m: Pick<Move, 'piece' | 'to' | 'captured' | 'san' | 'flags' | 'promotion'>): string {
  let base: string;
  if (m.flags.includes('k')) base = 'Roque pequeno';
  else if (m.flags.includes('q')) base = 'Roque grande';
  else if (m.captured) base = `${cap(PIECE_NAME[m.piece as PieceType])} pega ${m.captured === 'q' || m.captured === 'r' ? 'a' : 'o'} ${PIECE_NAME[m.captured as PieceType]} em ${m.to}`;
  else base = `${cap(PIECE_NAME[m.piece as PieceType])} para ${m.to}`;
  if (m.promotion) base += ` e vira ${PIECE_NAME[m.promotion as PieceType]}`;
  if (m.san.includes('#')) return `${base}. Xeque-mate!`;
  if (m.san.includes('+')) return `${base}. Xeque!`;
  return base;
}

export type Outcome = { result: 'win' | 'loss' | 'draw'; line: string };

/** Fim de partida do ponto de vista de quem joga com `me`; null se ainda não acabou. */
export function outcomeFor(chess: Chess, me: Side): Outcome | null {
  if (chess.isCheckmate()) {
    const loser = chess.turn();
    return loser === me
      ? { result: 'loss', line: 'Xeque-mate. Dessa vez ele ganhou. Bora a revanche?' }
      : { result: 'win', line: 'Xeque-mate! Você venceu!' };
  }
  if (chess.isStalemate()) return { result: 'draw', line: 'Afogado: quem joga não tem lance e não está em xeque. Empate.' };
  if (chess.isThreefoldRepetition()) return { result: 'draw', line: 'A mesma posição três vezes. Empate.' };
  if (chess.isInsufficientMaterial()) return { result: 'draw', line: 'Não sobrou peça para dar mate. Empate.' };
  if (chess.isDraw()) return { result: 'draw', line: 'Empate pela regra dos 50 lances.' };
  return null;
}

/** Lance ao acaso (o Aprendiz): prefere pegar peça quando pode, metade das vezes. */
export function randomMove(chess: Chess, rnd: () => number): Move | null {
  const all = chess.moves({ verbose: true });
  if (!all.length) return null;
  const captures = all.filter((m) => m.captured);
  const pool = captures.length && rnd() < 0.5 ? captures : all;
  return pool[Math.floor(rnd() * pool.length)] ?? null;
}

/** Peças que cada lado já perdeu, para mostrar ao lado do tabuleiro. */
export function capturedPieces(chess: Chess): Record<Side, PieceType[]> {
  const out: Record<Side, PieceType[]> = { w: [], b: [] };
  for (const m of chess.history({ verbose: true })) {
    if (m.captured) out[m.color === 'w' ? 'b' : 'w'].push(m.captured as PieceType);
  }
  const order: PieceType[] = ['q', 'r', 'b', 'n', 'p'];
  out.w.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  out.b.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return out;
}

/** Quanto paga uma vitória: XP do nível e um material a partir do Minerador. */
export function winReward(levelId: number): { xp: number; material: Material | null } {
  const lv = levelById(levelId);
  return { xp: lv.xp, material: lv.material };
}
