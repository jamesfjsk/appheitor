// ========================================
// Mine Rush: efeitos sonoros sintetizados com Web Audio (sem arquivos)
// createMineSfx(getContext, enabled) tolera contexto null e som desligado.
// ========================================

export interface MineSfx {
  /** quebra de bloco: ruído filtrado 80 ms + blip curto que sobe meio tom por nível de picareta */
  hit: (pickaxeLevel: number) => void;
  /** batida no bloco errado: onda quadrada grave descendo */
  miss: () => void;
  /** placa de aprendizado: toque suave */
  learn: () => void;
  /** baú de checkpoint: fanfarra de 3 notas */
  checkpoint: () => void;
  /** troca de picareta: arpejo curto, meio tom acima por nível */
  pickaxeUp: (level: number) => void;
  /** destravou algo (fim de corrida, recorde): brilho ascendente */
  unlock: () => void;
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    const length = Math.floor(ctx.sampleRate * 0.25);
    buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

/** Frequência de uma nota em semitons acima de 440 Hz */
const semi = (n: number): number => 440 * Math.pow(2, n / 12);

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startAt: number,
  durationSec: number,
  gain: number,
  endFreq?: number
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

function noiseBurst(ctx: AudioContext, startAt: number, durationSec: number, gain: number, centerHz: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = centerHz;
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, startAt);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(startAt);
  src.stop(startAt + durationSec + 0.02);
}

export function createMineSfx(getContext: () => AudioContext | null, enabled: () => boolean): MineSfx {
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
      // Web Audio indisponível ou bloqueado: som é opcional
    }
  };

  const clampLevel = (level: number): number => Math.max(0, Math.min(8, Math.floor(level)));

  return {
    hit: (pickaxeLevel) => {
      withCtx((ctx, now) => {
        const level = clampLevel(pickaxeLevel);
        noiseBurst(ctx, now, 0.08, 0.35, 900 + level * 250);
        tone(ctx, 'triangle', semi(level), now, 0.06, 0.18);
        tone(ctx, 'triangle', semi(level + 7), now + 0.05, 0.08, 0.14);
      });
    },
    miss: () => {
      withCtx((ctx, now) => {
        tone(ctx, 'square', 110, now, 0.18, 0.22, 55);
        noiseBurst(ctx, now, 0.12, 0.2, 300);
      });
    },
    learn: () => {
      withCtx((ctx, now) => {
        tone(ctx, 'sine', semi(0), now, 0.12, 0.16);
        tone(ctx, 'sine', semi(4), now + 0.1, 0.16, 0.14);
      });
    },
    checkpoint: () => {
      withCtx((ctx, now) => {
        tone(ctx, 'square', semi(0), now, 0.12, 0.12);
        tone(ctx, 'square', semi(4), now + 0.12, 0.12, 0.12);
        tone(ctx, 'square', semi(7), now + 0.24, 0.3, 0.14);
      });
    },
    pickaxeUp: (level) => {
      withCtx((ctx, now) => {
        const base = clampLevel(level);
        tone(ctx, 'triangle', semi(base), now, 0.07, 0.16);
        tone(ctx, 'triangle', semi(base + 4), now + 0.06, 0.07, 0.16);
        tone(ctx, 'triangle', semi(base + 7), now + 0.12, 0.07, 0.16);
        tone(ctx, 'triangle', semi(base + 12), now + 0.18, 0.16, 0.18);
      });
    },
    unlock: () => {
      withCtx((ctx, now) => {
        tone(ctx, 'sine', semi(12), now, 0.5, 0.14, semi(24));
        tone(ctx, 'triangle', semi(7), now + 0.08, 0.4, 0.1, semi(19));
      });
    },
  };
}
