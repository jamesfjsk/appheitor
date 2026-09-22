/** Partículas e seleção em pixel — sem círculo suave, sem caixa de debug. */

export type Puff = { x: number; y: number; r: number; a: number; vy: number; vx?: number };

export type Firefly = { x: number; y: number; p: number };

export type HoverKind = 'fence' | 'building' | 'npc' | 'spot';

export type HoverHit = {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  sprite?: HTMLImageElement | null;
  pixel?: boolean;
  hover?: HoverKind;
};

const ALPHA_CUT = 24;
const haloCache = new Map<string, HTMLCanvasElement>();
const alphaCache = new WeakMap<HTMLImageElement, { data: Uint8ClampedArray; w: number; h: number }>();

function pix(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  fill: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, s), Math.max(1, s));
}

const HEART = [
  [0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
];

export function idleFrameIndex(nowMs: number, cols: number, seed = 0): number {
  if (cols < 2) return 0;
  const t = (nowMs + 900 + seed * 7919) % 3800;
  if (t < 90) return 1;
  if (t > 170 && t < 240) return 1;
  if (t > 2480 && t < 2780) return Math.min(2, cols - 1);
  return 0;
}

export function idleBob(nowMs: number, seed: number, moving: boolean, reduced: boolean): number {
  if (reduced) return 0;
  const period = moving ? 400 : 1500;
  const amp = moving ? 2 : 1;
  return Math.floor((nowMs + seed * 220) / period) % 2 === 0 ? 0 : -amp;
}

export function idleShift(nowMs: number, seed: number, reduced: boolean): number {
  if (reduced) return 0;
  const t = (nowMs + seed * 1301) % 5400;
  return t > 4300 && t < 4900 ? 1 : 0;
}

export function paintPixelHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: boolean,
  scale = 2,
) {
  for (let row = 0; row < HEART.length; row++) {
    for (let col = 0; col < HEART[row].length; col++) {
      if (!HEART[row][col]) continue;
      const edge =
        !HEART[row - 1]?.[col] ||
        !HEART[row + 1]?.[col] ||
        !HEART[row][col - 1] ||
        !HEART[row][col + 1];
      if (!fill && !edge) continue;
      pix(ctx, x + col * scale, y + row * scale, scale, fill ? (edge ? '#7a1f1f' : '#c23b3b') : '#f0d9b0');
    }
  }
}

export function paintPixelPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: 'paper' | 'wood' = 'paper',
) {
  const X = Math.round(x);
  const Y = Math.round(y);
  const W = Math.max(8, Math.round(w));
  const H = Math.max(8, Math.round(h));
  const fill = kind === 'wood' ? '#8d5728' : '#f4ead8';
  const shine = kind === 'wood' ? '#c9a06a' : '#fff6ea';
  ctx.fillStyle = 'rgba(22,14,10,0.32)';
  ctx.fillRect(X + 2, Y + H, W - 2, 3);
  ctx.fillStyle = '#1a140f';
  ctx.fillRect(X, Y + 2, W, H - 4);
  ctx.fillRect(X + 2, Y, W - 4, H);
  ctx.fillStyle = fill;
  ctx.fillRect(X + 2, Y + 2, W - 4, H - 4);
  ctx.fillStyle = shine;
  ctx.fillRect(X + 3, Y + 2, W - 6, 2);
}

export function paintPixelTail(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  side: 'bottom' | 'left' | 'right',
  fill = '#f4ead8',
) {
  const P = Math.round(px);
  const Q = Math.round(py);
  const steps = side === 'bottom'
    ? [[-7, 0, 14, 3], [-5, 3, 10, 3], [-3, 6, 6, 3], [-1, 9, 2, 3]]
    : side === 'right'
      ? [[0, -7, 3, 14], [3, -5, 3, 10], [6, -3, 3, 6], [9, -1, 3, 2]]
      : [[-3, -7, 3, 14], [-6, -5, 3, 10], [-9, -3, 3, 6], [-12, -1, 3, 2]];
  ctx.fillStyle = '#1a140f';
  steps.forEach(([x, y, w, h]) => ctx.fillRect(P + x - 1, Q + y - 1, w + 2, h + 2));
  ctx.fillStyle = fill;
  steps.forEach(([x, y, w, h]) => ctx.fillRect(P + x, Q + y, w, h));
}

