import { PANTS_HEX, SHIRT_HEX } from '../../../config/village';
import type { VillageCharacter } from '../../../types/village';

export const TORSO_MASK_SRC = '/assets/village/masks/torso.png';

const SIZE = 64;
/** Abaixo do torso (y 24–44 no pipeline); acima das botas. */
const PANTS_RECT = { x: 16, y: 44, w: 32, h: 12 };

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

export function paintCharacterLook(
  ctx: CanvasRenderingContext2D,
  base: CanvasImageSource,
  torsoMask: CanvasImageSource | null,
  character: VillageCharacter,
  pet?: CanvasImageSource | null
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.drawImage(base, 0, 0, SIZE, SIZE);
  const buf = ctx.getImageData(0, 0, SIZE, SIZE);
  const torso = maskData(torsoMask);
  const shirtHex = SHIRT_HEX[character.shirt];
  if (shirtHex && character.shirt !== 'shirt_1' && character.shirt !== 'shirt_team' && torso) {
    colorize(buf, torso, hexRgb(shirtHex));
  }
  const pantsHex = PANTS_HEX[character.pants];
  if (pantsHex && character.pants !== 'pants_1') {
    colorize(buf, null, hexRgb(pantsHex), PANTS_RECT);
  }
  ctx.putImageData(buf, 0, 0);
  if (pet) ctx.drawImage(pet, 36, 36, 24, 24);
}
