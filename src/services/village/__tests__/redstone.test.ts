import { expect, run, test } from '../../english/__tests__/harness';
import { addDays } from '../../../utils/clock';
import {
  RS_SIZE,
  cellIndex,
  clickCell,
  coachOf,
  dustArms,
  goalOf,
  howOf,
  initialState,
  isDustLook,
  isWon,
  lookOf,
  neighbors,
  noteDoneOf,
  reasoningOk,
  redstoneTier,
  sessionFor,
  sessionHash,
  sessionPay,
  simulate,
  solve,
  startTool,
  whyOf,
  type BenchState,
  type CellKind,
  type RedstonePuzzle,
} from '../redstone';

const fill = (kind: CellKind): CellKind[] => Array.from({ length: RS_SIZE }, () => kind);

const BAN = /anel|marcada|puxa as duas|desliga a/i;

const leversOf = (p: RedstonePuzzle): number[] => p.cells.map((k, i) => (k === 'lever' ? i : -1)).filter((i) => i >= 0);

const mashOf = (p: RedstonePuzzle): BenchState => {
  const start = initialState(p);
  return { ...start, leverOn: start.leverOn.map((_, i) => p.cells[i] === 'lever') };
};

const winCount = (p: RedstonePuzzle): number => {
  const levers = leversOf(p);
  const start = initialState(p);
  let n = 0;
  const bits = 1 << levers.length;
  for (let mask = 0; mask < bits; mask++) {
    const leverOn = start.leverOn.slice();
    for (let b = 0; b < levers.length; b++) leverOn[levers[b] as number] = Boolean(mask & (1 << b));
    if (isWon(p, { ...start, leverOn })) n += 1;
  }
  return n;
};

test('pagamento da sessão: 0 a 3 redstone, XP 5/7/9/11, sem gold', () => {
  expect(sessionPay(0)).toEqual({ redstone: 0, xp: 5 });
  expect(sessionPay(1)).toEqual({ redstone: 1, xp: 7 });
  expect(sessionPay(2)).toEqual({ redstone: 2, xp: 9 });
  expect(sessionPay(3)).toEqual({ redstone: 3, xp: 11 });
  expect(sessionPay(9)).toEqual({ redstone: 3, xp: 11 });
  expect(sessionPay(-1)).toEqual({ redstone: 0, xp: 5 });
  expect(redstoneTier(1)).toBe(1);
  expect(redstoneTier(5)).toBe(2);
  expect(redstoneTier(10)).toBe(3);
});

test('tocha inverte o fio', () => {
  const cells = fill('stone');
  cells[cellIndex(0, 2)] = 'lever';
  cells[cellIndex(1, 2)] = 'dust';
  cells[cellIndex(2, 2)] = 'torch';
  cells[cellIndex(3, 2)] = 'dust';
  cells[cellIndex(4, 2)] = 'lamp';
  const puzzle: RedstonePuzzle = {
    family: 'acender',
    title: 't',
    brief: 'b',
    hint: 'h',
    cells,
    leverStartsOn: false,
    pistonAnd: false,
    targetLamps: cells.map((k) => k === 'lamp'),
    targetPistons: Array.from({ length: RS_SIZE }, () => false),
    order: [],
    layoutHash: 'hand',
    mode: 'levers',
  };
  const off = initialState(puzzle);
  expect(simulate(puzzle, off).lampOn[cellIndex(4, 2)]).toBe(true);
  const on = clickCell(puzzle, off, cellIndex(0, 2)).state;
  expect(simulate(puzzle, on).lampOn[cellIndex(4, 2)]).toBe(false);
});

test('Recado feito destrava; contrato aberto não', () => {
  expect(noteDoneOf({ contracts: { a: { type: 'note', status: 'open' } } })).toBe(false);
  expect(noteDoneOf({ contracts: { a: { type: 'note', status: 'done' }, b: { type: 'forge', status: 'open' } } })).toBe(true);
  expect(noteDoneOf(null)).toBe(false);
});

test('sessão de 3 circuitos é estável na mesma semente', () => {
  const a = sessionFor('heitor', '2026-09-16', 1);
  const b = sessionFor('heitor', '2026-09-16', 1);
  expect(a).toHaveLength(3);
  expect(b).toHaveLength(3);
  expect(sessionHash(a)).toBe(sessionHash(b));
  expect(a.map((p) => p.stage)).toEqual([1, 2, 3]);
  expect(startTool(a[0] as RedstonePuzzle)).toBe('hand');
});

test('pó abre braço para peça e para o fio vizinho', () => {
  const cells = fill('stone');
  cells[cellIndex(0, 2)] = 'lever';
  cells[cellIndex(1, 2)] = 'dust';
  cells[cellIndex(2, 2)] = 'dust';
  cells[cellIndex(3, 2)] = 'lamp';
  const puzzle: RedstonePuzzle = {
    family: 'caminho',
    title: 't',
    brief: 'b',
    hint: 'h',
    cells,
    leverStartsOn: true,
    pistonAnd: false,
    targetLamps: cells.map((k) => k === 'lamp'),
    targetPistons: Array.from({ length: RS_SIZE }, () => false),
    order: [],
    layoutHash: 'arms',
    mode: 'paint',
  };
  const state = initialState(puzzle);
  const mid = dustArms(puzzle, state, cellIndex(1, 2));
  expect(mid.w).toBe(true);
  expect(mid.e).toBe(true);
  expect(mid.n).toBe(false);
  expect(mid.s).toBe(false);
  expect(isDustLook('empty', false)).toBe(false);
  expect(isDustLook('empty', true)).toBe(true);
  expect(dustArms(puzzle, state, cellIndex(0, 2))).toEqual({ n: false, e: false, s: false, w: false });
});

