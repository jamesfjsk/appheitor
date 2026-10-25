// Tabuleiro de xadrez da Arena (25/10/2026). Toca na peça, os pontos mostram para onde ela vai,
// toca no destino. Mostra o último lance, o xeque e a dica; vira para quem joga de pretas.
// Serve à criança (Arena) e ao pai (painel).
import React, { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { PIECE_NAME, pieceImage, type PieceType, type Side } from '../../services/arena/chessGame';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const PROMOS: PieceType[] = ['q', 'r', 'b', 'n'];

export interface BoardMove {
  from: string;
  to: string;
  promotion?: PieceType;
}

const ChessBoard: React.FC<{
  fen: string;
  orientation: Side;
  /** cor que pode mexer agora; null trava o tabuleiro */
  movable: Side | null;
  lastMove?: { from: string; to: string } | null;
  hint?: { from: string; to: string } | null;
  onMove: (m: BoardMove) => void;
  onSelect?: () => void;
  className?: string;
  /** tabuleiro de treino (Escola): sem rei e sem fim de jogo */
  free?: boolean;
  /** casas com diamante para pegar */
  marks?: string[];
  /** só esta peça mexe */
  pieceFilter?: PieceType;
}> = ({ fen, orientation, movable, lastMove, hint, onMove, onSelect, className, free = false, marks, pieceFilter }) => {
  const chess = useMemo(() => new Chess(fen, free ? { skipValidation: true } : undefined), [fen, free]);
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [seenFen, setSeenFen] = useState(fen);
  if (seenFen !== fen) {
    setSeenFen(fen);
    setSelected(null);
    setPromo(null);
  }

  const targets = useMemo(() => {
    if (!selected) return new Map<string, boolean>();
    const list = chess.moves({ square: selected as Square, verbose: true });
    return new Map(list.map((m) => [m.to, Boolean(m.captured)]));
  }, [chess, selected]);

  const checkSquare = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board()) {
      for (const p of row) if (p && p.type === 'k' && p.color === turn) return p.square;
    }
    return null;
  }, [chess]);

  const canMove = movable !== null && chess.turn() === movable && (free || !chess.isGameOver());
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'w' ? FILES : [...FILES].reverse();

  const tap = (sq: string) => {
    if (!canMove) return;
    const piece = chess.get(sq as Square);
    if (selected && targets.has(sq)) {
      const moving = chess.get(selected as Square);
      if (moving?.type === 'p' && (sq.endsWith('8') || sq.endsWith('1'))) {
        setPromo({ from: selected, to: sq });
        return;
      }
      onMove({ from: selected, to: sq });
      setSelected(null);
      return;
    }
    if (piece && piece.color === movable && (!pieceFilter || piece.type === pieceFilter)) {
      onSelect?.();
      setSelected(sq === selected ? null : sq);
      return;
    }
    setSelected(null);
  };

  return (
    <div className={`ch-wrap${className ? ` ${className}` : ''}`}>
      <div className="ch-board" role="grid" aria-label="Tabuleiro de xadrez" data-testid="chess-board">
        {ranks.map((rank, ri) =>
          files.map((file, fi) => {
            const sq = `${file}${rank}`;
            const piece = chess.get(sq as Square);
            const light = (FILES.indexOf(file) + rank) % 2 === 1;
            const cls = [
              'ch-sq',
              light ? 'is-light' : 'is-dark',
              lastMove && (lastMove.from === sq || lastMove.to === sq) ? 'is-last' : '',
              selected === sq ? 'is-sel' : '',
              checkSquare === sq ? 'is-check' : '',
              hint && (hint.from === sq || hint.to === sq) ? 'is-hint' : '',
              canMove && piece && piece.color === movable && (!pieceFilter || piece.type === pieceFilter) ? 'is-mine' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={sq}
                type="button"
                className={cls}
                onClick={() => tap(sq)}
                data-sq={sq}
                aria-label={piece ? `${PIECE_NAME[piece.type as PieceType]} ${piece.color === 'w' ? 'branco' : 'preto'} em ${sq}` : sq}
              >
                {fi === 0 && <span className="ch-coord is-rank">{rank}</span>}
                {ri === 7 && <span className="ch-coord is-file">{file}</span>}
                {piece && (
                  <img
                    key={`${piece.color}${piece.type}-${lastMove?.to === sq ? fen : ''}`}
                    src={pieceImage(piece.color as Side, piece.type as PieceType)}
                    alt=""
                    className={`ch-piece${lastMove?.to === sq ? ' is-landed' : ''}`}
                    draggable={false}
                  />
                )}
                {marks?.includes(sq) && <img src="/assets/english/ui/diamond.webp" alt="" className="ch-mark" draggable={false} />}
                {targets.has(sq) && <span className={targets.get(sq) ? 'ch-take' : 'ch-dot'} aria-hidden />}
              </button>
            );
          }),
        )}
      </div>
      {promo && (
        <div className="ch-promo" role="dialog" aria-label="Escolha a peça">
          <p>O peão chegou ao fim! Vira o quê?</p>
          <div>
            {PROMOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onMove({ ...promo, promotion: t });
                  setPromo(null);
                  setSelected(null);
                }}
                aria-label={PIECE_NAME[t]}
              >
                <img src={pieceImage(movable ?? 'w', t)} alt="" />
                <span>{PIECE_NAME[t]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessBoard;
