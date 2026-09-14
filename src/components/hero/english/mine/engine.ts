// ========================================
// Mine Rush: motor puro da corrida (sem React, sem DOM; roda em Node)
// Único import: ./types. A tela chama createRun -> start -> tick a cada quadro,
// chooseLane no gesto do jogador, drainEvents para som/HUD e summarize no fim.
//
// Decisões de tempo:
// - Uma fileira julgada por vez: a próxima nasce quando não há fileira viva
//   (e respeitando spawnGapMs desde o último nascimento). Assim o tempo de
//   decisão é a janela inteira (4,0 -> 2,0 s) e 40 blocos duram ~100 s.
// - Após um erro, highlightMs mostra o bloco certo e nada nasce nesse período.
// Partículas: x em 0..1 ao longo da largura do trilho (centro da pista = (pista + 0,5) / 3),
// y em 0..1 a partir da linha de impacto (positivo = para cima), vx/vy por segundo, size em px.
// ========================================

import {
  DEFAULT_CONFIG,
  PICKAXES,
  type BlockFace,
  type BlockRow,
  type Lane,
  type MineConfig,
  type MineState,
  type MineWord,
  type PromptMode,
  type RunPlan,
  type RunSummary,
  type Stratum,
} from './types';

const MAX_PARTICLES = 40;
const PARTICLES_PER_HIT = 12;
const PARTICLES_PER_LEARN = 8;
const PARTICLE_LIFE_MS = 600;
const CART_LERP_MS = 150;
const MAX_ALIVE_ROWS = 3;

const STRATUM_COLORS: Record<Stratum, string[]> = {
  surface: ['#7cb342', '#9ccc65', '#8d6e63', '#a1887f'],
  stone: ['#8a8a8a', '#a0a0a0', '#6f6f6f', '#b5b5b5'],
};

// ---------- RNG determinístico (xorshift32) ----------

function seedToState(seed: number): number {
  const s = (seed >>> 0) || 0x9e3779b9;
  return s;
}

/** Devolve um número em [0, 1) e avança state.rngState */
export function nextRandom(state: MineState): number {
  let x = state.rngState >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  state.rngState = x;
  return x / 4294967296;
}

function randInt(state: MineState, min: number, max: number): number {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}

