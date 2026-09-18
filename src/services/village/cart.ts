// ========================================
// Vagoneta da Mina: 3 contas por dia. Módulo puro (sem Firebase/React).
// Soma de cabeça; o total só aparece no Enviar. Nunca gold.
// ========================================

export const CART_MAX_TRIES = 2;
/** Uma tentativa. Dá pra somar de cabeça; não dá pra abrir calculadora. */
export const CART_TRY_MS = 26_000;
export type CartStage = 1 | 2 | 3;
export type CartKind = 'sum' | 'product' | 'divide' | 'logic';
export const CART_RULES = ['odd', 'even', 'no5', 'no7', 'max7', 'min4'] as const;
export type CartRule = (typeof CART_RULES)[number];
export type CartBand = 0 | 1 | 2 | 3 | 4;
export type CartSkill = { redstoneDone?: number; redstonePerfect?: number };

export interface CartPuzzle {
  stage: CartStage;
  title: string;
  crates: number[];
  loaded: number;
  target: number;
  needCount: number | null;
  kind: CartKind;
  rule: CartRule | null;
  noise: number;
  layoutHash: string;
}

/** Teto pelo nível da mina. Sem XP de minerador, não pula pra × ÷ lógica. */
export function cartCap(level: number): CartBand {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  if (n >= 30) return 4;
  if (n >= 20) return 3;
  if (n >= 10) return 2;
  if (n >= 5) return 1;
  return 0;
}

/** Maestria da vagoneta: dias com acerto e dias 3 de 3. */
export function cartSkill(done: number, perfect: number): CartBand {
  const d = Math.max(0, Math.floor(Number(done) || 0));
  const p = Math.max(0, Math.floor(Number(perfect) || 0));
  if (d >= 18 && p >= 5) return 4;
  if (d >= 10 && p >= 2) return 3;
  if (d >= 5) return 2;
  if (d >= 2) return 1;
  return 0;
}

/** A faixa do dia é o menor entre o nível da mina e o que ele já mostrou na oficina. */
export function cartBand(level: number, skill: CartSkill = {}): CartBand {
  const cap = cartCap(level);
  const got = cartSkill(skill.redstoneDone ?? 0, skill.redstonePerfect ?? 0);
  return (got < cap ? got : cap) as CartBand;
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
  const hitch = hitchOf(puzzle, on);
  return { sum: puzzle.loaded + hitch.sum, count: hitch.count };
}

export function hitchOf(puzzle: CartPuzzle, on: boolean[]): { sum: number; count: number; product: number } {
  let sum = 0;
  let count = 0;
  let product = 1;
  for (let i = 0; i < puzzle.crates.length; i++) {
    if (!on[i]) continue;
    const v = puzzle.crates[i] as number;
    sum += v;
    count += 1;
    product *= v;
  }
  if (count === 0) product = 0;
  return { sum, count, product };
}

export function scoreOf(puzzle: CartPuzzle, on: boolean[]): number {
  const hitch = hitchOf(puzzle, on);
  if (puzzle.kind === 'product') return hitch.product;
  if (puzzle.kind === 'divide') {
    if (hitch.sum <= 0 || puzzle.loaded % hitch.sum !== 0) return hitch.sum;
    return puzzle.loaded / hitch.sum;
  }
  return puzzle.loaded + hitch.sum;
}

function crateFits(rule: CartRule, v: number): boolean {
  if (rule === 'odd') return v % 2 === 1;
  if (rule === 'even') return v % 2 === 0;
  if (rule === 'no5') return v !== 5;
  if (rule === 'no7') return v !== 7;
  if (rule === 'max7') return v <= 7;
  return v >= 4;
}

function ruleOk(puzzle: CartPuzzle, on: boolean[]): boolean {
  if (!puzzle.rule) return true;
  for (let i = 0; i < puzzle.crates.length; i++) {
    if (!on[i]) continue;
    if (!crateFits(puzzle.rule, puzzle.crates[i] as number)) return false;
  }
  return true;
}

