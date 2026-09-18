// ========================================
// Mina: vagoneta do dia. 3 contas. Recado abre. Paga redstone + XP, nunca gold.
// ========================================

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MATERIAL_ICONS } from '../../../../config/englishBase';
import { completeRedstone } from '../../../../services/redstoneService';
import {
  CART_MAX_TRIES,
  CART_TRY_MS,
  closeOf,
  emptyPick,
  hitchOf,
  hookSlots,
  isWon,
  sayOf,
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
const SIGNAL = '/assets/english/ui/cart/signal.png';
const DOCK = '/assets/english/ui/cart/dock.png';
const SMITH = '/assets/village/npc/ferreiro-iso.png';
const WIN_MS = 1600;
const FAIL_MS = 1680;
const RETURN_MS = 900;
const ENTER_MS = 680;

interface Props {
  uid: string;
  date: string;
  minerLevel: number;
  redstoneDone?: number;
  redstonePerfect?: number;
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

const OpTile: React.FC<{ value: number; caption?: string; testid?: string }> = ({ value, caption, testid }) => (
  <span className={`vg-op-tile${caption ? ' has-cap' : ''}`} data-testid={testid}>
    {caption ? <small>{caption}</small> : null}
    <b>{value}</b>
  </span>
);

const Pile: React.FC<{ value: number }> = ({ value }) => (
  <div className="vg-pile" data-testid="cart-loaded">
    <img src={CHEST} alt="" className="vg-pile-body mc-pixel" draggable={false} />
    <span className="vg-wagon-tag">{value}</span>
  </div>
);

const Socket: React.FC = () => <i className="vg-socket" aria-hidden />;

const Say: React.FC<{ text: string; testid: string; tone?: string }> = ({ text, testid, tone }) => {
  const bits = text.split(/(\d+)/);
  let used = false;
  return (
    <p className={`vg-say${tone || ''}`} data-testid="cart-say" aria-label={text}>
      {bits.map((bit, i) => {
        if (!used && /^\d+$/.test(bit)) {
          used = true;
          return (
            <b key={i} data-testid={testid}>
              {bit}
            </b>
          );
        }
        return <React.Fragment key={i}>{bit}</React.Fragment>;
      })}
    </p>
  );
};

const CartBench: React.FC<Props> = ({
  uid,
  date,
  minerLevel,
  redstoneDone = 0,
  redstonePerfect = 0,
  noteDone,
  claimed,
  onQuit,
  onGoRecado,
}) => {
  const { playClick, playError, playNotification, playTick, playWhistle } = useSound();
  const session = useMemo(
    () => sessionFor(uid, date, minerLevel, { redstoneDone, redstonePerfect }),
    [uid, date, minerLevel, redstoneDone, redstonePerfect],
  );
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
  const [fuse, setFuse] = useState(CART_TRY_MS);
  const [poke, setPoke] = useState(false);
  const finishing = useRef(false);
  const ended = useRef(false);
  const stageIndexRef = useRef(0);
  const wonRef = useRef(0);
  const sentLock = useRef(false);
  const sendRef = useRef<(forced?: boolean) => void>(() => {});
  const lastTick = useRef(-1);

  useEffect(() => {
    if (ended.current || finishing.current) return;
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
    setFuse(CART_TRY_MS);
    sentLock.current = false;
    setEnter(true);
    const t = window.setTimeout(() => setEnter(false), ENTER_MS);
    return () => window.clearTimeout(t);
  }, [puzzle]);

  const board = { ...puzzle, crates };
  const done = claimed || Boolean(result);
  const inputOn = noteDone && !done && !saving && !celebrate && !reveal;
  const triesLeft = Math.max(0, CART_MAX_TRIES - fails);
  const plate = hitchOf(board, on);
  const shown = reveal || celebrate;
  const shownNum = puzzle.kind === 'product' ? plate.product : puzzle.kind === 'divide' ? plate.sum : weigh(board, on).sum;
  const hitchCount = on.filter(Boolean).length;
  const isOp = puzzle.kind === 'product' || puzzle.kind === 'divide';
  const fuseHot = fuse <= 7000 && inputOn && !enter;
  const waitingNote = noteDone === false && !done;
  const idleScene = waitingNote || done;
  const mood = celebrate ? 'win' : reveal && failWhy === 'Tombou' ? 'Tombou' : reveal && failWhy === 'Faltou' ? 'Faltou' : reveal && failWhy === 'contagem' ? 'contagem' : fuseHot ? 'hurry' : 'ask';
  const say = done
    ? closeOf(result ? result.redstone : null)
    : waitingNote
      ? 'Primeiro o recado.'
      : sayOf(puzzle, mood, shown ? shownNum : 0, fails + puzzle.noise);
  const talking = idleScene || Boolean(shown) || fuseHot || poke;
  const picked = crates.map((value, i) => ({ value, i })).filter((_, i) => on[i]);
  const sockets = Math.max(hookSlots(puzzle), picked.length);
  const railClass = [
    'vg-line',
    isOp ? 'is-op' : '',
    enter && !celebrate && !reveal ? 'is-enter' : '',
    celebrate ? 'is-go' : '',
    reveal && !celebrate ? 'is-fail' : '',
    reveal && !celebrate && failWhy === 'Tombou' ? 'is-dump' : '',
    reveal && !celebrate && failWhy === 'Faltou' ? 'is-short' : '',
    returning ? 'is-return' : '',
    fuseHot ? 'is-hot' : '',
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
      sentLock.current = false;
      if (next >= CART_MAX_TRIES) resolveStage(false);
    }, FAIL_MS);
    return () => {
      window.clearTimeout(ret);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, celebrate, result, fails, puzzle]);

  const pokeSmith = () => {
    if (!inputOn) return;
    playClick();
    setPoke(false);
    window.setTimeout(() => setPoke(true), 20);
    window.setTimeout(() => setPoke(false), 520);
  };

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

  const onSend = (forced = false) => {
    if (sentLock.current || !inputOn) return;
    if (!forced && hitchCount === 0) return;
    sentLock.current = true;
    if (!forced) playClick();
    setFly(null);
    setArriving(null);
    pendingFly.current = null;
    setReveal(true);
    if (isWon(board, on)) {
      setCelebrate(true);
      playNotification();
      return;
    }
    setFailWhy(whyOf(board, on));
    playError();
  };
  sendRef.current = onSend;

  useEffect(() => {
    if (!inputOn || enter) return;
    const t0 = performance.now();
    setFuse(CART_TRY_MS);
    lastTick.current = -1;
    const id = window.setInterval(() => {
      const left = Math.max(0, CART_TRY_MS - (performance.now() - t0));
      setFuse(left);
      if (left > 0) return;
      window.clearInterval(id);
      sendRef.current(true);
    }, 100);
    return () => window.clearInterval(id);
  }, [inputOn, enter, fails, puzzle.layoutHash]);

  useEffect(() => {
    if (!fuseHot) return;
    const sec = Math.ceil(fuse / 1000);
    if (sec <= 0 || sec === lastTick.current) return;
    if (lastTick.current < 0 && sec <= 7) playWhistle();
    else if (sec < 7) playTick();
    lastTick.current = sec;
  }, [fuse, fuseHot, playTick, playWhistle]);

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
        <div className="vg-dots" aria-label={done ? 'oficina fechada' : `etapa ${puzzle.stage} de 3`}>
          {[1, 2, 3].map((n) => (
            <i key={n} className={done || n < puzzle.stage ? 'is-done' : n === puzzle.stage ? 'is-now' : ''} />
          ))}
        </div>
        {!idleScene && (
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
        )}
      </header>

      <div
        className={`rs-play-stage vg-stage${idleScene ? ' is-closed' : ''}`}
        data-testid="cart-bench"
        data-target={puzzle.target}
        data-loaded={puzzle.loaded}
        data-need={puzzle.needCount ?? ''}
        data-kind={puzzle.kind}
        data-closed={idleScene ? '1' : '0'}
      >
        {waitingNote && (
          <div className="vg-pay" data-testid="redstone-locked">
            <div className="vg-pay-card">
              <p className="vg-pay-kicker">Primeiro o recado</p>
              <p className="vg-pay-next">O ferreiro só pesa depois do recado da mina.</p>
              <button type="button" className="mc-btn mc-btn-green px-5 py-2.5 text-sm font-bold" onClick={onGoRecado} data-testid="redstone-go-note">
                Fazer o Recado
              </button>
            </div>
          </div>
        )}
        {done && (
          <div className="vg-pay" data-testid="redstone-done">
            <div className={`vg-pay-card${result ? ' has-loot' : ''}`}>
              {result && (
                <>
                  <div className="vg-pay-gems" aria-label={`${result.redstone} redstone`}>
                    {[0, 1, 2].map((n) => (
                      <img
                        key={n}
                        src={MATERIAL_ICONS.redstone}
                        alt=""
                        draggable={false}
                        className={`mc-pixel${n < result.redstone ? '' : ' is-off'}`}
                      />
                    ))}
                  </div>
                  <p className="vg-pay-xp">+{result.xp} XP</p>
                </>
              )}
              <button type="button" className="mc-btn mc-btn-green px-5 py-2.5 text-sm font-bold" onClick={onQuit} data-testid="cart-home">
                Voltar à Mina
              </button>
            </div>
          </div>
        )}

        <img src={CAVE} alt="" className="vg-cave mc-pixel" draggable={false} />
        <div className="vg-dim" />

        <button
          type="button"
          className={`vg-smith${talking ? ' is-talk' : ''}${fuseHot ? ' is-nag' : ''}${poke ? ' is-poke' : ''}`}
          onClick={pokeSmith}
          disabled={!inputOn}
          aria-label={say}
          data-testid="cart-smith"
        >
          <Say
            text={say}
          testid={done ? 'cart-close' : waitingNote ? 'cart-close' : shown ? 'cart-scale' : isOp ? 'cart-ask' : 'redstone-goal'}
          tone={done || waitingNote ? ' is-ok' : shown ? (failWhy === 'Tombou' ? ' is-over' : failWhy === 'Faltou' ? ' is-under' : ' is-ok') : ''}
          />
          <span className="vg-smith-stand">
            <img src={SMITH} alt="" className="vg-smith-body mc-pixel" draggable={false} />
          </span>
        </button>

        {!idleScene && (
        <div className="vg-play">
          <div className={railClass} data-testid="cart-body">
            <div className="vg-mouth">
              {noteDone && !done && (
                <div
                  className={`vg-fuse${fuseHot ? ' is-hot' : ''}${!inputOn || enter ? ' is-hold' : ''}${shown ? ' is-hide' : ''}`}
                  data-testid="cart-fuse"
                  data-left={Math.ceil(fuse / 1000)}
                  role="timer"
                  aria-hidden={Boolean(shown)}
                  aria-label={shown ? undefined : `${Math.max(0, Math.ceil(fuse / 1000))} segundos`}
                >
                  <span className="vg-fuse-track">
                    <i
                      style={{
                        transform: `scaleX(${!inputOn || enter ? 1 : Math.max(0, Math.min(1, fuse / CART_TRY_MS))})`,
                      }}
                    />
                  </span>
                </div>
              )}
              {(inputOn || celebrate || reveal) && (
                <button
                  type="button"
                  className={`vg-send${!celebrate && (hitchCount === 0 || reveal) ? ' is-off' : ''}${celebrate ? ' is-go' : ''}${fuseHot && hitchCount > 0 ? ' is-hot' : ''}`}
                  onClick={() => onSend()}
                  disabled={!inputOn || hitchCount === 0}
                  data-testid="redstone-ready"
                >
                  <img src={SIGNAL} alt="" className="vg-signal mc-pixel" draggable={false} />
                  <span>Enviar</span>
                </button>
              )}
            </div>
            <div className={`vg-train${isOp ? ' vg-op' : ''}`} data-testid={isOp ? 'cart-op' : 'cart-train'}>
              {puzzle.kind === 'divide' && (
                <>
                  <Pile value={puzzle.loaded} />
                  <span className="vg-op-sym" aria-hidden>
                    ÷
                  </span>
                  <OpTile value={puzzle.target} caption="montes" />
                  <span className="vg-op-sym" aria-hidden>
                    =
                  </span>
                </>
              )}
              {puzzle.kind === 'product' &&
                Array.from({ length: Math.max(2, sockets) }, (_, slot) => {
                  const item = picked[slot];
                  return (
                    <React.Fragment key={`mul-${slot}`}>
                      {slot > 0 ? (
                        <span className="vg-op-sym" aria-hidden>
                          ×
                        </span>
                      ) : null}
                      {item ? (
                        <Wagon
                          value={item.value}
                          cargo={CHEST}
                          hitch
                          ghost={arriving === item.i}
                          arrive={arriving === item.i && !fly}
                          disabled={!inputOn}
                          testid={`cart-crate-${item.i}`}
                          onClick={() => onCrate(item.i)}
                        />
                      ) : (
                        <Socket />
                      )}
                    </React.Fragment>
                  );
                })}
              {puzzle.kind === 'product' && (
                <>
                  <span className="vg-op-sym" aria-hidden>
                    =
                  </span>
                  <OpTile value={puzzle.target} testid="redstone-goal" />
                </>
              )}
              {puzzle.kind === 'divide' &&
                Array.from({ length: sockets }, (_, slot) => {
                  const item = picked[slot];
                  return (
                    <React.Fragment key={`div-${slot}`}>
                      {slot > 0 ? (
                        <span className="vg-op-sym is-plus" aria-hidden>
                          +
                        </span>
                      ) : null}
                      {item ? (
                        <Wagon
                          value={item.value}
                          cargo={CHEST}
                          hitch
                          ghost={arriving === item.i}
                          arrive={arriving === item.i && !fly}
                          disabled={!inputOn}
                          testid={`cart-crate-${item.i}`}
                          onClick={() => onCrate(item.i)}
                        />
                      ) : (
                        <Socket />
                      )}
                    </React.Fragment>
                  );
                })}
              {!isOp && puzzle.loaded > 0 && (
                <Wagon value={puzzle.loaded} cargo={IRON} locked testid="cart-loaded" />
              )}
              {!isOp &&
                crates.map((value, i) =>
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
              {fuseHot && <span className="vg-steam" aria-hidden />}
            </div>
          </div>

          <div className="vg-yard">
            <img src={DOCK} alt="" className="vg-dock mc-pixel" draggable={false} />
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
        )}
      </div>
    </div>
  );
};

export default CartBench;
