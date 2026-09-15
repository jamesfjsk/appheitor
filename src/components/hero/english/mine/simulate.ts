// ========================================
// Mine Rush: simulador do motor (roda em Node, sem DOM)
//
// Como executar (testado; o esbuild vem com o Vite):
//   npx esbuild src/components/hero/english/mine/simulate.ts --bundle --platform=node --format=cjs --outfile=%TEMP%\mine-sim.cjs && node %TEMP%\mine-sim.cjs
// No Git Bash / PowerShell troque %TEMP% por $TEMP / $env:TEMP.
// Também pode ser importado pela tela ou por testes: simulateRun(plan, policy, seed).
//
// A "tela" simulada libera cada fileira anunciada depois de releaseDelayMs (0 = no tick seguinte
// ao 'prompt'; Infinity = nunca libera, só o announceMaxMs do motor solta a fileira).
// ========================================

import { chooseLane, createRun, drainEvents, releaseRow, start, summarize, tick } from './engine';
import type {
  BlockRow,
  Lane,
  MineConfig,
  MineEvent,
  MineState,
  MineWord,
  PromptMode,
  RunPlan,
  RunSummary,
} from './types';

export type SimPolicy = 'perfect' | 'random' | 'always-lane-0';

/** Um item por evento 'prompt', na ordem em que as fileiras nasceram */
export interface SimPrompt {
  id: string;
  mode: PromptMode;
  hint: boolean;
  retry: boolean;
}

export interface SimResult {
  summary: RunSummary;
  ticks: number;
  events: Record<MineEvent['type'], number>;
  prompts: SimPrompt[];
  /** menor announceMs visto num evento 'go' (Infinity se nenhum saiu) */
  minAnnounceMsAtGo: number;
  /** retries ainda na fila quando a corrida acabou */
  retriesQueued: number;
  finalWindowMs: number;
  stratum: MineState['stratum'];
}