test('três raciocínios: contrário, recusar o E, E+NÃO', () => {
  const [p1, p2, p3] = sessionFor('heitor-logica', '2026-09-16', 1);
  if (!p1 || !p2 || !p3) throw new Error('sessão incompleta');

  expect(reasoningOk(p1)).toBe(true);
  expect(p1.stage).toBe(1);
  expect(p1.cells.includes('torch')).toBe(true);
  expect(winCount(p1)).toBe(1);
  expect(isWon(p1, mashOf(p1))).toBe(false);
  expect(goalOf(p1)).toBe('As duas lâmpadas acesas');
  const tRow = Math.floor(p1.cells.findIndex((k) => k === 'torch') / 8);
  const b = leversOf(p1).find((i) => Math.floor(i / 8) === tRow) as number;
  const a = leversOf(p1).find((i) => i !== b) as number;
  const s1 = initialState(p1);
  expect(s1.leverOn[b]).toBe(true);
  expect(s1.leverOn[a]).toBe(false);
  const onlyA = clickCell(p1, s1, a).state;
  expect(isWon(p1, onlyA)).toBe(false);
  expect(isWon(p1, clickCell(p1, onlyA, b).state)).toBe(true);

  expect(reasoningOk(p2)).toBe(true);
  expect(p2.stage).toBe(2);
  expect(p2.pistonAnd).toBe(true);
  expect(winCount(p2)).toBe(1);
  expect(isWon(p2, mashOf(p2))).toBe(false);
  expect(goalOf(p2)).toBe('Lâmpada acesa e pistão fechado');
  expect(isWon(p2, solve(p2))).toBe(true);

  expect(reasoningOk(p3)).toBe(true);
  expect(p3.stage).toBe(3);
  expect(p3.cells.includes('torch')).toBe(true);
  expect(p3.pistonAnd).toBe(true);
  expect(leversOf(p3)).toHaveLength(3);
  expect(winCount(p3)).toBe(1);
  expect(isWon(p3, mashOf(p3))).toBe(false);
  expect(goalOf(p3)).toBe('Pistão aberto e lâmpada acesa');

  for (const p of [p1, p2, p3]) {
    const zero = initialState(p);
    expect(BAN.test(goalOf(p))).toBe(false);
    expect(BAN.test(coachOf(p, zero, 'hand'))).toBe(false);
    expect(BAN.test(whyOf(p, mashOf(p)))).toBe(false);
    expect(BAN.test(lookOf(p, zero))).toBe(false);
    expect(coachOf(p, zero, 'hand').includes('Etapa')).toBe(true);
    expect(coachOf(p, zero, 'hand').includes('Pronto')).toBe(true);
    expect(lookOf(p, zero, false).includes('Pronto')).toBe(true);
  }
  expect(howOf(p1).map((c) => c.id)).toEqual(['lever', 'dust', 'torch', 'lamp']);
    expect(howOf(p2).map((c) => c.id)).toEqual(['lever', 'dust', 'lamp', 'piston']);
    expect(lookOf(p1, initialState(p1)).includes('contrário')).toBe(true);
    expect(lookOf(p2, mashOf(p2)).includes('pistão')).toBe(true);
    for (const p of [p1, p2, p3]) {
      expect(p.cells.includes('empty')).toBe(false);
      for (let i = 0; i < RS_SIZE; i++) {
        if (p.cells[i] !== 'dust') continue;
        const links = neighbors(i).filter((j) => {
          const k = p.cells[j];
          return k === 'dust' || k === 'lever' || k === 'torch' || k === 'lamp' || k === 'piston';
        }).length;
        expect(links).toBeGreaterThanOrEqual(2);
      }
    }
});

test('90 dias × 3 níveis: reasoningOk e hash de sessão único em 60 dias', () => {
  const uid = 'heitor-redstone';
  const start = '2026-09-16';
  for (const level of [1, 6, 12]) {
    const hashes: string[] = [];
    for (let d = 0; d < 90; d++) {
      const date = addDays(start, d);
      const session = sessionFor(uid, date, level);
      expect(session).toHaveLength(3);
      for (const p of session) {
        expect(p.cells).toHaveLength(RS_SIZE);
        expect(reasoningOk(p)).toBe(true);
        expect(isWon(p, solve(p))).toBe(true);
      }
      const h = sessionHash(session);
      const window = hashes.slice(Math.max(0, hashes.length - 59));
      const dup = window.indexOf(h);
      if (dup >= 0) throw new Error(`sessão repetida nível ${level} dia ${d} = ${d - window.length + dup}`);
      hashes.push(h);
    }
  }
});

void run();