export function isWon(puzzle: CartPuzzle, on: boolean[]): boolean {
  const hitch = hitchOf(puzzle, on);
  if (hitch.count === 0) return false;
  if (puzzle.kind === 'product') return hitch.count >= 2 && hitch.product === puzzle.target;
  if (puzzle.kind === 'divide') {
    if (hitch.sum <= 0 || puzzle.loaded % hitch.sum !== 0) return false;
    if (puzzle.loaded / hitch.sum !== puzzle.target) return false;
    if (puzzle.needCount !== null && hitch.count !== puzzle.needCount) return false;
    return true;
  }
  if (puzzle.kind === 'logic' && !ruleOk(puzzle, on)) return false;
  const { sum, count } = weigh(puzzle, on);
  if (sum !== puzzle.target) return false;
  if (puzzle.needCount !== null && count !== puzzle.needCount) return false;
  return true;
}

export function whyOf(puzzle: CartPuzzle, on: boolean[]): string {
  const hitch = hitchOf(puzzle, on);
  if (puzzle.kind === 'product') {
    if (hitch.product > puzzle.target) return 'Tombou';
    if (hitch.product < puzzle.target) return 'Faltou';
    return 'Tombou';
  }
  if (puzzle.kind === 'divide') {
    if (hitch.sum <= 0) return 'Faltou';
    if (puzzle.loaded % hitch.sum !== 0) return 'Faltou';
    const q = puzzle.loaded / hitch.sum;
    if (q < puzzle.target) return 'Tombou';
    if (q > puzzle.target) return 'Faltou';
    if (puzzle.needCount !== null && hitch.count !== puzzle.needCount) return 'contagem';
    return 'Tombou';
  }
  const { sum, count } = weigh(puzzle, on);
  if (puzzle.kind === 'logic' && sum === puzzle.target && !ruleOk(puzzle, on)) return 'contagem';
  if (puzzle.needCount !== null && count !== puzzle.needCount) return 'contagem';
  if (sum > puzzle.target) return 'Tombou';
  if (sum < puzzle.target) return 'Faltou';
  return 'Tombou';
}

export function goalOf(puzzle: CartPuzzle): string {
  return String(puzzle.target);
}

function ruleLine(rule: CartRule | null): string {
  if (rule === 'odd') return 'Só ímpares.';
  if (rule === 'even') return 'Só pares.';
  if (rule === 'no5') return 'Sem o 5.';
  if (rule === 'no7') return 'Sem o 7.';
  if (rule === 'max7') return 'Nenhuma maior que 7.';
  if (rule === 'min4') return 'Nenhuma menor que 4.';
  return 'Tem regra.';
}

export function askOf(puzzle: CartPuzzle): string {
  if (puzzle.kind === 'product') return 'Vezes.';
  if (puzzle.kind === 'divide') return 'Quanto em cada monte?';
  if (puzzle.kind === 'logic') return `Me traz ${puzzle.target}. ${ruleLine(puzzle.rule)}`;
  if (puzzle.needCount !== null) return `Me traz ${puzzle.target}. ${puzzle.needCount} caixas.`;
  if (puzzle.loaded > 0) return `Fecha ${puzzle.target}.`;
  return `Me traz ${puzzle.target}.`;
}

const TOMBOU_RIB = [
  (n: number) => `${n}? Quer derrubar o túnel?`,
  (n: number) => `${n}. A locomotiva não é boi.`,
  (n: number) => `${n}. Pesado demais, moleque.`,
];
const FALTOU_RIB = [
  (n: number) => `${n}? Tá de brincadeira?`,
  (n: number) => `${n}. Cadê o resto?`,
  (n: number) => `${n}. Isso não puxa nem um prego.`,
];
const COUNT_RIB = [
  (n: number) => `${n}. Quantidade errada, moleque.`,
  (n: number) => `${n}. Não é esse tanto.`,
];
const NOD = [
  (n: number) => `${n}. Agora sim.`,
  (n: number) => `${n}. Fechado.`,
  (n: number) => `${n}. Boa.`,
];

