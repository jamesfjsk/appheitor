import { CAPE_HEX, HAIR_HEX, HAT_HEX, PANTS_HEX, SHIRT_HEX, SKIN_HEX } from '../../../config/village';
import type { VillageCharacter } from '../../../types/village';

export const TORSO_MASK_SRC = '/assets/village/masks/torso.png';

const SIZE = 64;

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
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      if (lum < 0.08) continue;
      const shade = lift + lum * gain;
      d[i] = Math.min(255, color[0] * shade);
      d[i + 1] = Math.min(255, color[1] * shade);
      d[i + 2] = Math.min(255, color[2] * shade);
    }
  }
}

function fillPx(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCape(ctx: CanvasRenderingContext2D, hex: string, scarf: boolean) {
  const [r, g, b] = hexRgb(hex);
  const mid = rgb(r, g, b);
  const lite = rgb(Math.min(255, r + 42), Math.min(255, g + 38), Math.min(255, b + 32));
  const shade = rgb(Math.max(0, r - 30), Math.max(0, g - 30), Math.max(0, b - 26));
  const dark = rgb(Math.max(0, r - 62), Math.max(0, g - 58), Math.max(0, b - 50));
  const hem = rgb(Math.max(0, r - 84), Math.max(0, g - 78), Math.max(0, b - 68));

  if (scarf) {
    fillPx(ctx, 20, 28, 6, 15, mid);
    fillPx(ctx, 20, 28, 2, 13, lite);
    fillPx(ctx, 24, 33, 3, 11, dark);
    fillPx(ctx, 21, 41, 5, 4, hem);
    return;
  }

  fillPx(ctx, 17, 26, 8, 2, mid);
  fillPx(ctx, 15, 28, 10, 4, mid);
  fillPx(ctx, 14, 32, 10, 5, mid);
  fillPx(ctx, 14, 37, 9, 5, shade);
  fillPx(ctx, 15, 42, 8, 4, dark);
  fillPx(ctx, 16, 46, 6, 3, hem);
  fillPx(ctx, 21, 28, 1, 15, lite);
  fillPx(ctx, 16, 31, 1, 12, dark);

  fillPx(ctx, 40, 26, 6, 2, mid);
  fillPx(ctx, 41, 28, 6, 4, mid);
  fillPx(ctx, 42, 32, 6, 4, shade);
  fillPx(ctx, 43, 36, 5, 4, dark);
  fillPx(ctx, 44, 40, 4, 3, hem);
  fillPx(ctx, 42, 28, 1, 9, lite);
}

function drawCapeFront(ctx: CanvasRenderingContext2D, hex: string, scarf: boolean) {
  const [r, g, b] = hexRgb(hex);
  const mid = rgb(r, g, b);
  const lite = rgb(Math.min(255, r + 42), Math.min(255, g + 38), Math.min(255, b + 32));
  const dark = rgb(Math.max(0, r - 62), Math.max(0, g - 58), Math.max(0, b - 50));

  if (scarf) {
    fillPx(ctx, 22, 24, 20, 4, mid);
    fillPx(ctx, 23, 24, 18, 1, lite);
    fillPx(ctx, 28, 26, 4, 3, dark);
    fillPx(ctx, 30, 24, 4, 4, '#E8B923');
    fillPx(ctx, 31, 25, 2, 2, '#fff4c4');
    return;
  }

  fillPx(ctx, 22, 24, 8, 3, mid);
  fillPx(ctx, 34, 24, 8, 3, mid);
  fillPx(ctx, 23, 24, 6, 1, lite);
  fillPx(ctx, 35, 24, 6, 1, lite);
  fillPx(ctx, 29, 24, 6, 4, '#E8B923');
  fillPx(ctx, 30, 25, 4, 2, '#fff4c4');
  fillPx(ctx, 31, 26, 2, 1, '#c9a020');
}

function drawHatAccent(ctx: CanvasRenderingContext2D, hat: string) {
  if (hat === 'hat_cap') {
    fillPx(ctx, 17, 16, 24, 3, '#1e3a5c');
    fillPx(ctx, 16, 17, 7, 2, '#1e3a5c');
    return;
  }
  if (hat === 'hat_crown' || hat === 'milestone_30' || hat === 'milestone_40') {
    fillPx(ctx, 24, 1, 3, 4, '#E8B923');
    fillPx(ctx, 30, 0, 4, 5, '#E8B923');
    fillPx(ctx, 37, 1, 3, 4, '#E8B923');
    fillPx(ctx, 31, 1, 2, 2, '#fff4c4');
  }
}

export function lookKey(character: VillageCharacter): string {
  return [
    character.skin,
    character.hair,
    character.shirt,
    character.pants,
    character.hat || '',
    character.cape || '',
    character.pet || '',
  ].join('|');
}

export function paintCharacterLook(
  ctx: CanvasRenderingContext2D,
  base: CanvasImageSource,
  _torsoMask: CanvasImageSource | null,
  character: VillageCharacter,
  pet?: CanvasImageSource | null,
  view: 'iso' | 'side' = 'iso'
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.drawImage(base, 0, 0, SIZE, SIZE);
  const buf = ctx.getImageData(0, 0, SIZE, SIZE);
  const skinHex = SKIN_HEX[character.skin];
  if (skinHex) {
    tintWhere(buf, hexRgb(skinHex), (r, g, b, _x, y) => y >= 14 && y <= 52 && isSkinTone(r, g, b));
  }
  const hairHex = HAIR_HEX[character.hair];
  if (hairHex) {
    tintWhere(buf, hexRgb(hairHex), (r, g, b, _x, y) => y >= 10 && y <= 22 && isHairTone(r, g, b));
  }
  const hatHex = character.hat ? HAT_HEX[character.hat] : null;
  if (hatHex && view === 'iso') {
    tintWhere(buf, hexRgb(hatHex), (r, g, b, _x, y) => y >= 2 && y <= 24 && isHelmet(r, g, b));
  }
  const shirtHex = SHIRT_HEX[character.shirt];
  if (shirtHex && view === 'iso') {
    tintWhere(buf, hexRgb(shirtHex), isShirtBlue, 0.82, 0.48);
  }
  const pantsHex = PANTS_HEX[character.pants];
  if (pantsHex) {
    tintWhere(buf, hexRgb(pantsHex), isPantsBrown, 0.82, 0.48);
  }
  ctx.putImageData(buf, 0, 0);
  const capeHex = character.cape ? CAPE_HEX[character.cape] : null;
  if (capeHex && view === 'iso') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    drawCape(ctx, capeHex, character.cape === 'cape_vila');
    ctx.restore();
  }
  if (character.hat && view === 'iso') drawHatAccent(ctx, character.hat);
  if (pet) ctx.drawImage(pet, 36, 36, 24, 24);
}