function shuffleInPlace<T>(state: MineState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Montagem da fila ----------

const categoryOf = (w: MineWord): string => {
  const i = w.id.indexOf(':');
  return i > 0 ? w.id.slice(0, i) : '';
};

const hasPicture = (w: MineWord): boolean => Boolean(w.image || w.hex);

function pictureFace(word: MineWord): BlockFace {
  if (word.image) return { kind: 'image', word, text: word.word };
  if (word.hex) return { kind: 'color', word, text: word.word };
  return { kind: 'text', word, text: word.word };
}

const textFace = (word: MineWord): BlockFace => ({ kind: 'text', word, text: word.word });

/** Sorteia `count` distratores do pool, diferentes da alvo e entre si, preferindo a mesma categoria */
function pickDistractors(
  state: MineState,
  target: MineWord,
  count: number,
  accept: (w: MineWord) => boolean
): MineWord[] {
  const seen = new Set<string>([target.id]);
  const candidates: MineWord[] = [];
  const pool = [...state.plan.pool, ...state.plan.words.map((x) => x.word)];
  for (const w of pool) {
    if (seen.has(w.id) || !accept(w)) continue;
    seen.add(w.id);
    candidates.push(w);
  }
  const cat = categoryOf(target);
  const same = shuffleInPlace(state, candidates.filter((w) => categoryOf(w) === cat));
  const others = shuffleInPlace(state, candidates.filter((w) => categoryOf(w) !== cat));
  const picked = [...same, ...others].slice(0, count);
  // Pool degenerado (menos de 3 palavras): repete o que houver para manter 3 faces
  while (picked.length < count) picked.push(picked.length > 0 ? picked[0] : target);
  return picked;
}

function nextRowIndex(state: MineState): number {
  return state.spawned + state.queue.length + state.rows.length;
}

function buildLearnRow(state: MineState, word: MineWord): BlockRow {
  const face = pictureFace(word);
  return {
    index: nextRowIndex(state),
    target: word,
    mode: 'learn',
    faces: [face, { ...face }, { ...face }],
    correctLane: 1,
    z: 1,
    windowMs: state.config.windowStartMs,
    ageMs: 0,
    resolved: null,
    retry: false,
  };
}

function buildJudgedRow(state: MineState, word: MineWord, wanted: PromptMode, retry: boolean): BlockRow {
  let mode: PromptMode = wanted;
  let distractorWords: MineWord[];
  if (mode === 'word_to_image') {
    distractorWords = hasPicture(word) ? pickDistractors(state, word, 2, hasPicture) : [];
    if (distractorWords.length < 2 || distractorWords.some((w) => !hasPicture(w))) {
      mode = 'translation_to_word';
      distractorWords = pickDistractors(state, word, 2, () => true);
    }
  } else {
    if (mode === 'image_to_word' && !word.image) mode = 'translation_to_word';
    distractorWords = pickDistractors(state, word, 2, () => true);
  }
  const mk = mode === 'word_to_image' ? pictureFace : textFace;
  const faces = shuffleInPlace(state, [mk(word), mk(distractorWords[0]), mk(distractorWords[1])]);
  const correctLane = faces.findIndex((f) => f.word.id === word.id) as Lane;
  return {
    index: nextRowIndex(state),
    target: word,
    mode,
    faces: [faces[0], faces[1], faces[2]],
    correctLane,
    z: 1,
    windowMs: state.config.windowStartMs,
    ageMs: 0,
    resolved: null,
    retry,
  };
}

function levelOf(state: MineState, id: string): number {
  const entry = state.plan.words.find((x) => x.word.id === id);
  return entry ? entry.level : 1;
}

/** Modo desejado para a k-ésima aparição (0-based) de uma palavra com o nível dado */
function modeFor(word: MineWord, level: number, occurrence: number): PromptMode {
  if (level <= 1) return word.image ? 'image_to_word' : 'translation_to_word';
  return occurrence % 2 === 0 ? 'translation_to_word' : 'word_to_image';
}

/** Ordem intercalada de palavras: rodadas embaralhadas, sem repetir a mesma palavra em posições consecutivas */
function interleave(state: MineState, count: number, total: number): number[] {
  const order: number[] = [];
  while (order.length < total) {
    const round = shuffleInPlace(state, Array.from({ length: count }, (_, i) => i));
    if (count > 1 && order.length > 0 && round[0] === order[order.length - 1]) {
      const j = 1 + Math.floor(nextRandom(state) * (count - 1));
      [round[0], round[j]] = [round[j], round[0]];
    }
    order.push(...round);
  }
  return order.slice(0, total);
}

export function createRun(plan: RunPlan, config: Partial<MineConfig> = {}): MineState {
  if (plan.words.length === 0) throw new Error('RunPlan sem palavras');
  const cfg: MineConfig = { ...DEFAULT_CONFIG, ...config };
  const state: MineState = {
    status: 'ready',
    seed: plan.seed,
    rngState: seedToState(plan.seed),
    config: cfg,
    plan,
    choiceAgeMs: 0,
    lane: 1,
    cartX: 1,
    rows: [],
    queue: [],
    totalBlocks: cfg.totalBlocks,
    spawned: 0,
    hearts: cfg.hearts,
    combo: 0,
    maxCombo: 0,
    pickaxe: 0,
    score: 0,
    depth: 0,
    windowMs: cfg.windowStartMs,
    elapsedMs: 0,
    stratum: 'surface',
    particles: [],
    events: [],
    results: [],
    highlightMs: 0,
    highlightRow: null,
    activeRowIndex: null,
  };

  const order = interleave(state, plan.words.length, cfg.totalBlocks);
  const occurrences = new Map<number, number>();
  for (const wi of order) {
    const { word, level } = plan.words[wi];
    const k = occurrences.get(wi) ?? 0;
    occurrences.set(wi, k + 1);
    if (level <= 0 && k === 0) state.queue.push(buildLearnRow(state, word));
    state.queue.push(buildJudgedRow(state, word, modeFor(word, level, k), false));
  }
  return state;
}

// ---------- Controle ----------

export function start(state: MineState): void {
  if (state.status === 'ready') state.status = 'running';
}

export function pause(state: MineState): void {
  if (state.status === 'running') state.status = 'paused';
}

export function resume(state: MineState): void {
  if (state.status === 'paused') state.status = 'running';
}

/** Único gesto do jogador: escolhe a pista. O julgamento acontece no impacto. */
export function chooseLane(state: MineState, lane: Lane): void {
  if (lane === state.lane) return;
  state.lane = lane;
  const active = activeRow(state);
  if (active) state.choiceAgeMs = active.ageMs;
}

export function drainEvents(state: MineState): MineState['events'] {
  const out = state.events;
  state.events = [];
  return out;
}

// ---------- Utilidades de estado ----------

function activeRow(state: MineState): BlockRow | null {
  let best: BlockRow | null = null;
  for (const r of state.rows) {
    if (r.resolved) continue;
    if (!best || r.z < best.z) best = r;
  }
  return best;
}

function updateActive(state: MineState): void {
  const active = activeRow(state);
  const idx = active ? active.index : null;
  if (idx === state.activeRowIndex) return;
  state.activeRowIndex = idx;
  if (active) {
    state.choiceAgeMs = active.ageMs;
    if (active.mode === 'learn') state.events.push({ type: 'audio', word: active.target });
  }
}

export function pickaxeFor(combo: number): number {
  let level = 0;
  for (let i = 0; i < PICKAXES.length; i++) if (combo >= PICKAXES[i].minCombo) level = i;
  return level;
}

function setPickaxe(state: MineState, level: number): void {
  if (level === state.pickaxe) return;
  state.pickaxe = level;
  state.events.push({ type: 'pickaxe', level });
}

function spawnParticles(state: MineState, lane: Lane, count: number): void {
  const colors = STRATUM_COLORS[state.stratum];
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
    state.particles.push({
      x: (lane + 0.5) / 3 + (nextRandom(state) - 0.5) * 0.16,
      y: 0.04 + nextRandom(state) * 0.08,
      vx: (nextRandom(state) - 0.5) * 0.7,
      vy: 0.5 + nextRandom(state) * 0.8,
      life: 1,
      color: colors[Math.floor(nextRandom(state) * colors.length)],
      size: 2 + Math.floor(nextRandom(state) * 4),
    });
  }
}