export type CartMood = 'ask' | 'hurry' | 'win' | 'Tombou' | 'Faltou' | 'contagem';

function pickRib(lines: ((n: number) => string)[], n: number, salt: number): string {
  return lines[Math.abs(salt) % lines.length]!(n);
}

export function sayOf(puzzle: CartPuzzle, mood: CartMood, sum = 0, salt = 0): string {
  if (mood === 'ask') return askOf(puzzle);
  if (mood === 'hurry') {
    if (puzzle.kind === 'product') return 'Anda. Vezes.';
    if (puzzle.kind === 'divide') return 'Anda. Quanto em cada?';
    if (puzzle.kind === 'logic') return `Anda. ${ruleLine(puzzle.rule)}`;
    return `Anda, moleque. ${puzzle.target}.`;
  }
  if (mood === 'win') return pickRib(NOD, sum > 0 ? sum : puzzle.target, salt);
  if (mood === 'Tombou') return pickRib(TOMBOU_RIB, sum, salt);
  if (mood === 'Faltou') return pickRib(FALTOU_RIB, sum, salt);
  return pickRib(COUNT_RIB, sum, salt);
}

/** Fala do ferreiro quando a oficina fecha. Sem número da última conta. */
export function closeOf(stagesWon: number | null): string {
  if (stagesWon === null) return 'Já foi hoje. Amanhã tem mais.';
  if (stagesWon >= 3) return 'Oficina fechada. Amanhã tem mais.';
  if (stagesWon <= 0) return 'Amanhã a gente tenta de novo.';
  return 'Por hoje chega. Amanhã tem mais.';
}

export function coachOf(puzzle: CartPuzzle): string {
  return `Etapa ${puzzle.stage} de 3. Soma de cabeça. Enviar manda a vagoneta.`;
}

export function lookOf(puzzle: CartPuzzle, on: boolean[], running = true): string {
  if (!running) return 'O peso só aparece quando a vagoneta sai.';
  const hitch = hitchOf(puzzle, on);
  if (puzzle.kind === 'product') return `Foram ${hitch.count} caixas. Produto ${hitch.product}.`;
  if (puzzle.kind === 'divide') return `Peso ${hitch.sum}.`;
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
  if (puzzle.kind === 'product') chips.push({ id: 'mul', label: 'Multiplica as caixas.' });
  if (puzzle.kind === 'divide') chips.push({ id: 'div', label: 'O trem divide.' });
  if (puzzle.kind === 'logic') chips.push({ id: 'rule', label: ruleLine(puzzle.rule) });
  return chips;
}

const FALLBACK: Record<CartStage, Omit<CartPuzzle, 'layoutHash'>> = {
  1: { stage: 1, title: 'A soma', crates: [2, 5, 7, 8, 10, 12], loaded: 0, target: 17, needCount: null, kind: 'sum', rule: null, noise: 1 },
  2: { stage: 2, title: 'O que falta', crates: [2, 4, 7, 8, 10, 12], loaded: 5, target: 16, needCount: null, kind: 'sum', rule: null, noise: 1 },
  3: { stage: 3, title: 'Três caixas', crates: [2, 4, 6, 9, 11, 12], loaded: 0, target: 17, needCount: 3, kind: 'sum', rule: null, noise: 1 },
};

