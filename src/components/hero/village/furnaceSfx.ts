import { N, sfxThump, sfxTone, sfxWood, withSfx } from '../../../services/village/uiSfx';

export interface FurnaceSfx {
  whoosh: () => void;
  ding: () => void;
  thud: () => void;
  crackleStart: () => void;
  crackleStop: () => void;
}

export function createFurnaceSfx(getContext: () => AudioContext | null, enabled: () => boolean): FurnaceSfx {
  let crackle: number | null = null;

  const go = (fn: (ctx: AudioContext, now: number) => void): void => {
    withSfx(getContext(), enabled(), fn);
  };

  const pop = () => {
    go((ctx, now) => {
      sfxWood(ctx, now, 0.07, 380, 0.06);
      sfxWood(ctx, now + 0.04, 0.05, 260, 0.07);
    });
  };

  return {
    whoosh: () => {
      go((ctx, now) => {
        sfxWood(ctx, now, 0.12, 200, 0.18);
        sfxTone(ctx, 180, now, 0.22, 0.05, { endFreq: 90, lp: 500, type: 'triangle' });
      });
    },
    ding: () => {
      go((ctx, now) => {
        sfxTone(ctx, N.D5, now, 0.12, 0.08, { lp: 2200 });
        sfxTone(ctx, N.G5, now + 0.08, 0.18, 0.09, { lp: 2300 });
        sfxTone(ctx, N.E5, now + 0.18, 0.3, 0.08, { lp: 2200 });
      });
    },
    thud: () => {
      go((ctx, now) => sfxThump(ctx, now, 0.14));
    },
    crackleStart: () => {
      if (!enabled()) return;
      if (crackle !== null) return;
      pop();
      crackle = window.setInterval(pop, 320);
    },
    crackleStop: () => {
      if (crackle === null) return;
      window.clearInterval(crackle);
      crackle = null;
    },
  };
}