export function hoverLabelPos(
  hit: HoverHit,
  canvas: { w: number; h: number } = { w: 1280, h: 640 },
): { x: number; y: number } {
  const bh = 18;
  const cx = hit.x + hit.w / 2;
  const y = Math.max(4, Math.min(canvas.h - bh - 4, hit.y - bh - 6));
  return { x: cx, y };
}

export function paintHoverLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
) {
  ctx.save();
  ctx.font = '700 12px Fredoka, system-ui, sans-serif';
  const tw = Math.ceil(ctx.measureText(text).width);
  const bw = tw + 14;
  const bh = 18;
  const maxX = Math.max(4, ctx.canvas.width - bw - 4);
  const x = Math.max(4, Math.min(maxX, Math.round(cx - bw / 2)));
  const yy = Math.round(y);
  paintPixelPanel(ctx, x, yy, bw, bh, 'wood');
  ctx.fillStyle = '#f3e6c8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + Math.round(bw / 2), yy + Math.round(bh / 2) + 1);
  ctx.restore();
}

export function paintClosedSign(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
): { x: number; y: number; w: number; h: number } {
  ctx.save();
  ctx.font = '11px Fredoka, system-ui, sans-serif';
  const tw = Math.ceil(ctx.measureText(text).width);
  const bw = Math.max(72, tw + 18);
  const bh = 24;
  const x = Math.round(cx - bw / 2);
  const y = Math.round(cy - bh - 8);
  ctx.fillStyle = '#5c3a1c';
  ctx.fillRect(Math.round(cx) - 2, y + bh - 2, 4, 12);
  paintPixelPanel(ctx, x, y, bw, bh, 'wood');
  ctx.fillStyle = '#f3e6c8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, Math.round(cx), y + bh / 2 + 1);
  ctx.restore();
  return { x, y, w: bw, h: bh + 12 };
}

/** Cadeado da prova: ferro e madeira das placas, sem placa-inventário atrás. */
export function paintGateLock(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const x = Math.round(cx - 7);
  const y = Math.round(cy);
  ctx.save();
  ctx.fillStyle = '#1a140f';
  ctx.fillRect(x + 3, y, 9, 9);
  ctx.fillStyle = '#d4b07a';
  ctx.fillRect(x + 4, y + 1, 7, 7);
  ctx.fillStyle = '#1a140f';
  ctx.fillRect(x + 6, y + 3, 3, 6);
  ctx.fillStyle = '#1a140f';
  ctx.fillRect(x, y + 7, 15, 13);
  ctx.fillStyle = '#8d5728';
  ctx.fillRect(x + 1, y + 8, 13, 11);
  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(x + 2, y + 8, 11, 2);
  ctx.fillStyle = '#5c3a1c';
  ctx.fillRect(x + 2, y + 16, 11, 2);
  ctx.fillStyle = '#1a140f';
  ctx.fillRect(x + 6, y + 12, 3, 3);
  ctx.fillRect(x + 7, y + 14, 2, 3);
  ctx.restore();
}

/** Brilho do Baú do Dia na hora: ouro em volta da tampa. */
export function paintChestGlint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number,
  reduced: boolean,
) {
  const pulse = reduced ? 0.3 : 0.22 + 0.16 * Math.sin(elapsed * 5.4);
  paintGlow(ctx, x, y, 36, [255, 210, 80], pulse);
  if (reduced) return;
  for (let i = 0; i < 7; i++) {
    const a = elapsed * 1.9 + i * 0.9;
    const r = 8 + (i % 3) * 7;
    const px = Math.round(x + Math.cos(a) * r);
    const py = Math.round(y - 6 - Math.abs(Math.sin(a * 1.35)) * 14);
    const s = i % 2 ? 3 : 2;
    ctx.fillStyle = i % 2 ? '#ffe27a' : '#fff6c8';
    ctx.fillRect(px, py, s, s);
  }
}

