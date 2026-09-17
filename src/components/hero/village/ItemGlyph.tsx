import React from 'react';
import type { BootTier, GlyphType, HatStyle, PickaxeTier } from './itemGlyphs';

function rgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function tone(hex: string, add: number): string {
  const [r, g, b] = rgb(hex);
  const t = (c: number) => Math.max(0, Math.min(255, c + add));
  return `rgb(${t(r)},${t(g)},${t(b)})`;
}

type Cell = [x: number, y: number, w: number, h: number, fill: string];

function Cells({ cells }: { cells: Cell[] }) {
  return (
    <>
      {cells.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </>
  );
}

const INK = '#120e0c';
const GOLD = '#E8B923';
const GOLD_HI = '#fff4c4';

const PICK_HEAD: Record<PickaxeTier, string> = {
  wood: '#C4A574',
  stone: '#9a9aa4',
  iron: '#d4dce4',
  gold: '#ffd83d',
  diamond: '#7ef0f6',
};

function cloth(hex: string, ghost: boolean) {
  const fill = ghost ? '#5a534c' : hex;
  return {
    fill,
    lite: ghost ? '#7a736c' : tone(fill, 46),
    shade: ghost ? '#3f3a36' : tone(fill, -32),
    dark: ghost ? '#2e2a27' : tone(fill, -58),
  };
}

function shirtCells(c: ReturnType<typeof cloth>): Cell[] {
  return [
    [2, 6, 6, 6, c.fill],
    [16, 6, 6, 6, c.fill],
    [5, 7, 14, 14, c.fill],
    [9, 4, 6, 4, c.fill],
    [2, 6, 6, 2, c.lite],
    [16, 6, 6, 2, c.lite],
    [9, 4, 6, 2, c.lite],
    [6, 18, 12, 3, c.dark],
    [2, 10, 2, 2, c.shade],
    [20, 10, 2, 2, c.shade],
    [11, 5, 2, 2, INK],
  ];
}

function pantsCells(c: ReturnType<typeof cloth>): Cell[] {
  return [
    [6, 3, 12, 7, c.fill],
    [5, 9, 6, 12, c.fill],
    [13, 9, 6, 12, c.fill],
    [6, 3, 12, 2, c.lite],
    [5, 18, 6, 3, c.dark],
    [13, 18, 6, 3, c.dark],
    [11, 9, 2, 5, c.shade],
    [7, 4, 10, 1, INK],
  ];
}

function capeCells(c: ReturnType<typeof cloth>, ghost: boolean): Cell[] {
  const clasp = ghost ? c.lite : GOLD;
  const claspHi = ghost ? c.fill : GOLD_HI;
  return [
    [7, 4, 10, 3, c.fill],
    [5, 7, 14, 4, c.fill],
    [4, 11, 16, 5, c.fill],
    [5, 16, 14, 4, c.shade],
    [7, 20, 10, 3, c.dark],
    [6, 7, 3, 12, c.lite],
    [16, 10, 3, 8, c.dark],
    [9, 21, 6, 1, INK],
    [10, 2, 4, 3, clasp],
    [11, 3, 2, 1, claspHi],
    [11, 8, 2, 8, c.shade],
  ];
}

function scarfCells(c: ReturnType<typeof cloth>, ghost: boolean): Cell[] {
  const clasp = ghost ? c.lite : GOLD;
  return [
    [4, 6, 16, 5, c.fill],
    [4, 6, 16, 2, c.lite],
    [4, 10, 16, 1, c.dark],
    [8, 11, 4, 10, c.fill],
    [8, 11, 1, 10, c.lite],
    [11, 14, 2, 8, c.dark],
    [8, 19, 4, 3, c.shade],
    [10, 7, 4, 3, clasp],
    [11, 8, 2, 1, ghost ? c.fill : GOLD_HI],
  ];
}

function pickaxeCells(tier: PickaxeTier, ghost: boolean): Cell[] {
  const head = ghost ? '#7a736c' : PICK_HEAD[tier];
  const headLite = ghost ? '#9a948c' : tone(head, 40);
  const headDark = ghost ? '#4a433c' : tone(head, -48);
  const handle = ghost ? '#5a534c' : (tier === 'wood' ? '#8B5A2B' : '#5c3d24');
  const handleLite = ghost ? '#6a635c' : tone(handle, 28);
  const wrap = tier === 'diamond' && !ghost ? '#3aa8b0' : handleLite;
  return [
    [5, 16, 3, 6, handle],
    [6, 13, 3, 5, handle],
    [7, 10, 3, 5, handle],
    [8, 8, 3, 4, handle],
    [5, 16, 1, 6, handleLite],
    [8, 9, 2, 2, wrap],
    [10, 5, 10, 4, head],
    [14, 3, 6, 4, head],
    [16, 7, 4, 5, head],
    [10, 5, 10, 1, headLite],
    [14, 3, 6, 1, headLite],
    [12, 8, 8, 1, headDark],
    [18, 9, 2, 3, headDark],
    ...(tier === 'diamond' && !ghost ? [[15, 4, 2, 2, '#ffffff'] as Cell, [12, 6, 1, 1, '#ffffff'] as Cell] : []),
  ];
}

function bootsCells(tier: BootTier, ghost: boolean): Cell[] {
  const leather = ghost ? '#5a534c' : (tier === 'iron' ? '#6d6d74' : '#8B5A2B');
  const c = cloth(leather, ghost);
  const sole = ghost ? '#2e2a27' : '#1a1008';
  const cuff = tier === 'iron' && !ghost ? '#c0c8d0' : c.lite;
  return [
    [3, 8, 8, 10, c.fill],
    [13, 8, 8, 10, c.fill],
    [2, 14, 10, 5, c.fill],
    [12, 14, 10, 5, c.fill],
    [3, 8, 8, 2, cuff],
    [13, 8, 8, 2, cuff],
    [3, 10, 2, 6, c.lite],
    [13, 10, 2, 6, c.lite],
    [2, 18, 10, 3, sole],
    [12, 18, 10, 3, sole],
    [8, 15, 3, 3, c.shade],
    [18, 15, 3, 3, c.shade],
  ];
}

function hatCells(style: HatStyle, hex: string, ghost: boolean): Cell[] {
  if (style === 'crown') {
    const gold = ghost ? '#7a736c' : GOLD;
    const hi = ghost ? '#9a948c' : GOLD_HI;
    const dark = ghost ? '#3f3a36' : '#6b4d00';
    const gem = ghost ? '#5a534c' : '#b3261e';
    return [
      [5, 12, 14, 6, gold],
      [5, 12, 14, 2, hi],
      [5, 16, 14, 2, dark],
      [5, 6, 4, 8, gold],
      [10, 3, 4, 11, gold],
      [15, 6, 4, 8, gold],
      [11, 3, 2, 3, hi],
      [6, 6, 2, 2, hi],
      [16, 6, 2, 2, hi],
      [11, 8, 2, 2, gem],
      [6, 14, 2, 2, '#3D6EA8'],
      [16, 14, 2, 2, '#5b9b3a'],
    ];
  }
  if (style === 'cap') {
    const c = cloth(hex || '#3D6EA8', ghost);
    return [
      [6, 6, 12, 8, c.fill],
      [8, 4, 8, 4, c.fill],
      [8, 4, 8, 2, c.lite],
      [6, 6, 3, 6, c.lite],
      [15, 8, 3, 5, c.dark],
      [4, 12, 16, 4, c.shade],
      [3, 13, 18, 3, c.fill],
      [3, 13, 18, 1, c.lite],
      [4, 15, 16, 1, c.dark],
      [11, 5, 2, 2, c.dark],
    ];
  }
  const c = cloth(hex || '#8B8B8B', ghost);
  return [
    [6, 5, 12, 10, c.fill],
    [8, 3, 8, 4, c.fill],
    [8, 3, 8, 2, c.lite],
    [6, 5, 3, 8, c.lite],
    [15, 7, 3, 7, c.dark],
    [7, 12, 10, 3, INK],
    [4, 10, 4, 7, c.fill],
    [16, 10, 4, 7, c.fill],
    [5, 11, 2, 2, c.lite],
    [8, 15, 8, 2, c.dark],
  ];
}

function lampCells(ghost: boolean): Cell[] {
  const frame = ghost ? '#5a534c' : '#4a4038';
  const frameLite = ghost ? '#7a736c' : '#7a6a58';
  const glass = ghost ? '#6a5a40' : '#E8B923';
  const glow = ghost ? '#8a7a50' : '#fff4c4';
  const dark = ghost ? '#3a342f' : '#2a2018';
  return [
    [9, 2, 6, 3, frame],
    [10, 1, 4, 2, frameLite],
    [7, 5, 10, 12, frame],
    [8, 6, 8, 10, glass],
    [9, 7, 6, 4, glow],
    [10, 8, 2, 2, '#ffffff'],
    [7, 16, 10, 3, dark],
    [8, 19, 8, 3, frame],
    [7, 5, 10, 1, frameLite],
  ];
}

const ItemGlyph: React.FC<{
  type: GlyphType;
  hex?: string;
  variant?: PickaxeTier | HatStyle | BootTier;
  ghost?: boolean;
  size?: number;
}> = ({ type, hex, variant, ghost = false, size = 40 }) => {
  const c = cloth(hex || '#8B5A2B', ghost);
  let cells: Cell[] = [];
  if (type === 'shirt') cells = shirtCells(c);
  else if (type === 'pants') cells = pantsCells(c);
  else if (type === 'cape') cells = capeCells(c, ghost);
  else if (type === 'scarf') cells = scarfCells(c, ghost);
  else if (type === 'pickaxe') cells = pickaxeCells((variant as PickaxeTier) || 'wood', ghost);
  else if (type === 'boots') cells = bootsCells((variant as BootTier) || 'leather', ghost);
  else if (type === 'hat') cells = hatCells((variant as HatStyle) || 'cap', hex || '#3D6EA8', ghost);
  else if (type === 'lamp') cells = lampCells(ghost);

  return (
    <svg
      className={`mn-garment mc-pixel ${ghost ? 'is-ghost' : ''} is-${type}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <Cells cells={cells} />
    </svg>
  );
};

export default ItemGlyph;
