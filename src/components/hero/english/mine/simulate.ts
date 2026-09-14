// ========================================
// Mine Rush: simulador do motor (roda em Node, sem DOM)
//
// Como executar (testado; o esbuild vem com o Vite):
//   npx esbuild src/components/hero/english/mine/simulate.ts --bundle --platform=node --format=cjs --outfile=%TEMP%\mine-sim.cjs && node %TEMP%\mine-sim.cjs
// No Git Bash / PowerShell troque %TEMP% por $TEMP / $env:TEMP.
// Também pode ser importado pela tela ou por testes: simulateRun(plan, policy, seed).
// ========================================

import { chooseLane, createRun, drainEvents, start, summarize, tick } from './engine';
import type { Lane, MineConfig, MineEvent, MineState, MineWord, RunPlan, RunSummary } from './types';

export type SimPolicy = 'perfect' | 'random' | 'always-lane-0';

export interface SimResult {
  summary: RunSummary;
  ticks: number;
  events: Record<MineEvent['type'], number>;
  learned: number;
  finalWindowMs: number;
  stratum: MineState['stratum'];
}

function activeRow(state: MineState) {
  let best = null;
  for (const r of state.rows) {
    if (r.resolved) continue;
    if (!best || r.z < best.z) best = r;
  }
  return best;
}

/** Roda a corrida inteira com passo de 16 ms até status 'finished' */
export function simulateRun(
  plan: RunPlan,
  policy: SimPolicy,
  seed: number = plan.seed,
  config: Partial<MineConfig> = {}
): SimResult {
  const state = createRun({ ...plan, seed }, config);
  start(state);
  let rng = (seed >>> 0) || 1;
  const rand = () => {
    rng ^= rng << 13; rng >>>= 0;
    rng ^= rng >>> 17;
    rng ^= rng << 5; rng >>>= 0;
    return rng / 4294967296;
  };
  const counts = { hit: 0, miss: 0, learn: 0, pickaxe: 0, checkpoint: 0, gameover: 0, audio: 0 };
  let ticks = 0;
  let decidedFor: number | null = null;
  while (state.status !== 'finished' && ticks < 200000) {
    const row = activeRow(state);
    if (row && row.index !== decidedFor) {
      decidedFor = row.index;
      if (policy === 'perfect') chooseLane(state, row.correctLane);
      else if (policy === 'random') chooseLane(state, Math.floor(rand() * 3) as Lane);
      else chooseLane(state, 0);
    }
    tick(state, 16);
    ticks += 1;
    for (const e of drainEvents(state)) counts[e.type] += 1;
  }
  return {
    summary: summarize(state),
    ticks,
    events: counts,
    learned: counts.learn,
    finalWindowMs: state.windowMs,
    stratum: state.stratum,
  };
}

// ---------- Plano de exemplo (palavras fictícias, sem depender do banco real) ----------

const mk = (cat: string, word: string, translation: string, image: boolean, hex: string | null = null): MineWord => ({
  id: `${cat}:${word}`,
  word,
  translation,
  image: image ? `/assets/english/images/${cat}_${word}.webp` : null,
  audio: null,
  hex,
});

export function samplePlan(seed = 12345): RunPlan {
  const fruits = [
    mk('fruits', 'apple', 'maçã', true),
    mk('fruits', 'banana', 'banana', true),
    mk('fruits', 'grape', 'uva', true),
    mk('fruits', 'orange', 'laranja', true),
    mk('fruits', 'pear', 'pera', true),
  ];
  const colors = [
    mk('colors', 'red', 'vermelho', false, '#e53935'),
    mk('colors', 'blue', 'azul', false, '#1e88e5'),
    mk('colors', 'green', 'verde', false, '#43a047'),
    mk('colors', 'yellow', 'amarelo', false, '#fdd835'),
  ];
  const animals = [
    mk('animals', 'dog', 'cachorro', true),
    mk('animals', 'cat', 'gato', true),
    mk('animals', 'cow', 'vaca', false),
    mk('animals', 'horse', 'cavalo', true),
  ];
  const pool = [...fruits, ...colors, ...animals];
  const words = [
    { word: fruits[0], level: 0 },
    { word: fruits[1], level: 0 },
    { word: fruits[2], level: 1 },
    { word: fruits[3], level: 2 },
    { word: colors[0], level: 0 },
    { word: colors[1], level: 1 },
    { word: colors[2], level: 2 },
    { word: animals[0], level: 3 },
    { word: animals[1], level: 2 },
    { word: animals[2], level: 1 },
  ];
  return { words, pool, seed };
}

function fmt(label: string, r: SimResult): string {
  const s = r.summary;
  const correct = s.results.filter((x) => x.correct).length;
  return [
    `[${label}]`,
    `completed=${s.completed}`,
    `depth=${s.depth}`,
    `hearts=${s.hearts}`,
    `score=${s.score}`,
    `maxCombo=${s.maxCombo}`,
    `judged=${s.results.length} (correct=${correct})`,
    `learned=${r.learned}`,
    `missedWords=${s.missedWords.map((w) => w.word).join(',') || '-'}`,
    `elapsed=${(s.elapsedMs / 1000).toFixed(1)}s`,
    `ticks=${r.ticks}`,
    `finalWindow=${r.finalWindowMs}ms`,
    `stratum=${r.stratum}`,
    `events=${JSON.stringify(r.events)}`,
  ].join(' ');
}

function main(): void {
  const plan = samplePlan();
  const learnRows = plan.words.filter((w) => w.level === 0).length;
  const perfect = simulateRun(plan, 'perfect');
  const lane0 = simulateRun(plan, 'always-lane-0');
  const random = simulateRun(plan, 'random');
  console.log(`placas de aprendizado no plano: ${learnRows}`);
  console.log(fmt('perfect', perfect));
  console.log(fmt('always-lane-0', lane0));
  console.log(fmt('random', random));

  const checks: [string, boolean][] = [
    ['perfect: completed', perfect.summary.completed],
    ['perfect: depth = 40 + placas', perfect.summary.depth === 40 + learnRows],
    ['perfect: hearts = 3', perfect.summary.hearts === 3],
    ['perfect: janela chegou ao mínimo', perfect.finalWindowMs === 2000],
    ['perfect: estrato pedra', perfect.stratum === 'stone'],
    ['perfect: 3 checkpoints ou mais', perfect.events.checkpoint >= 3],
    ['always-lane-0: acabou por corações', !lane0.summary.completed && lane0.summary.hearts === 0],
    ['determinismo: mesma semente, mesmo resultado', JSON.stringify(simulateRun(plan, 'random').summary) === JSON.stringify(random.summary)],
  ];
  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? 'OK ' : 'FAIL'} ${name}`);
    if (!ok) failed += 1;
  }
  const g = globalThis as { process?: { exitCode?: number } };
  if (g.process) g.process.exitCode = failed > 0 ? 1 : 0;
}

const isNode = typeof (globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node === 'string';
if (isNode) main();
