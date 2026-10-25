// Xadrez com o pai (25/10/2026): uma partida por vez, em arenaMatches/{childUid}.
// Cada um joga quando pode (filho na Arena; pai no painel ou no Telegram). A Cloud Function avisa a vez.
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { Chess } from 'chess.js';
import { db } from '../../config/firebase';
import { moveLine, outcomeFor, type Side } from './chessGame';
import { fromDoc, type MatchBy } from './matchStore';

export { subscribeMatch, type ArenaMatch, type MatchBy } from './matchStore';

/** Partida nova (só quando não há outra em andamento). */
export async function createMatch(childUid: string, childColor: Side, by: MatchBy): Promise<void> {
  const fresh = new Chess();
  await setDoc(doc(db, 'arenaMatches', childUid), {
    childUid,
    n: Date.now(),
    childColor,
    pgn: '',
    fen: fresh.fen(),
    turn: 'w',
    status: 'playing',
    moves: 0,
    createdBy: by,
    updatedAt: serverTimestamp(),
  });
}

/** Joga um lance de quem está na vez; confere no chess.js e no estado salvo (transação). */
export async function playMatchMove(childUid: string, by: MatchBy, move: { from: string; to: string; promotion?: string }): Promise<void> {
  const ref = doc(db, 'arenaMatches', childUid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const m = fromDoc(snap.data());
    if (!m || m.status !== 'playing') throw new Error('A partida já acabou.');
    const mySide: Side = by === 'filho' ? m.childColor : m.childColor === 'w' ? 'b' : 'w';
    const c = new Chess();
    if (m.pgn) c.loadPgn(m.pgn);
    if (c.turn() !== mySide) throw new Error('Ainda não é a sua vez.');
    const done = c.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    const out = outcomeFor(c, m.childColor);
    tx.update(ref, {
      pgn: c.pgn(),
      fen: c.fen(),
      turn: c.turn(),
      moves: c.history().length,
      lastMove: { from: done.from, to: done.to, line: moveLine(done), by },
      ...(out ? { status: 'over', result: out.result, resultLine: out.line } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Desistir: quem desiste perde. */
export async function resignMatch(childUid: string, by: MatchBy): Promise<void> {
  const ref = doc(db, 'arenaMatches', childUid);
  await runTransaction(db, async (tx) => {
    const m = fromDoc((await tx.get(ref)).data());
    if (!m || m.status !== 'playing') return;
    tx.update(ref, {
      status: 'over',
      result: by === 'filho' ? 'loss' : 'win',
      resultLine: by === 'filho' ? 'Você desistiu. O pai ganhou essa.' : 'O pai desistiu. Vitória sua!',
      updatedAt: serverTimestamp(),
    });
  });
}
