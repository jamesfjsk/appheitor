// ========================================
// Bancada: cliques, fio, erro e circuito feito. Sem arquivo de áudio.
// ========================================

export interface RedstoneSfx {
  toggle: () => void;
  paint: () => void;
  repair: () => void;
  ok: () => void;
  fail: () => void;
  win: () => void;
  power: () => void;
}

const semi = (n: number): number => 440 * Math.pow(2, n / 12);

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startAt: number,
  durationSec: number,
  gain: number,
  endFreq?: number,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startAt + durationSec);
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export function createRedstoneSfx(getContext: () => AudioContext | null, enabled: () => boolean): RedstoneSfx {
  const withCtx = (fn: (ctx: AudioContext, now: number) => void): void => {
    if (!enabled()) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = getContext();
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      fn(ctx, ctx.currentTime);
    } catch {
      // som opcional
    }
  };

  return {
    toggle: () => {
      withCtx((ctx, now) => {
        tone(ctx, 'square', 180, now, 0.05, 0.12);
        tone(ctx, 'triangle', 420, now + 0.03, 0.06, 0.08);
      });
    },
    paint: () => {
      withCtx((ctx, now) => tone(ctx, 'triangle', 220, now, 0.07, 0.1, 160));
    },
    repair: () => {
      withCtx((ctx, now) => {
        tone(ctx, 'square', 90, now, 0.08, 0.12);
        tone(ctx, 'triangle', 300, now + 0.05, 0.08, 0.08);
      });
    },
    ok: () => {
      withCtx((ctx, now) => tone(ctx, 'square', semi(7), now, 0.07, 0.1));
    },
    fail: () => {
      withCtx((ctx, now) => tone(ctx, 'square', 140, now, 0.18, 0.16, 60));
    },
    win: () => {
      withCtx((ctx, now) => {
        tone(ctx, 'square', semi(0), now, 0.1, 0.1);
        tone(ctx, 'square', semi(4), now + 0.1, 0.1, 0.1);
        tone(ctx, 'square', semi(7), now + 0.2, 0.22, 0.12);
        tone(ctx, 'triangle', semi(12), now + 0.28, 0.28, 0.1);
      });
    },
    power: () => {
      withCtx((ctx, now) => tone(ctx, 'sine', 90, now, 0.12, 0.08, 220));
    },
  };
}
