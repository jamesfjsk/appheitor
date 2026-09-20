import { N, sfxThump, sfxTone, sfxWood, withSfx } from '../../../../services/village/uiSfx';

export interface MineSfx {
  hit: (pickaxeLevel: number) => void;
  miss: () => void;
  checkpoint: () => void;
  pickaxeUp: (level: number) => void;
  unlock: () => void;
  /** Entrega certa: madeira + acorde */
  ok: () => void;
  /** Entrega errada: tombo */
  fail: () => void;
  /** Vai pro próximo pedido */
  next: () => void;
}

export function createMineSfx(getContext: () => AudioContext | null, enabled: () => boolean): MineSfx {
  const go = (fn: (ctx: AudioContext, now: number) => void): void => {
    withSfx(getContext(), enabled(), fn);
  };
  const clamp = (level: number): number => Math.max(0, Math.min(8, Math.floor(level)));

  return {
    hit: (pickaxeLevel) => {
      go((ctx, now) => {
        const level = clamp(pickaxeLevel);
        sfxWood(ctx, now, 0.12, 720 + level * 90, 0.06);
        sfxTone(ctx, N.D5 + level * 18, now, 0.07, 0.07, { type: 'triangle', lp: 2200 });
        sfxTone(ctx, N.G5 + level * 12, now + 0.05, 0.09, 0.06, { type: 'triangle', lp: 2300 });
      });
    },
    miss: () => {
      go((ctx, now) => {
        sfxWood(ctx, now, 0.08, 280, 0.08);
        sfxTone(ctx, N.E5, now, 0.16, 0.07, { endFreq: N.G4, lp: 1600 });
      });
    },
    checkpoint: () => {
      go((ctx, now) => {
        sfxTone(ctx, N.D5, now, 0.12, 0.08, { lp: 2200 });
        sfxTone(ctx, N.G5, now + 0.11, 0.12, 0.09, { lp: 2300 });
        sfxTone(ctx, N.E5, now + 0.22, 0.28, 0.1, { lp: 2200 });
      });
    },
    pickaxeUp: (level) => {
      go((ctx, now) => {
        const lift = clamp(level) * 12;
        sfxTone(ctx, N.G4 + lift, now, 0.08, 0.08, { type: 'triangle', lp: 2000 });
        sfxTone(ctx, N.B4 + lift, now + 0.07, 0.08, 0.08, { type: 'triangle', lp: 2100 });
        sfxTone(ctx, N.D5 + lift, now + 0.14, 0.08, 0.08, { type: 'triangle', lp: 2200 });
        sfxTone(ctx, N.G5 + lift, now + 0.22, 0.18, 0.1, { lp: 2300 });
      });
    },
    unlock: () => {
      go((ctx, now) => {
        sfxTone(ctx, N.D5, now, 0.18, 0.08, { lp: 2200 });
        sfxTone(ctx, N.G5, now + 0.1, 0.2, 0.09, { lp: 2300 });
        sfxTone(ctx, N.E5, now + 0.22, 0.42, 0.11, { lp: 2200 });
      });
    },
    ok: () => {
      go((ctx, now) => {
        sfxThump(ctx, now, 0.16);
        sfxWood(ctx, now, 0.14, 880, 0.07);
        sfxTone(ctx, N.D5, now + 0.04, 0.16, 0.12, { type: 'triangle', lp: 2400 });
        sfxTone(ctx, N.G5, now + 0.14, 0.18, 0.13, { type: 'triangle', lp: 2500 });
        sfxTone(ctx, N.E5, now + 0.26, 0.36, 0.14, { lp: 2300 });
      });
    },
    fail: () => {
      go((ctx, now) => {
        sfxThump(ctx, now, 0.18);
        sfxWood(ctx, now, 0.16, 240, 0.12);
        sfxTone(ctx, N.E5, now, 0.2, 0.11, { endFreq: N.G4, lp: 1400 });
        sfxTone(ctx, N.B4, now + 0.1, 0.28, 0.1, { endFreq: N.G4, lp: 1200 });
      });
    },
    next: () => {
      go((ctx, now) => {
        sfxWood(ctx, now, 0.1, 1100, 0.05);
        sfxTone(ctx, N.G4, now, 0.1, 0.09, { type: 'triangle', lp: 2000 });
        sfxTone(ctx, N.D5, now + 0.09, 0.14, 0.1, { type: 'triangle', lp: 2200 });
        sfxTone(ctx, N.G5, now + 0.2, 0.22, 0.11, { lp: 2300 });
      });
    },
  };
}
