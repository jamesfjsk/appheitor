import { N, sfxThump, sfxTone, sfxWood, withSfx } from '../../../services/village/uiSfx';

export interface ChestSfx {
  creak: () => void;
  ding: () => void;
  thud: () => void;
}

export function createChestSfx(getContext: () => AudioContext | null, enabled: () => boolean): ChestSfx {
  const go = (fn: (ctx: AudioContext, now: number) => void): void => {
    withSfx(getContext(), enabled(), fn);
  };

  return {
    creak: () => {
      go((ctx, now) => {
        sfxWood(ctx, now, 0.11, 240, 0.16);
        sfxWood(ctx, now + 0.08, 0.08, 420, 0.12);
        sfxTone(ctx, 140, now, 0.22, 0.05, { endFreq: 90, lp: 480, type: 'triangle' });
      });
    },
    ding: () => {
      go((ctx, now) => {
        sfxTone(ctx, N.D5, now, 0.12, 0.08, { lp: 2200 });
        sfxTone(ctx, N.G5, now + 0.08, 0.16, 0.09, { lp: 2300 });
        sfxTone(ctx, N.E5, now + 0.18, 0.28, 0.08, { lp: 2200 });
      });
    },
    thud: () => {
      go((ctx, now) => sfxThump(ctx, now, 0.14));
    },
  };
}
