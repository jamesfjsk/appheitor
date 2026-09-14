// ========================================
// Mine Rush: tela da corrida (input, HUD, ciclo de vida)
// O motor (engine.ts) cuida das regras, o render.ts desenha e o sfx.ts faz os sons.
// Nenhuma animação do framer-motion roda durante a corrida.
// Fluxo: 'Descer na mina' (destrava o AudioContext e pré-carrega as imagens) -> corrida
// -> overlay de 1,5 s com profundidade e melhor combo -> onFinish (o resultado é do EnglishArena).
// ========================================

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Volume2 } from 'lucide-react';
import { EnglishCategory, EnglishWord } from '../../../../data/englishVocabulary';
import { EnglishProgressDoc, RoundResult, pickWords, playWord, shuffle, wordsOf } from '../../../../services/englishGameService';
import { useSound } from '../../../../contexts/SoundContext';
import { Lane, MineEvent, MineState, MineWord, PICKAXES, PromptMode, RenderAssets, RenderOptions, RunPlan } from './types';
import { chooseLane, createRun, drainEvents, pause, resume, start, summarize, tick } from './engine';
import { createRenderer } from './render';
import { createMineSfx } from './sfx';

interface Props {
  category: EnglishCategory | 'mixed';
  progress: EnglishProgressDoc | null;
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}

type Phase = 'intro' | 'loading' | 'running';

/** Cópia leve do estado para o HUD (atualizada só em eventos e a cada 200 ms) */
interface Hud {
  hearts: number;
  maxHearts: number;
  pickaxe: number;
  depth: number;
  total: number;
  combo: number;
  score: number;
  prompt: { mode: PromptMode; word: MineWord; retry: boolean } | null;
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

/** Nível da palavra pela regra da Fase 1: nunca vista = 0 (placa), streak 0-1 = 1, senão 2 */
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

const clampLane = (n: number): Lane => (n <= 0 ? 0 : n >= 2 ? 2 : 1);

/** total = blocos julgados + placas de aprendizado (depth conta as placas, então o contador nunca passa do total) */
function snapshot(st: MineState, maxHearts: number, total: number): Hud {
  const row = st.activeRowIndex === null ? undefined : st.rows.find((r) => r.index === st.activeRowIndex);
  return {
    hearts: st.hearts,
    maxHearts,
    pickaxe: st.pickaxe,
    depth: st.depth,
    total,
    combo: st.combo,
    score: st.score,
    prompt: row ? { mode: row.mode, word: row.target, retry: row.retry } : null,
  };
}

const MineRush: React.FC<Props> = ({ category, progress, onFinish, onQuit }) => {
  const { isSoundEnabled } = useSound();
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
  const totalRef = useRef(0);
  const gestureRef = useRef<{ x: number; laneBefore: Lane; swiped: boolean } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
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

  const speak = (word: MineWord) => {
    const ew = wordById.current.get(word.id);
    if (ew) playWord(ew);
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
    const st = createRun(plan);
    stateRef.current = st;
    finishedRef.current = false;
    prevPickaxeRef.current = st.pickaxe;
    totalRef.current = st.totalBlocks + st.queue.filter((r) => r.mode === 'learn').length;
    setHud(snapshot(st, maxHearts, totalRef.current));
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

    const finishRun = (state: MineState) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
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

    const handleEvent = (ev: MineEvent, state: MineState) => {
      switch (ev.type) {
        case 'hit':
          sfx.hit(ev.pickaxe);
          break;
        case 'miss':
          sfx.miss();
          break;
        case 'learn':
          sfx.learn();
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
          speak(ev.word);
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
        setHud(snapshot(state, maxHearts, totalRef.current));
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
    onQuit();
  };

  // ---------- Tela de entrada ----------
  if (phase !== 'running') {
    const loading = phase === 'loading';
    return (
      <div className="text-center py-4 text-white">
        <img src="/assets/english/ui/minecart.webp" alt="" className="w-28 h-28 mx-auto" style={{ imageRendering: 'pixelated' }} draggable={false} />
        <h3 className="mc-title text-base sm:text-xl mt-2">Mine Rush</h3>
        <p className="text-white/85 mt-3">Troque de pista e quebre o bloco certo antes do carrinho bater.</p>
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

        {/* Pedido da fileira ativa */}
        {prompt && (
          <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none">
            <div className="flex items-center gap-3 bg-black/60 text-white rounded-xl px-3 py-2 max-w-full">
              {(prompt.mode === 'learn' || prompt.mode === 'image_to_word') && (
                prompt.word.image ? (
                  <img src={prompt.word.image} alt="" className="w-12 h-12 object-contain" style={{ imageRendering: 'pixelated' }} draggable={false} />
                ) : prompt.word.hex ? (
                  <span className="w-12 h-12 rounded border-2 border-white/60" style={{ backgroundColor: prompt.word.hex }} />
                ) : (
                  <span className="text-lg font-bold">{prompt.word.word}</span>
                )
              )}
              <span className="min-w-0 text-left">
                {prompt.mode === 'learn' && (
                  <>
                    <span className="block text-xl font-bold leading-tight">{prompt.word.word}</span>
                    <span className="block text-sm text-white/80">{prompt.word.translation}</span>
                    <span className="block text-[10px] text-emerald-300 uppercase">Palavra nova: quebre qualquer bloco</span>
                  </>
                )}
                {prompt.mode === 'image_to_word' && <span className="block text-xs text-white/80">Qual é a palavra?</span>}
                {prompt.mode === 'translation_to_word' && (
                  <>
                    <span className="block text-xl font-bold leading-tight">{prompt.word.translation}</span>
                    <span className="block text-xs text-white/80">Como se diz em inglês?</span>
                  </>
                )}
                {prompt.mode === 'word_to_image' && (
                  <>
                    <span className="block text-xl font-bold leading-tight">{prompt.word.word}</span>
                    <span className="block text-xs text-white/80">Qual é a figura?</span>
                  </>
                )}
                {prompt.retry && prompt.mode !== 'learn' && <span className="block text-[10px] text-amber-300 uppercase">De novo</span>}
              </span>
              <button
                onClick={() => speak(prompt.word)}
                className="pointer-events-auto shrink-0 p-2 rounded-lg bg-white/15 hover:bg-white/30"
                aria-label="Ouvir a palavra"
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