const FALLBACK_PRODUCT: Omit<CartPuzzle, 'layoutHash'> = {
  stage: 2, title: 'Multiplica', crates: [2, 3, 4, 5, 7, 8], loaded: 0, target: 12, needCount: null, kind: 'product', rule: null, noise: 1,
};
const FALLBACK_DIVIDE: Omit<CartPuzzle, 'layoutHash'> = {
  stage: 1, title: 'Divide', crates: [1, 2, 4, 7, 8, 10], loaded: 24, target: 4, needCount: null, kind: 'divide', rule: null, noise: 1,
};
const FALLBACK_LOGIC: Omit<CartPuzzle, 'layoutHash'> = {
  stage: 3, title: 'Ímpares', crates: [1, 3, 5, 7, 8, 10], loaded: 0, target: 15, needCount: 3, kind: 'logic', rule: 'odd', noise: 1,
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
  if (puzzle.crates.some((v) => v < 1 || v > 12)) return false;
  if (new Set(puzzle.crates).size !== n) return false;
  const kind = puzzle.kind || 'sum';
  if (kind === 'product') {
    if (puzzle.loaded !== 0 || puzzle.needCount !== null) return false;
    if (puzzle.target < 6 || puzzle.target > 36) return false;
  } else if (kind === 'divide') {
    if (puzzle.loaded < 12 || puzzle.target < 2) return false;
    if (puzzle.loaded % puzzle.target !== 0) return false;
    const gap = puzzle.loaded / puzzle.target;
    if (puzzle.crates.includes(gap)) return false;
  } else {
    if (puzzle.target < 10 || puzzle.target > 28) return false;
    if (kind === 'sum' && puzzle.stage === 2) {
      if (puzzle.loaded < 3 || puzzle.loaded >= puzzle.target) return false;
      if (puzzle.crates.includes(puzzle.target - puzzle.loaded)) return false;
    } else if (kind !== 'logic' && puzzle.loaded !== 0 && puzzle.stage !== 2) return false;
    if (kind === 'logic') {
      if (!puzzle.rule || !CART_RULES.includes(puzzle.rule)) return false;
      if (puzzle.needCount !== 3 && puzzle.needCount !== 4) return false;
    } else if (puzzle.stage === 3) {
      if (puzzle.needCount !== 3 && puzzle.needCount !== 4) return false;
    } else if (puzzle.needCount !== null) return false;
  }
  const wins = winMasks(puzzle);
  if (wins.length !== 1) return false;
  const w = wins[0] as number;
  if (w === 0 || w === (1 << n) - 1) return false;
  const bits = bitCount(w);
  if (kind === 'product' && bits !== 2) return false;
  if (kind === 'divide' && (bits < 2 || bits > 3)) return false;
  if (kind === 'logic' && bits !== puzzle.needCount) return false;
  if (kind === 'sum') {
    if (puzzle.stage === 1 && (bits < 3 || bits > 4)) return false;
    if (puzzle.stage === 2 && (bits < 2 || bits > 3)) return false;
    if (puzzle.stage === 3 && bits !== puzzle.needCount) return false;
  }
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
  const kind = puzzle.kind || 'sum';
  if (kind !== 'product' && kind !== 'divide') {
    if ((vals[k - 1] as number) - (vals[0] as number) === k - 1) return true;
  }
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
    const hitch = hitchOf(puzzle, on);
    if (puzzle.kind === 'product') {
      if (hitch.sum === puzzle.target) return true;
      if (hitch.product === puzzle.target - 1 || hitch.product === puzzle.target + 1) return true;
      continue;
    }
    if (puzzle.kind === 'divide') {
      const gap = puzzle.loaded / puzzle.target;
      if (hitch.sum === gap - 1 || hitch.sum === gap + 1) return true;
      continue;
    }
    const { sum } = weigh(puzzle, on);
    if (sum === puzzle.target - 1 || sum === puzzle.target + 1) return true;
    if (puzzle.needCount !== null && sum === puzzle.target) return true;
    if (puzzle.kind === 'logic' && sum === puzzle.target) return true;
  }
  return false;
}

function hashOf(p: Omit<CartPuzzle, 'layoutHash'>): string {
  return `${p.stage}:${p.kind}:${p.rule ?? ''}:${p.crates.join(',')}:L${p.loaded}:T${p.target}:c${p.needCount ?? 0}:n${p.noise}`;
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
  kind: CartKind = 'sum',
  rule: CartRule | null = null,
): CartPuzzle {
  return {
    stage,
    title: '',
    crates,
    loaded,
    target,
    needCount,
    kind,
    rule,
    noise: 0,
    layoutHash: '',
  };
}

