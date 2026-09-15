// Trilha de suspense da mina para o teaser, gerada por código (WebAudio, sem arquivo de áudio).
// Camadas: vento (ruído filtrado), baixo grave, arpejo em lá menor com tensão a cada 4 compassos e pingos de caverna com eco.
// Só toca depois de um clique (política de autoplay dos navegadores).

export type TeaserMusic = { start: () => void; stop: () => void; playing: () => boolean };

const BPM = 72;
const STEP = 60 / BPM / 2; // colcheia
const A = 220, C = 261.63, E = 329.63, A4 = 440, F = 174.61, F4 = 349.23, GS = 207.65, B = 246.94, E3 = 164.81;
const ARP: number[][] = [
  [A, C, E, A4, E, C, A, E],
  [A, C, E, A4, E, C, A, E],
  [F, A, C, F4, C, A, F, C],
  [E3, GS, B, E, B, GS, E3, B],
];
const BASS = [55, 55, 43.65, 41.2];
const DRIPS = [880, 1174.66, 1318.51, 1760, 987.77];

export function createTeaserMusic(): TeaserMusic {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let echo: DelayNode | null = null;
  let wind: AudioBufferSourceNode | null = null;
  let timer: number | null = null;
  let nextTime = 0;
  let step = 0;

  const note = (freq: number, at: number, dur: number, type: OscillatorType, gain: number, out: AudioNode) => {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
  };

  const schedule = (s: number, at: number) => {
    if (!ctx || !master || !echo) return;
    const bar = Math.floor(s / 8);
    const chord = bar % 4;
    const i = s % 8;
    note(ARP[chord][i], at, STEP * 0.9, 'square', 0.035, master);
    if (i === 0) note(BASS[chord], at, STEP * 8, 'triangle', 0.11, master);
    if (i === 4 && chord === 3) note(BASS[chord] * 2, at, STEP * 3, 'triangle', 0.05, master);
    const dripStep = (bar * 5 + 3) % 8;
    if (i === dripStep && bar % 2 === 0) note(DRIPS[bar % DRIPS.length], at, 0.5, 'sine', 0.09, echo);
  };

  const tick = () => {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.4) {
      schedule(step, nextTime);
      nextTime += STEP;
      step++;
    }
  };

  const setup = () => {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    echo = ctx.createDelay(1.0);
    echo.delayTime.value = STEP * 1.5;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    echo.connect(fb).connect(echo);
    echo.connect(master);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    const wg = ctx.createGain();
    wg.gain.value = 0.035;
    wind.connect(lp).connect(wg).connect(master);
    wind.start();
    return true;
  };

  return {
    start: () => {
      if (timer !== null) return;
      if (!ctx && !setup()) return;
      if (!ctx || !master) return;
      if (ctx.state === 'suspended') void ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
      nextTime = ctx.currentTime + 0.1;
      step = 0;
      tick();
      timer = window.setInterval(tick, 120);
    },
    stop: () => {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
      if (!ctx || !master) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    },
    playing: () => timer !== null,
  };
}