function activeRow(state: MineState): BlockRow | null {
  let best: BlockRow | null = null;
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
  config: Partial<MineConfig> = {},
  releaseDelayMs = 0
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
  const counts: Record<MineEvent['type'], number> = {
    prompt: 0, go: 0, hit: 0, miss: 0, pickaxe: 0, checkpoint: 0, gameover: 0, audio: 0,
  };
  const prompts: SimPrompt[] = [];
  let minAnnounceMsAtGo = Infinity;
  let ticks = 0;
  let decidedFor: number | null = null;
  let awaitingRelease: BlockRow | null = null;
  while (state.status !== 'finished' && ticks < 200000) {
    // A política decide a pista assim que a fileira aparece (ainda parada, anunciando)
    const row = activeRow(state);
    if (row && row.index !== decidedFor) {
      decidedFor = row.index;
      if (policy === 'perfect') chooseLane(state, row.correctLane);
      else if (policy === 'random') chooseLane(state, Math.floor(rand() * 3) as Lane);
      else chooseLane(state, 0);
    }
    if (awaitingRelease && awaitingRelease.announceMs >= releaseDelayMs) {
      releaseRow(state);
      awaitingRelease = null;
    }
    tick(state, 16);
    ticks += 1;
    for (const e of drainEvents(state)) {
      counts[e.type] += 1;
      if (e.type === 'prompt') {
        prompts.push({ id: e.row.target.id, mode: e.row.mode, hint: e.row.hint, retry: e.row.retry });
        awaitingRelease = e.row;
      } else if (e.type === 'go') {
        minAnnounceMsAtGo = Math.min(minAnnounceMsAtGo, e.row.announceMs);
      }
    }
  }
  return {
    summary: summarize(state),
    ticks,
    events: counts,
    prompts,
    minAnnounceMsAtGo,
    retriesQueued: state.queue.filter((r) => r.retry).length,
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
  const modes: Record<PromptMode, number> = { intro: 0, word_to_image: 0, translation_to_word: 0 };
  for (const p of r.prompts) modes[p.mode] += 1;
  return [
    `[${label}]`,
    `completed=${s.completed}`,
    `depth=${s.depth}`,
    `hearts=${s.hearts}`,
    `score=${s.score}`,
    `maxCombo=${s.maxCombo}`,
    `judged=${s.results.length} (correct=${correct})`,
    `retries=${r.prompts.filter((p) => p.retry).length}+${r.retriesQueued} na fila`,
    `missedWords=${s.missedWords.map((w) => w.word).join(',') || '-'}`,
    `elapsed=${(s.elapsedMs / 1000).toFixed(1)}s`,
    `ticks=${r.ticks}`,
    `finalWindow=${r.finalWindowMs}ms`,
    `stratum=${r.stratum}`,
    `minAnnounceAtGo=${r.minAnnounceMsAtGo}ms`,
    `modes=${JSON.stringify(modes)}`,
    `events=${JSON.stringify(r.events)}`,
  ].join(' ');
}

/**
 * A 1ª aparição de cada palavra nível 0 sai em 'intro'; fora isso só um retry dessa fileira
 * (que herda o modo) pode ser 'intro'. Palavra de nível 1+ nunca é 'intro'.
 */
function introOnlyOnFirstAppearance(plan: RunPlan, r: SimResult): boolean {
  const fresh = new Set(plan.words.filter((w) => w.level === 0).map((w) => w.word.id));
  const seen = new Set<string>();
  for (const p of r.prompts) {
    const first = !seen.has(p.id);
    seen.add(p.id);
    const expectIntro = first && fresh.has(p.id);
    if (expectIntro && p.mode !== 'intro') return false;
    if (!expectIntro && p.mode === 'intro' && !(p.retry && fresh.has(p.id))) return false;
  }
  return true;
}

function main(): void {
  const plan = samplePlan();
  const perfect = simulateRun(plan, 'perfect');
  const slow = simulateRun(plan, 'perfect', plan.seed, {}, 1200);
  const never = simulateRun(plan, 'perfect', plan.seed, {}, Infinity);
  const lane0 = simulateRun(plan, 'always-lane-0');
  // Com 3 corações a corrida acaba antes de um retry nascer; com mais corações eles chegam ao trilho
  const lenient = simulateRun(plan, 'always-lane-0', plan.seed, { hearts: 12 });
  const random = simulateRun(plan, 'random');
  console.log(`palavras nível 0 no plano: ${plan.words.filter((w) => w.level === 0).length}`);
  console.log(fmt('perfect', perfect));
  console.log(fmt('perfect release 1200ms', slow));
  console.log(fmt('perfect nunca libera', never));
  console.log(fmt('always-lane-0', lane0));
  console.log(fmt('always-lane-0 hearts 12', lenient));
  console.log(fmt('random', random));

  const all = [perfect, slow, never, lane0, lenient, random];
  const legacyModes: string[] = ['learn', 'image_to_word'];
  const checks: [string, boolean][] = [
    ['perfect: completed', perfect.summary.completed],
    ['perfect: depth = 40', perfect.summary.depth === 40],
    ['perfect: hearts = 3', perfect.summary.hearts === 3],
    ['perfect: janela chegou ao mínimo', perfect.finalWindowMs === 2000],
    ['perfect: estrato pedra', perfect.stratum === 'stone'],
    ['perfect: 3 checkpoints ou mais', perfect.events.checkpoint >= 3],
    ['perfect: exatamente 40 prompt e 40 go', perfect.events.prompt === 40 && perfect.events.go === 40],
    ['perfect: nenhuma fileira desce antes de 500 ms parada', perfect.minAnnounceMsAtGo >= 500],
    [
      'perfect release 1200ms: mesmo jogo, mais demorado',
      slow.summary.depth === 40 && slow.summary.hearts === 3 && slow.summary.elapsedMs > perfect.summary.elapsedMs,
    ],
    ['nunca libera: completa pelo announceMaxMs', never.summary.completed && never.summary.depth === 40],
    ['nunca libera: cada go com announceMs >= 6000', never.events.go === 40 && never.minAnnounceMsAtGo >= 6000],
    ['always-lane-0: acabou por corações', !lane0.summary.completed && lane0.summary.hearts === 0],
    [
      'always-lane-0: cada erro reinseriu a palavra (retries nascidos + na fila = erros)',
      lane0.prompts.filter((p) => p.retry).length + lane0.retriesQueued === lane0.events.miss,
    ],
    [
      'always-lane-0 hearts 12: retries nascem e são julgados (prompt > originais julgadas)',
      lenient.prompts.some((p) => p.retry) &&
        lenient.events.prompt > lenient.prompts.filter((p) => !p.retry).length,
    ],
    [
      // Uma fileira por vez: results[i] é o julgamento de prompts[i]
      'always-lane-0 hearts 12: depth = acertos em fileiras originais (retry não conta)',
      lenient.summary.depth === lenient.summary.results.filter((x, i) => x.correct && !lenient.prompts[i].retry).length,
    ],
    [
      'determinismo: mesma semente, mesmo resultado',
      JSON.stringify(simulateRun(plan, 'random').summary) === JSON.stringify(random.summary),
    ],
    ['intro: só na 1ª aparição de palavra nível 0', all.every((r) => introOnlyOnFirstAppearance(plan, r))],
    ['modos antigos (learn, image_to_word) não aparecem', all.every((r) => r.prompts.every((p) => !legacyModes.includes(p.mode)))],
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