function bitsOk(stage: CartStage, bits: number, needCount: number | null, kind: CartKind = 'sum'): boolean {
  if (kind === 'product') return bits === 2;
  if (kind === 'divide') return bits >= 2 && bits <= 3;
  if (kind === 'logic') return bits === (needCount ?? 3);
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
  kind: CartKind = 'sum',
  rule: CartRule | null = null,
): boolean {
  if (crates.length === 0) return false;
  if (new Set(crates).size !== crates.length) return false;
  const wins = winMasks(draft(stage, crates, loaded, target, needCount, kind, rule));
  if (wins.length !== 1) return false;
  const w = wins[0] as number;
  const n = crates.length;
  if (w === 0) return false;
  if (n >= 2 && w === (1 << n) - 1) return false;
  return bitsOk(stage, bitCount(w), needCount, kind);
}

function canAdd(
  stage: CartStage,
  crates: number[],
  loaded: number,
  target: number,
  needCount: number | null,
  value: number,
  kind: CartKind = 'sum',
  rule: CartRule | null = null,
): boolean {
  if (crates.includes(value)) return false;
  return uniqueSoFar(stage, [...crates, value], loaded, target, needCount, kind, rule);
}

function baitRank(
  stage: CartStage,
  crates: number[],
  loaded: number,
  target: number,
  needCount: number | null,
  value: number,
  kind: CartKind = 'sum',
  rule: CartRule | null = null,
): number {
  if (!canAdd(stage, crates, loaded, target, needCount, value, kind, rule)) return -1;
  let rank = 1;
  if (kind === 'product') {
    for (const c of crates) {
      if (c + value === target) rank += 6;
      if (c * value === target + 1 || c * value === target - 1) rank += 3;
    }
    return rank;
  }
  if (kind === 'divide') {
    const gap = loaded / target;
    if (Math.abs(value - gap) === 1) rank += 4;
    return rank;
  }
  const gap = target - loaded;
  if (Math.abs(value - gap) === 1) rank += 4;
  if (Math.abs(value - gap) === 2) rank += 2;
  for (const c of crates) {
    if (c + value === target - 1 || c + value === target + 1) rank += 3;
    if (needCount !== null && c + value === target) rank += 6;
    if (kind === 'logic' && rule && !crateFits(rule, value) && c + value === target) rank += 5;
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
  kind: CartKind = 'sum',
  rule: CartRule | null = null,
): number[] {
  const crates = [...start];
  while (crates.length < n) {
    const rest = POOL.filter((v) => !crates.includes(v));
    const ranked = rest
      .map((value) => ({ value, rank: baitRank(stage, crates, loaded, target, needCount, value, kind, rule) }))
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

function pickSumTo(rng: Rng, k: number, gap: number): number[] | null {
  const pool = POOL.filter((v) => v !== gap);
  const hits: number[][] = [];
  if (k === 2) {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if ((pool[i] as number) + (pool[j] as number) === gap) hits.push([pool[i] as number, pool[j] as number]);
      }
    }
  } else {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        for (let m = j + 1; m < pool.length; m++) {
          if ((pool[i] as number) + (pool[j] as number) + (pool[m] as number) === gap) {
            hits.push([pool[i] as number, pool[j] as number, pool[m] as number]);
          }
        }
      }
    }
  }
  if (hits.length === 0) return null;
  return hits[randInt(rng, 0, hits.length - 1)] as number[];
}

