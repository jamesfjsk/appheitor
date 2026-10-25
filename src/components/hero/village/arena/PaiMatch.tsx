// Xadrez com o pai (25/10/2026): ele desafia, escolhe a cor e joga quando é a vez dele.
// O pai responde pelo painel ou pelo Telegram; a Cloud Function avisa cada um da sua vez.
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Chess } from 'chess.js';
import { Flag } from 'lucide-react';
import ChessBoard, { type BoardMove } from '../../../arena/ChessBoard';
import { useSound } from '../../../../contexts/SoundContext';
import { moveLine, pieceImage, type Side } from '../../../../services/arena/chessGame';
import { createMatch, playMatchMove, resignMatch, subscribeMatch, type ArenaMatch } from '../../../../services/arena/matchService';

const PaiMatch: React.FC<{ uid: string }> = ({ uid }) => {
  const { playClick, playHammer, playNotification, playError, playTaskComplete } = useSound();
  const [match, setMatch] = useState<ArenaMatch | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [newGame, setNewGame] = useState(false);
  const [resigning, setResigning] = useState(false);

  useEffect(() => subscribeMatch(uid, setMatch), [uid]);

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

  if (match === undefined) return <p className="p-6 text-center">Abrindo a partida...</p>;

  const challenge = async (color: Side | 'sorteio') => {
    playClick();
    const side: Side = color === 'sorteio' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    setBusy(true);
    try {
      await createMatch(uid, side, 'filho');
      setNewGame(false);
      toast('Desafio enviado! O pai recebe no celular.');
    } catch {
      playError();
      toast('Não deu para criar a partida. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  if (!match || (match.status === 'over' && newGame)) {
    return (
      <div className="ar-menu" data-testid="pai-desafio">
        <div className="ar-host">
          <img src="/assets/arena/pieces/wk.png" alt="" className="mc-pixel" />
          <p className="ar-host-line">
            Desafie o seu pai! Cada um joga quando pode: você aqui na Arena, ele pelo celular. Quando for a sua vez, chega um aviso.
          </p>
        </div>
        <div className="ar-colors">
          <p>Você joga com:</p>
          <button type="button" className="mc-btn mc-btn-stone min-h-[48px] px-4" disabled={busy} onClick={() => void challenge('w')} data-testid="pai-brancas">
            <img src="/assets/arena/pieces/wp.png" alt="" /> Brancas (você começa)
          </button>
          <button type="button" className="mc-btn mc-btn-dark min-h-[48px] px-4" disabled={busy} onClick={() => void challenge('b')}>
            <img src="/assets/arena/pieces/bp.png" alt="" /> Pretas
          </button>
          <button type="button" className="mc-btn mc-btn-gold min-h-[48px] px-4" disabled={busy} onClick={() => void challenge('sorteio')}>
            Sorteio
          </button>
        </div>
      </div>
    );
  }

  const myTurn = match.status === 'playing' && match.turn === match.childColor;
  const last = match.lastMove;

  const onMove = (m: BoardMove) => {
    if (!myTurn || busy) return;
    const c = new Chess(match.fen);
    let done;
    try {
      done = c.move({ from: m.from, to: m.to, promotion: m.promotion });
    } catch {
      playError();
      return;
    }
    if (c.isCheckmate()) playTaskComplete();
    else if (c.inCheck()) playNotification();
    else if (done.captured) playHammer();
    else playClick();
    setBusy(true);
    void playMatchMove(uid, 'filho', m)
      .catch((e: unknown) => {
        playError();
        toast(e instanceof Error ? e.message : 'Não deu para jogar. Tente de novo.');
      })
      .finally(() => setBusy(false));
  };

  const narration = history.slice(-6).map((m, i, arr) => ({
    key: `${history.length - arr.length + i}`,
    who: m.color === match.childColor ? 'Você' : 'Pai',
    text: moveLine(m),
  }));

  return (
    <div className="ar-game" data-testid="pai-partida">
      <div className="ar-board-col">
        <div className={`ar-player${!myTurn && match.status === 'playing' ? ' is-turn' : ''}`}>
          <img src={pieceImage(match.childColor === 'w' ? 'b' : 'w', 'k')} alt="" className="ar-player-face mc-pixel" />
          <div className="min-w-0">
            <p className="ar-player-name">Pai ({match.childColor === 'w' ? 'pretas' : 'brancas'})</p>
            <p className="ar-player-sub">{match.status === 'playing' && !myTurn ? 'na vez: ele recebeu o aviso no celular' : ' '}</p>
          </div>
        </div>
        <ChessBoard
          fen={match.fen}
          orientation={match.childColor}
          movable={myTurn && !busy ? match.childColor : null}
          lastMove={last ? { from: last.from, to: last.to } : null}
          onMove={onMove}
          onSelect={playClick}
        />
        <div className={`ar-player${myTurn ? ' is-turn' : ''}`}>
          <img src="/assets/village/char/miner-iso.png" alt="" className="ar-player-face mc-pixel" />
          <div className="min-w-0">
            <p className="ar-player-name">Você ({match.childColor === 'w' ? 'brancas' : 'pretas'})</p>
            <p className="ar-player-sub">{myTurn ? 'sua vez!' : ' '}</p>
          </div>
        </div>
      </div>
      <aside className="ar-side">
        <div className="ar-log" aria-live="polite">
          {narration.length === 0 && <p className="ar-log-empty">{myTurn ? 'Você começa. Toque numa peça.' : 'O pai começa. Ele já foi avisado.'}</p>}
          {narration.map((n) => (
            <p key={n.key} className={n.who === 'Você' ? 'is-me' : ''}>
              <b>{n.who}:</b> {n.text}
            </p>
          ))}
          {match.status === 'over' && <p className="ar-log-hint">{match.resultLine}</p>}
        </div>
        <div className="ar-actions">
          {match.status === 'playing' && (
            resigning ? (
              <button type="button" className="mc-btn mc-btn-red min-h-[44px] px-3" onClick={() => { setResigning(false); void resignMatch(uid, 'filho'); }}>
                Desistir mesmo?
              </button>
            ) : (
              <button type="button" className="mc-btn mc-btn-dark min-h-[44px] px-3" onClick={() => { playClick(); setResigning(true); }}>
                <Flag className="w-4 h-4" /> Desistir
              </button>
            )
          )}
          {match.status === 'over' && (
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-4" onClick={() => { playClick(); setNewGame(true); }} data-testid="pai-nova">
              Nova partida com o pai
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

export default PaiMatch;
