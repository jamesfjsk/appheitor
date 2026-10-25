import { Chess } from 'chess.js';
import { expect, run, test } from '../../english/__tests__/harness';
import { BOT_LEVELS, PAID_WINS_PER_DAY, capturedPieces, moveLine, outcomeFor, randomMove, winReward } from '../../arena/chessGame';

test('xadrez: lance narrado em português', () => {
  const c = new Chess();
  expect(moveLine(c.move('Nf3'))).toBe('Cavalo para f3');
  c.load('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  expect(moveLine(c.move('exd5'))).toBe('Peão pega o peão em d5');
  c.load('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  expect(moveLine(c.move('O-O'))).toBe('Roque pequeno');
  c.load('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  expect(moveLine(c.move('Ra8#'))).toBe('Torre para a8. Xeque-mate!');
  c.load('8/P7/8/8/8/8/k7/6K1 w - - 0 1');
  expect(moveLine(c.move({ from: 'a7', to: 'a8', promotion: 'q' }))).toBe('Peão para a8 e vira dama. Xeque!');
});

test('xadrez: fim de partida do ponto de vista de quem joga', () => {
  const mate = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  mate.move('Ra8#');
  expect(outcomeFor(mate, 'w')?.result).toBe('win');
  expect(outcomeFor(mate, 'b')?.result).toBe('loss');
  const afogado = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  expect(outcomeFor(afogado, 'w')?.result).toBe('draw');
  expect(outcomeFor(new Chess(), 'w')).toBe(null);
});

test('xadrez: lance ao acaso é sempre válido e as peças perdidas aparecem', () => {
  const c = new Chess();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 40 && !c.isGameOver(); i++) {
    const m = randomMove(c, rnd);
    if (!m) break;
    c.move(m);
  }
  const lost = capturedPieces(c);
  expect(Array.isArray(lost.w) && Array.isArray(lost.b)).toBe(true);
});

test('xadrez: níveis em ordem, prêmio sem gold e com teto diário', () => {
  expect(BOT_LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4]);
  for (let i = 1; i < BOT_LEVELS.length; i++) expect(BOT_LEVELS[i].xp > BOT_LEVELS[i - 1].xp).toBe(true);
  expect(winReward(1).material).toBe(null);
  expect(winReward(4).material).toBe('redstone');
  expect(PAID_WINS_PER_DAY).toBe(3);
});

void run();
