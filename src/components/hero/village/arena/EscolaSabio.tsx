// Escola do Sábio (25/10/2026): uma lição por peça (pegar os diamantes) e os desafios "xeque-mate em 1".
// Cada lição e cada desafio pagam só na primeira vez (claimed xadrez:licao|desafio:<id>).
import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Check, Lightbulb, RotateCcw } from 'lucide-react';
import ChessBoard, { type BoardMove } from '../../../arena/ChessBoard';
import { useSound } from '../../../../contexts/SoundContext';
import { useVillage } from '../../../../contexts/VillageContext';
import { CHESS_LESSONS, lessonStars, type ChessLesson } from '../../../../data/chessLessons';
import { CHESS_PUZZLES, PUZZLE_THEMES, type ChessPuzzle } from '../../../../data/chessPuzzles';
import { pieceImage, type PieceType } from '../../../../services/arena/chessGame';
import { payChessSchool } from '../../../../services/arenaService';
import { claimKey, hasClaim } from '../../../../services/village/claims';

const SABIO = '/assets/village/npc/sabio-iso.png';

/** Depois de cada lance da lição, as brancas voltam a jogar (não há adversário). */
function whiteAgain(fen: string): string {
  const parts = fen.split(' ');
  parts[1] = 'w';
  parts[3] = '-';
  return parts.join(' ');
}

const Sabio: React.FC<{ line: string }> = ({ line }) => (
  <div className="es-sabio">
    <img src={SABIO} alt="" className="mc-pixel" />
    <p>{line}</p>
  </div>
);

