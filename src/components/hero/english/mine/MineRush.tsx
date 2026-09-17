// ========================================
// Mine Rush: tela da corrida (input, HUD, áudio e ciclo de vida)
// O motor (engine.ts) cuida das regras, o render.ts desenha e o sfx.ts faz os sons.
// Nenhuma animação do framer-motion roda durante a corrida.
// Fluxo: 'Descer na mina' (destrava o AudioContext e pré-carrega as imagens) -> corrida
// -> overlay de 1,5 s com profundidade e melhor combo -> onFinish (o resultado é do EnglishArena).
// Ritmo (Fase 2): a fileira nasce parada; o áudio do pedido passa por uma fila sequencial
// (nunca dois áudios juntos) e a tela chama releaseRow() quando ele termina.
// ========================================

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Volume2 } from 'lucide-react';
import { EnglishCategory, EnglishWord } from '../../../../data/englishVocabulary';
import { EnglishProgressDoc, RoundResult, pickWords, playWord, playWordAsync, shuffle, speakAsync, wordsOf } from '../../../../services/englishGameService';
import { useVillage } from '../../../../contexts/VillageContext';
import { BlockRow, Lane, MineEvent, MineState, MineWord, PICKAXES, PromptMode, RenderAssets, RenderOptions, RowPhase, RunPlan } from './types';
import { chooseLane, createRun, drainEvents, pause, releaseRow, resume, start, summarize, tick } from './engine';
import { createRenderer } from './render';
import { createMineSfx } from './sfx';

interface Props {
  category: EnglishCategory | 'mixed';
  progress: EnglishProgressDoc | null;
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}

type Phase = 'intro' | 'loading' | 'running';

interface HudPrompt {
  mode: PromptMode;
  phase: RowPhase;
  word: MineWord;
  retry: boolean;
  hint: boolean;
}

/** Cópia leve do estado para o HUD (atualizada só em eventos e a cada 200 ms) */
interface Hud {
  hearts: number;
  maxHearts: number;
  pickaxe: number;
  depth: number;
  total: number;
  combo: number;
  score: number;
  prompt: HudPrompt | null;
}

type AudioTask = () => Promise<void>;

interface AudioQueue {
  push: (task: AudioTask) => void;
  /** esvazia e recusa novas tarefas (desmontar, sair, fim da corrida) */
  cancel: () => void;
  cancelled: () => boolean;
}

const RUN_WORDS = 12;
const MIN_WORDS = 6;
const HUD_SYNC_MS = 200;
const MAX_DT_MS = 50;
const SWIPE_PX = 40;
const END_OVERLAY_MS = 1500;
const IMAGE_TIMEOUT_MS = 4000;

const pixelFont = { fontFamily: "'Press Start 2P', monospace" } as const;
const titleFont = { fontFamily: 'Comic Neue, cursive' } as const;

const toMineWord = (w: EnglishWord): MineWord => ({ id: w.id, word: w.word, translation: w.translation, image: w.image, audio: w.audio, hex: w.hex });

/** Nível da palavra: nunca vista = 0 (modo 'intro'), streak 0-1 = 1, senão 2 */
function levelOf(w: EnglishWord, progress: EnglishProgressDoc | null): number {
  const s = progress?.words[w.id];
  if (!s || s.seen === 0) return 0;
  return s.streak <= 1 ? 1 : 2;
}

/** Palavras da corrida e banco de distratores */
function buildPlan(category: EnglishCategory | 'mixed', progress: EnglishProgressDoc | null): { plan: RunPlan; pool: EnglishWord[] } {
  let chosen = pickWords(category, RUN_WORDS, progress);
  let pool = wordsOf(category);
  if (chosen.length < MIN_WORDS) {
    const ids = new Set(chosen.map((w) => w.id));
    const extra = shuffle(wordsOf('mixed').filter((w) => !ids.has(w.id))).slice(0, MIN_WORDS - chosen.length);
    chosen = [...chosen, ...extra];
    pool = wordsOf('mixed');
  }
  const plan: RunPlan = {
    words: chosen.map((w) => ({ word: toMineWord(w), level: levelOf(w, progress) })),
    pool: pool.map(toMineWord),
    seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0 || 1,
  };
  return { plan, pool };
}