function genStage1(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  const tmax = extra > 0 ? 28 : 22;
  for (let t = 0; t < 80; t++) {
    const k = rng() < (extra > 0 ? 0.55 : 0.4) ? 4 : 3;
    const solution = pickSolution(rng, k);
    if (!solution) continue;
    const target = solution.reduce((s, v) => s + v, 0);
    if (target < 10 || target > tmax) continue;
    const crates = fillDecoys(1, solution, 0, target, null, n, rng, 'sum', null);
    if (crates.length < n) continue;
    const p = finish({
      stage: 1,
      title: 'A soma',
      crates: shuffle(crates, rng),
      loaded: 0,
      target,
      needCount: null,
      kind: 'sum',
      rule: null,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK[1], layoutHash: hashOf(FALLBACK[1]) };
}

function genStage2(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  const tmax = extra > 0 ? 28 : 22;
  for (let t = 0; t < 80; t++) {
    const k = rng() < 0.7 ? 3 : 2;
    const loaded = randInt(rng, 4, 9);
    const solution = pickSolution(rng, k);
    if (!solution) continue;
    const missing = solution.reduce((s, v) => s + v, 0);
    const target = loaded + missing;
    if (target < 10 || target > tmax) continue;
    const crates = fillDecoys(2, solution, loaded, target, null, n, rng, 'sum', null);
    if (crates.length < n) continue;
    const p = finish({
      stage: 2,
      title: 'O que falta',
      crates: shuffle(crates, rng),
      loaded,
      target,
      needCount: null,
      kind: 'sum',
      rule: null,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK[2], layoutHash: hashOf(FALLBACK[2]) };
}

function genStage3(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  const tmax = extra > 0 ? 28 : 22;
  for (let t = 0; t < 80; t++) {
    const need = extra > 0 && rng() < 0.4 ? 4 : 3;
    const solution = pickSolution(rng, need);
    if (!solution) continue;
    const target = solution.reduce((s, v) => s + v, 0);
    if (target < 10 || target > tmax) continue;
    const crates = fillDecoys(3, solution, 0, target, need, n, rng, 'sum', null);
    if (crates.length < n) continue;
    const p = finish({
      stage: 3,
      title: 'Três caixas',
      crates: shuffle(crates, rng),
      loaded: 0,
      target,
      needCount: need,
      kind: 'sum',
      rule: null,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK[3], layoutHash: hashOf(FALLBACK[3]) };
}

function genProduct(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  const factors = [2, 3, 4, 5, 6, 7, 8, 9];
  for (let t = 0; t < 80; t++) {
    const a = factors[randInt(rng, 0, factors.length - 1)] as number;
    const rest = factors.filter((x) => x !== a);
    const b = rest[randInt(rng, 0, rest.length - 1)] as number;
    const target = a * b;
    if (target < 6 || target > 36) continue;
    const crates = fillDecoys(2, [a, b], 0, target, null, n, rng, 'product', null);
    if (crates.length < n) continue;
    const p = finish({
      stage: 2,
      title: 'Multiplica',
      crates: shuffle(crates, rng),
      loaded: 0,
      target,
      needCount: null,
      kind: 'product',
      rule: null,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK_PRODUCT, layoutHash: hashOf(FALLBACK_PRODUCT) };
}

function genDivide(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  const loads = [12, 16, 18, 20, 24, 30, 36];
  for (let t = 0; t < 80; t++) {
    const loaded = loads[randInt(rng, 0, loads.length - 1)] as number;
    const parts: number[] = [];
    for (let d = 2; d <= 8; d++) {
      if (loaded % d === 0) {
        const q = loaded / d;
        if (q >= 3 && q <= 12) parts.push(q);
      }
    }
    if (parts.length === 0) continue;
    const target = parts[randInt(rng, 0, parts.length - 1)] as number;
    const gap = loaded / target;
    const k = rng() < 0.65 ? 2 : 3;
    const solution = pickSumTo(rng, k, gap);
    if (!solution) continue;
    const crates = fillDecoys(1, solution, loaded, target, null, n, rng, 'divide', null);
    if (crates.length < n) continue;
    const p = finish({
      stage: 1,
      title: 'Divide',
      crates: shuffle(crates, rng),
      loaded,
      target,
      needCount: null,
      kind: 'divide',
      rule: null,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK_DIVIDE, layoutHash: hashOf(FALLBACK_DIVIDE) };
}

function poolOf(rule: CartRule): number[] {
  if (rule === 'odd') return [1, 3, 5, 7, 9, 11];
  if (rule === 'even') return [2, 4, 6, 8, 10, 12];
  if (rule === 'no5') return POOL.filter((v) => v !== 5);
  if (rule === 'no7') return POOL.filter((v) => v !== 7);
  if (rule === 'max7') return [1, 2, 3, 4, 5, 6, 7];
  return [4, 5, 6, 7, 8, 9, 10, 11, 12];
}

function genLogic(rng: Rng, extra: number): CartPuzzle {
  const n = wagonCount(extra);
  const order = shuffle([...CART_RULES], rng);
  for (let t = 0; t < 80; t++) {
    const rule = order[t % order.length] as CartRule;
    const pool = poolOf(rule);
    const need = 3;
    const solution = shuffle(pool, rng).slice(0, need);
    if (solution.length < need) continue;
    const target = solution.reduce((s, v) => s + v, 0);
    if (target < 10 || target > 28) continue;
    const crates = fillDecoys(3, solution, 0, target, need, n, rng, 'logic', rule);
    if (crates.length < n) continue;
    const p = finish({
      stage: 3,
      title: ruleLine(rule).replace(/\.$/, ''),
      crates: shuffle(crates, rng),
      loaded: 0,
      target,
      needCount: need,
      kind: 'logic',
      rule,
    }, rng);
    if (cartOk(p)) return p;
  }
  return { ...FALLBACK_LOGIC, layoutHash: hashOf(FALLBACK_LOGIC) };
}

/** Quantos ganchos o trilho mostra. Nunca o tamanho secreto da resposta da etapa 1. */
export function hookSlots(puzzle: CartPuzzle): number {
  if (puzzle.kind === 'product') return 2;
  if (puzzle.needCount !== null) return puzzle.needCount;
  if (puzzle.kind === 'divide' || puzzle.stage === 2) return 2;
  return 4;
}

/** Mesmos pesos, outra ordem. Segunda tentativa não clica no mesmo lugar de memória. */
export function scrambleCrates(puzzle: CartPuzzle, salt: string): CartPuzzle {
  const rng = createRng(seedFromString(`${puzzle.layoutHash}|scramble|${salt}`));
  const crates = shuffle(puzzle.crates, rng);
  const next = { ...puzzle, crates, noise: puzzle.noise };
  return { ...next, layoutHash: hashOf(next) };
}

function gensFor(band: CartBand): Array<(rng: Rng, extra: number) => CartPuzzle> {
  if (band === 0) return [genStage1, genStage2, genStage3];
  if (band === 1) return [genStage1, genStage2, genStage3];
  if (band === 2) return [genStage1, genProduct, genStage3];
  if (band === 3) return [genProduct, genDivide, genStage3];
  return [genDivide, genProduct, genLogic];
}

export function sessionFor(uid: string, date: string, minerLevel: number, skill: CartSkill = {}): CartPuzzle[] {
  const band = cartBand(minerLevel, skill);
  const extra = minerLevel >= 10 ? 2 : minerLevel >= 5 ? 1 : 0;
  const gens = gensFor(band);
  const out: CartPuzzle[] = [];
  for (let s = 0; s < 3; s++) {
    let found: CartPuzzle | null = null;
    const gen = gens[s] as (rng: Rng, extra: number) => CartPuzzle;
    for (let salt = 0; salt < 120; salt++) {
      const rng = createRng(seedFromString(`${uid}|${date}|cartv4|b${band}|st${s + 1}|x${extra}|s${salt}`));
      const p = gen(rng, extra);
      if (cartOk(p)) {
        found = p;
        break;
      }
    }
    if (!found) {
      const rng = createRng(seedFromString(`${uid}|${date}|cartv4|b${band}|st${s + 1}|x${extra}|can`));
      found = gen(rng, extra);
    }
    out.push(found);
  }
  return out;
}

export function sessionHash(session: CartPuzzle[]): string {
  return session.map((p) => p.layoutHash).join('|');
}
