/** Trilha da Vila: loop com crossfade, some na Mina/prova, respeita o mudo. */

export const VILLAGE_THEME = '/assets/village/music/vila.mp3?v=5';
export const BGM_VOL = 0.22;
export const BGM_DUCK_VOL = 0.06;
export const SOUND_PREF_KEY = 'mm_sound';

const CROSS_S = 1.35;

export function bgmDuckFor(district: string | null, quizOpen: boolean): boolean {
  return quizOpen || district === 'mine';
}

export function readSoundPref(): boolean {
  try {
    return localStorage.getItem(SOUND_PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeSoundPref(on: boolean): void {
  try {
    localStorage.setItem(SOUND_PREF_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

class VillageBgm {
  private a: HTMLAudioElement | null = null;
  private b: HTMLAudioElement | null = null;
  private active: HTMLAudioElement | null = null;
  private wanted = false;
  private soundOn = true;
  private ducks = new Set<string>();
  private hidden = false;
  private watch: number | null = null;
  private fade: number | null = null;
  private crossing = false;

  want(on: boolean): void {
    this.wanted = on;
    this.sync();
  }

  enable(on: boolean): void {
    this.soundOn = on;
    this.sync();
  }

  duck(key: string, on: boolean): void {
    if (on) this.ducks.add(key);
    else this.ducks.delete(key);
    this.sync();
  }

  setHidden(on: boolean): void {
    this.hidden = on;
    this.sync();
  }

  unlock(): void {
    this.ensure();
    this.sync();
  }

  private target(): number {
    if (!this.wanted || !this.soundOn || this.hidden) return 0;
    return this.ducks.size > 0 ? BGM_DUCK_VOL : BGM_VOL;
  }

  private make(): HTMLAudioElement {
    const el = new Audio(VILLAGE_THEME);
    el.preload = 'auto';
    el.loop = false;
    el.volume = 0;
    return el;
  }

  private ensure(): void {
    if (this.a) return;
    this.a = this.make();
    this.b = this.make();
    this.active = this.a;
  }

  private sync(): void {
    this.ensure();
    const vol = this.target();
    const cur = this.active;
    if (!cur) return;
    if (vol > 0) {
      if (cur.paused) {
        cur.volume = 0;
        void cur.play().catch(() => undefined);
      }
      this.fadeTo(cur, vol);
      this.arm();
    } else {
      this.fadeTo(cur, 0, () => {
        cur.pause();
      });
      this.disarm();
    }
  }

  private arm(): void {
    if (this.watch !== null) return;
    this.watch = window.setInterval(() => this.tick(), 200);
  }

  private disarm(): void {
    if (this.watch === null) return;
    window.clearInterval(this.watch);
    this.watch = null;
  }

  private tick(): void {
    const cur = this.active;
    const other = cur === this.a ? this.b : this.a;
    if (!cur || !other || this.crossing || this.target() <= 0) return;
    const dur = cur.duration;
    if (!Number.isFinite(dur) || dur < 6) return;
    if (dur - cur.currentTime > CROSS_S) return;
    this.crossing = true;
    other.currentTime = 0;
    other.volume = 0;
    void other.play().catch(() => undefined);
    const t0 = performance.now();
    const step = () => {
      const k = clamp01((performance.now() - t0) / (CROSS_S * 1000));
      const vol = this.target();
      other.volume = vol * k;
      cur.volume = vol * (1 - k);
      if (k < 1) {
        requestAnimationFrame(step);
        return;
      }
      cur.pause();
      cur.currentTime = 0;
      this.active = other;
      this.crossing = false;
    };
    requestAnimationFrame(step);
  }

  private fadeTo(el: HTMLAudioElement, to: number, done?: () => void): void {
    if (this.fade !== null) {
      cancelAnimationFrame(this.fade);
      this.fade = null;
    }
    const from = el.volume;
    if (Math.abs(from - to) < 0.01) {
      el.volume = to;
      if (to === 0) done?.();
      return;
    }
    const t0 = performance.now();
    const ms = 480;
    const step = () => {
      const k = clamp01((performance.now() - t0) / ms);
      el.volume = from + (to - from) * k;
      if (k < 1) {
        this.fade = requestAnimationFrame(step);
        return;
      }
      this.fade = null;
      el.volume = to;
      if (to === 0) done?.();
    };
    this.fade = requestAnimationFrame(step);
  }
}

export const villageBgm = new VillageBgm();
