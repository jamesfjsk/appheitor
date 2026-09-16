// ========================================
// Vagoneta da Mina: 3 contas por dia. Módulo puro (sem Firebase/React).
// Soma de cabeça; o total só aparece no Enviar. Nunca gold.
// ========================================

export const CART_MAX_TRIES = 2;
export type CartStage = 1 | 2 | 3;

export interface CartPuzzle {
  stage: CartStage;
  title: string;
  crates: number[];
  loaded: number;
  target: number;
  needCount: number | null;
  noise: number;
  layoutHash: string;
}

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

function bitCount(m: number): number {
  let n = 0;
  while (m) {
    n += m & 1;
    m >>= 1;
  }
  return n;
}

export function emptyPick(n: number): boolean[] {
  return Array.from({ length: n }, () => false);
}

export function toggleCrate(on: boolean[], i: number): boolean[] {
  if (i < 0 || i >= on.length) return on;
  const next = on.slice();
  next[i] = !next[i];
  return next;
}

export function weigh(puzzle: CartPuzzle, on: boolean[]): { sum: number; count: number } {
  let sum = puzzle.loaded;
  let count = 0;
  for (let i = 0; i < puzzle.crates.length; i++) {
    if (!on[i]) continue;
    sum += puzzle.crates[i] as number;
    count += 1;
  }
  return { sum, count };
}

export function isWon(puzzle: CartPuzzle, on: boolean[]): boolean {
  const { sum, count } = weigh(puzzle, on);
  if (sum !== puzzle.target) return false;
  if (puzzle.needCount !== null && count !== puzzle.needCount) return false;
  return true;
}

export function whyOf(puzzle: CartPuzzle, on: boolean[]): string {
  const { sum, count } = weigh(puzzle, on);
  if (puzzle.needCount !== null && count !== puzzle.needCount) return 'contagem';
  if (sum > puzzle.target) return 'Tombou';
  if (sum < puzzle.target) return 'Faltou';
  return 'Tombou';
}

export function goalOf(puzzle: CartPuzzle): string {
  return String(puzzle.target);
}

export function coachOf(puzzle: CartPuzzle): string {
  return `Etapa ${puzzle.stage} de 3. Soma de cabeça. Enviar manda a vagoneta.`;
}

export function lookOf(puzzle: CartPuzzle, on: boolean[], running = true): string {
  if (!running) return 'O peso só aparece quando a vagoneta sai.';
  const { sum, count } = weigh(puzzle, on);
  if (puzzle.needCount !== null) return `Foram ${count} caixas. Peso ${sum}.`;
  return `Peso ${sum}.`;
}

export function howOf(puzzle: CartPuzzle): { id: string; label: string }[] {
  const chips = [
    { id: 'crate', label: 'O número é o peso.' },
    { id: 'cart', label: 'Clica na caixa pra por ou tirar.' },
    { id: 'send', label: 'O ferreiro pesa.' },
  ];
  if (puzzle.stage === 2) chips.push({ id: 'load', label: 'Já tem peso na vagoneta.' });
  if (puzzle.stage === 3) chips.push({ id: 'count', label: 'Conta as caixas também.' });
  return chips;
}

const FALLBACK: Record<CartStage, Omit<CartPuzzle, 'layoutHash'>> = {
  1: { stage: 1, title: 'A soma', crates: [2, 5, 7, 8, 10, 12], loaded: 0, target: 17, needCount: null, noise: 1 },
  2: { stage: 2, title: 'O que falta', crates: [2, 4, 7, 8, 10, 12], loaded: 5, target: 16, needCount: null, noise: 1 },
  3: { stage: 3, title: 'Três caixas', crates: [2, 4, 6, 9, 11, 12], loaded: 0, target: 17, needCount: 3, noise: 1 },
};

export function winMasks(puzzle: CartPuzzle): number[] {
  const n = puzzle.crates.length;
  const out: number[] = [];
  for (let m = 0; m < 1 << n; m++) {
    const on = Array.from({ length: n }, (_, i) => Boolean(m & (1 << i)));
    if (isWon(puzzle, on)) out.push(m);
  }
  return out;
}

export function cartOk(puzzle: CartPuzzle): boolean {
  const n = puzzle.crates.length;
  if (n < 6 || n > 7) return false;
  if (puzzle.target < 10 || puzzle.target > 22) return false;
  if (puzzle.crates.some((v) => v < 1 || v > 12)) return false;
  if (new Set(puzzle.crates).size !== n) return false;
  if (puzzle.stage === 2) {
    if (puzzle.loaded < 3 || puzzle.loaded >= puzzle.target) return false;
    if (puzzle.crates.includes(puzzle.target - puzzle.loaded)) return false;
  } else if (puzzle.loaded !== 0) return false;
  if (puzzle.stage === 3) {
    if (puzzle.needCount !== 3 && puzzle.needCount !== 4) return false;
  } else if (puzzle.needCount !== null) return false;
  const wins = winMasks(puzzle);
  if (wins.length !== 1) return false;
  const w = wins[0] as number;
  if (w === 0 || w === (1 << n) - 1) return false;
  const bits = bitCount(w);
  if (puzzle.stage === 1 && (bits < 3 || bits > 4)) return false;
  if (puzzle.stage === 2 && (bits < 2 || bits > 3)) return false;
  if (puzzle.stage === 3 && bits !== puzzle.needCount) return false;
  if (monkeyWin(puzzle, w)) return false;
  if (!hasBait(puzzle)) return false;
  return true;
}

