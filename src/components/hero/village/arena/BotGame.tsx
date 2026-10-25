// Partida contra o computador na Arena (25/10/2026). O robô pensa num Web Worker; cada lance é narrado
// em português; Dica (3 por partida), Voltar lance (só no Aprendiz e no Minerador), Desistir.
// A partida fica guardada no aparelho e volta se ele fechar a Arena no meio.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Lightbulb, Flag, Undo2 } from 'lucide-react';
import ChessBoard, { type BoardMove } from '../../../arena/ChessBoard';
import { useSound } from '../../../../contexts/SoundContext';
import { askBot } from '../../../../services/arena/chessBot';
import { PIECE_NAME, capturedPieces, levelById, moveLine, outcomeFor, pieceImage, type Outcome, type PieceType, type Side } from '../../../../services/arena/chessGame';
import { logChessGame, payChessWin, type ChessPay } from '../../../../services/arenaService';
import { setAppBusy } from '../../../../services/appUpdate';
import { writeSavedBotGame as writeSaved, type SavedBotGame } from '../../../../services/arena/botSave';
import { getTodayBrazil } from '../../../../utils/clock';
import { MATERIAL_LABELS } from '../../../../config/englishBase';

const HINTS = 3;

const BotGame: React.FC<{
  uid: string;
  level: number;
  color: Side;
  resume?: SavedBotGame | null;
  onExit: () => void;
  onRematch: (color: Side) => void;
}> = ({ uid, level, color, resume, onExit, onRematch }) => {
  const { playClick, playHammer, playTaskComplete, playError, playNotification } = useSound();
  const bot = levelById(level);
  const chessRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState(() => {
    if (resume?.pgn) {
      try {
        chessRef.current.loadPgn(resume.pgn);
      } catch {
        chessRef.current.reset();
      }
    }
    return chessRef.current.fen();
  });
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<{ from: string; to: string } | null>(null);
  const [hints, setHints] = useState(resume?.hints ?? HINTS);
  const [hintLine, setHintLine] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pay, setPay] = useState<ChessPay | null>(null);
  const [resigned, setResigned] = useState(false);
  const finished = useRef(false);
  const chess = chessRef.current;
  const history = chess.history({ verbose: true });
  const last = history[history.length - 1];
  const lost = useMemo(() => capturedPieces(new Chess(fen)), [fen]);
  const myTurn = !thinking && !outcome && chess.turn() === color;

  // Partida em andamento: a versão nova do app espera o fim
  useEffect(() => {
    setAppBusy('xadrez', !outcome && history.length > 0);
    return () => setAppBusy('xadrez', false);
  }, [outcome, history.length]);

  const finish = useCallback(async (out: Outcome, byResign = false) => {
    if (finished.current) return;
    finished.current = true;
    setOutcome(out);
    writeSaved(uid, null);
    const moves = chessRef.current.history().length;
    const date = getTodayBrazil();
    if (out.result === 'win') {
      playTaskComplete();
      try {
        setPay(await payChessWin(uid, level, date, color, moves));
      } catch {
        setPay({ paid: false, xp: 0, material: null, left: 0 });
      }
    } else {
      if (out.result === 'loss') playError();
      void logChessGame(uid, { mode: 'bot', level, result: byResign ? 'resign' : out.result, color, moves, date }).catch(() => undefined);
    }
  }, [uid, level, color, playTaskComplete, playError]);

  const afterMove = useCallback((): boolean => {
    const c = chessRef.current;
    setFen(c.fen());
    setHint(null);
    setHintLine(null);
    const out = outcomeFor(c, color);
    if (out) {
      void finish(out);
      return true;
    }
    writeSaved(uid, { level, color, pgn: c.pgn(), hints });
    return false;
  }, [color, finish, uid, level, hints]);

  const sound = (captured: boolean, check: boolean) => {
    if (check) playNotification();
    else if (captured) playHammer();
    else playClick();
  };

  const botTurn = useCallback(async () => {
    const c = chessRef.current;
    if (c.isGameOver() || c.turn() === color || finished.current) return;
    setThinking(true);
    const started = Date.now();
    try {
      const m = await askBot(c.fen(), level);
      const wait = 650 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
      if (finished.current) return;
      const done = c.move(m);
      sound(Boolean(done.captured), c.inCheck());
    } catch {
      /* robô sem lance: a partida segue no próximo toque */
    } finally {
      setThinking(false);
      afterMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, level, afterMove]);

  // Começo (ou volta) com o robô na vez: ele joga
  useEffect(() => {
    if (!finished.current && chessRef.current.turn() !== color && !chessRef.current.isGameOver()) void botTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (m: BoardMove) => {
    if (!myTurn) return;
    const c = chessRef.current;
    let done;
    try {
      done = c.move({ from: m.from, to: m.to, promotion: m.promotion });
    } catch {
      playError();
      return;
    }
    sound(Boolean(done.captured), c.inCheck());
    if (!afterMove()) void botTurn();
  };

  const askHint = async () => {
    if (!myTurn || hints <= 0) return;
    playClick();
    setHints((h) => h - 1);
    try {
      const m = await askBot(chessRef.current.fen(), 4, 4);
      setHint({ from: m.from, to: m.to });
      const piece = chessRef.current.get(m.from as never);
      if (piece) {
        const art = piece.type === 'q' || piece.type === 'r' ? 'a' : 'o';
        setHintLine(`Dica do Sábio: mova ${art} ${PIECE_NAME[piece.type as PieceType]} de ${m.from} para ${m.to}.`);
      }
    } catch {
      setHints((h) => h + 1);
    }
  };

  const undo = () => {
    if (!myTurn || level > 2) return;
    const c = chessRef.current;
    if (c.history().length < 2) return;
    playClick();
    c.undo();
    c.undo();
    afterMove();
  };

  const resign = () => {
    if (outcome) return;
    setResigned(false);
    void finish({ result: 'loss', line: 'Você desistiu. Toda partida ensina alguma coisa.' }, true);
  };

  const myLabel = color === 'w' ? 'brancas' : 'pretas';
  const narration = history.slice(-6).map((m, i, arr) => ({
    key: `${history.length - arr.length + i}`,
    who: m.color === color ? 'Você' : bot.who,
    text: moveLine(m),
  }));

  const playerBar = (who: 'bot' | 'me') => {
    const side: Side = who === 'me' ? color : color === 'w' ? 'b' : 'w';
    const taken = lost[side === 'w' ? 'b' : 'w'];
    return (
      <div className={`ar-player${chess.turn() === side && !outcome ? ' is-turn' : ''}`}>
        {who === 'bot' ? (
          <img src={bot.image} alt="" className="ar-player-face mc-pixel" />
        ) : (
          <img src="/assets/village/char/miner-iso.png" alt="" className="ar-player-face mc-pixel" />
        )}
        <div className="min-w-0">
          <p className="ar-player-name">{who === 'bot' ? (bot.who === bot.name ? bot.who : `${bot.who} · ${bot.name}`) : `Você (${myLabel})`}</p>
          <p className="ar-player-sub">
            {who === 'bot' && thinking ? <span className="ar-thinking">pensando<span>.</span><span>.</span><span>.</span></span> : chess.turn() === side && !outcome ? 'na vez' : ' '}
          </p>
        </div>
        <div className="ar-taken" aria-label="peças pegas">
          {taken.map((t, i) => <img key={i} src={pieceImage(side === 'w' ? 'b' : 'w', t)} alt="" />)}
        </div>
      </div>
    );
  };

  return (
    <div className="ar-game" data-testid="arena-bot-game">
      <div className="ar-board-col">
        {playerBar('bot')}
        <ChessBoard
          fen={fen}
          orientation={color}
          movable={myTurn ? color : null}
          lastMove={last ? { from: last.from, to: last.to } : null}
          hint={hint}
          onMove={onMove}
          onSelect={playClick}
        />
        {playerBar('me')}
      </div>
      <aside className="ar-side">
        <div className="ar-log" aria-live="polite">
          {narration.length === 0 && <p className="ar-log-empty">{color === 'w' ? 'Você começa. Toque numa peça branca.' : `${bot.who} começa.`}</p>}
          {narration.map((n) => (
            <p key={n.key} className={n.who === 'Você' ? 'is-me' : ''}>
              <b>{n.who}:</b> {n.text}
            </p>
          ))}
          {myTurn && chess.inCheck() && <p className="ar-log-check">Seu rei está em xeque! Proteja o rei.</p>}
          {hintLine && <p className="ar-log-hint">{hintLine}</p>}
        </div>
        <div className="ar-actions">
          <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => void askHint()} disabled={!myTurn || hints <= 0} data-testid="chess-hint">
            <Lightbulb className="w-4 h-4" /> Dica ({hints})
          </button>
          {level <= 2 && (
            <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={undo} disabled={!myTurn || history.length < 2}>
              <Undo2 className="w-4 h-4" /> Voltar lance
            </button>
          )}
          {!outcome && (
            resigned ? (
              <button type="button" className="mc-btn mc-btn-red min-h-[44px] px-3" onClick={resign}>
                Desistir mesmo?
              </button>
            ) : (
              <button type="button" className="mc-btn mc-btn-dark min-h-[44px] px-3" onClick={() => { playClick(); setResigned(true); }}>
                <Flag className="w-4 h-4" /> Desistir
              </button>
            )
          )}
        </div>
      </aside>

      {outcome && (
        <div className="ar-end" role="dialog" aria-label="Fim da partida" data-testid="chess-end">
          <div className={`ar-end-card is-${outcome.result}`}>
            <img src={outcome.result === 'win' ? '/assets/english/ui/trophy.webp' : bot.image} alt="" className="ar-end-img mc-pixel" />
            <h3 className="mc-title">{outcome.result === 'win' ? 'Vitória!' : outcome.result === 'draw' ? 'Empate' : 'Fim de partida'}</h3>
            <p>{outcome.line}</p>
            {outcome.result === 'win' && pay && (
              <p className="ar-end-pay">
                {pay.paid
                  ? `+${pay.xp} XP${pay.material ? ` e 1 ${MATERIAL_LABELS[pay.material].toLowerCase()}` : ''}. ${pay.left > 1 ? `Hoje ainda valem ${pay.left} vitórias.` : pay.left === 1 ? 'Hoje ainda vale 1 vitória.' : 'Prêmio de hoje completo.'}`
                  : 'Vitória guardada. O prêmio de hoje já foi todo; amanhã tem mais.'}
              </p>
            )}
            <div className="ar-end-actions">
              <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-4" onClick={() => onRematch(color === 'w' ? 'b' : 'w')}>
                Revanche (com as {color === 'w' ? 'pretas' : 'brancas'})
              </button>
              <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-4" onClick={onExit}>
                Trocar de adversário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotGame;
