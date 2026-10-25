import { Chess } from 'chess.js';
import { expect, run, test } from '../../english/__tests__/harness';
import { CHESS_LESSONS, lessonStars } from '../../../data/chessLessons';
import { CHESS_PUZZLES, PUZZLE_THEMES } from '../../../data/chessPuzzles';

const whiteAgain = (fen: string) => {
  const p = fen.split(' ');
  p[1] = 'w';
  p[3] = '-';
  return p.join(' ');
};

/** Menor número de lances que pega todos os diamantes, mexendo só a peça da lição. */
function shortest(fen: string, piece: string, targets: string[], limit: number): number | null {
  let frontier: Array<{ fen: string; got: string }> = [{ fen, got: '' }];
  const seen = new Set([`${fen.split(' ')[0]}|`]);
  for (let depth = 1; depth <= limit; depth++) {
    const next: Array<{ fen: string; got: string }> = [];
    for (const s of frontier) {
      const c = new Chess(s.fen, { skipValidation: true });
      for (const m of c.moves({ verbose: true })) {
        if (m.piece !== piece) continue;
        if (m.promotion && m.promotion !== 'q') continue;
        c.move(m);
        const got = targets.includes(m.to) && !s.got.split(',').includes(m.to) ? [s.got, m.to].filter(Boolean).sort().join(',') : s.got;
        const nf = whiteAgain(c.fen());
        c.undo();
        if (got.split(',').filter(Boolean).length === targets.length) return depth;
        const key = `${nf.split(' ')[0]}|${got}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ fen: nf, got });
      }
    }
    frontier = next;
  }
  return null;
}

test('escola: cada lição fecha exatamente na meta de lances', () => {
  for (const l of CHESS_LESSONS) {
    const best = shortest(l.fen, l.piece, l.targets, l.par + 1);
    if (best !== l.par) throw new Error(`${l.id}: meta ${l.par}, menor caminho ${best}`);
  }
});

test('escola: estrelas pela distância da meta', () => {
  expect(lessonStars(3, 3)).toBe(3);
  expect(lessonStars(5, 3)).toBe(2);
  expect(lessonStars(9, 3)).toBe(1);
});

test('desafios: todos são mate em 1 de verdade, sem xeque no começo', () => {
  expect(CHESS_PUZZLES.length >= 20).toBe(true);
  expect(new Set(CHESS_PUZZLES.map((p) => p.id)).size).toBe(CHESS_PUZZLES.length);
  for (const p of CHESS_PUZZLES) {
    const c = new Chess(p.fen);
    if (c.inCheck()) throw new Error(`${p.id}: começa em xeque`);
    for (const san of p.mates) {
      c.move(san);
      if (!c.isCheckmate()) throw new Error(`${p.id}: ${san} não é mate`);
      c.undo();
    }
    if (!PUZZLE_THEMES[p.theme]) throw new Error(`${p.id}: tema sem nome`);
  }
});

void run();
