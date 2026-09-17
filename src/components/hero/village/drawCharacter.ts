import { CAPE_HEX, HAIR_HEX, HAT_SPRITE, CAPE_SPRITE, PANTS_HEX, PICK_OVERLAY, SHIRT_HEX, SKIN_HEX } from '../../../config/village';
import type { VillageCharacter, VillageGear } from '../../../types/village';

export const TORSO_MASK_SRC = '/assets/village/masks/torso.png';

const SIZE = 64;

const BOOT_LEATHER: [number, number, number] = [92, 52, 28];

export type LookKit = {
  hat?: CanvasImageSource | null;
  cape?: CanvasImageSource | null;
  pickaxe?: CanvasImageSource | null;
  pet?: CanvasImageSource | null;
  gear?: VillageGear | null;
  iso?: CanvasImageSource | null;
};

function hexRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function rgb(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

function isHelmet(r: number, g: number, b: number): boolean {
  return r > 150 && g > 110 && b < 90 && r + g > b * 3;
}

function isSkinTone(r: number, g: number, b: number): boolean {
  if (isHelmet(r, g, b)) return false;
  return r > 130 && g > 70 && g < 210 && b < 170 && r > b + 10 && r > g - 10;
}

function isHairTone(r: number, g: number, b: number): boolean {
  if (isHelmet(r, g, b) || isSkinTone(r, g, b)) return false;
  return r > 35 && r < 150 && g > 15 && g < 100 && b < 70 && r >= g && r > b + 8;
}

function isShirtBlue(r: number, g: number, b: number, x: number, y: number): boolean {
  if (y < 21 || y > 42 || x < 18 || x > 50) return false;
  if (x >= 48) return false;
  return b > 70 && b > r + 12 && g > 40 && g < 190;
}

function isPantsBrown(r: number, g: number, b: number, x: number, y: number): boolean {
  if (y < 39 || y > 53 || x < 18 || x > 42) return false;
  return r > 70 && r < 175 && g < r - 8 && b < g + 10 && r > b + 15;
}

function isStockPick(r: number, g: number, b: number, x: number, y: number): boolean {
  if (x < 44 || y < 11 || y > 27) return false;
  if (isHelmet(r, g, b)) return false;
  const gray = Math.abs(r - g) < 32 && Math.abs(g - b) < 32;
  if (!gray) return false;
  if (r < 24) return true;
  return r > 68 && r < 220 && b > 80;
}

function isShoe(r: number, g: number, b: number, x: number, y: number): boolean {
  if (y < 48 || y > 58 || x < 18 || x > 44) return false;
  if (g > r && g > 80) return false;
  return r > 88 && r > g && g > 36 && b < 90;
}

function isTurf(r: number, g: number, b: number, y: number): boolean {
  if (y < 52) return false;
  return g > 92 && g >= r && g > b + 10 && r < 210;
}

function stripTurf(data: ImageData) {
  const d = data.data;
  for (let y = 52; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (d[i + 3] < 16) continue;
      if (isTurf(d[i], d[i + 1], d[i + 2], y)) d[i + 3] = 0;
    }
  }
}

function shadeTo(color: [number, number, number], lum: number, gain = 1.15, lift = 0.22): [number, number, number] {
  const s = lift + lum * gain;
  return [
    Math.min(255, color[0] * s),
    Math.min(255, color[1] * s),
    Math.min(255, color[2] * s),
  ];
}

function lumOf(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function tintWhere(
  data: ImageData,
  color: [number, number, number],
  test: (r: number, g: number, b: number, x: number, y: number) => boolean,
  gain = 1.35,
  lift = 0
) {
  const d = data.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (d[i + 3] < 16) continue;
      if (!test(d[i], d[i + 1], d[i + 2], x, y)) continue;
      const lum = lumOf(d[i], d[i + 1], d[i + 2]);
      if (lum < 0.08) continue;
      const [nr, ng, nb] = shadeTo(color, lum, gain, lift);
      d[i] = nr;
      d[i + 1] = ng;
      d[i + 2] = nb;
    }
  }
}

function eraseStockPick(data: ImageData) {
  const d = data.data;
  for (let y = 11; y < 28; y++) {
    for (let x = 44; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (d[i + 3] < 16) continue;
      if (!isStockPick(d[i], d[i + 1], d[i + 2], x, y)) continue;
      d[i + 3] = 0;
    }
  }
}

function stampWeapon(dest: ImageData, src: ImageData) {
  const d = dest.data;
  const s = src.data;
  for (let i = 0; i < d.length; i += 4) {
    if (s[i + 3] < 16) continue;
    d[i] = s[i];
    d[i + 1] = s[i + 1];
    d[i + 2] = s[i + 2];
    d[i + 3] = s[i + 3];
  }
}

function fillPx(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function readPixels(src: CanvasImageSource): ImageData {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const x = c.getContext('2d');
  if (!x) return new ImageData(SIZE, SIZE);
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, SIZE, SIZE);
  return x.getImageData(0, 0, SIZE, SIZE);
}

function isCapeCloth(r: number, g: number, b: number): boolean {
  return r > 90 && r > g + 50 && r > b + 20 && g > 18 && g < 95 && b < 90;
}

function stampCape(dest: ImageData, cape: ImageData, iso: ImageData, tint: [number, number, number]) {
  const d = dest.data;
  const c = cape.data;
  const s = iso.data;
  for (let y = 18; y < 54; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (c[i + 3] < 16) continue;
      if (isTurf(c[i], c[i + 1], c[i + 2], y) || isHelmet(c[i], c[i + 1], c[i + 2])) continue;
      const extra = s[i + 3] < 20;
      const cloth = isCapeCloth(c[i], c[i + 1], c[i + 2]);
      if (!(extra && cloth)) continue;
      if (d[i + 3] >= 16 && y < 22) continue;
      const [nr, ng, nb] = shadeTo(tint, lumOf(c[i], c[i + 1], c[i + 2]), 1.05, 0.28);
      d[i] = nr;
      d[i + 1] = ng;
      d[i + 2] = nb;
      d[i + 3] = Math.max(d[i + 3], c[i + 3]);
    }
  }
}

