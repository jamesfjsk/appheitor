// ========================================
// Mina: oficina de Redstone em tela cheia (Phaser). Regras em redstone.ts.
// Porta: Recado feito. 3 etapas. Paga redstone + XP, nunca gold.
// ========================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../../config/englishBase';
import { completeRedstone } from '../../../../services/redstoneService';
import {
  RS_MAX_TRIES,
  clickCell,
  coachOf,
  goalOf,
  howOf,
  initialState,
  isWon,
  kitLeft,
  lookOf,
  needsReady,
  sessionFor,
  simulate,
  startTool,
  whyOf,
  type BenchState,
  type Tool,
} from '../../../../services/village/redstone';
import { checkLevelUp, emitMinerLevelUp } from '../../../../utils/levelSystem';
import { useSound } from '../../../../contexts/SoundContext';
import { benchSceneOf, createRedstoneGame } from '../../../../game/redstone/createGame';
import { createRedstoneSfx } from './redstoneSfx';

const TORCH = '/assets/english/ui/torch.webp';
const WIN_MS = 1200;
const FAIL_MS = 1600;
const HOW_NAME: Record<string, string> = {
  lever: 'Alavanca',
  dust: 'Pó',
  torch: 'Tocha',
  lamp: 'Lâmpada',
  piston: 'Pistão',
};

interface Props {
  uid: string;
  date: string;
  minerLevel: number;
  noteDone: boolean;
  claimed: boolean;
  onQuit: () => void;
  onGoRecado: () => void;
}

