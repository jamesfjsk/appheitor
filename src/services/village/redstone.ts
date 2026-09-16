// ========================================
// Redstone: 3 circuitos de raciocínio por dia. Módulo puro (sem Firebase/React).
// Grade 8×5, semente uid+data+nível. Nunca gold.
// ========================================

export const RS_COLS = 8;
export const RS_ROWS = 5;
export const RS_SIZE = RS_COLS * RS_ROWS;
export const RS_MAX_TRIES = 2;

export const REDSTONE_FAMILIES = ['acender', 'caminho', 'porta', 'conserto', 'ordem'] as const;
export type RedstoneFamily = (typeof REDSTONE_FAMILIES)[number];
export type CellKind = 'empty' | 'stone' | 'dust' | 'lever' | 'torch' | 'lamp' | 'piston' | 'broken';
export type PlaceKind = 'none' | 'dust' | 'lever' | 'torch';
export type Tool = 'hand' | 'dust' | 'lever' | 'torch';
export type RedstoneMode = 'levers' | 'paint' | 'repair' | 'order' | 'build';
export type RedstoneTier = 1 | 2 | 3;
export type RedstoneStage = 1 | 2 | 3;

export interface RedstoneKit {
  dust: number;
  lever: number;
  torch: number;
}

export const EMPTY_KIT: RedstoneKit = { dust: 0, lever: 0, torch: 0 };
export const TOOLS: readonly Tool[] = ['hand', 'dust', 'lever', 'torch'];

export interface RedstonePuzzle {
  family: RedstoneFamily;
  title: string;
  brief: string;
  hint: string;
  cells: CellKind[];
  leverStartsOn: boolean;
  pistonAnd: boolean;
  targetLamps: boolean[];
  targetPistons: boolean[];
  order: number[];
  layoutHash: string;
  mode: RedstoneMode;
  kit?: RedstoneKit;
  solution?: PlaceKind[];
  noise?: number;
  stage?: RedstoneStage;
}

export interface BenchState {
  leverOn: boolean[];
  placed: PlaceKind[];
  repaired: boolean[];
  orderNext: number;
  orderDone: boolean;
}

export interface SimState {
  condPower: boolean[];
  torchOn: boolean[];
  lampOn: boolean[];
  pistonOn: boolean[];
}

export type ClickEvent = 'noop' | 'toggle' | 'paint' | 'place' | 'pick' | 'repair' | 'order-ok' | 'order-fail' | 'order-win';

function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0 || 0x9e3779b9;
}

type Rng = () => number;