function drawCapeFallback(ctx: CanvasRenderingContext2D, hex: string, scarf: boolean) {
  const [r, g, b] = hexRgb(hex);
  const mid = rgb(r, g, b);
  const lite = rgb(Math.min(255, r + 42), Math.min(255, g + 38), Math.min(255, b + 32));
  const shade = rgb(Math.max(0, r - 30), Math.max(0, g - 30), Math.max(0, b - 26));
  const hem = rgb(Math.max(0, r - 84), Math.max(0, g - 78), Math.max(0, b - 68));
  if (scarf) {
    fillPx(ctx, 24, 24, 16, 3, mid);
    fillPx(ctx, 24, 24, 16, 1, lite);
    fillPx(ctx, 30, 24, 4, 3, '#E8B923');
    fillPx(ctx, 31, 25, 2, 1, '#fff4c4');
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  fillPx(ctx, 15, 26, 10, 22, mid);
  fillPx(ctx, 15, 28, 3, 16, lite);
  fillPx(ctx, 15, 42, 9, 6, hem);
  fillPx(ctx, 41, 26, 7, 16, shade);
  fillPx(ctx, 43, 38, 5, 5, hem);
  ctx.restore();
  fillPx(ctx, 22, 24, 8, 3, mid);
  fillPx(ctx, 34, 24, 8, 3, mid);
  fillPx(ctx, 29, 24, 6, 4, '#E8B923');
  fillPx(ctx, 30, 25, 4, 2, '#fff4c4');
}

function kitOf(extras?: CanvasImageSource | LookKit | null): LookKit {
  if (!extras) return {};
  if (typeof extras === 'object' && ('hat' in extras || 'cape' in extras || 'pet' in extras || 'gear' in extras || 'pickaxe' in extras || 'iso' in extras)) {
    return extras as LookKit;
  }
  return { pet: extras as CanvasImageSource };
}

export function lookKey(character: VillageCharacter, gear?: VillageGear | null): string {
  return [
    character.skin,
    character.hair,
    character.shirt,
    character.pants,
    character.hat || '',
    character.cape || '',
    character.pet || '',
    gear?.pickaxe ?? '',
    gear?.boots ?? '',
  ].join('|');
}

export function paintCharacterLook(
  ctx: CanvasRenderingContext2D,
  base: CanvasImageSource,
  _torsoMask: CanvasImageSource | null,
  character: VillageCharacter,
  extras?: CanvasImageSource | LookKit | null,
  view: 'iso' | 'side' = 'iso'
): void {
  const kit = kitOf(extras);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.drawImage(base, 0, 0, SIZE, SIZE);
  const dest = ctx.getImageData(0, 0, SIZE, SIZE);
  const orig = new ImageData(new Uint8ClampedArray(dest.data), SIZE, SIZE);

  const skinHex = SKIN_HEX[character.skin];
  if (skinHex) {
    tintWhere(dest, hexRgb(skinHex), (r, g, b, _x, y) => y >= 14 && y <= 52 && isSkinTone(r, g, b));
  }
  const hairHex = HAIR_HEX[character.hair];
  if (hairHex) {
    tintWhere(dest, hexRgb(hairHex), (r, g, b, _x, y) => y >= 10 && y <= 22 && isHairTone(r, g, b));
  }
  const shirtHex = SHIRT_HEX[character.shirt];
  if (shirtHex && view === 'iso') {
    tintWhere(dest, hexRgb(shirtHex), isShirtBlue, 0.82, 0.48);
  }
  const pantsHex = PANTS_HEX[character.pants];
  if (pantsHex) {
    tintWhere(dest, hexRgb(pantsHex), isPantsBrown, 0.82, 0.48);
  }

  const capeHex = character.cape ? CAPE_HEX[character.cape] : null;
  const scarf = character.cape === 'cape_vila';
  let capeStamped = false;
  if (capeHex && view === 'iso' && !scarf) {
    const isoPx = kit.iso ? readPixels(kit.iso) : orig;
    if (kit.cape) stampCape(dest, readPixels(kit.cape), isoPx, hexRgb(capeHex));
    else stampCape(dest, dest, isoPx, hexRgb(capeHex));
    capeStamped = true;
  }

  eraseStockPick(dest);
  if (kit.pickaxe) stampWeapon(dest, readPixels(kit.pickaxe));

  if (kit.gear?.boots === 1) {
    tintWhere(dest, BOOT_LEATHER, isShoe, 0.9, 0.25);
  }

  stripTurf(dest);
  ctx.putImageData(dest, 0, 0);

  if (capeHex && !capeStamped && view === 'iso') {
    drawCapeFallback(ctx, capeHex, character.cape === 'cape_vila');
  }

  if (kit.pet) ctx.drawImage(kit.pet, 40, 40, 22, 22);
}

export function lookOverlaySrc(character: VillageCharacter, gear?: VillageGear | null): { hat: string | null; cape: string | null; pickaxe: string | null } {
  const hatOn = Boolean(character.hat && HAT_SPRITE[character.hat]);
  const pickLv = Math.max(0, Math.min(4, gear?.pickaxe ?? 0));
  return {
    hat: null,
    cape: character.cape && character.cape !== 'cape_vila' && hatOn ? CAPE_SPRITE[character.cape] || null : null,
    pickaxe: PICK_OVERLAY[pickLv] || PICK_OVERLAY[0],
  };
}