export function chestLidBob(elapsed: number, reduced: boolean): number {
  if (reduced) return 0;
  return Math.sin(elapsed * 4.4) > 0.2 ? -2 : 0;
}

export function paintCharBlink(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  w: number,
  h: number,
  nowMs: number,
  seed: number,
  face: number,
  reduced: boolean,
  eyes = { y: 20 / 64, left: 25.5 / 64, right: 34 / 64 },
) {
  if (reduced) return;
  const t = (nowMs + 900 + seed * 7919) % 3800;
  if (!(t < 90 || (t > 170 && t < 240))) return;
  const eh = Math.max(1, Math.round(h / 64));
  const ew = Math.max(2, Math.round((3 * w) / 64));
  const y = Math.round(oy + eyes.y * h);
  ctx.fillStyle = '#3a2418';
  for (const r of [eyes.left, eyes.right]) {
    const rr = face < 0 ? 1 - r : r;
    ctx.fillRect(Math.round(ox + rr * w - ew / 2), y, ew, eh);
  }
}

export function paintCampFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number,
  reduced: boolean,
) {
  const lick = reduced ? 3 : 3 + Math.round(1.5 + 1.5 * Math.sin(elapsed * 11));
  pix(ctx, x - 1, y - 2, 2, 'rgba(255,210,80,0.95)');
  pix(ctx, x, y - lick, 2, 'rgba(255,120,32,0.9)');
  pix(ctx, x - 2, y - Math.max(2, lick - 2), 2, 'rgba(255,80,20,0.72)');
  pix(ctx, x + 1, y - Math.max(1, lick - 3), 1, 'rgba(255,240,180,0.8)');
}

export function paintPuff(ctx: CanvasRenderingContext2D, p: Puff, kind: 'smoke' | 'dust' | 'rubble') {
  const s = Math.max(2, Math.round(p.r));
  const x = p.x;
  const y = p.y;
  if (kind === 'smoke') {
    pix(ctx, x, y, s, `rgba(168,166,158,${p.a})`);
    pix(ctx, x + 1, y - 1, Math.max(1, s - 1), `rgba(214,210,200,${p.a * 0.55})`);
    return;
  }
  if (kind === 'dust') {
    pix(ctx, x, y, Math.min(3, s), `rgba(176,158,122,${p.a})`);
    return;
  }
  pix(ctx, x, y, Math.min(4, s), `rgba(138,118,88,${p.a})`);
  pix(ctx, x + 1, y + 1, 1, `rgba(92,74,52,${p.a * 0.8})`);
}

export function paintEmber(ctx: CanvasRenderingContext2D, p: Puff) {
  const s = p.a > 0.4 ? 2 : 1;
  const hot = p.a > 0.45;
  pix(ctx, p.x, p.y, s, hot ? `rgba(255,186,70,${p.a})` : `rgba(255,92,32,${p.a})`);
  if (hot) pix(ctx, p.x, p.y - 1, 1, `rgba(255,240,180,${p.a * 0.7})`);
}

export function paintGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: [number, number, number],
  a: number,
) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  g.addColorStop(0.45, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.22})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Brisa da Vila: da esquerda pra direita, no andamento da trilha. */
export const BREEZE_PX = 16;

export function wrapDrift(elapsed: number, span: number, speed: number, seed: number): number {
  const x = (seed + elapsed * speed) % span;
  return x < 0 ? x + span : x;
}

export function breezeSway(elapsed: number, seed: number, amp = 2): number {
  return Math.sin(elapsed * 0.7 + seed) * amp;
}

function withSoft(ctx: CanvasRenderingContext2D, fn: () => void) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  fn();
  ctx.restore();
}

function softOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rgb: [number, number, number],
  a: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  g.addColorStop(0.55, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.35})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const CLOUD_PUFFS: Array<[number, number, number, number]> = [
  [0, 0, 92, 36],
  [48, -14, 72, 28],
  [-52, -10, 64, 26],
  [22, 14, 70, 26],
  [-28, 16, 54, 22],
];

function paintCloudPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
) {
  CLOUD_PUFFS.forEach(([dx, dy, w, h]) => {
    softOrb(ctx, x + dx, y + dy, w * 0.55, h * 0.55, [255, 255, 255], alpha);
  });
}

function paintBird(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number) {
  const lift = 5 + flap * 7;
  ctx.strokeStyle = 'rgba(23, 19, 15, 0.82)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 13, y + lift * 0.2);
  ctx.quadraticCurveTo(x - 5, y - lift, x, y);
  ctx.quadraticCurveTo(x + 5, y - lift, x + 13, y + lift * 0.2);
  ctx.stroke();
}

/** Nuvem e passarinho no céu — faixa de cima, sem máscara que some com o efeito. */
export function paintSkyLife(
  ctx: CanvasRenderingContext2D,
  W: number,
  elapsed: number,
  night: boolean,
  reduced: boolean,
  _inSky?: (x: number, y: number) => boolean,
) {
  void _inSky;
  if (night) return;
  const pace = reduced ? 0.45 : 1;
  withSoft(ctx, () => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, 128);
    ctx.clip();
    const clouds = [
      { seed: 40, y: 28, speed: 34 * pace, a: 0.72 },
      { seed: 480, y: 48, speed: 48 * pace, a: 0.55 },
      { seed: 860, y: 20, speed: 26 * pace, a: 0.64 },
      { seed: 190, y: 62, speed: 40 * pace, a: 0.48 },
      { seed: 1100, y: 36, speed: 30 * pace, a: 0.58 },
    ];
    clouds.forEach((c, i) => {
      const x = wrapDrift(elapsed, W + 280, c.speed, c.seed) - 140;
      const y = c.y + breezeSway(elapsed, i * 1.7, reduced ? 0.8 : 2.2);
      paintCloudPuff(ctx, x, y, c.a);
    });
    ctx.restore();
    if (reduced) return;
    for (let i = 0; i < 4; i++) {
      const x = wrapDrift(elapsed, W + 180, 56 + i * 10, i * 220) - 70;
      const y = 26 + i * 18 + Math.sin(elapsed * 1.2 + i) * 7;
      if (y > 118) continue;
      paintBird(ctx, x, y, 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * 7 + i)));
    }
  });
}

const TREE_TIPS: Array<[number, number]> = [
  [72, 210], [120, 180], [168, 148], [248, 92], [390, 64],
  [980, 58], [1100, 120], [1188, 168], [1240, 300], [80, 320],
];

const LEAF: Array<[number, number, number]> = [
  [72, 140, 42],
  [155, 196, 70],
  [210, 150, 70],
  [90, 120, 36],
];

/** Pólen e folha no vento — a vila respira, ninguém “pensa”. */
export function paintWind(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  elapsed: number,
  night: boolean,
  reduced: boolean,
) {
  if (night) return;
  const pace = reduced ? 0.4 : 1;
  withSoft(ctx, () => {
    const motes = reduced ? 10 : 22;
    for (let i = 0; i < motes; i++) {
      const x = wrapDrift(elapsed, W + 50, (18 + (i % 5) * 4) * pace, i * 73) - 16;
      const y = 190 + (i * 27) % 300 + breezeSway(elapsed, i, 10);
      const a = 0.38 + 0.32 * (0.5 + 0.5 * Math.sin(elapsed * 1.3 + i));
      softOrb(ctx, x, y, i % 4 === 0 ? 5.5 : 3.6, i % 4 === 0 ? 4 : 2.6, [255, 236, 170], a);
    }
    const tips = reduced ? TREE_TIPS.slice(0, 5) : TREE_TIPS;
    for (let i = 0; i < tips.length; i++) {
      const [tx, ty] = tips[i];
      const fall = wrapDrift(elapsed, 280, (16 + (i % 3) * 4) * pace, i * 40);
      const x = tx + wrapDrift(elapsed, 140, BREEZE_PX * 0.9 * pace, i * 17) - 30;
      const y = ty + fall;
      if (y > H - 70) continue;
      const spin = elapsed * 2.1 + i;
      const [r, g, b] = LEAF[i % LEAF.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(spin) * 1.1);
      softOrb(ctx, 0, 0, 8, 4.2, [r, g, b], 0.78);
      ctx.restore();
    }
  });
}