const LessonPlay: React.FC<{ uid: string; lesson: ChessLesson; onNext: () => void }> = ({ uid, lesson, onNext }) => {
  const { playClick, playProvaHit, playTaskComplete } = useSound();
  const [fen, setFen] = useState(lesson.fen);
  const [got, setGot] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [pay, setPay] = useState<{ paid: boolean; xp: number } | null>(null);
  const done = got.length === lesson.targets.length;

  const onMove = (m: BoardMove) => {
    const c = new Chess(fen, { skipValidation: true });
    try {
      c.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
    } catch {
      return;
    }
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setLast({ from: m.from, to: m.to });
    setFen(whiteAgain(c.fen()));
    if (lesson.targets.includes(m.to) && !got.includes(m.to)) {
      const nextGot = [...got, m.to];
      setGot(nextGot);
      if (nextGot.length === lesson.targets.length) {
        playTaskComplete();
        void payChessSchool(uid, 'licao', lesson.id).then(setPay).catch(() => setPay({ paid: false, xp: 0 }));
      } else playProvaHit();
    } else playClick();
  };

  const reset = () => {
    playClick();
    setFen(lesson.fen);
    setGot([]);
    setMoves(0);
    setLast(null);
    setPay(null);
  };

  const stars = lessonStars(moves, lesson.par);
  return (
    <div className="ar-game" data-testid="escola-licao">
      <div className="ar-board-col">
        <Sabio line={done ? lesson.done : lesson.intro} />
        <ChessBoard
          fen={fen}
          orientation="w"
          movable={done ? null : 'w'}
          lastMove={last}
          onMove={onMove}
          onSelect={playClick}
          free
          marks={lesson.targets.filter((t) => !got.includes(t))}
          pieceFilter={lesson.piece}
        />
      </div>
      <aside className="ar-side">
        <div className="ar-log">
          <p><b>{lesson.title}</b></p>
          <p>Diamantes: {got.length} de {lesson.targets.length}</p>
          <p>Lances: {moves} (o caminho mais curto tem {lesson.par})</p>
          {done && (
            <>
              <p className="es-stars" aria-label={`${stars} estrelas`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</p>
              {pay?.paid && <p className="ar-log-hint">+{pay.xp} XP e 1 pedra.</p>}
              {pay && !pay.paid && <p>Lição já feita antes: dessa vez é só treino.</p>}
              {stars < 3 && <p>Dá para fazer em {lesson.par}. Quer tentar de novo?</p>}
            </>
          )}
        </div>
        <div className="ar-actions">
          <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={reset}>
            <RotateCcw className="w-4 h-4" /> Recomeçar
          </button>
          {done && (
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3" onClick={onNext} data-testid="escola-proxima">
              Próxima
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

const PuzzlePlay: React.FC<{ uid: string; puzzle: ChessPuzzle; index: number; onNext: () => void }> = ({ uid, puzzle, index, onNext }) => {
  const { playClick, playProvaHit, playProvaMiss, playTaskComplete } = useSound();
  const [fen, setFen] = useState(puzzle.fen);
  const [line, setLine] = useState('Brancas jogam e dão xeque-mate em 1 lance. Ache o lance!');
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState<{ from: string; to: string } | null>(null);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [pay, setPay] = useState<{ paid: boolean; xp: number } | null>(null);
  const theme = PUZZLE_THEMES[puzzle.theme];

  const onMove = (m: BoardMove) => {
    const c = new Chess(fen);
    try {
      c.move({ from: m.from, to: m.to, promotion: m.promotion });
    } catch {
      return;
    }
    setFen(c.fen());
    setLast({ from: m.from, to: m.to });
    if (c.isCheckmate()) {
      setSolved(true);
      setHint(null);
      playTaskComplete();
      setLine('Xeque-mate! O rei preto não tem para onde fugir.');
      void payChessSchool(uid, 'desafio', puzzle.id).then(setPay).catch(() => setPay({ paid: false, xp: 0 }));
      return;
    }
    playProvaMiss();
    setLine(c.inCheck() ? 'É xeque, mas o rei ainda escapa. Procure outro lance.' : 'Esse lance não dá mate. Olhe para onde o rei preto pode fugir.');
    window.setTimeout(() => {
      setFen(puzzle.fen);
      setLast(null);
    }, 900);
  };

  const showHint = () => {
    playClick();
    const c = new Chess(puzzle.fen);
    const m = c.move(puzzle.mates[0]);
    setHint({ from: m.from, to: m.from });
    setLine(`${theme.tip} A peça que dá o mate está piscando.`);
    playProvaHit();
  };

  return (
    <div className="ar-game" data-testid="escola-desafio">
      <div className="ar-board-col">
        <Sabio line={line} />
        <ChessBoard fen={fen} orientation="w" movable={solved ? null : 'w'} lastMove={last} hint={hint} onMove={onMove} onSelect={playClick} />
      </div>
      <aside className="ar-side">
        <div className="ar-log">
          <p><b>Desafio {index + 1} de {CHESS_PUZZLES.length}</b></p>
          <p>Tema: {theme.name}</p>
          {solved && pay?.paid && <p className="ar-log-hint">+{pay.xp} XP.</p>}
          {solved && pay && !pay.paid && <p>Desafio já resolvido antes.</p>}
        </div>
        <div className="ar-actions">
          {!solved && (
            <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={showHint} disabled={Boolean(hint)}>
              <Lightbulb className="w-4 h-4" /> Dica
            </button>
          )}
          {solved && index + 1 < CHESS_PUZZLES.length && (
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3" onClick={onNext} data-testid="escola-proximo-desafio">
              Próximo desafio
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

const EscolaSabio: React.FC<{ uid: string; onTitle: (t: string) => void; open: { kind: 'licao' | 'desafio'; index: number } | null; onOpen: (o: { kind: 'licao' | 'desafio'; index: number } | null) => void }> = ({ uid, onTitle, open, onOpen }) => {
  const { village } = useVillage();
  const { playClick } = useSound();
  const doneLessons = useMemo(() => new Set(CHESS_LESSONS.filter((l) => hasClaim(village, claimKey('xadrez', 'licao', l.id))).map((l) => l.id)), [village]);
  const donePuzzles = useMemo(() => new Set(CHESS_PUZZLES.filter((p) => hasClaim(village, claimKey('xadrez', 'desafio', p.id))).map((p) => p.id)), [village]);

  if (open?.kind === 'licao') {
    const lesson = CHESS_LESSONS[open.index];
    return (
      <LessonPlay
        key={lesson.id}
        uid={uid}
        lesson={lesson}
        onNext={() => {
          playClick();
          if (open.index + 1 < CHESS_LESSONS.length) {
            onTitle(CHESS_LESSONS[open.index + 1].title);
            onOpen({ kind: 'licao', index: open.index + 1 });
          } else onOpen(null);
        }}
      />
    );
  }
  if (open?.kind === 'desafio') {
    const puzzle = CHESS_PUZZLES[open.index];
    return (
      <PuzzlePlay
        key={puzzle.id}
        uid={uid}
        puzzle={puzzle}
        index={open.index}
        onNext={() => { playClick(); onOpen({ kind: 'desafio', index: open.index + 1 }); }}
      />
    );
  }

  return (
    <div className="ar-menu" data-testid="escola-lista">
      <Sabio line="Aqui a gente aprende com calma. Primeiro, como cada peça anda. Depois, os desafios de xeque-mate." />
      <h3 className="es-h">Como cada peça anda</h3>
      <div className="es-grid">
        {CHESS_LESSONS.map((l, i) => (
          <button key={l.id} type="button" className="es-card" onClick={() => { playClick(); onTitle(l.title); onOpen({ kind: 'licao', index: i }); }} data-testid={`escola-licao-${l.id}`}>
            <img src={pieceImage('w', l.piece as PieceType)} alt="" className="mc-pixel" />
            <span>{l.title}</span>
            {doneLessons.has(l.id) && <Check className="es-done" aria-label="feita" />}
          </button>
        ))}
      </div>
      <h3 className="es-h">Desafios: xeque-mate em 1 ({donePuzzles.size} de {CHESS_PUZZLES.length})</h3>
      <div className="es-puzzles">
        {CHESS_PUZZLES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`es-puzzle${donePuzzles.has(p.id) ? ' is-done' : ''}`}
            onClick={() => { playClick(); onTitle(`Desafio ${i + 1}`); onOpen({ kind: 'desafio', index: i }); }}
            title={PUZZLE_THEMES[p.theme].name}
            data-testid={`escola-desafio-${i + 1}`}
          >
            {donePuzzles.has(p.id) ? <Check /> : i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EscolaSabio;
