/** Sons da Vila no tom do hino (Sol maior, motivo D–G–E). Sem square/saw. */

export const N = {
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
} as const;

const noiseCache = new WeakMap<AudioContext, AudioBuffer>();
let lastClickAt = -1;

function noise(ctx: AudioContext): AudioBuffer {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.28), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return buf;
}

export function withSfx(
  ctx: AudioContext | null,
  on: boolean,
  fn: (ctx: AudioContext, now: number) => void,
): void {
  if (!on || !ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    fn(ctx, ctx.currentTime);
  } catch {
    /* som opcional */
  }
}

export function sfxTone(
  ctx: AudioContext,
  freq: number,
  t0: number,
  dur: number,
  peak: number,
  opts?: { type?: OscillatorType; endFreq?: number; lp?: number; atk?: number },
): void {
  const o = ctx.createOscillator();
  o.type = opts?.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (opts?.endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(24, opts.endFreq), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + (opts?.atk ?? 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = opts?.lp ?? 2600;
  lp.Q.value = 0.65;
  o.connect(g);
  g.connect(lp);
  lp.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.04);
}

export function sfxWood(ctx: AudioContext, t0: number, peak = 0.05, center = 1580, dur = 0.034): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = center;
  bp.Q.value = 2.6;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2300;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp);
  bp.connect(lp);
  lp.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function sfxThump(ctx: AudioContext, t0: number, peak = 0.1): void {
  sfxWood(ctx, t0, peak * 0.7, 220, 0.09);
  sfxTone(ctx, 98, t0, 0.14, peak * 0.55, { lp: 420, atk: 0.006 });
}

export function playUiClick(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    if (now - lastClickAt < 0.045) return;
    lastClickAt = now;
    sfxWood(audio, now, 0.048, 1480, 0.028);
    sfxTone(audio, N.G4, now, 0.07, 0.026, { lp: 1700, atk: 0.006 });
  });
}

export function playUiTick(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxWood(audio, now, 0.03, 1100, 0.022);
  });
}

export function playUiTask(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxTone(audio, N.D5, now, 0.14, 0.09, { lp: 2400 });
    sfxTone(audio, N.G5, now + 0.11, 0.14, 0.1, { lp: 2400 });
    sfxTone(audio, N.E5, now + 0.22, 0.32, 0.11, { lp: 2200 });
  });
}

export function playUiLevel(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxTone(audio, N.G4, now, 0.16, 0.08, { lp: 2000 });
    sfxTone(audio, N.B4, now + 0.12, 0.16, 0.085, { lp: 2100 });
    sfxTone(audio, N.D5, now + 0.24, 0.16, 0.09, { lp: 2200 });
    sfxTone(audio, N.G5, now + 0.36, 0.2, 0.1, { lp: 2300 });
    sfxTone(audio, N.E5, now + 0.52, 0.42, 0.12, { lp: 2200 });
  });
}

export function playUiReward(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxTone(audio, N.E5, now, 0.12, 0.07, { type: 'triangle', lp: 2400 });
    sfxTone(audio, N.G5, now + 0.09, 0.14, 0.08, { type: 'triangle', lp: 2400 });
    sfxTone(audio, N.B5, now + 0.2, 0.36, 0.09, { lp: 2600 });
  });
}

export function playUiAchieve(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxTone(audio, N.D5, now, 0.14, 0.08, { lp: 2200 });
    sfxTone(audio, N.G5, now + 0.1, 0.14, 0.09, { lp: 2300 });
    sfxTone(audio, N.B5, now + 0.2, 0.16, 0.09, { lp: 2400 });
    sfxTone(audio, N.E5, now + 0.34, 0.4, 0.11, { lp: 2200 });
  });
}

export function playUiError(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxTone(audio, N.E5, now, 0.16, 0.07, { endFreq: N.D5, lp: 1800 });
    sfxTone(audio, N.B4, now + 0.12, 0.22, 0.06, { endFreq: N.G4, lp: 1600 });
  });
}

export function playProvaHit(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxWood(audio, now, 0.055, 1380, 0.026);
  });
}

export function playProvaMiss(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxWood(audio, now, 0.06, 640, 0.04);
    sfxThump(audio, now, 0.07);
  });
}

export function playUiNote(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxTone(audio, N.D5, now, 0.14, 0.07, { lp: 2200 });
    sfxTone(audio, N.E5, now + 0.12, 0.22, 0.08, { lp: 2200 });
  });
}

export function playUiWhistle(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxTone(audio, N.G4, now, 0.18, 0.07, { endFreq: N.E5, lp: 2000 });
    sfxTone(audio, N.E5, now + 0.14, 0.28, 0.06, { endFreq: N.D5, lp: 1900 });
  });
}

export function playUiHammer(ctx: AudioContext | null, on: boolean): void {
  withSfx(ctx, on, (audio, now) => {
    sfxThump(audio, now, 0.11);
    sfxThump(audio, now + 0.16, 0.1);
    sfxThump(audio, now + 0.32, 0.13);
  });
}
