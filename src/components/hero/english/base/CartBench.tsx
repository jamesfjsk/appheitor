// ========================================
// Mina: vagoneta do dia. 3 contas. Recado abre. Paga redstone + XP, nunca gold.
// ========================================

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../../config/englishBase';
import { completeRedstone } from '../../../../services/redstoneService';
import {
  CART_MAX_TRIES,
  emptyPick,
  isWon,
  scrambleCrates,
  sessionFor,
  toggleCrate,
  weigh,
  whyOf,
} from '../../../../services/village/cart';
import { checkLevelUp, emitMinerLevelUp } from '../../../../utils/levelSystem';
import { useSound } from '../../../../contexts/SoundContext';

const TORCH = '/assets/english/ui/torch.webp';
const CHEST = '/assets/english/ui/chest.webp';
const IRON = '/assets/english/ui/base/mat_ferro.webp';
const CAVE = '/assets/english/ui/cart/tunnel.png';
const LOCO = '/assets/english/ui/cart/loco.png';
const WAGON = '/assets/english/ui/cart/wagon.png';
const SIGN = '/assets/english/ui/cart/sign.png';
const SIGNAL = '/assets/english/ui/cart/signal.png';
const WIN_MS = 1600;
const FAIL_MS = 1680;
const RETURN_MS = 900;
const ENTER_MS = 680;

interface Props {
  uid: string;
  date: string;
  minerLevel: number;
  noteDone: boolean;
  claimed: boolean;
  onQuit: () => void;
  onGoRecado: () => void;
}

const Wagon: React.FC<{
  value: number;
  cargo: string;
  hitch?: boolean;
  locked?: boolean;
  disabled?: boolean;
  arrive?: boolean;
  ghost?: boolean;
  testid: string;
  onClick?: () => void;
}> = ({ value, cargo, hitch, locked, disabled, arrive, ghost, testid, onClick }) => {
  const className = `vg-wagon${hitch ? ' is-hitch' : ''}${locked ? ' is-lock' : ''}${arrive ? ' is-arrive' : ''}${ghost ? ' is-ghost' : ''}`;
  const inner = (
    <>
      <img src={WAGON} alt="" className="vg-wagon-body mc-pixel" draggable={false} />
      <img src={cargo} alt="" className="vg-wagon-load mc-pixel" draggable={false} />
      <span className="vg-wagon-tag">{value}</span>
    </>
  );
  if (locked || !onClick) {
    return (
      <div className={className} data-testid={testid}>
        {inner}
      </div>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} data-testid={testid}>
      {inner}
    </button>
  );
};