/** Pré-carrega as imagens (com limite de tempo) e devolve só as que carregaram */
function preloadImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const images = new Map<string, HTMLImageElement>();
  const unique = Array.from(new Set(urls));
  if (unique.length === 0) return Promise.resolve(images);
  return new Promise((resolve) => {
    let pending = unique.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(images);
    };
    const timer = window.setTimeout(finish, IMAGE_TIMEOUT_MS);
    for (const url of unique) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        images.set(url, img);
        if (--pending === 0) { window.clearTimeout(timer); finish(); }
      };
      img.onerror = () => {
        if (--pending === 0) { window.clearTimeout(timer); finish(); }
      };
      img.src = url;
    }
  });
}

/**
 * Fila sequencial de áudio: uma tarefa por vez, a próxima só começa quando a anterior resolve.
 * Depois de cancel() nada mais entra; a tarefa em curso termina sozinha e o laço para.
 */
function createAudioQueue(): AudioQueue {
  const tasks: AudioTask[] = [];
  let busy = false;
  let cancelled = false;
  const run = async () => {
    busy = true;
    while (!cancelled) {
      const task = tasks.shift();
      if (!task) break;
      try {
        await task();
      } catch {
        // áudio nunca trava a corrida
      }
    }
    busy = false;
  };
  return {
    push: (task) => {
      if (cancelled) return;
      tasks.push(task);
      if (!busy) void run();
    },
    cancel: () => {
      cancelled = true;
      tasks.length = 0;
    },
    cancelled: () => cancelled,
  };
}

const cancelSpeech = () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};

const clampLane = (n: number): Lane => (n <= 0 ? 0 : n >= 2 ? 2 : 1);

/** total = blocos julgados; retries não contam, então o contador nunca passa do total */
function snapshot(st: MineState, maxHearts: number): Hud {
  const row = st.activeRowIndex === null ? undefined : st.rows.find((r) => r.index === st.activeRowIndex);
  return {
    hearts: st.hearts,
    maxHearts,
    pickaxe: st.pickaxe,
    depth: st.depth,
    total: st.totalBlocks,
    combo: st.combo,
    score: st.score,
    prompt: row ? { mode: row.mode, phase: row.phase, word: row.target, retry: row.retry, hint: row.hint } : null,
  };
}

/** Figura da palavra: imagem, quadrado da cor, ou nada */
const Figure: React.FC<{ word: MineWord; size: string }> = ({ word, size }) => {
  if (word.image) {
    return <img src={word.image} alt="" className={`${size} shrink-0 object-contain`} style={{ imageRendering: 'pixelated' }} draggable={false} />;
  }
  if (word.hex) return <span className={`${size} shrink-0 inline-block rounded border-2 border-white/60`} style={{ backgroundColor: word.hex }} />;
  return null;
};