export function paintWater(
  ctx: CanvasRenderingContext2D,
  water: { x: number; y: number; w: number; h: number },
  elapsed: number,
  night: boolean,
  reduced: boolean,
) {
  const cx = water.x + water.w * 0.52;
  const cy = water.y + water.h * 0.58;
  const rx = water.w * 0.38;
  const ry = water.h * 0.22;
  const tint: [number, number, number] = night ? [186, 206, 255] : [255, 255, 255];
  if (reduced) {
    withSoft(ctx, () => softOrb(ctx, cx, cy, 4, 2.2, tint, 0.22));
    return;
  }
  withSoft(ctx, () => {
    const sheen = wrapDrift(elapsed, rx * 2, 22, 0) - rx;
    softOrb(ctx, cx + sheen, cy - 2, 22, 6, tint, night ? 0.28 : 0.4);
    for (let i = 0; i < 10; i++) {
      const t = elapsed * (0.32 + (i % 3) * 0.07) + i * 1.7;
      const px = cx + Math.cos(t) * rx * (0.25 + 0.7 * ((i * 17) % 10) / 10);
      const py = cy + Math.sin(t * 0.85 + i) * ry * (0.4 + 0.6 * ((i * 13) % 10) / 10);
      const blink = 0.5 + 0.5 * Math.sin(elapsed * 2.4 + i * 1.3);
      const a = (night ? 0.22 : 0.38) * blink;
      if (a < 0.08) continue;
      softOrb(ctx, px, py, i % 3 === 0 ? 5 : 3.2, 2.2, tint, a);
    }
  });
}