const CartBench: React.FC<Props> = ({ uid, date, minerLevel, noteDone, claimed, onQuit, onGoRecado }) => {
  const { playClick } = useSound();
  const session = useMemo(() => sessionFor(uid, date, minerLevel), [uid, date, minerLevel]);
  const [stageIndex, setStageIndex] = useState(0);
  const puzzle = session[stageIndex] ?? session[0]!;
  const [crates, setCrates] = useState<number[]>(() => puzzle.crates);
  const [on, setOn] = useState<boolean[]>(() => emptyPick(puzzle.crates.length));
  const [fails, setFails] = useState(0);
  const [failWhy, setFailWhy] = useState('');
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [result, setResult] = useState<{ redstone: number; xp: number } | null>(null);
  const [fly, setFly] = useState<{
    i: number;
    value: number;
    left: number;
    top: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
    go: boolean;
  } | null>(null);
  const pendingFly = useRef<{ i: number; from: DOMRect } | null>(null);
  const [arriving, setArriving] = useState<number | null>(null);
  const [enter, setEnter] = useState(true);
  const [returning, setReturning] = useState(false);
  const finishing = useRef(false);
  const ended = useRef(false);
  const stageIndexRef = useRef(0);
  const wonRef = useRef(0);

  useEffect(() => {
    finishing.current = false;
    ended.current = false;
    wonRef.current = 0;
    stageIndexRef.current = 0;
    setStageIndex(0);
    setFails(0);
    setFailWhy('');
    setCelebrate(false);
    setReveal(false);
    setResult(null);
  }, [session]);

  useEffect(() => {
    setCrates(puzzle.crates);
    setOn(emptyPick(puzzle.crates.length));
    setFails(0);
    setFailWhy('');
    setCelebrate(false);
    setReveal(false);
    setFly(null);
    setArriving(null);
    pendingFly.current = null;
    setReturning(false);
    setEnter(true);
    const t = window.setTimeout(() => setEnter(false), ENTER_MS);
    return () => window.clearTimeout(t);
  }, [puzzle]);

  const board = { ...puzzle, crates };
  const done = claimed || Boolean(result);
  const inputOn = noteDone && !done && !saving && !celebrate && !reveal;
  const triesLeft = Math.max(0, CART_MAX_TRIES - fails);
  const shown = reveal || celebrate ? weigh(board, on) : null;
  const hitchCount = on.filter(Boolean).length;
  const railClass = [
    'vg-line',
    enter && !celebrate && !reveal ? 'is-enter' : '',
    celebrate ? 'is-go' : '',
    reveal && !celebrate ? 'is-fail' : '',
    reveal && !celebrate && failWhy === 'Tombou' ? 'is-dump' : '',
    reveal && !celebrate && failWhy === 'Faltou' ? 'is-short' : '',
    returning ? 'is-return' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
      const msg = e instanceof Error ? e.message : 'Não deu para guardar a vagoneta.';
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
    const ret = window.setTimeout(() => setReturning(true), RETURN_MS);
    const t = window.setTimeout(() => {
      const next = fails + 1;
      setFails(next);
      setReveal(false);
      setReturning(false);
      setFly(null);
      setArriving(null);
      pendingFly.current = null;
      setCrates(scrambleCrates(puzzle, `try${next}`).crates);
      setOn(emptyPick(puzzle.crates.length));
      setFailWhy('');
      if (next >= CART_MAX_TRIES) resolveStage(false);
    }, FAIL_MS);
    return () => {
      window.clearTimeout(ret);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, celebrate, result, fails, puzzle]);

  const onRetry = () => {
    if (!inputOn) return;
    playClick();
    setFly(null);
    setArriving(null);
    pendingFly.current = null;
    setOn(emptyPick(puzzle.crates.length));
    setFailWhy('');
  };

  const onCrate = (i: number) => {
    if (!inputOn) return;
    const el = document.querySelector(`[data-testid="cart-crate-${i}"]`);
    if (arriving === null && el) pendingFly.current = { i, from: el.getBoundingClientRect() };
    playClick();
    if (arriving === null) setArriving(i);
    setOn((prev) => toggleCrate(prev, i));
  };

  useLayoutEffect(() => {
    const pending = pendingFly.current;
    pendingFly.current = null;
    if (!pending) return;
    const dest = document.querySelector(`[data-testid="cart-crate-${pending.i}"]`);
    if (!dest) {
      setArriving(null);
      return;
    }
    const to = dest.getBoundingClientRect();
    const dx = to.left - pending.from.left;
    const dy = to.top - pending.from.top;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
      setArriving(null);
      return;
    }
    setFly({
      i: pending.i,
      value: crates[pending.i] as number,
      left: pending.from.left,
      top: pending.from.top,
      width: pending.from.width,
      height: pending.from.height,
      dx,
      dy,
      go: false,
    });
  }, [on, crates]);

  useEffect(() => {
    if (!fly || fly.go) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setFly((cur) => (cur ? { ...cur, go: true } : null));
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [fly]);

  useEffect(() => {
    if (!fly?.go) return;
    const t = window.setTimeout(() => {
      setFly(null);
      setArriving(null);
    }, 420);
    return () => window.clearTimeout(t);
  }, [fly]);

  const onSend = () => {
    if (!inputOn || hitchCount === 0) return;
    playClick();
    setFly(null);
    setArriving(null);
    pendingFly.current = null;
    setReveal(true);
    if (isWon(board, on)) {
      setCelebrate(true);
      return;
    }
    setFailWhy(whyOf(board, on));
  };

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
    <div className="rs-play" data-testid="redstone-play">
      <header className="vg-bar">
        <button type="button" className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold" onClick={onQuit} data-testid="redstone-quit">
          Voltar à Mina
        </button>
        <div className="vg-dots" aria-label={`etapa ${puzzle.stage} de 3`}>
          {[1, 2, 3].map((n) => (
            <i key={n} className={n === puzzle.stage ? 'is-now' : n < puzzle.stage ? 'is-done' : ''} />
          ))}
        </div>
        <div className="rs-tries" aria-label={`${triesLeft} tentativas`}>
          <div className="flex gap-1 justify-end">
            {Array.from({ length: CART_MAX_TRIES }, (_, n) => (
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

      <div
        className="rs-play-stage vg-stage"
        data-testid="cart-bench"
        data-target={puzzle.target}
        data-loaded={puzzle.loaded}
        data-need={puzzle.needCount ?? ''}
      >
        {!noteDone && (
          <div className="rs-play-lock" data-testid="redstone-locked">
            <div className="rs-play-lock-card">
              <p className="text-base font-bold text-white">Primeiro o Recado da Mina</p>
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
                    ? `+${result.redstone} ${MATERIAL_LABELS.redstone.toLowerCase()} · +${result.xp} XP`
                    : `+${result.xp} XP`
                  : 'Já foi hoje.'}
              </p>
            </div>
          </div>
        )}

        <img src={CAVE} alt="" className="vg-cave mc-pixel" draggable={false} />
        <div className="vg-dim" />

        <div className="vg-play">
          <div className="vg-hang">
            <img src={SIGN} alt="" className="vg-goal-plank mc-pixel" draggable={false} />
            <span className="vg-goal-n" data-testid="redstone-goal">{puzzle.target}</span>
            {shown && (
              <span className={`vg-goal-got${failWhy === 'Tombou' ? ' is-over' : failWhy === 'Faltou' ? ' is-under' : ''}`} data-testid="cart-scale">
                {shown.sum}
              </span>
            )}
            {puzzle.needCount !== null && (
              <span className={`vg-cars${failWhy === 'contagem' ? ' is-bad' : ''}`} data-testid="cart-need">
                {Array.from({ length: puzzle.needCount }, (_, i) => (
                  <i key={i} className={reveal && i < hitchCount ? 'is-in' : ''} />
                ))}
              </span>
            )}
          </div>

          <div className={railClass} data-testid="cart-body">
            <div className="vg-train">
              {puzzle.loaded > 0 && (
                <Wagon value={puzzle.loaded} cargo={IRON} locked testid="cart-loaded" />
              )}
              {crates.map((value, i) =>
                on[i] ? (
                  <Wagon
                    key={`on-${i}`}
                    value={value}
                    cargo={CHEST}
                    hitch
                    ghost={arriving === i}
                    arrive={arriving === i && !fly}
                    disabled={!inputOn}
                    testid={`cart-crate-${i}`}
                    onClick={() => onCrate(i)}
                  />
                ) : null,
              )}
              {inputOn && <span className="vg-hook" aria-hidden />}
              <img src={LOCO} alt="" className="vg-loco mc-pixel" draggable={false} />
            </div>
            {(inputOn || celebrate || reveal) && (
              <button
                type="button"
                className={`vg-send${!celebrate && (hitchCount === 0 || reveal) ? ' is-off' : ''}${celebrate ? ' is-go' : ''}`}
                onClick={onSend}
                disabled={!inputOn || hitchCount === 0}
                data-testid="redstone-ready"
              >
                <img src={SIGNAL} alt="" className="vg-signal mc-pixel" draggable={false} />
                <span>Enviar</span>
              </button>
            )}
          </div>

          <div className="vg-yard">
            {crates.map((value, i) =>
              on[i] ? null : (
                <Wagon
                  key={`off-${i}`}
                  value={value}
                  cargo={CHEST}
                  ghost={arriving === i}
                  arrive={arriving === i && !fly}
                  disabled={!inputOn}
                  testid={`cart-crate-${i}`}
                  onClick={() => onCrate(i)}
                />
              ),
            )}
          </div>

          {fly && (
            <div
              className={`vg-fly${fly.go ? ' is-go' : ''}`}
              style={{
                left: fly.left,
                top: fly.top,
                width: fly.width,
                height: fly.height,
                transform: fly.go ? `translate(${fly.dx}px, ${fly.dy}px)` : 'translate(0, 0)',
              }}
              onTransitionEnd={(e) => {
                if (e.propertyName !== 'transform') return;
                setFly(null);
                setArriving(null);
              }}
            >
              <Wagon value={fly.value} cargo={CHEST} testid="cart-fly" />
            </div>
          )}

          {failWhy === 'Tombou' && <p className="vg-stamp is-over" data-testid="cart-why">Tombou</p>}
          {failWhy === 'Faltou' && <p className="vg-stamp is-under" data-testid="cart-why">Faltou</p>}

          {inputOn && (
            <button type="button" className="mc-btn mc-btn-stone vg-reset" onClick={onRetry} data-testid="redstone-retry">
              De novo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartBench;
