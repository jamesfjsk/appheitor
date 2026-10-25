// Partida de xadrez com o pai (arenaMatches/{childUid}): tipos e leitura, sem o chess.js.
// A Vila só escuta (aviso da vez e prêmio); jogar fica em matchService.ts, carregado com a Arena.
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Side } from './chessGame';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type MatchBy = 'filho' | 'pai';

export interface ArenaMatch {
  childUid: string;
  /** número da partida (Date.now() da criação): chave do prêmio */
  n: number;
  childColor: Side;
  pgn: string;
  fen: string;
  turn: Side;
  status: 'playing' | 'over';
  /** do ponto de vista do filho */
  result?: 'win' | 'loss' | 'draw';
  resultLine?: string;
  lastMove?: { from: string; to: string; line: string; by: MatchBy };
  moves: number;
  createdBy: MatchBy;
  updatedAt: string;
}

const iso = (v: unknown): string => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === 'string' ? v : '');

export function fromDoc(data: Record<string, unknown> | undefined): ArenaMatch | null {
  if (!data || typeof data.pgn !== 'string' || typeof data.childUid !== 'string') return null;
  const side = (v: unknown): Side => (v === 'b' ? 'b' : 'w');
  const lm = data.lastMove as ArenaMatch['lastMove'] | undefined;
  return {
    childUid: data.childUid,
    n: Number(data.n) || 0,
    childColor: side(data.childColor),
    pgn: data.pgn,
    fen: typeof data.fen === 'string' ? data.fen : START_FEN,
    turn: side(data.turn),
    status: data.status === 'over' ? 'over' : 'playing',
    ...(data.result === 'win' || data.result === 'loss' || data.result === 'draw' ? { result: data.result } : {}),
    ...(typeof data.resultLine === 'string' ? { resultLine: data.resultLine } : {}),
    ...(lm && typeof lm.from === 'string' ? { lastMove: lm } : {}),
    moves: Number(data.moves) || 0,
    createdBy: data.createdBy === 'pai' ? 'pai' : 'filho',
    updatedAt: iso(data.updatedAt),
  };
}

export function subscribeMatch(childUid: string, onChange: (m: ArenaMatch | null) => void): () => void {
  return onSnapshot(
    doc(db, 'arenaMatches', childUid),
    (snap) => onChange(fromDoc(snap.data())),
    () => onChange(null),
  );
}

