// Partida contra o computador guardada no aparelho: volta se ele fechar a Arena no meio.
import type { Side } from './chessGame';

const saveKey = (uid: string) => `mm_xadrez_bot_${uid}`;

export interface SavedBotGame {
  level: number;
  color: Side;
  pgn: string;
  hints: number;
}

export function readSavedBotGame(uid: string): SavedBotGame | null {
  try {
    const raw = JSON.parse(localStorage.getItem(saveKey(uid)) || 'null') as SavedBotGame | null;
    return raw && typeof raw.pgn === 'string' && (raw.color === 'w' || raw.color === 'b') ? raw : null;
  } catch {
    return null;
  }
}

export function writeSavedBotGame(uid: string, game: SavedBotGame | null): void {
  try {
    if (game) localStorage.setItem(saveKey(uid), JSON.stringify(game));
    else localStorage.removeItem(saveKey(uid));
  } catch { /* aba privada */ }
}
