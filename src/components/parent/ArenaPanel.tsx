// Painel do pai: Arena (25/10/2026). A partida de xadrez com ele, jogada daqui ou pelo Telegram
// ("lance e4"), e o histórico das partidas dele (contra o computador, a Escola e o pai). Tailwind.
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Chess } from 'chess.js';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import ChessBoard, { type BoardMove } from '../arena/ChessBoard';
import { levelById, moveLine, type Side } from '../../services/arena/chessGame';
import { createMatch, playMatchMove, resignMatch, subscribeMatch, type ArenaMatch } from '../../services/arena/matchService';

interface LogRow {
  id: string;
  mode: string;
  level: number;
  result: string;
  date: string;
  moves: number;
}

const RESULT: Record<string, string> = { win: 'venceu', loss: 'perdeu', draw: 'empatou', resign: 'desistiu' };

const ArenaPanel: React.FC = () => {
  const { childUid } = useAuth();
  const [match, setMatch] = useState<ArenaMatch | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogRow[] | null>(null);

  useEffect(() => (childUid ? subscribeMatch(childUid, setMatch) : undefined), [childUid]);
  useEffect(() => {
    if (!childUid) return;
    getDocs(query(collection(db, 'arenaLog'), where('userId', '==', childUid), orderBy('createdAt', 'desc'), limit(30)))
      .then((snap) => setLog(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LogRow, 'id'>) }))))
      .catch(() => setLog([]));
  }, [childUid, match?.status]);

  const history = useMemo(() => {
    if (!match?.pgn) return [];
    const c = new Chess();
    try {
      c.loadPgn(match.pgn);
    } catch {
      return [];
    }
    return c.history({ verbose: true });
  }, [match?.pgn]);

  if (!childUid) return <p className="text-sm text-gray-500">Sem criança ligada a este painel.</p>;

  const fatherSide: Side | null = match ? (match.childColor === 'w' ? 'b' : 'w') : null;
  const myTurn = Boolean(match && match.status === 'playing' && fatherSide && match.turn === fatherSide);

  const run = (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    void fn()
      .then(() => { if (ok) toast.success(ok); })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : 'Não deu certo.'))
      .finally(() => setBusy(false));
  };

  const onMove = (m: BoardMove) => {
    if (!myTurn || busy) return;
    run(() => playMatchMove(childUid, 'pai', m));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-gray-900">Xadrez com ele</h3>
          {match?.status === 'playing' && (
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${myTurn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {myTurn ? 'Sua vez' : 'Vez dele'}
            </span>
          )}
        </div>

        {match === undefined && <p className="text-sm text-gray-500">Carregando…</p>}

        {match !== undefined && (!match || match.status === 'over') && (
          <div className="space-y-3">
            {match?.status === 'over' && <p className="text-sm text-gray-700">Última partida: {match.resultLine}</p>}
            <p className="text-sm text-gray-600">Comece uma partida. Ele recebe o aviso na Vila e no aparelho.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => run(() => createMatch(childUid, 'b', 'pai'), 'Partida criada. Você começa.')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                Eu jogo de brancas
              </button>
              <button type="button" disabled={busy} onClick={() => run(() => createMatch(childUid, 'w', 'pai'), 'Partida criada. Ele começa.')} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Ele joga de brancas
              </button>
            </div>
          </div>
        )}

        {match && match.status === 'playing' && fatherSide && (
          <div className="flex flex-wrap gap-6">
            <div className="w-full max-w-md">
              <ChessBoard
                fen={match.fen}
                orientation={fatherSide}
                movable={myTurn && !busy ? fatherSide : null}
                lastMove={match.lastMove ? { from: match.lastMove.from, to: match.lastMove.to } : null}
                onMove={onMove}
              />
            </div>
            <div className="min-w-[220px] flex-1 space-y-3">
              <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-1">
                {history.length === 0 && <p className="text-gray-500">Nenhum lance ainda.</p>}
                {history.slice(-10).map((m, i, arr) => (
                  <p key={history.length - arr.length + i} className={m.color === fatherSide ? 'text-blue-700' : 'text-gray-800'}>
                    <b>{m.color === fatherSide ? 'Você' : 'Ele'}:</b> {moveLine(m)}
                  </p>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Também dá para jogar pelo Telegram: mande <b>lance e4</b> ou <b>lance Cf3</b> para o robô, e <b>xadrez</b> para ver o tabuleiro.
              </p>
              <button type="button" disabled={busy} onClick={() => run(() => resignMatch(childUid, 'pai'), 'Você desistiu. Vitória dele.')} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                Desistir
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
        <h3 className="text-lg font-bold text-gray-900">Partidas dele</h3>
        {log === null && <p className="text-sm text-gray-500">Carregando…</p>}
        {log?.length === 0 && <p className="text-sm text-gray-500">Nenhuma partida ainda.</p>}
        {log && log.length > 0 && (
          <ul className="divide-y divide-gray-100 text-sm">
            {log.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span className="text-gray-700">
                  {r.date.split('-').reverse().join('/')} · {r.mode === 'pai' ? 'com você' : r.mode === 'bot' ? `contra o ${levelById(r.level).name}` : 'Escola'}
                </span>
                <span className={r.result === 'win' ? 'font-semibold text-green-700' : 'text-gray-600'}>
                  {RESULT[r.result] ?? r.result} · {r.moves} lances
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ArenaPanel;
