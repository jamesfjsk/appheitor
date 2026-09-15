import { CAPE_HEX, HAIR_HEX, HAT_HEX, PANTS_HEX, SHIRT_HEX, SKIN_HEX } from '../../../config/village';
import type { VillageCharacter } from '../../../types/village';

export const TORSO_MASK_SRC = '/assets/village/masks/torso.png';

const SIZE = 64;
/** Vista lateral (sprites antigos). */
const PANTS_RECT = { x: 16, y: 44, w: 32, h: 12 };
/** Vista iso: camisa e calça no corpo, sem pegar a picareta. */
const ISO_SHIRT = { x: 20, y: 26, w: 24, h: 16 };
const ISO_PANTS = { x: 20, y: 40, w: 22, h: 12 };

function hexRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function maskData(source: CanvasImageSource | null): ImageData | null {
  if (!source) return null;
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const ctx = off.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, SIZE, SIZE);
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

function colorize(
  data: ImageData,
  mask: ImageData | null,
  color: [number, number, number],
  rect?: { x: number; y: number; w: number; h: number }
) {
  const d = data.data;
  const m = mask?.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (rect && (x < rect.x || y < rect.y || x >= rect.x + rect.w || y >= rect.y + rect.h)) continue;
      const i = (y * SIZE + x) * 4;
      if (d[i + 3] < 16) continue;
      if (m && m[i] < 128) continue;
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      if (lum < 0.08) continue;
      const shade = lum * 1.35;
      d[i] = Math.min(255, color[0] * shade);
      d[i + 1] = Math.min(255, color[1] * shade);
      d[i + 2] = Math.min(255, color[2] * shade);
    }
  }
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

function tintWhere(
  data: ImageData,
  color: [number, number, number],
  test: (r: number, g: number, b: number, x: number, y: number) => boolean
) {
  const d = data.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (d[i + 3] < 16) continue;
      if (!test(d[i], d[i + 1], d[i + 2], x, y)) continue;
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      if (lum < 0.08) continue;
      const shade = lum * 1.35;
      d[i] = Math.min(255, color[0] * shade);
      d[i + 1] = Math.min(255, color[1] * shade);
      d[i + 2] = Math.min(255, color[2] * shade);
    }
  }
}

function drawCape(ctx: CanvasRenderingContext2D, hex: string, longHair: boolean) {
  const [r, g, b] = hexRgb(hex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  ctx.moveTo(26, 30);
  ctx.lineTo(16, 46);
  ctx.lineTo(22, 56);
  ctx.lineTo(32, 50);
  ctx.lineTo(42, 56);
  ctx.lineTo(48, 46);
  ctx.lineTo(38, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})`;
  ctx.fillRect(30, 34, 3, 16);
  if (longHair) ctx.fillRect(28, 28, 8, 6);
}

export function paintCharacterLook(
  ctx: CanvasRenderingContext2D,
  base: CanvasImageSource,
  torsoMask: CanvasImageSource | null,
  character: VillageCharacter,
  pet?: CanvasImageSource | null,
  view: 'iso' | 'side' = 'iso'
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SIZE, SIZE);
  if (view === 'iso' && character.cape && CAPE_HEX[character.cape]) {
    drawCape(ctx, CAPE_HEX[character.cape], character.hair === 'hair_4');
  }
  ctx.drawImage(base, 0, 0, SIZE, SIZE);
  const buf = ctx.getImageData(0, 0, SIZE, SIZE);
  if (view === 'iso') {
    const skinHex = SKIN_HEX[character.skin];
    if (skinHex && character.skin !== 'skin_1') {
      tintWhere(buf, hexRgb(skinHex), (r, g, b, _x, y) => y >= 14 && y <= 52 && isSkinTone(r, g, b));
    }
    const hairHex = HAIR_HEX[character.hair];
    if (hairHex && character.hair !== 'hair_1') {
      tintWhere(buf, hexRgb(hairHex), (r, g, b, _x, y) => y >= 8 && y <= 30 && isHairTone(r, g, b));
    }
    if (character.hat && HAT_HEX[character.hat]) {
      tintWhere(buf, hexRgb(HAT_HEX[character.hat]), (r, g, b, _x, y) => y >= 4 && y <= 24 && isHelmet(r, g, b));
    }
  }
  const shirtHex = SHIRT_HEX[character.shirt];
  if (shirtHex && character.shirt !== 'shirt_1' && character.shirt !== 'shirt_team') {
    if (view === 'iso') colorize(buf, null, hexRgb(shirtHex), ISO_SHIRT);
    else {
      const torso = maskData(torsoMask);
      if (torso) colorize(buf, torso, hexRgb(shirtHex));
    }
  }
  const pantsHex = PANTS_HEX[character.pants];
  if (pantsHex && character.pants !== 'pants_1') {
    colorize(buf, null, hexRgb(pantsHex), view === 'iso' ? ISO_PANTS : PANTS_RECT);
  }
  ctx.putImageData(buf, 0, 0);
  if (pet) ctx.drawImage(pet, 36, 36, 24, 24);
}