const RedstoneBench: React.FC<Props> = ({ uid, date, minerLevel, noteDone, claimed, onQuit, onGoRecado }) => {
  const { playClick, isSoundEnabled } = useSound();
  const session = useMemo(() => sessionFor(uid, date, minerLevel), [uid, date, minerLevel]);
  const [stageIndex, setStageIndex] = useState(0);
  const puzzle = session[stageIndex] ?? session[0]!;
  const [state, setState] = useState<BenchState>(() => initialState(puzzle));
  const [fails, setFails] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const [failWhy, setFailWhy] = useState('');
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [result, setResult] = useState<{ redstone: number; xp: number } | null>(null);
  const [tool, setTool] = useState<Tool>(() => startTool(puzzle));
  const finishing = useRef(false);
  const ended = useRef(false);
  const stageIndexRef = useRef(0);
  const wonRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ReturnType<typeof createRedstoneGame> | null>(null);
  const onCellRef = useRef<(i: number) => void>(() => undefined);
  const onToolRef = useRef<(t: Tool) => void>(() => undefined);
  const audioRef = useRef<AudioContext | null>(null);
  const soundOn = useRef(isSoundEnabled);
  const [sfx] = useState(() => createRedstoneSfx(() => audioRef.current, () => soundOn.current));
  const reduced = useRef(false);

  useEffect(() => {
    soundOn.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const unlockAudio = () => {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!audioRef.current) audioRef.current = new Ctor();
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    } catch {
      audioRef.current = null;
    }
  };

  useEffect(() => {
    finishing.current = false;
    ended.current = false;
    wonRef.current = 0;
    stageIndexRef.current = 0;
    setStageIndex(0);
    setFails(0);
    setHintOn(false);
    setFailWhy('');
    setCelebrate(false);
    setReveal(false);
    setResult(null);
  }, [session]);

  useEffect(() => {
    setTool(startTool(puzzle));
    setState(initialState(puzzle));
    setFails(0);
    setHintOn(false);
    setFailWhy('');
    setCelebrate(false);
    setReveal(false);
  }, [puzzle]);

  const hot = useMemo(() => simulate(puzzle, state), [puzzle, state]);
  const cold = useMemo(
    () => simulate(puzzle, { ...state, leverOn: state.leverOn.map(() => false) }),
    [puzzle, state],
  );
  const done = claimed || Boolean(result);
  const running = reveal || celebrate || done;
  const sim = running ? hot : cold;
  const inputOn = noteDone && !done && !saving && !celebrate && !reveal;
  const triesLeft = Math.max(0, RS_MAX_TRIES - fails);
  const coach = useMemo(() => coachOf(puzzle, state, tool), [puzzle, state, tool]);

  useEffect(() => {
    if (!inputOn || puzzle.mode === 'order') return;
    const left = kitLeft(puzzle, state);
    if (left.dust + left.lever + left.torch === 0 && tool !== 'hand') setTool('hand');
  }, [inputOn, puzzle, state, tool]);

  const saveSession = async (stages: number) => {
    if (finishing.current || claimed || !noteDone) return;
    finishing.current = true;
    setSaving(true);
    try {
      const pay = await completeRedstone(uid, date, stages);
      setResult({ redstone: pay.redstone, xp: pay.xp });
      emitMinerLevelUp(checkLevelUp(pay.previousXP, pay.totalXP));
      if (pay.redstone > 0) toast.success(`+${pay.redstone} redstone, +${pay.xp} XP`);
      else toast.success(`Oficina encerrada. +${pay.xp} XP`);
    } catch (e) {
      finishing.current = false;
      setCelebrate(false);
      const msg = e instanceof Error ? e.message : 'Não deu para guardar o circuito.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const resolveStage = (won: boolean) => {
    if (finishing.current || claimed || !noteDone) return;
    if (stageIndexRef.current < 2) {
      if (won) wonRef.current += 1;
      stageIndexRef.current += 1;
      setStageIndex(stageIndexRef.current);
      return;
    }
    if (!ended.current) {
      if (won) wonRef.current += 1;
      ended.current = true;
    }
    void saveSession(wonRef.current);
  };

  useEffect(() => {
    if (!celebrate || result || finishing.current) return;
    const t = window.setTimeout(() => resolveStage(true), WIN_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate, result]);

  useEffect(() => {
    if (!reveal || celebrate || result || finishing.current) return;
    const t = window.setTimeout(() => {
      const next = fails + 1;
      setFails(next);
      setReveal(false);
      setState(initialState(puzzle));
      if (next >= RS_MAX_TRIES) resolveStage(false);
    }, FAIL_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, celebrate, result, fails, puzzle]);

  const failBoard = () => {
    const game = gameRef.current;
    if (!game) return;
    benchSceneOf(game)?.failJuice();
  };

  const onRetry = () => {
    if (!inputOn) return;
    playClick();
    setState(initialState(puzzle));
    setHintOn(false);
    setFailWhy('');
  };

  const onReady = () => {
    if (!inputOn || !needsReady(puzzle)) return;
    unlockAudio();
    setReveal(true);
    if (isWon(puzzle, state)) {
      setCelebrate(true);
      sfx.win();
      return;
    }
    setFailWhy(whyOf(puzzle, state));
    setHintOn(true);
    sfx.fail();
    failBoard();
  };

  const onCell = (i: number) => {
    if (!inputOn) return;
    unlockAudio();
    const { state: next, event } = clickCell(puzzle, state, i, tool);
    if (event === 'noop') return;
    if (event === 'toggle') sfx.toggle();
    else if (event === 'paint' || event === 'place') sfx.paint();
    else if (event === 'pick') sfx.toggle();
    else if (event === 'repair') sfx.repair();
    else if (event === 'order-ok' || event === 'order-win') sfx.ok();
    if (event === 'order-fail') {
      sfx.fail();
      failBoard();
      const n = fails + 1;
      setFails(n);
      setHintOn(true);
      setState(initialState(puzzle));
      if (n >= RS_MAX_TRIES) resolveStage(false);
      return;
    }
    if (event === 'paint' || event === 'repair' || event === 'place') sfx.power();
    setState(next);
  };
  onCellRef.current = onCell;
  onToolRef.current = setTool;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const game = createRedstoneGame(el, {
      onTile: (i) => onCellRef.current(i),
      onTool: (t) => onToolRef.current(t),
    });
    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const view = {
      puzzle,
      state,
      sim,
      inputOn,
      celebrate,
      reducedMotion: reduced.current,
      tool,
    };
    const apply = (): boolean => {
      const scene = benchSceneOf(game);
      if (!scene) return false;
      scene.sync(view);
      return true;
    };
    if (apply()) return undefined;
    const t = window.setInterval(() => {
      if (apply()) window.clearInterval(t);
    }, 40);
    return () => window.clearInterval(t);
  }, [puzzle, state, sim, inputOn, celebrate, tool, reveal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onQuit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onQuit]);

  return (
    <div className="rs-play" data-testid="redstone-play" onPointerDownCapture={unlockAudio}>
      <header className="rs-play-bar">
        <button type="button" className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold" onClick={onQuit} data-testid="redstone-quit">
          Voltar à Mina
        </button>
        <div className="min-w-0 text-center">
          <p className="mc-font text-[9px] mc-muted uppercase">Oficina da Mina · Etapa {puzzle.stage ?? stageIndex + 1} de 3</p>
          <p className="text-base font-bold text-white leading-snug">{puzzle.title}</p>
          <p className="text-sm font-bold text-amber-200" data-testid="redstone-goal">{goalOf(puzzle)}</p>
          <p className="rs-play-how" data-testid="redstone-coach">
            {noteDone
              ? done
                ? 'Oficina do dia encerrada.'
                : coach
              : 'Primeiro o Recado da Mina. Depois você monta o fio aqui.'}
          </p>
          {noteDone && !done && (
            <p className="rs-play-look" data-testid="redstone-look">{lookOf(puzzle, state, running)}</p>
          )}
          <div className="rs-how" data-testid="redstone-how">
            {howOf(puzzle).map((chip) => (
              <span key={chip.id} className="rs-how-chip">
                <b>{HOW_NAME[chip.id] ?? chip.id}</b> {chip.label}
              </span>
            ))}
          </div>
        </div>
        <div className="rs-tries" aria-label={`${triesLeft} tentativas`}>
          <span className="mc-font text-[9px] mc-muted uppercase">Tentativas</span>
          <div className="flex gap-1 mt-1 justify-end">
            {Array.from({ length: RS_MAX_TRIES }, (_, n) => (
              <img
                key={n}
                src={TORCH}
                alt=""
                draggable={false}
                className={`w-7 h-7 mc-pixel ${n < triesLeft ? '' : 'opacity-25 grayscale'}`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="rs-play-stage" data-testid="redstone-bench">
        <div ref={stageRef} className="absolute inset-0" />
        {!noteDone && (
          <div className="rs-play-lock" data-testid="redstone-locked">
            <div className="rs-play-lock-card">
              <p className="mc-font text-[9px] mc-muted uppercase mb-1">Porta da oficina</p>
              <p className="text-base font-bold text-white">Primeiro o Recado da Mina</p>
              <p className="text-sm text-white/85 mt-2">
                É o contrato do dia no quadro. Faz ele, volta para cá, monta o fio e leva redstone para a Fornalha.
              </p>
              <button type="button" className="mc-btn mc-btn-green mt-4 px-5 py-2.5 text-sm font-bold" onClick={onGoRecado} data-testid="redstone-go-note">
                Fazer o Recado
              </button>
            </div>
          </div>
        )}
        {noteDone && done && (
          <div className="rs-play-lock" data-testid="redstone-done">
            <div className="rs-play-lock-card flex items-center gap-3">
              <img src={MATERIAL_ICONS.redstone} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
              <p className="text-sm text-white">
                {result
                  ? result.redstone > 0
                    ? `Oficina feita. +${result.redstone} ${MATERIAL_LABELS.redstone.toLowerCase()} · +${result.xp} XP`
                    : `Oficina encerrada. +${result.xp} XP`
                  : 'Você já fez os circuitos de hoje.'}
              </p>
            </div>
          </div>
        )}
        {hintOn && <p className="rs-play-hint">{failWhy || puzzle.hint}</p>}
        {inputOn && (
          <div className="rs-play-actions">
            {needsReady(puzzle) && (
              <button type="button" className="mc-btn mc-btn-green px-5 py-2.5 text-sm font-bold" onClick={onReady} data-testid="redstone-ready">
                Pronto
              </button>
            )}
            <button type="button" className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold" onClick={onRetry} data-testid="redstone-retry">
              Alavancas de novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedstoneBench;