function pickVals(puzzle: CartPuzzle, w: number): number[] {
  const vals: number[] = [];
  for (let i = 0; i < puzzle.crates.length; i++) {
    if (w & (1 << i)) vals.push(puzzle.crates[i] as number);
  }
  vals.sort((a, b) => a - b);
  return vals;
}

/** Atalho de macaco: os k menores, os k maiores, ou números seguidos. */
function monkeyWin(puzzle: CartPuzzle, w: number): boolean {
  const vals = pickVals(puzzle, w);
  const k = vals.length;
  if (k < 2) return true;
  if ((vals[k - 1] as number) - (vals[0] as number) === k - 1) return true;
  const all = [...puzzle.crates].sort((a, b) => a - b);
  const small = all.slice(0, k);
  const large = all.slice(all.length - k);
  if (vals.every((v, i) => v === small[i])) return true;
  if (vals.every((v, i) => v === large[i])) return true;
  return false;
}

/** Tem um jeito errado que quase fecha: peso ±1, ou peso certo com contagem errada. */
function hasBait(puzzle: CartPuzzle): boolean {
  const n = puzzle.crates.length;
  for (let m = 1; m < 1 << n; m++) {
    const on = Array.from({ length: n }, (_, i) => Boolean(m & (1 << i)));
    if (isWon(puzzle, on)) continue;
    const { sum } = weigh(puzzle, on);
    if (sum === puzzle.target - 1 || sum === puzzle.target + 1) return true;
    if (puzzle.needCount !== null && sum === puzzle.target) return true;
  }
  return false;
}

function hashOf(p: Omit<CartPuzzle, 'layoutHash'>): string {
  return `${p.stage}:${p.crates.join(',')}:L${p.loaded}:T${p.target}:c${p.needCount ?? 0}:n${p.noise}`;
}

function finish(partial: Omit<CartPuzzle, 'layoutHash' | 'noise'> & { noise?: number }, rng: Rng): CartPuzzle {
  const noise = partial.noise ?? randInt(rng, 0, 999999);
  const full = { ...partial, noise };
  return { ...full, layoutHash: hashOf(full) };
}

const POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function wagonCount(extra: number): number {
  return extra > 0 ? 7 : 6;
}

function draft(
  stage: CartStage,
  crates: number[],
  loaded: number,
  target: number,
  needCount: number | null,
): CartPuzzle {
  return {
    stage,
    title: '',
    crates,
    loaded,
    target,
    needCount,
    noise: 0,
    layoutHash: '',
  };
}

function bitsOk(stage: CartStage, bits: number, needCount: number | null): boolean {
  if (stage === 1) return bits >= 3 && bits <= 4;
  if (stage === 2) return bits >= 2 && bits <= 3;
  return bits === (needCount ?? 3);
}

function uniqueSoFar(
  stage: CartStage,
  crates: number[],
  loaded: number,
  target: number,
  needCount: number | null,
): boolean {
  if (crates.length === 0) return false;
  if (new Set(crates).size !== crates.length) return false;
  const wins = winMasks(draft(stage, crates, loaded, target, needCount));
  if (wins.length !== 1) return false;
  const w = wins[0] as number;
  const n = crates.length;
  if (w === 0) return false;
  if (n >= 2 && w === (1 << n) - 1) return false;
  return bitsOk(stage, bitCount(w), needCount);
}

function canAdd(
  stage: CartStage,
  crates: number[],
  loaded: number,
  target: number,
  needCount: number | null,
  value: number,
): boolean {
  if (crates.includes(value)) return false;
  return uniqueSoFar(stage, [...crates, value], loaded, target, needCount);
}

function baitRank(
  stage: CartStage,
  crates: number[],
  loaded: number,
  target: number,
  needCount: number | null,
  value: number,
): number {
  if (!canAdd(stage, crates, loaded, target, needCount, value)) return -1;
  const gap = target - loaded;
  let rank = 1;
  if (Math.abs(value - gap) === 1) rank += 4;
  if (Math.abs(value - gap) === 2) rank += 2;
  for (const c of crates) {
    if (c + value === target - 1 || c + value === target + 1) rank += 3;
    if (needCount !== null && c + value === target) rank += 6;
  }
  return rank;
}

