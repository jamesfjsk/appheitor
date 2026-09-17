// ========================================
// Mine Rush: motor puro da corrida (sem React, sem DOM; roda em Node)
// Único import: ./types. A tela chama createRun -> start -> tick a cada quadro,
// chooseLane no gesto do jogador, releaseRow quando o áudio do pedido termina,
// drainEvents para som/HUD e summarize no fim.
//
// Ritmo (Fase 2):
// - Uma fileira julgada por vez. Ela nasce PARADA no fundo do túnel ('announce')
//   e o motor emite 'prompt'; a tela mostra o pedido, toca o áudio e chama
//   releaseRow(). A fileira só começa a descer ('moving', evento 'go') depois de
//   announceMinMs parada e, por segurança, sozinha ao atingir announceMaxMs.
//   A janela de tempo (4,0 -> 2,0 s) conta só a partir do 'go'.
// - Depois de um acerto a próxima nasce no mesmo tick (fica anunciando, sem pressa
//   visual); depois de um erro, highlightMs mostra o bloco certo e nada nasce.
// - O motor nunca toca nada: acerto/erro saem como evento 'audio' (reason + modo julgado) e a
//   tela enfileira antes do pedido seguinte (a fileira espera parada).
// - Palavra nova (nível 0) é apresentada no próprio pedido (modo 'intro') e julgada
//   como qualquer outra; não há mais placa "quebre qualquer bloco". depth = acertos.
// - spawnGapMs não é consultado: o intervalo entre nascimentos é janela + anúncio,
//   sempre maior que ele.
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
const PARTICLE_LIFE_MS = 600;
const CART_LERP_MS = 150;

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

/**
 * Sorteia até `count` distratores do pool, diferentes da alvo e entre si, preferindo a
 * mesma categoria. Pode devolver menos que `count` quando o pool não tem candidatos.
 */
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
  return [...same, ...others].slice(0, count);
}

function nextRowIndex(state: MineState): number {
  return state.spawned + state.queue.length + state.rows.length;
}

/** Modo e dica para a k-ésima aparição (0-based) de uma palavra com o nível dado */
function modeFor(level: number, occurrence: number): { mode: PromptMode; hint: boolean } {
  if (level <= 0 && occurrence === 0) return { mode: 'intro', hint: true };
  // Depois da apresentação, a palavra nova segue o roteiro de nível 1 (começando pela tradução)
  const k = level <= 0 ? occurrence - 1 : occurrence;
  return { mode: k % 2 === 0 ? 'translation_to_word' : 'word_to_image', hint: level <= 1 };
}