export function paintHourSky(ctx: CanvasRenderingContext2D, w: number, h: number, hour: number) {
  const sky = h * 0.42;
  ctx.save();
  if (hour >= 6 && hour < 10) {
    const g = ctx.createLinearGradient(0, 0, 0, sky);
    g.addColorStop(0, 'rgba(255,236,196,0.28)');
    g.addColorStop(0.55, 'rgba(255,236,196,0.08)');
    g.addColorStop(1, 'rgba(255,236,196,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, sky);
  } else if (hour >= 16 && hour < 18) {
    const g = ctx.createLinearGradient(0, 0, 0, sky);
    g.addColorStop(0, 'rgba(255,118,48,0.32)');
    g.addColorStop(0.5, 'rgba(255,150,70,0.12)');
    g.addColorStop(1, 'rgba(255,130,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, sky);
  }
  ctx.restore();
}

export function defaultFireflies(): Firefly[] {
  const spots: Array<[number, number]> = [
    [1188, 400], [1210, 418], [1164, 390], [1228, 408],
    [1020, 248], [1004, 228], [1038, 268],
    [382, 418], [876, 430], [640, 350],
    [700, 390], [560, 370], [800, 360], [1100, 420], [980, 340],
  ];
  return spots.map(([x, y], i) => ({ x, y, p: i * 0.73 }));
}

export function paintFireflies(ctx: CanvasRenderingContext2D, flies: Firefly[], elapsed: number) {
  withSoft(ctx, () => {
    flies.forEach((f, i) => {
      const x = f.x + Math.sin(elapsed * 0.55 + f.p) * 18;
      const y = f.y + Math.cos(elapsed * 0.42 + i) * 10;
      const blink = 0.5 + 0.5 * Math.sin(elapsed * 5.4 + i * 2.1);
      if (blink < 0.12) return;
      const a = 0.28 + 0.42 * blink;
      softOrb(ctx, x, y, blink > 0.55 ? 8 : 5.5, blink > 0.55 ? 8 : 5.5, [255, 232, 120], a);
    });
  });
}

export function paintMotes(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  night: boolean,
  reduced: boolean,
  W = 1280,
  H = 640,
) {
  paintWind(ctx, W, H, elapsed, night, reduced);
}

export function boxContains(hit: { x: number; y: number; w: number; h: number }, px: number, py: number): boolean {
  return px >= hit.x && px <= hit.x + hit.w && py >= hit.y && py <= hit.y + hit.h;
}

function alphaSheet(img: HTMLImageElement): { data: Uint8ClampedArray; w: number; h: number } | null {
  const cached = alphaCache.get(img);
  if (cached) return cached;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d', { willReadFrequently: true });
  if (!octx) return null;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(img, 0, 0);
  const sheet = { data: octx.getImageData(0, 0, w, h).data, w, h };
  alphaCache.set(img, sheet);
  return sheet;
}

export function spriteAlphaAt(
  img: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
  px: number,
  py: number,
): number {
  const sheet = alphaSheet(img);
  if (!sheet || box.w <= 0 || box.h <= 0) return 255;
  const sx = Math.floor(((px - box.x) / box.w) * sheet.w);
  const sy = Math.floor(((py - box.y) / box.h) * sheet.h);
  if (sx < 0 || sy < 0 || sx >= sheet.w || sy >= sheet.h) return 0;
  return sheet.data[(sy * sheet.w + sx) * 4 + 3];
}

/** Cerca construída usa as peças de `wall`, não o PNG do lote. Torre desenha `torre-1..3`. */
export function skipLotSprite(id: string, empty: boolean): boolean {
  return id === 'cerca' && !empty;
}

export function pickHit<T extends HoverHit>(spots: T[], px: number, py: number): T | undefined {
  for (let i = spots.length - 1; i >= 0; i--) {
    const s = spots[i];
    if (!boxContains(s, px, py)) continue;
    if (s.pixel && s.sprite) {
      if (spriteAlphaAt(s.sprite, s, px, py) < ALPHA_CUT) continue;
    }
    return s;
  }
  return undefined;
}

export function hoverAnchor(hit: HoverHit): { x: number; y: number } {
  const kind = hit.hover || (hit.w > 200 ? 'fence' : 'building');
  if (kind === 'fence') {
    return { x: hit.x + hit.w * 0.5, y: hit.y + hit.h * 0.55 };
  }
  if (kind === 'npc') {
    return { x: hit.x + hit.w / 2, y: hit.y + hit.h - 4 };
  }
  return { x: hit.x + hit.w / 2, y: hit.y + hit.h - 2 };
}

function goldOf(night: boolean): [number, number, number] {
  return night ? [255, 196, 90] : [255, 236, 176];
}

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function paintDiamondRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  color: string,
) {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const steps = Math.max(hw, hh) * 2;
  const corners: Array<[number, number]> = [[0, -hh], [hw, 0], [0, hh], [-hw, 0], [0, -hh]];
  for (let c = 0; c < 4; c++) {
    const [ax, ay] = corners[c];
    const [bx, by] = corners[c + 1];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pix(ctx, x0 + ax + (bx - ax) * t, y0 + ay + (by - ay) * t, 2, color);
    }
  }
}

function bakeHalo(img: HTMLImageElement, dw: number, dh: number, color: string): HTMLCanvasElement | null {
  const w = Math.max(2, Math.round(dw));
  const h = Math.max(2, Math.round(dh));
  const key = `${img.src}|${w}x${h}|${color}`;
  const hit = haloCache.get(key);
  if (hit) return hit;
  if (!img.naturalWidth) return null;
  const stamp = document.createElement('canvas');
  stamp.width = w;
  stamp.height = h;
  const sctx = stamp.getContext('2d');
  if (!sctx) return null;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0, w, h);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = color;
  sctx.fillRect(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w + 4;
  out.height = h + 4;
  const octx = out.getContext('2d');
  if (!octx) return null;
  octx.imageSmoothingEnabled = false;
  const dirs = [[2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0]];
  dirs.forEach(([ox, oy]) => octx.drawImage(stamp, ox, oy));
  octx.globalCompositeOperation = 'destination-out';
  octx.drawImage(img, 2, 2, w, h);
  haloCache.set(key, out);
  return out;
}