/** Conteúdo do pedido nos dois tamanhos: grande (fileira parada, ouvindo) e compacto (em movimento) */
const PromptBody: React.FC<{ prompt: HudPrompt; big: boolean }> = ({ prompt, big }) => {
  const { mode, word, retry, hint } = prompt;
  const main = big ? 'block text-2xl sm:text-3xl font-bold leading-tight break-words' : 'block text-xl font-bold leading-tight';
  const sub = big ? 'block text-base text-white/85 mt-1' : 'block text-sm text-white/80';
  const ask = big ? 'block text-sm text-white/70 mt-1' : 'block text-xs text-white/80';
  const note = 'block text-[10px] uppercase tracking-wide mt-1';
  return (
    <div className={big ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3 min-w-0'}>
      {mode === 'intro' && <Figure word={word} size={big ? 'w-24 h-24' : 'w-12 h-12'} />}
      {mode === 'translation_to_word' && hint && <Figure word={word} size={big ? 'w-16 h-16' : 'w-10 h-10'} />}
      <span className={`min-w-0 ${big ? 'text-center' : 'text-left'}`}>
        {mode === 'intro' && (
          <>
            <span className={main}>{word.word}</span>
            <span className={sub}>{word.translation}</span>
            <span className={`${note} text-emerald-300`}>Palavra nova</span>
          </>
        )}
        {mode === 'word_to_image' && (
          <>
            <span className={main}>{word.word}</span>
            <span className={ask}>Qual é a figura?</span>
          </>
        )}
        {mode === 'translation_to_word' && (
          <>
            <span className={main}>{word.translation}</span>
            <span className={ask}>Ache a palavra em inglês</span>
          </>
        )}
        {retry && <span className={`${note} text-amber-300`}>De novo</span>}
      </span>
    </div>
  );
};

const MineRush: React.FC<Props> = ({ category, progress, onFinish, onQuit }) => {
  const { isSoundEnabled } = useSound();
  const { village } = useVillage();
  const pickaxeFloor = village.gear.pickaxe;
  const [phase, setPhase] = useState<Phase>('intro');
  const [hud, setHud] = useState<Hud | null>(null);
  const [paused, setPaused] = useState(false);
  const [ending, setEnding] = useState<{ depth: number; maxCombo: number } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MineState | null>(null);
  const assetsRef = useRef<RenderAssets>({ images: new Map() });
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const sfxRef = useRef<ReturnType<typeof createMineSfx> | null>(null);
  const wordById = useRef<Map<string, EnglishWord>>(new Map());
  const optsRef = useRef<RenderOptions>({ width: 0, height: 0, dpr: 1, reduceEffects: false });
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastHudRef = useRef(0);
  const lastActiveRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const endTimerRef = useRef(0);
  const gestureRef = useRef<{ x: number; laneBefore: Lane; swiped: boolean } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const prevPickaxeRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  // Sons seguem a chave global de som (lida por ref para não recriar o sfx)
  const soundEnabledRef = useRef(isSoundEnabled);
  soundEnabledRef.current = isSoundEnabled;

  const maxHearts = 3;
  const bestDepth = progress?.bestDepth ?? 0;

  const getSfx = () => {
    if (!sfxRef.current) {
      sfxRef.current = createMineSfx(() => audioCtxRef.current, () => soundEnabledRef.current);
    }
    return sfxRef.current;
  };

  /** Cria/retoma o AudioContext dentro do gesto do usuário (exigência dos navegadores) */
  const unlockAudio = () => {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
      if (audioCtxRef.current.state === 'suspended') void audioCtxRef.current.resume();
    } catch {
      audioCtxRef.current = null;
    }
  };

  /** Palavra em inglês (mp3, ou fala en-US se ela não estiver no banco) */
  const wordAudio = (word: MineWord): Promise<void> => {
    const ew = wordById.current.get(word.id);
    return ew ? playWordAsync(ew) : speakAsync(word.word, 'en-US');
  };

  /** Áudio do pedido: sempre a palavra em inglês (o pai não quis a tradução falada em português) */
  const promptAudio = (row: BlockRow): Promise<void> => wordAudio(row.target);

  /** Repetição manual do pedido (botão do alto-falante): fora da fila, não segura a fileira */
  const replay = (p: HudPrompt) => {
    // durante o anúncio o pedido ainda está tocando
    if (p.phase === 'announce') return;
    const ew = wordById.current.get(p.word.id);
    if (ew) playWord(ew);
    else void speakAsync(p.word.word, 'en-US');
  };

  // ---------- Início: destrava o áudio, monta a corrida e pré-carrega as imagens ----------
  const descend = async () => {
    if (phase !== 'intro') return;
    setPhase('loading');
    unlockAudio();
    getSfx();
    const { plan, pool } = buildPlan(category, progress);
    wordById.current = new Map(pool.map((w) => [w.id, w]));
    const urls = pool.map((w) => w.image).filter((u): u is string => Boolean(u));
    assetsRef.current = { images: await preloadImages(urls) };
    const st = createRun(plan, { pickaxeFloor });
    stateRef.current = st;
    finishedRef.current = false;
    prevPickaxeRef.current = st.pickaxe;
    setHud(snapshot(st, maxHearts));
    setPhase('running');
  };

  // ---------- Tamanho do canvas: largura do modal, 3:4 no celular e 4:3 no desktop, máx. 70vh ----------
  useEffect(() => {
    if (phase !== 'running') return;
    const outer = outerRef.current;
    if (!outer) return;
    const measure = () => {
      const isDesktop = window.matchMedia('(min-width: 640px)').matches;
      const ratio = isDesktop ? 3 / 4 : 4 / 3; // altura / largura
      let w = outer.clientWidth;
      let h = w * ratio;
      const maxH = window.innerHeight * 0.7;
      if (h > maxH) { h = maxH; w = h / ratio; }
      w = Math.floor(w);
      h = Math.floor(h);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const reduceEffects = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      optsRef.current = { width: w, height: h, dpr, reduceEffects };
      // o renderer ajusta o tamanho físico (dpr) e o CSS do canvas
      rendererRef.current?.resize(optsRef.current);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [phase]);

  // ---------- Loop principal ----------
  useEffect(() => {
    if (phase !== 'running') return;
    const canvas = canvasRef.current;
    const st = stateRef.current;
    if (!canvas || !st) return;

    const renderer = createRenderer(canvas);
    rendererRef.current = renderer;
    if (optsRef.current.width > 0) renderer.resize(optsRef.current);
    const sfx = getSfx();
    const audio = createAudioQueue();
    audioQueueRef.current = audio;

    const finishRun = (state: MineState) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      // o áudio da última palavra (já em curso) termina sozinho; nada mais entra
      audio.cancel();
      const sum = summarize(state);
      setEnding({ depth: sum.depth, maxCombo: sum.maxCombo });
      endTimerRef.current = window.setTimeout(() => {
        const correct = sum.results.filter((r) => r.correct).length;
        onFinishRef.current({
          game: 'mine_rush',
          category,
          correct,
          total: sum.results.length,
          score: sum.score,
          durationSec: Math.max(1, Math.round(sum.elapsedMs / 1000)),
          words: sum.results,
          depth: sum.depth,
          maxCombo: sum.maxCombo,
        });
      }, END_OVERLAY_MS);
    };

    /** Toca o pedido da fileira parada e, quando termina, libera a fileira */
    const announce = (row: BlockRow) => {
      audio.push(async () => {
        await promptAudio(row);
        const state = stateRef.current;
        if (audio.cancelled() || !state || state.status === 'finished' || state.status === 'ready') return;
        // pausada também libera: o motor não anda parado e a fileira sai ao continuar
        const current = state.rows.find((r) => r.index === row.index);
        if (current && current.phase === 'announce') releaseRow(state);
      });
    };

    const handleEvent = (ev: MineEvent, state: MineState) => {
      switch (ev.type) {
        case 'prompt':
          announce(ev.row);
          break;
        case 'go':
          // o HUD já sincroniza por ter havido evento; o renderer cuida do movimento
          break;
        case 'hit':
          sfx.hit(ev.pickaxe);
          break;
        case 'miss':
          sfx.miss();
          break;
        case 'pickaxe':
          // o motor avisa subida e queda; só a subida tem som
          if (ev.level > prevPickaxeRef.current) sfx.pickaxeUp(ev.level);
          prevPickaxeRef.current = ev.level;
          break;
        case 'checkpoint':
          sfx.checkpoint();
          break;
        case 'audio':
          // sem repetição no impacto (pedido do pai): só os sons de quebra/batida; um erro volta como retry e é anunciado de novo
          break;
        case 'gameover':
          if (ev.reason === 'complete') sfx.unlock();
          finishRun(state);
          break;
      }
    };

    const loop = (now: number) => {
      const state = stateRef.current;
      if (!state) return;
      const dt = Math.min(MAX_DT_MS, Math.max(0, now - lastTsRef.current));
      lastTsRef.current = now;
      if (state.status === 'running') tick(state, dt);
      const events = drainEvents(state);
      for (const ev of events) handleEvent(ev, state);
      renderer.draw(state, assetsRef.current, now);
      if (events.length > 0 || now - lastHudRef.current >= HUD_SYNC_MS || state.activeRowIndex !== lastActiveRef.current) {
        lastHudRef.current = now;
        lastActiveRef.current = state.activeRowIndex;
        setHud(snapshot(state, maxHearts));
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    start(st);
    lastTsRef.current = performance.now();
    lastHudRef.current = lastTsRef.current;
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(endTimerRef.current);
      audio.cancel();
      cancelSpeech();
      audioQueueRef.current = null;
      renderer.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o loop usa refs; só (re)inicia quando a corrida começa
  }, [phase]);

  // ---------- Pausa ao perder o foco da aba ----------
  useEffect(() => {
    if (phase !== 'running') return;
    const onVisibility = () => {
      const st = stateRef.current;
      if (!st) return;
      if (document.hidden && st.status === 'running') {
        pause(st);
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase]);

  // ---------- Teclado: A/S/D e setas ----------
  useEffect(() => {
    if (phase !== 'running') return;
    const onKey = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (!st || st.status !== 'running') return;
      const k = e.key.toLowerCase();
      let next: Lane | null = null;
      if (k === 'a' || k === 'arrowleft') next = clampLane(st.lane - 1);
      else if (k === 'd' || k === 'arrowright') next = clampLane(st.lane + 1);
      else if (k === 's' || k === 'arrowdown') next = 1;
      if (next === null) return;
      e.preventDefault();
      chooseLane(st, next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const continueRun = () => {
    const st = stateRef.current;
    if (st && st.status === 'paused') resume(st);
    lastTsRef.current = performance.now();
    setPaused(false);
  };

  // ---------- Toque: terços do canvas e deslize horizontal ----------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = stateRef.current;
    if (!st || st.status !== 'running') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const third = Math.min(2, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * 3))) as Lane;
    gestureRef.current = { x: e.clientX, laneBefore: st.lane, swiped: false };
    chooseLane(st, third);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    const st = stateRef.current;
    if (!g || g.swiped || !st || st.status !== 'running') return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) < SWIPE_PX) return;
    g.swiped = true;
    chooseLane(st, clampLane(g.laneBefore + (dx > 0 ? 1 : -1)));
  };
  const onPointerEnd = () => {
    gestureRef.current = null;
  };

  const quit = () => {
    cancelAnimationFrame(rafRef.current);
    window.clearTimeout(endTimerRef.current);
    audioQueueRef.current?.cancel();
    cancelSpeech();
    onQuit();
  };

  // ---------- Tela de entrada ----------
  if (phase !== 'running') {
    const loading = phase === 'loading';
    return (
      <div className="text-center py-4 text-white">
        <img src="/assets/english/ui/minecart.webp" alt="" className="w-28 h-28 mx-auto" style={{ imageRendering: 'pixelated' }} draggable={false} />
        <h3 className="mc-title text-base sm:text-xl mt-2">Mine Rush</h3>
        <p className="text-white/85 mt-3">Ouça o pedido, troque de pista e quebre o bloco certo antes do carrinho bater.</p>
        <p className="text-sm mt-2 font-bold" style={{ color: PICKAXES[pickaxeFloor].color }}>
          Você desce com a {PICKAXES[pickaxeFloor].name.toLowerCase()} (x{PICKAXES[pickaxeFloor].multiplier}). Combo ainda sobe. Errar não tira essa picareta.
        </p>
        <p className="text-sm text-white/60 mt-1">Toque nos lados da tela, deslize, ou use A, S, D e as setas.</p>
        {bestDepth > 0 && (
          <p className="mc-font text-[10px] mc-diamond mt-4">Recorde: {bestDepth} blocos</p>
        )}
        <button
          onClick={descend}
          disabled={loading}
          className="mc-btn mc-btn-green mt-6 w-full max-w-xs mx-auto py-4 text-lg font-bold uppercase"
        >
          {loading ? 'Preparando a mina...' : 'Descer na mina'}
        </button>
        <div className="mt-4">
          <button onClick={onQuit} className="text-sm text-white/60 hover:text-white hover:underline">Sair</button>
        </div>
      </div>
    );
  }

  // ---------- Corrida ----------
  const pick = PICKAXES[Math.min(hud?.pickaxe ?? 0, PICKAXES.length - 1)];
  const prompt = hud?.prompt ?? null;

  return (
    <div ref={outerRef} className="w-full select-none">
      <div className="relative mx-auto bg-stone-900 rounded-xl overflow-hidden" style={{ width: size.w || '100%', height: size.h || undefined, aspectRatio: size.h ? undefined : '3 / 4' }}>
        <div
          className="absolute inset-0"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        >
          <canvas ref={canvasRef} className="block w-full h-full" style={{ imageRendering: 'pixelated' }} />
        </div>

        {/* HUD: barra de cima */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-2 text-white pointer-events-none">
          <span className="flex gap-1">
            {Array.from({ length: hud?.maxHearts ?? maxHearts }).map((_, i) => (
              <Heart key={i} className={`w-5 h-5 drop-shadow ${i < (hud?.hearts ?? 0) ? 'text-red-500 fill-current' : 'text-white/30'}`} />
            ))}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide drop-shadow" style={{ color: pick.color }}>
            {pick.name} x{pick.multiplier}
          </span>
          <span className="text-xs drop-shadow" style={pixelFont}>
            {hud?.depth ?? 0}/{hud?.total ?? 40}
          </span>
          <span className="text-xs text-yellow-300 drop-shadow" style={pixelFont}>
            {hud?.score ?? 0}
          </span>
          <button onClick={quit} className="pointer-events-auto text-xs font-semibold text-white/80 bg-black/40 rounded-md px-2 py-1 hover:bg-black/60">Sair</button>
        </div>

        {/* Combo */}
        {(hud?.combo ?? 0) >= 2 && (
          <div className="absolute top-10 right-3 text-yellow-300 text-sm drop-shadow pointer-events-none" style={pixelFont}>
            x{hud?.combo}
          </div>
        )}

        {/* Pedido grande: fileira parada no fundo, ouvindo o áudio. Fica na base para não cobrir a fileira parada */}
        {prompt && prompt.phase === 'announce' && (
          <div className="absolute inset-0 flex items-end justify-center p-4 pointer-events-none">
            <div className="w-full max-w-xs bg-black/75 border border-white/15 rounded-2xl px-5 py-4 text-white text-center shadow-2xl">
              <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-wide text-emerald-300">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>Ouça</span>
              </div>
              <div className="mt-3">
                <PromptBody prompt={prompt} big />
              </div>
              {/* desabilitado enquanto o pedido toca */}
              <button
                onClick={() => replay(prompt)}
                disabled
                aria-disabled="true"
                className="pointer-events-auto mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 text-sm font-semibold opacity-40 cursor-not-allowed"
                aria-label="Ouvir o pedido de novo"
              >
                <Volume2 className="w-5 h-5" />
                Ouvir de novo
              </button>
            </div>
          </div>
        )}

        {/* Pedido compacto: fileira descendo */}
        {prompt && prompt.phase === 'moving' && (
          <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none">
            <div className="flex items-center gap-3 bg-black/60 text-white rounded-xl px-3 py-2 max-w-full">
              <PromptBody prompt={prompt} big={false} />
              <button
                onClick={() => replay(prompt)}
                className="pointer-events-auto shrink-0 p-2 rounded-lg bg-white/15 hover:bg-white/30"
                aria-label="Ouvir o pedido de novo"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Pausa (perdeu o foco da aba) */}
        {paused && !ending && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
            <p className="text-lg font-bold mb-4" style={titleFont}>Corrida pausada</p>
            <button onClick={continueRun} className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-lg">Continuar</button>
            <button onClick={quit} className="mt-3 text-sm text-white/70 hover:underline">Sair</button>
          </div>
        )}

        {/* Fim da corrida: overlay curto antes do resultado do hub */}
        {ending && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-center px-4">
            <p className="text-sm text-white/70 mb-2">Fim da corrida</p>
            <p className="text-sm leading-relaxed" style={pixelFont}>
              Profundidade {ending.depth} · Melhor combo {ending.maxCombo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MineRush;
