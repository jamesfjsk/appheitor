import { N, sfxThump, sfxTone, sfxWood, withSfx } from '../../../../services/village/uiSfx';

export interface RedstoneSfx {
  toggle: () => void;
  paint: () => void;
  repair: () => void;
  ok: () => void;
  fail: () => void;
  win: () => void;
  power: () => void;
}

export function createRedstoneSfx(getContext: () => AudioContext | null, enabled: () => boolean): RedstoneSfx {
  const go = (fn: (ctx: AudioContext, now: number) => void): void => {
    withSfx(getContext(), enabled(), fn);
  };

  return {
    toggle: () => {
      go((ctx, now) => {
        sfxWood(ctx, now, 0.045, 1320, 0.03);
        sfxTone(ctx, N.G4, now, 0.06, 0.03, { lp: 1600, atk: 0.005 });
      });
    },
    paint: () => {
      go((ctx, now) => {
        sfxWood(ctx, now, 0.04, 900, 0.04);
        sfxTone(ctx, N.B4, now, 0.07, 0.04, { endFreq: N.G4, lp: 1700 });
      });
    },
    repair: () => {
      go((ctx, now) => {
        sfxThump(ctx, now, 0.08);
        sfxTone(ctx, N.D5, now + 0.05, 0.08, 0.05, { type: 'triangle', lp: 2000 });
      });
    },
    ok: () => {
      go((ctx, now) => sfxTone(ctx, N.G5, now, 0.08, 0.06, { lp: 2200 }));
    },
    fail: () => {
      go((ctx, now) => {
        sfxWood(ctx, now, 0.06, 320, 0.07);
        sfxTone(ctx, N.E5, now, 0.16, 0.06, { endFreq: N.G4, lp: 1500 });
      });
    },
    win: () => {
      go((ctx, now) => {
        sfxTone(ctx, N.D5, now, 0.12, 0.08, { lp: 2200 });
        sfxTone(ctx, N.G5, now + 0.11, 0.12, 0.09, { lp: 2300 });
        sfxTone(ctx, N.E5, now + 0.22, 0.32, 0.1, { lp: 2200 });
      });
    },
    power: () => {
      go((ctx, now) => sfxTone(ctx, N.G4, now, 0.14, 0.05, { endFreq: N.D5, lp: 1400 }));
    },
  };
}