function paintSilhouette(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha: number,
) {
  const halo = bakeHalo(img, w, h, color);
  if (!halo) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.drawImage(halo, Math.round(x) - 2, Math.round(y) - 2, w + 4, h + 4);
  ctx.restore();
}

function paintFenceSparks(
  ctx: CanvasRenderingContext2D,
  hit: HoverHit,
  elapsed: number,
  gold: [number, number, number],
  reduced: boolean,
) {
  const tips: Array<[number, number]> = [
    [0.1, 0.1], [0.28, 0.1], [0.5, 0.04], [0.72, 0.1], [0.9, 0.1],
  ];
  tips.forEach(([nx, ny], i) => {
    const blink = reduced ? 0.8 : 0.45 + 0.55 * Math.sin(elapsed * 5.2 + i * 1.4);
    if (blink < 0.35) return;
    pix(ctx, hit.x + hit.w * nx, hit.y + hit.h * ny, blink > 0.85 ? 2 : 1, rgba(gold, 0.35 + 0.55 * blink));
  });
  const rail: Array<[number, number]> = [
    [0.18, 0.52], [0.34, 0.52], [0.5, 0.42], [0.66, 0.52], [0.82, 0.52],
  ];
  rail.forEach(([nx, ny]) => {
    pix(ctx, hit.x + hit.w * nx, hit.y + hit.h * ny, 2, rgba(gold, 0.5));
  });
}

export function paintHover(
  ctx: CanvasRenderingContext2D,
  hit: HoverHit,
  night: boolean,
  elapsed: number,
  reduced: boolean,
): { x: number; y: number } {
  const kind = hit.hover || (hit.w > 200 ? 'fence' : 'building');
  const gold = goldOf(night);
  const pulse = reduced ? 1 : 0.78 + 0.22 * Math.sin(elapsed * 4.1);
  const feet = hoverAnchor(hit);

  if (kind === 'fence') {
    paintGlow(ctx, feet.x, feet.y, 22, gold, 0.16 * pulse);
    if (hit.sprite) {
      paintSilhouette(ctx, hit.sprite, hit.x, hit.y, hit.w, hit.h, rgba(gold, 1), 0.55 + 0.35 * pulse);
    }
    if (!reduced) paintFenceSparks(ctx, hit, elapsed, gold, reduced);
    return hoverLabelPos(hit, { w: ctx.canvas.width, h: ctx.canvas.height });
  }

  paintGlow(ctx, feet.x, feet.y, kind === 'npc' ? 16 : 20, gold, 0.14 * pulse);
  if (hit.sprite && kind !== 'spot') {
    paintSilhouette(ctx, hit.sprite, hit.x, hit.y, hit.w, hit.h, rgba(gold, 1), 0.5 + 0.3 * pulse);
  }
  const hw = kind === 'npc' ? 10 : Math.min(16, Math.max(10, hit.w * 0.14));
  paintDiamondRing(ctx, feet.x, feet.y, hw, Math.max(5, Math.round(hw * 0.42)), rgba(gold, 0.7 * pulse));
  return hoverLabelPos(hit, { w: ctx.canvas.width, h: ctx.canvas.height });
}

export type GrowthMark = {
  kind: 'flowers' | 'lamp' | 'bench' | 'bunting' | 'stones';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
};