function buildRow(state: MineState, word: MineWord, wanted: PromptMode, hint: boolean, retry: boolean): BlockRow {
  let mode: PromptMode = wanted;
  let distractors: MineWord[] = [];
  if (mode === 'word_to_image') {
    if (hasPicture(word)) distractors = pickDistractors(state, word, 2, hasPicture);
    // Sem alvo ou distratores com figura: pede a palavra escrita a partir da tradução
    if (distractors.length < 2) mode = 'translation_to_word';
  }
  if (mode !== 'word_to_image') distractors = pickDistractors(state, word, 2, () => true);
  // Pool degenerado (menos de 3 palavras): repete o que houver para manter 3 faces
  while (distractors.length < 2) distractors.push(distractors.length > 0 ? distractors[0] : word);
  const mk = mode === 'word_to_image' ? pictureFace : textFace;
  const faces = shuffleInPlace(state, [mk(word), mk(distractors[0]), mk(distractors[1])]);
  const correctLane = faces.findIndex((f) => f.word.id === word.id) as Lane;
  return {
    index: nextRowIndex(state),
    target: word,
    mode,
    hint,
    faces: [faces[0], faces[1], faces[2]],
    correctLane,
    phase: 'announce',
    announceMs: 0,
    released: false,
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
  cfg.pickaxeFloor = Math.max(0, Math.min(4, Math.round(cfg.pickaxeFloor) || 0));
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
    pickaxe: cfg.pickaxeFloor,
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
    const { mode, hint } = modeFor(level, k);
    state.queue.push(buildRow(state, word, mode, hint, false));
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
  // Escolher durante o anúncio conta como resposta imediata
  state.choiceAgeMs = active && active.phase === 'moving' ? active.ageMs : 0;
}

/** A tela terminou o áudio do pedido: libera a fileira parada (ela desce após announceMinMs) */
export function releaseRow(state: MineState): void {
  const active = activeRow(state);
  if (active && active.phase === 'announce') active.released = true;
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
  if (active) state.choiceAgeMs = active.ageMs;
}

export function pickaxeFor(combo: number, floor = 0): number {
  let level = 0;
  for (let i = 0; i < PICKAXES.length; i++) if (combo >= PICKAXES[i].minCombo) level = i;
  return Math.max(floor, level);
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
  const isOriginal = (r: BlockRow) => !r.retry && !r.resolved;
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

/** Lança a próxima fileira da fila (se houver), parada no fundo, e emite 'prompt'. Devolve a fileira ou null. */
export function spawnNext(state: MineState): BlockRow | null {
  const row = state.queue.shift();
  if (!row) return null;
  // Apresentação e palavra nova nunca aceleram: janela cheia
  const fresh = row.mode === 'intro' || levelOf(state, row.target.id) <= 0;
  row.windowMs = fresh ? state.config.windowStartMs : state.windowMs;
  row.phase = 'announce';
  row.announceMs = 0;
  row.released = false;
  row.ageMs = 0;
  row.z = 1;
  state.rows.push(row);
  state.spawned += 1;
  state.events.push({ type: 'prompt', row });
  return row;
}

function resolveHit(state: MineState, row: BlockRow): void {
  const cfg = state.config;
  row.resolved = 'hit';
  const fast = state.choiceAgeMs <= cfg.fastFraction * row.windowMs;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const level = pickaxeFor(state.combo, state.config.pickaxeFloor);
  const points = cfg.basePoints * PICKAXES[level].multiplier + (fast ? cfg.fastBonus : 0);
  state.score += points;
  // Palavra nova não aperta a janela global
  if (levelOf(state, row.target.id) > 0) {
    state.windowMs = Math.max(cfg.windowMinMs, state.windowMs - cfg.windowStepMs);
  }
  // Profundidade = acertos nos 40 blocos originais; retry vale pontos e combo, mas não avança a mina
  if (!row.retry) state.depth += 1;
  state.results.push({ id: row.target.id, correct: true });
  spawnParticles(state, row.correctLane, PARTICLES_PER_HIT + level);
  state.events.push({ type: 'hit', word: row.target, points, fast, combo: state.combo, pickaxe: level });
  setPickaxe(state, level);
  state.events.push({ type: 'audio', word: row.target, reason: 'hit', mode: row.mode });
  if (!row.retry) checkpointIfDue(state);
}

function resolveMiss(state: MineState, row: BlockRow): void {
  const cfg = state.config;
  row.resolved = 'miss';
  state.hearts = Math.max(0, state.hearts - 1);
  state.combo = 0;
  setPickaxe(state, pickaxeFor(0, state.config.pickaxeFloor));
  state.windowMs = cfg.windowStartMs;
  state.results.push({ id: row.target.id, correct: false });
  const chosen = row.faces[state.lane].word;
  state.events.push({ type: 'miss', word: row.target, chosen: chosen.id === row.target.id ? null : chosen });
  state.events.push({ type: 'audio', word: row.target, reason: 'miss', mode: row.mode });
  state.highlightRow = row;
  state.highlightMs = cfg.highlightMs;
  // Reinsere a palavra 5 a 8 blocos à frente (ou no fim da fila, se ela for menor), no mesmo modo e dica
  const retry = buildRow(state, row.target, row.mode, row.hint, true);
  const at = Math.min(state.queue.length, Math.max(0, randInt(state, cfg.retryAfterMin, cfg.retryAfterMax) - 1));
  state.queue.splice(at, 0, retry);
}

function resolveAtImpact(state: MineState, row: BlockRow): void {
  if (state.lane === row.correctLane) resolveHit(state, row);
  else resolveMiss(state, row);
}

// ---------- Passo de simulação ----------

export function tick(state: MineState, dtMs: number): void {
  if (state.status !== 'running' || dtMs <= 0) return;
  const cfg = state.config;
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

  // Fileira parada espera a liberação; em movimento, avança até o impacto
  for (const row of state.rows) {
    if (row.resolved) continue;
    if (row.phase === 'announce') {
      row.announceMs += dtMs;
      const releasedEnough = row.released && row.announceMs >= cfg.announceMinMs;
      const timedOut = cfg.announceMaxMs > 0 && row.announceMs >= cfg.announceMaxMs;
      if (releasedEnough || timedOut) {
        // A pista escolhida durante o anúncio vale como resposta imediata
        row.phase = 'moving';
        row.ageMs = 0;
        row.z = 1;
        state.choiceAgeMs = 0;
        state.events.push({ type: 'go', row });
      }
      continue;
    }
    row.ageMs += dtMs;
    row.z = Math.max(0, 1 - row.ageMs / row.windowMs);
  }
  const due = state.rows
    .filter((r) => !r.resolved && r.phase === 'moving' && r.z <= 0)
    .sort((a, b) => a.ageMs - b.ageMs);
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
    } else if (state.highlightMs === 0 && state.queue.length > 0 && state.rows.length === 0) {
      // Uma fileira julgada por vez: após acerto nasce já neste tick (parada, anunciando);
      // após erro, só quando o destaque do bloco certo termina
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