function updateParticles(state: MineState, dtMs: number): void {
  const dt = dtMs / 1000;
  const alive = [];
  for (const p of state.particles) {
    p.life -= dtMs / PARTICLE_LIFE_MS;
    if (p.life <= 0) continue;
    p.vy -= 2.2 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    alive.push(p);
  }
  state.particles = alive;
}

function pendingOriginals(state: MineState): number {
  const isOriginal = (r: BlockRow) => !r.retry && r.mode !== 'learn' && !r.resolved;
  return state.queue.filter(isOriginal).length + state.rows.filter(isOriginal).length;
}

function finish(state: MineState, reason: 'hearts' | 'complete'): void {
  state.status = 'finished';
  state.events.push({ type: 'gameover', reason });
}

function checkpointIfDue(state: MineState): void {
  const every = state.config.checkpointEvery;
  if (every <= 0 || state.depth === 0 || state.depth % every !== 0) return;
  state.hearts = Math.min(state.config.hearts, state.hearts + 1);
  if (state.depth >= every) state.stratum = 'stone';
  state.events.push({ type: 'checkpoint', index: state.depth, heartsAfter: state.hearts, stratum: state.stratum });
}

// ---------- Nascimento e resolução ----------

/** Lança a próxima fileira da fila (se houver). Devolve a fileira ou null. */
export function spawnNext(state: MineState): BlockRow | null {
  const row = state.queue.shift();
  if (!row) return null;
  const fresh = levelOf(state, row.target.id) <= 0;
  row.windowMs = row.mode === 'learn' || fresh ? state.config.windowStartMs : state.windowMs;
  row.ageMs = 0;
  row.z = 1;
  state.rows.push(row);
  state.spawned += 1;
  return row;
}

function resolveLearn(state: MineState, row: BlockRow): void {
  row.resolved = 'learned';
  state.depth += 1;
  spawnParticles(state, state.lane, PARTICLES_PER_LEARN);
  state.events.push({ type: 'learn', word: row.target });
  state.events.push({ type: 'audio', word: row.target });
  checkpointIfDue(state);
}

function resolveHit(state: MineState, row: BlockRow): void {
  const cfg = state.config;
  row.resolved = 'hit';
  const fast = state.choiceAgeMs <= cfg.fastFraction * row.windowMs;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const level = pickaxeFor(state.combo);
  const points = cfg.basePoints * PICKAXES[level].multiplier + (fast ? cfg.fastBonus : 0);
  state.score += points;
  if (levelOf(state, row.target.id) > 0) {
    state.windowMs = Math.max(cfg.windowMinMs, state.windowMs - cfg.windowStepMs);
  }
  state.depth += 1;
  state.results.push({ id: row.target.id, correct: true });
  spawnParticles(state, row.correctLane, PARTICLES_PER_HIT);
  state.events.push({ type: 'hit', word: row.target, points, fast, combo: state.combo, pickaxe: level });
  setPickaxe(state, level);
  state.events.push({ type: 'audio', word: row.target });
  checkpointIfDue(state);
}