export const DEFAULT_GROWTH: Array<{ stage: number; minLevels: number; src?: string; marks?: GrowthMark[] }> = [
  { stage: 1, minLevels: 0, src: '/assets/village/scene/growth-1.png', marks: [] },
  {
    stage: 2,
    minLevels: 7,
    src: '/assets/village/scene/growth-2.png',
    marks: [
      { kind: 'flowers', x: 448, y: 292 },
      { kind: 'flowers', x: 502, y: 278 },
      { kind: 'flowers', x: 690, y: 292 },
      { kind: 'flowers', x: 768, y: 286 },
      { kind: 'flowers', x: 978, y: 268 },
      { kind: 'flowers', x: 1064, y: 272 },
      { kind: 'stones', x: 520, y: 352 },
      { kind: 'stones', x: 470, y: 348 },
      { kind: 'lamp', x: 976, y: 236 },
      { kind: 'lamp', x: 1068, y: 238 },
    ],
  },
  {
    stage: 3,
    minLevels: 14,
    src: '/assets/village/scene/growth-3.png',
    marks: [
      { kind: 'bunting', x: 360, y: 328, x2: 820, y2: 322 },
      { kind: 'bunting', x: 948, y: 132, x2: 1088, y2: 88 },
      { kind: 'bench', x: 1108, y: 504 },
      { kind: 'lamp', x: 1124, y: 512 },
      { kind: 'lamp', x: 392, y: 388 },
      { kind: 'flowers', x: 620, y: 498 },
      { kind: 'flowers', x: 680, y: 508 },
    ],
  },
];

export function visibleGrowthMarks(
  growth: Array<{ stage: number; minLevels: number; marks?: GrowthMark[] }> | undefined,
  sum: number,
): GrowthMark[] {
  const stage = sum >= 14 ? 3 : sum >= 7 ? 2 : 1;
  const layers = growth && growth.length ? growth : DEFAULT_GROWTH;
  const out: GrowthMark[] = [];
  for (const g of layers) {
    if (g.stage > stage || g.minLevels > sum) continue;
    const marks = g.marks ?? DEFAULT_GROWTH.find((d) => d.stage === g.stage)?.marks;
    if (marks) out.push(...marks);
  }
  return out;
}

/** Estacas e corda no lote vazio — o buraco de terra vira canteiro reservado. */
export function paintEmptyLot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  night: boolean,
  accent = '#e8b923',
) {
  const posts: Array<[number, number]> = [
    [x + w * 0.5, y + h * 0.18],
    [x + w * 0.86, y + h * 0.5],
    [x + w * 0.5, y + h * 0.84],
    [x + w * 0.14, y + h * 0.5],
  ];
  ctx.fillStyle = night ? '#c9a06a' : '#e8d4a8';
  for (let i = 0; i < posts.length; i++) {
    const [ax, ay] = posts[i];
    const [bx, by] = posts[(i + 1) % posts.length];
    const n = 7;
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (k % 2 === 0) continue;
      ctx.fillRect(Math.round(ax + (bx - ax) * t) - 1, Math.round(ay + (by - ay) * t) - 1, 4, 3);
    }
  }
  posts.forEach(([px, py], i) => {
    const ox = Math.round(px);
    const oy = Math.round(py);
    ctx.fillStyle = '#17130f';
    ctx.fillRect(ox - 3, oy - 22, 7, 24);
    ctx.fillStyle = '#8d5728';
    ctx.fillRect(ox - 2, oy - 21, 5, 21);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(ox - 2, oy - 21, 5, 4);
    ctx.fillStyle = '#f3e6c8';
    ctx.fillRect(ox - 1, oy - 20, 3, 2);
    if (i === 1) {
      ctx.fillStyle = '#17130f';
      ctx.fillRect(ox + 3, oy - 20, 16, 12);
      ctx.fillStyle = accent;
      ctx.fillRect(ox + 4, oy - 19, 14, 10);
      ctx.fillStyle = '#f6f2ec';
      ctx.fillRect(ox + 5, oy - 18, 4, 3);
    }
  });
}

export function paintSitLog(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.fillStyle = '#24160c';
  ctx.fillRect(x - 16, y - 4, 32, 8);
  ctx.fillStyle = '#6a472c';
  ctx.fillRect(x - 15, y - 5, 30, 6);
  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(x - 14, y - 5, 28, 2);
  ctx.fillStyle = '#3f2a1a';
  ctx.fillRect(x - 6, y - 3, 2, 4);
  ctx.fillRect(x + 4, y - 3, 2, 4);
}