function createRng(seed: number): Rng {
  let x = (seed >>> 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export function cellIndex(c: number, r: number): number {
  return r * RS_COLS + c;
}

export function cellXY(i: number): { c: number; r: number } {
  return { c: i % RS_COLS, r: Math.floor(i / RS_COLS) };
}

export function neighbors(i: number): number[] {
  const { c, r } = cellXY(i);
  const out: number[] = [];
  if (c > 0) out.push(i - 1);
  if (c < RS_COLS - 1) out.push(i + 1);
  if (r > 0) out.push(i - RS_COLS);
  if (r < RS_ROWS - 1) out.push(i + RS_COLS);
  return out;
}

function fill(kind: CellKind): CellKind[] {
  return Array.from({ length: RS_SIZE }, () => kind);
}

export const RS_HOW: readonly { id: CellKind; label: string }[] = [
  { id: 'lever', label: 'liga ou desliga o fio' },
  { id: 'dust', label: 'o sinal anda' },
  { id: 'torch', label: 'o contrário do fio da esquerda' },
  { id: 'lamp', label: 'acende se o sinal chegar' },
  { id: 'piston', label: 'só abre com os dois fios' },
];

/** Só as peças que estão neste circuito. */
export function howOf(puzzle: RedstonePuzzle): readonly { id: CellKind; label: string }[] {
  const has = new Set(puzzle.cells);
  return RS_HOW.filter((chip) => has.has(chip.id));
}

export function redstoneTier(minerLevel: number): RedstoneTier {
  if (minerLevel >= 10) return 3;
  if (minerLevel >= 5) return 2;
  return 1;
}


function isConductorAt(puzzle: RedstonePuzzle, state: BenchState, i: number): boolean {
  return kindAt(puzzle, state, i) === 'dust';
}

function isDeviceKind(kind: CellKind): boolean {
  return kind === 'lever' || kind === 'torch' || kind === 'lamp' || kind === 'piston';
}

export function nonePlaced(): PlaceKind[] {
  return Array.from({ length: RS_SIZE }, () => 'none');
}

export function kitOf(puzzle: RedstonePuzzle): RedstoneKit {
  return puzzle.kit ?? EMPTY_KIT;
}

/** O que está na casa agora: peça da planta ou peça que o minerador colocou. */
export function kindAt(puzzle: RedstonePuzzle, state: BenchState, i: number): CellKind {
  const base = puzzle.cells[i] ?? 'stone';
  if (base === 'broken') return state.repaired[i] ? 'dust' : 'broken';
  if (base !== 'empty') return base;
  const p = state.placed[i] ?? 'none';
  if (p === 'none') return 'empty';
  return p;
}

/** Pó visível: fio, queimado, ou chão pintado. */
export function isDustLook(kind: CellKind, painted: boolean): boolean {
  return kind === 'dust' || kind === 'broken' || (kind === 'empty' && painted);
}

export interface DustArms {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
}

const NO_ARMS: DustArms = { n: false, e: false, s: false, w: false };

/** Braços do fio até vizinho que também é fio ou peça. */
export function dustArms(puzzle: RedstonePuzzle, state: BenchState, i: number): DustArms {
  const kind = kindAt(puzzle, state, i);
  if (kind !== 'dust' && kind !== 'broken') return NO_ARMS;
  const link = (j: number): boolean => {
    const k = kindAt(puzzle, state, j);
    return isDeviceKind(k) || k === 'dust' || k === 'broken';
  };
  const { c, r } = cellXY(i);
  return {
    n: r > 0 && link(i - RS_COLS),
    e: c < RS_COLS - 1 && link(i + 1),
    s: r < RS_ROWS - 1 && link(i + RS_COLS),
    w: c > 0 && link(i - 1),
  };
}

export function kitLeft(puzzle: RedstonePuzzle, state: BenchState): RedstoneKit {
  const kit = kitOf(puzzle);
  const used: RedstoneKit = { dust: 0, lever: 0, torch: 0 };
  for (const p of state.placed) {
    if (p === 'dust') used.dust += 1;
    else if (p === 'lever') used.lever += 1;
    else if (p === 'torch') used.torch += 1;
  }
  return {
    dust: kit.dust - used.dust,
    lever: kit.lever - used.lever,
    torch: kit.torch - used.torch,
  };
}

export function initialState(puzzle: RedstonePuzzle): BenchState {
  return {
    leverOn: puzzle.cells.map((k, i) => {
      if (k !== 'lever' || !puzzle.leverStartsOn) return false;
      const row = cellXY(i).r;
      return puzzle.cells.some((ck, ci) => ck === 'torch' && cellXY(ci).r === row);
    }),
    placed: nonePlaced(),
    repaired: Array.from({ length: RS_SIZE }, () => false),
    orderNext: 0,
    orderDone: false,
  };
}

/** Tocha lê o vizinho oeste (o bloco em que está “plantada”) e só emite para os outros lados. */
function torchInputOf(i: number): number | null {
  const { c } = cellXY(i);
  return c > 0 ? i - 1 : null;
}

export function simulate(puzzle: RedstonePuzzle, state: BenchState): SimState {
  const torchOn = Array.from({ length: RS_SIZE }, () => false);
  let condPower = Array.from({ length: RS_SIZE }, () => false);
  for (let iter = 0; iter < 16; iter++) {
    for (let i = 0; i < RS_SIZE; i++) {
      if (kindAt(puzzle, state, i) !== 'torch') {
        torchOn[i] = false;
        continue;
      }
      const input = torchInputOf(i);
      const fed =
        input !== null &&
        ((kindAt(puzzle, state, input) === 'lever' && state.leverOn[input]) || Boolean(condPower[input]));
      torchOn[i] = !fed;
    }
    const next = Array.from({ length: RS_SIZE }, () => false);
    const q: number[] = [];
    const enqueue = (i: number): void => {
      if (!isConductorAt(puzzle, state, i)) return;
      if (next[i]) return;
      next[i] = true;
      q.push(i);
    };
    for (let i = 0; i < RS_SIZE; i++) {
      if (kindAt(puzzle, state, i) === 'lever' && state.leverOn[i]) {
        for (const j of neighbors(i)) enqueue(j);
      }
      if (torchOn[i]) {
        const input = torchInputOf(i);
        for (const j of neighbors(i)) {
          if (j === input) continue;
          enqueue(j);
        }
      }
    }
    while (q.length) {
      const i = q.shift() as number;
      for (const j of neighbors(i)) enqueue(j);
    }
    condPower = next;
  }

  const lampOn = puzzle.cells.map((k, i) => {
    if (k !== 'lamp') return false;
    if (puzzle.family === 'ordem') return state.orderDone;
    return neighbors(i).some(
      (j) => condPower[j] || torchOn[j] || (kindAt(puzzle, state, j) === 'lever' && state.leverOn[j]),
    );
  });

  const pistonOn = puzzle.cells.map((k, i) => {
    if (k !== 'piston') return false;
    const condN = neighbors(i).filter((j) => isConductorAt(puzzle, state, j));
    const powered = (j: number): boolean =>
      Boolean(condPower[j] || torchOn[j] || (kindAt(puzzle, state, j) === 'lever' && state.leverOn[j]));
    if (puzzle.pistonAnd && condN.length >= 2) return condN.every(powered);
    return neighbors(i).some(powered);
  });

  return { condPower, torchOn, lampOn, pistonOn };
}

export function isWon(puzzle: RedstonePuzzle, state: BenchState): boolean {
  if (puzzle.family === 'ordem') return state.orderDone;
  const sim = simulate(puzzle, state);
  const lampsOk = puzzle.cells.every((k, i) => k !== 'lamp' || sim.lampOn[i] === Boolean(puzzle.targetLamps[i]));
  const pistonsOk = puzzle.cells.every((k, i) => k !== 'piston' || sim.pistonOn[i] === Boolean(puzzle.targetPistons[i]));
  return lampsOk && pistonsOk;
}

export function clickCell(
  puzzle: RedstonePuzzle,
  state: BenchState,
  cell: number,
  tool: Tool = 'hand',
): { state: BenchState; event: ClickEvent } {
  if (cell < 0 || cell >= RS_SIZE) return { state, event: 'noop' };
  if (puzzle.mode === 'order' || puzzle.family === 'ordem') {
    const kind = kindAt(puzzle, state, cell);
    if (kind !== 'lever' || state.orderDone || state.leverOn[cell]) return { state, event: 'noop' };
    const expect = puzzle.order[state.orderNext];
    if (cell !== expect) {
      return { state: { ...state, orderNext: 0, leverOn: state.leverOn.map(() => false) }, event: 'order-fail' };
    }
    const leverOn = state.leverOn.map((v, i) => (i === cell ? true : v));
    const orderNext = state.orderNext + 1;
    const orderDone = orderNext >= puzzle.order.length;
    return {
      state: { ...state, leverOn, orderNext, orderDone },
      event: orderDone ? 'order-win' : 'order-ok',
    };
  }
  const base = puzzle.cells[cell];
  if (base === 'broken' && !state.repaired[cell]) {
    const repaired = state.repaired.map((v, i) => (i === cell ? true : v));
    return { state: { ...state, repaired }, event: 'repair' };
  }
  const here = state.placed[cell] ?? 'none';
  const kind = kindAt(puzzle, state, cell);
  const pickingLever = tool === 'lever' && here === 'lever';
  if (kind === 'lever' && !pickingLever) {
    const leverOn = state.leverOn.map((v, i) => (i === cell ? !v : v));
    return { state: { ...state, leverOn }, event: 'toggle' };
  }
  if (tool !== 'hand') {
    if (base !== 'empty') return { state, event: 'noop' };
    const placed = state.placed.slice();
    if (here === tool) {
      placed[cell] = 'none';
      const leverOn = here === 'lever' ? state.leverOn.map((v, i) => (i === cell ? false : v)) : state.leverOn;
      return { state: { ...state, placed, leverOn }, event: 'pick' };
    }
    if (here !== 'none') return { state, event: 'noop' };
    const left = kitLeft(puzzle, state);
    if (left[tool] <= 0) return { state, event: 'noop' };
    placed[cell] = tool;
    return { state: { ...state, placed }, event: 'place' };
  }
  if (puzzle.mode === 'paint' && base === 'empty') {
    const placed = state.placed.slice();
    const here = placed[cell] ?? 'none';
    placed[cell] = here === 'dust' ? 'none' : 'dust';
    return { state: { ...state, placed }, event: here === 'dust' ? 'pick' : 'paint' };
  }
  return { state, event: 'noop' };
}

export function sessionPay(stagesWon: number): { redstone: number; xp: number } {
  const n = Math.max(0, Math.min(3, Math.floor(Number(stagesWon) || 0)));
  return { redstone: n, xp: 5 + 2 * n };
}

export function noteDoneOf(plan: { contracts: Record<string, { type: string; status: string }> } | null | undefined): boolean {
  if (!plan) return false;
  return Object.values(plan.contracts).some((c) => c.type === 'note' && c.status === 'done');
}

export function goalOf(puzzle: RedstonePuzzle): string {
  if (puzzle.stage === 1) return 'As duas lâmpadas acesas';
  if (puzzle.stage === 2) return 'Lâmpada acesa e pistão fechado';
  if (puzzle.stage === 3) return 'Pistão aberto e lâmpada acesa';
  if (puzzle.family === 'porta') return 'Abre o pistão';
  if (puzzle.family === 'ordem') return 'Puxa as alavancas na ordem';
  if (puzzle.family === 'conserto') return 'Conserta o fio e acende a lâmpada';
  return 'Acende a lâmpada';
}

export function needsReady(puzzle: RedstonePuzzle): boolean {
  return puzzle.mode !== 'order' && puzzle.family !== 'ordem';
}

export function startTool(puzzle: RedstonePuzzle): Tool {
  if (puzzle.mode === 'order' || puzzle.family === 'ordem') return 'hand';
  const kit = kitOf(puzzle);
  if (kit.dust > 0) return 'dust';
  if (kit.lever > 0) return 'lever';
  if (kit.torch > 0) return 'torch';
  return 'hand';
}

export function lookOf(puzzle: RedstonePuzzle, state: BenchState, running = true): string {
  if (!running) return 'Pronto manda o sinal. Aí o fio acende ou não.';
  const sim = simulate(puzzle, state);
  const torch = puzzle.cells.findIndex((k) => k === 'torch');
  if (torch >= 0) {
    return sim.torchOn[torch]
      ? 'A tocha acendeu: o fio da esquerda está apagado. Ela faz o contrário.'
      : 'A tocha apagou: o fio da esquerda chegou. Ela faz o contrário.';
  }
  const piston = puzzle.cells.findIndex((k) => k === 'piston');
  if (piston >= 0) {
    if (sim.pistonOn[piston]) return 'O pistão abriu: os dois fios chegaram.';
    const lit = neighbors(piston).filter((j) => kindAt(puzzle, state, j) === 'dust' && sim.condPower[j]).length;
    if (lit === 1) return 'O pistão está fechado: chegou só um fio.';
    if (lit === 0) return 'O pistão está fechado: nenhum fio chegou.';
    return 'O pistão está fechado.';
  }
  return 'Olha o fio: vermelho é o sinal andando.';
}

export function coachOf(puzzle: RedstonePuzzle, state: BenchState, _tool: Tool): string {
  if (puzzle.stage) {
    return `Etapa ${puzzle.stage} de 3. Lê o fio. Pronto manda o sinal.`;
  }
  if (puzzle.family === 'ordem' || puzzle.mode === 'order') {
    if (state.orderDone) return 'Essa era a ordem. A lâmpada acendeu.';
    if (state.orderNext === 0) return 'Clica nas alavancas, uma por vez, na ordem certa.';
    const n = puzzle.order.length - state.orderNext;
    return n === 1 ? 'Isso. Falta uma alavanca.' : `Isso. Faltam ${n} alavancas.`;
  }
  if (isWon(puzzle, state)) return 'Aperta Pronto.';
  return 'Mexe nas alavancas, olha o fio, Pronto.';
}

export function whyOf(puzzle: RedstonePuzzle, state: BenchState): string {
  if (isWon(puzzle, state)) return '';
  const sim = simulate(puzzle, state);
  const pistonWant = puzzle.cells.findIndex((k, i) => k === 'piston' && puzzle.targetPistons[i]);
  const pistonExtra = puzzle.cells.findIndex((k, i) => k === 'piston' && !puzzle.targetPistons[i] && sim.pistonOn[i]);
  if (pistonExtra >= 0) return 'O pistão abre quando os dois fios chegam. Aqui ele tinha que ficar fechado.';
  if (pistonWant >= 0 && !sim.pistonOn[pistonWant]) return 'O pistão abre quando os dois fios chegam.';
  const torch = puzzle.cells.findIndex((k) => k === 'torch');
  if (torch >= 0 && !sim.torchOn[torch]) return 'A tocha faz o contrário do fio da esquerda.';
  const goalOff = puzzle.cells.some((k, i) => k === 'lamp' && puzzle.targetLamps[i] && !sim.lampOn[i]);
  if (goalOff) return 'A lâmpada ainda está apagada. Olha o fio e a tocha.';
  return 'Ainda não está no objetivo. Olha o que cada peça faz.';
}

export function reasoningOk(puzzle: RedstonePuzzle): boolean {
  if (puzzle.cells.length !== RS_SIZE) return false;
  if (isWon(puzzle, initialState(puzzle))) return false;
  const start = initialState(puzzle);
  const levers = leversOfAt(puzzle, start);
  if (levers.length < 2) return false;
  const mash = { ...start, leverOn: start.leverOn.map((_, i) => puzzle.cells[i] === 'lever') };
  if (isWon(puzzle, mash)) return false;
  let wins = 0;
  let mixed = false;
  const bits = 1 << levers.length;
  for (let mask = 0; mask < bits; mask++) {
    const st = applyMask(start, levers, mask);
    if (!isWon(puzzle, st)) continue;
    wins += 1;
    const on = levers.filter((i) => st.leverOn[i]).length;
    if (on > 0 && on < levers.length) mixed = true;
  }
  if (wins !== 1 || !mixed) return false;
  for (let i = 0; i < RS_SIZE; i++) {
    if (puzzle.cells[i] !== 'torch') continue;
    const { c } = cellXY(i);
    if (c === 0) return false;
    const west = puzzle.cells[i - 1];
    if (west !== 'dust' && west !== 'lever') return false;
  }
  if (puzzle.pistonAnd) {
    for (let i = 0; i < RS_SIZE; i++) {
      if (puzzle.cells[i] !== 'piston') continue;
      const dustN = neighbors(i).filter((j) => puzzle.cells[j] === 'dust');
      if (dustN.length !== 2) return false;
    }
  }
  if (puzzle.cells.includes('empty') || puzzle.cells.includes('broken')) return false;
  for (let i = 0; i < RS_SIZE; i++) {
    if (puzzle.cells[i] !== 'dust') continue;
    const links = neighbors(i).filter((j) => {
      const k = puzzle.cells[j];
      return k === 'dust' || k === 'lever' || k === 'torch' || k === 'lamp' || k === 'piston';
    }).length;
    if (links < 2) return false;
  }
  return isWon(puzzle, solve(puzzle));
}

function hashOf(p: Omit<RedstonePuzzle, 'layoutHash'>): string {
  const lamps = p.cells.map((k, i) => (k === 'lamp' && p.targetLamps[i] ? '1' : '0')).join('');
  const kit = p.kit ?? EMPTY_KIT;
  return `${p.family}:${p.stage ?? 0}:${p.title}:${p.cells.join('')}:${lamps}:${p.order.join('.')}:${p.pistonAnd ? 'A' : 'O'}:${p.leverStartsOn ? 1 : 0}:k${kit.dust}.${kit.lever}.${kit.torch}:n${p.noise ?? 0}`;
}

function finish(partial: Omit<RedstonePuzzle, 'layoutHash'>): RedstonePuzzle {
  const kit = partial.kit ?? EMPTY_KIT;
  const solution = partial.solution && partial.solution.length === RS_SIZE ? partial.solution : nonePlaced();
  const full = { ...partial, kit, solution };
  return { ...full, layoutHash: hashOf(full) };
}

function leversOfAt(puzzle: RedstonePuzzle, state: BenchState): number[] {
  const out: number[] = [];
  for (let i = 0; i < RS_SIZE; i++) if (kindAt(puzzle, state, i) === 'lever') out.push(i);
  return out;
}

function sealLogic(p: RedstonePuzzle, rng: Rng): RedstonePuzzle {
  const { layoutHash: _hash, ...rest } = p;
  return finish({
    ...rest,
    kit: EMPTY_KIT,
    solution: nonePlaced(),
    mode: 'levers',
    noise: randInt(rng, 0, 999999),
  });
}

const LANES = [0, 2, 4] as const;

function layRow(cells: CellKind[], row: number, end: CellKind, endCol = RS_COLS - 1): { lever: number; endAt: number } {
  const lever = cellIndex(0, row);
  const endAt = cellIndex(endCol, row);
  cells[lever] = 'lever';
  for (let c = 1; c < endCol; c++) cells[cellIndex(c, row)] = 'dust';
  cells[endAt] = end;
  return { lever, endAt };
}

function applyMask(state: BenchState, levers: number[], mask: number): BenchState {
  const leverOn = state.leverOn.slice();
  for (let b = 0; b < levers.length; b++) {
    leverOn[levers[b] as number] = Boolean(mask & (1 << b));
  }
  return { ...state, leverOn };
}

function andPair(rng: Rng): { aRow: number; bRow: number } {
  return rng() < 0.5 ? { aRow: 0, bRow: 2 } : { aRow: 2, bRow: 4 };
}

function layPistonAnd(cells: CellKind[], aRow: number, bRow: number): number {
  const pistonCol = 5;
  const piston = cellIndex(pistonCol, aRow);
  cells[piston] = 'piston';
  cells[cellIndex(0, aRow)] = 'lever';
  for (let c = 1; c < pistonCol; c++) cells[cellIndex(c, aRow)] = 'dust';
  cells[cellIndex(0, bRow)] = 'lever';
  for (let c = 1; c <= pistonCol; c++) cells[cellIndex(c, bRow)] = 'dust';
  const lo = Math.min(aRow, bRow);
  const hi = Math.max(aRow, bRow);
  for (let r = lo + 1; r < hi; r++) cells[cellIndex(pistonCol, r)] = 'dust';
  return piston;
}

function genStage1(rng: Rng): RedstonePuzzle {
  const cells = fill('stone');
  const rows = shuffle([...LANES], rng).slice(0, 2) as [number, number];
  const aRow = rows[0];
  const bRow = rows[1];
  const { endAt: lampA } = layRow(cells, aRow, 'lamp');
  const { endAt: lampB } = layRow(cells, bRow, 'lamp');
  const torchCol = randInt(rng, 2, 3);
  cells[cellIndex(torchCol, bRow)] = 'torch';
  return finish({
    family: 'acender',
    stage: 1,
    title: 'Duas lâmpadas',
    brief: 'As duas lâmpadas acesas.',
    hint: 'A tocha faz o contrário do fio da esquerda.',
    cells,
    leverStartsOn: true,
    pistonAnd: false,
    targetLamps: Array.from({ length: RS_SIZE }, (_, i) => i === lampA || i === lampB),
    targetPistons: Array.from({ length: RS_SIZE }, () => false),
    order: [],
    mode: 'levers',
  });
}

function genStage2(rng: Rng): RedstonePuzzle {
  const cells = fill('stone');
  const { aRow, bRow } = andPair(rng);
  layPistonAnd(cells, aRow, bRow);
  const lamp = cellIndex(7, bRow);
  cells[cellIndex(6, bRow)] = 'dust';
  cells[lamp] = 'lamp';
  const lamps = Array.from({ length: RS_SIZE }, () => false);
  lamps[lamp] = true;
  return finish({
    family: 'porta',
    stage: 2,
    title: 'Lâmpada e pistão',
    brief: 'Lâmpada acesa e pistão fechado.',
    hint: 'O pistão abre quando os dois fios chegam.',
    cells,
    leverStartsOn: false,
    pistonAnd: true,
    targetLamps: lamps,
    targetPistons: Array.from({ length: RS_SIZE }, () => false),
    order: [],
    mode: 'levers',
  });
}

function genStage3(rng: Rng): RedstonePuzzle {
  const cells = fill('stone');
  const { aRow, bRow } = andPair(rng);
  const piston = layPistonAnd(cells, aRow, bRow);
  const cRow = (LANES.find((r) => r !== aRow && r !== bRow) ?? 4) as number;
  const { endAt: lamp } = layRow(cells, cRow, 'lamp');
  const torchCol = randInt(rng, 2, 3);
  cells[cellIndex(torchCol, cRow)] = 'torch';
  const lamps = Array.from({ length: RS_SIZE }, () => false);
  lamps[lamp] = true;
  const pistons = Array.from({ length: RS_SIZE }, () => false);
  pistons[piston] = true;
  return finish({
    family: 'porta',
    stage: 3,
    title: 'Pistão e lâmpada',
    brief: 'Pistão aberto e lâmpada acesa.',
    hint: 'O pistão abre com os dois fios. A tocha faz o contrário.',
    cells,
    leverStartsOn: true,
    pistonAnd: true,
    targetLamps: lamps,
    targetPistons: pistons,
    order: [],
    mode: 'levers',
  });
}

export function solve(puzzle: RedstonePuzzle): BenchState {
  const start = initialState(puzzle);
  const levers = leversOfAt(puzzle, start);
  const bits = 1 << Math.max(1, levers.length);
  for (let mask = 0; mask < bits; mask++) {
    const st = applyMask(start, levers, mask);
    if (isWon(puzzle, st)) return st;
  }
  return start;
}

export function sessionFor(uid: string, date: string, minerLevel: number): RedstonePuzzle[] {
  const tier = redstoneTier(minerLevel);
  const gens = [genStage1, genStage2, genStage3];
  const out: RedstonePuzzle[] = [];
  for (let s = 0; s < 3; s++) {
    let found: RedstonePuzzle | null = null;
    for (let salt = 0; salt < 24; salt++) {
      const rng = createRng(seedFromString(`${uid}|${date}|st${s + 1}|t${tier}|s${salt}`));
      const p = sealLogic(gens[s](rng), rng);
      if (reasoningOk(p)) {
        found = p;
        break;
      }
    }
    if (!found) {
      const rng = createRng(seedFromString(`${uid}|${date}|st${s + 1}|fallback`));
      found = sealLogic(gens[s](rng), rng);
    }
    out.push(found);
  }
  return out;
}

export function sessionHash(session: RedstonePuzzle[]): string {
  return session.map((p) => p.layoutHash).join('|');
}

export function puzzleFor(uid: string, date: string, minerLevel: number): RedstonePuzzle {
  return sessionFor(uid, date, minerLevel)[0] as RedstonePuzzle;
}