function resolveMiss(state: MineState, row: BlockRow): void {
  const cfg = state.config;
  row.resolved = 'miss';
  state.hearts = Math.max(0, state.hearts - 1);
  state.combo = 0;
  setPickaxe(state, 0);
  state.windowMs = cfg.windowStartMs;
  state.results.push({ id: row.target.id, correct: false });
  const chosen = row.faces[state.lane].word;
  state.events.push({ type: 'miss', word: row.target, chosen: chosen.id === row.target.id ? null : chosen });
  state.events.push({ type: 'audio', word: row.target });
  state.highlightRow = row;
  state.highlightMs = cfg.highlightMs;
  // Reinsere a palavra 5 a 8 blocos à frente (ou no fim da fila, se ela for menor)
  const retry = buildJudgedRow(state, row.target, row.mode, true);
  const at = Math.min(state.queue.length, Math.max(0, randInt(state, cfg.retryAfterMin, cfg.retryAfterMax) - 1));
  state.queue.splice(at, 0, retry);
}

function resolveAtImpact(state: MineState, row: BlockRow): void {
  if (row.mode === 'learn') resolveLearn(state, row);
  else if (state.lane === row.correctLane) resolveHit(state, row);
  else resolveMiss(state, row);
}

// ---------- Passo de simulação ----------

export function tick(state: MineState, dtMs: number): void {
  if (state.status !== 'running' || dtMs <= 0) return;
  state.elapsedMs += dtMs;

  // Carrinho desliza até a pista escolhida (~150 ms)
  const k = Math.min(1, dtMs / CART_LERP_MS);
  state.cartX += (state.lane - state.cartX) * k;
  if (Math.abs(state.lane - state.cartX) < 0.005) state.cartX = state.lane;

  updateParticles(state, dtMs);

  if (state.highlightMs > 0) {
    state.highlightMs = Math.max(0, state.highlightMs - dtMs);
    if (state.highlightMs === 0) state.highlightRow = null;
  }

  // Fileiras avançam e são julgadas no impacto (da mais próxima para a mais distante)
  for (const row of state.rows) {
    if (row.resolved) continue;
    row.ageMs += dtMs;
    row.z = Math.max(0, 1 - row.ageMs / row.windowMs);
  }
  const due = state.rows.filter((r) => !r.resolved && r.z <= 0).sort((a, b) => a.ageMs - b.ageMs);
  for (const row of due) {
    resolveAtImpact(state, row);
    if (state.hearts === 0) {
      finish(state, 'hearts');
      break;
    }
  }
  state.rows = state.rows.filter((r) => !r.resolved);

  if (state.status === 'running') {
    if (state.queue.length === 0 && state.rows.length === 0) {
      finish(state, 'complete');
    } else if (
      state.highlightMs === 0 &&
      state.queue.length > 0 &&
      state.rows.length < MAX_ALIVE_ROWS &&
      state.rows.every((r) => r.resolved)
    ) {
      // Uma fileira julgada por vez: a próxima nasce assim que a anterior sai do trilho
      // (o intervalo desde o último nascimento é a janela inteira, sempre >= spawnGapMs)
      spawnNext(state);
    }
  }

  updateActive(state);
}

// ---------- Resumo ----------

export function summarize(state: MineState): RunSummary {
  const dict = new Map<string, MineWord>();
  for (const w of state.plan.words) dict.set(w.word.id, w.word);
  for (const w of state.plan.pool) if (!dict.has(w.id)) dict.set(w.id, w);
  const missedIds = new Set<string>();
  for (const r of state.results) if (!r.correct) missedIds.add(r.id);
  const missedWords: MineWord[] = [];
  for (const id of missedIds) {
    const w = dict.get(id);
    if (w) missedWords.push(w);
  }
  return {
    depth: state.depth,
    score: state.score,
    maxCombo: state.maxCombo,
    hearts: state.hearts,
    elapsedMs: state.elapsedMs,
    results: [...state.results],
    completed: state.status === 'finished' && state.hearts > 0 && pendingOriginals(state) === 0,
    missedWords,
  };
}