function fillDecoys(
  stage: CartStage,
  start: number[],
  loaded: number,
  target: number,
  needCount: number | null,
  n: number,
  rng: Rng,
): number[] {
  const crates = [...start];
  while (crates.length < n) {
    const rest = POOL.filter((v) => !crates.includes(v));
    const ranked = rest
      .map((value) => ({ value, rank: baitRank(stage, crates, loaded, target, needCount, value) }))
      .filter((x) => x.rank >= 0);
    if (ranked.length === 0) break;
    ranked.sort((a, b) => b.rank - a.rank || 0);
    const best = ranked[0]!.rank;
    const top = shuffle(ranked.filter((x) => x.rank === best).map((x) => x.value), rng);
    crates.push(top[0] as number);
  }
  return crates;
}

function pickSolution(rng: Rng, k: number): number[] | null {
  const solution = shuffle(POOL, rng).slice(0, k);
  if (solution.length < k) return null;
  return solution;
}

function genStage1(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  for (let t = 0; t < 80; t++) {
    const k = rng() < (extra > 0 ? 0.55 : 0.4) ? 4 : 3;
    const solution = pickSolution(rng, k);
    if (!solution) continue;
    const target = solution.reduce((s, v) => s + v, 0);
    if (target < 10 || target > 22) continue;
    const crates = fillDecoys(1, solution, 0, target, null, n, rng);
    if (crates.length < n) continue;
    const p = finish({
      stage: 1,
      title: 'A soma',
      crates: shuffle(crates, rng),
      loaded: 0,
      target,
      needCount: null,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK[1], layoutHash: hashOf(FALLBACK[1]) };
}

function genStage2(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  for (let t = 0; t < 80; t++) {
    const k = rng() < 0.7 ? 3 : 2;
    const loaded = randInt(rng, 4, 9);
    const solution = pickSolution(rng, k);
    if (!solution) continue;
    const missing = solution.reduce((s, v) => s + v, 0);
    const target = loaded + missing;
    if (target < 10 || target > 22) continue;
    const crates = fillDecoys(2, solution, loaded, target, null, n, rng);
    if (crates.length < n) continue;
    const p = finish({
      stage: 2,
      title: 'O que falta',
      crates: shuffle(crates, rng),
      loaded,
      target,
      needCount: null,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK[2], layoutHash: hashOf(FALLBACK[2]) };
}

function genStage3(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  for (let t = 0; t < 80; t++) {
    const need = extra > 0 && rng() < 0.4 ? 4 : 3;
    const solution = pickSolution(rng, need);
    if (!solution) continue;
    const target = solution.reduce((s, v) => s + v, 0);
    if (target < 10 || target > 22) continue;
    const crates = fillDecoys(3, solution, 0, target, need, n, rng);
    if (crates.length < n) continue;
    const p = finish({
      stage: 3,
      title: 'Três caixas',
      crates: shuffle(crates, rng),
      loaded: 0,
      target,
      needCount: need,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK[3], layoutHash: hashOf(FALLBACK[3]) };
}

/** Quantos ganchos o trilho mostra. Nunca o tamanho secreto da resposta da etapa 1. */
export function hookSlots(puzzle: CartPuzzle): number {
  if (puzzle.needCount !== null) return puzzle.needCount;
  if (puzzle.stage === 2) return 2;
  return 4;
}

/** Mesmos pesos, outra ordem. Segunda tentativa não clica no mesmo lugar de memória. */
export function scrambleCrates(puzzle: CartPuzzle, salt: string): CartPuzzle {
  const rng = createRng(seedFromString(`${puzzle.layoutHash}|scramble|${salt}`));
  const crates = shuffle(puzzle.crates, rng);
  const next = { ...puzzle, crates, noise: puzzle.noise };
  return { ...next, layoutHash: hashOf(next) };
}

export function sessionFor(uid: string, date: string, minerLevel: number): CartPuzzle[] {
  const extra = minerLevel >= 10 ? 2 : minerLevel >= 5 ? 1 : 0;
  const gens: Array<(rng: Rng, extra: number) => CartPuzzle> = [genStage1, genStage2, genStage3];
  const out: CartPuzzle[] = [];
  for (let s = 0; s < 3; s++) {
    let found: CartPuzzle | null = null;
    const gen = gens[s] as (rng: Rng, extra: number) => CartPuzzle;
    for (let salt = 0; salt < 120; salt++) {
      const rng = createRng(seedFromString(`${uid}|${date}|cartv2|st${s + 1}|x${extra}|s${salt}`));
      const p = gen(rng, extra);
      if (cartOk(p)) {
        found = p;
        break;
      }
    }
    if (!found) {
      const rng = createRng(seedFromString(`${uid}|${date}|cartv2|st${s + 1}|x${extra}|can`));
      found = gen(rng, extra);
    }
    out.push(found);
  }
  return out;
}

export function sessionHash(session: CartPuzzle[]): string {
  return session.map((p) => p.layoutHash).join('|');
}
