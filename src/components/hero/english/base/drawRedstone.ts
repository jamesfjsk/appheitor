// ========================================
// Bancada de Redstone: canvas 2D. O motor (redstone.ts) manda o estado;
// aqui só se desenha: pedra, sulco, pó que se liga, peças e brilho.
// ========================================

import {
  RS_COLS,
  RS_ROWS,
  RS_SIZE,
  cellXY,
  dustArms,
  kindAt,
  type BenchState,
  type CellKind,
  type DustArms,
  type RedstonePuzzle,
  type SimState,
} from '../../../../services/village/redstone';

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export interface BenchView {
  puzzle: RedstonePuzzle;
  state: BenchState;
  sim: SimState;
  hover: number | null;
  celebrate: boolean;
  reducedMotion: boolean;
  sparks: Spark[];
}

export interface BenchRenderer {
  resize(cssWidth: number, cssHeight?: number): void;
  draw(view: BenchView, timeMs: number): void;
  destroy(): void;
  cellSize(): number;
}

export const TILE_SRC = 32;
const SRC = TILE_SRC;
const MIN_CELL = 40;

const STONE = ['#6a6662', '#7a7570', '#5a5652', '#84807a', '#4e4a46'];
const GROUT = '#2e2a28';
const TABLE = '#1a1512';
const GROOVE = '#241c18';
const PAINT = '#6a2a24';
const DUST_OFF = '#5a1814';
const DUST_OFF_HI = '#7a2820';
const DUST_ON = '#e23d3d';
const DUST_CORE = '#ffb48a';
const WOOD = '#6b4a28';
const WOOD_HI = '#8a6236';
const WOOD_DK = '#3a2414';
const IRON = '#6a6e72';
const IRON_HI = '#8a8e92';
const IRON_DK = '#3a3e42';
const GOLD = '#e8b923';
const FLAME = '#ff8a1a';
const FLAME_HI = '#ffe566';
const OUT = '#0d0b0a';

function hash(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function pix(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function drawStone(ctx: CanvasRenderingContext2D, index: number): void {
  pix(ctx, 0, 0, SRC, SRC, GROUT);
  const h = hash(index + 17);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const v = hash(h + row * 8 + col);
      const c = STONE[v % STONE.length] as string;
      const ox = (v >>> 8) % 2;
      const oy = (v >>> 10) % 2;
      pix(ctx, col * 8 + 1 + ox, row * 8 + 1 + oy, 6, 6, c);
      pix(ctx, col * 8 + 1 + ox, row * 8 + 1 + oy, 6, 1, STONE[0] as string);
    }
  }
}

export function drawEmpty(ctx: CanvasRenderingContext2D, paintHint: boolean): void {
  pix(ctx, 0, 0, SRC, SRC, TABLE);
  pix(ctx, 3, 3, 26, 26, GROOVE);
  pix(ctx, 4, 4, 24, 1, '#120e0c');
  pix(ctx, 4, 4, 1, 24, '#120e0c');
  pix(ctx, 4, 27, 24, 1, '#3a3028');
  if (paintHint) {
    pix(ctx, 7, 7, 2, 2, PAINT);
    pix(ctx, 23, 7, 2, 2, PAINT);
    pix(ctx, 7, 23, 2, 2, PAINT);
    pix(ctx, 23, 23, 2, 2, PAINT);
  }
}

function dustColor(on: boolean, pulse: number, core: boolean): string {
  if (!on) return core ? DUST_OFF_HI : DUST_OFF;
  if (core) {
    const a = 0.55 + 0.45 * pulse;
    return a > 0.75 ? DUST_CORE : DUST_ON;
  }
  return DUST_ON;
}

export function drawDust(
  ctx: CanvasRenderingContext2D,
  on: boolean,
  arms: DustArms,
  pulse: number,
  broken: boolean,
): void {
  const t = 6;
  const mid = (SRC - t) / 2;
  const col = (core: boolean) => dustColor(on, pulse, core);
  pix(ctx, mid, mid, t, t, col(true));
  const any = arms.n || arms.e || arms.s || arms.w;
  if (!any) {
    pix(ctx, mid - 2, mid + 1, t + 4, t - 2, col(false));
    pix(ctx, mid + 1, mid - 2, t - 2, t + 4, col(false));
  } else {
    if (arms.n) pix(ctx, mid, 0, t, mid + t, col(false));
    if (arms.s) pix(ctx, mid, mid, t, SRC - mid, col(false));
    if (arms.w) pix(ctx, 0, mid, mid + t, t, col(false));
    if (arms.e) pix(ctx, mid, mid, SRC - mid, t, col(false));
    pix(ctx, mid, mid, t, t, col(true));
  }
  if (on) {
    pix(ctx, mid + 2, mid + 2, 2, 2, DUST_CORE);
  }
  if (broken) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(24, 24);
    ctx.moveTo(24, 10);
    ctx.lineTo(10, 24);
    ctx.stroke();
    pix(ctx, 14, 14, 4, 4, '#2a0c08');
  }
}

export function drawLever(ctx: CanvasRenderingContext2D, on: boolean): void {
  pix(ctx, 8, 18, 16, 10, IRON_DK);
  pix(ctx, 9, 19, 14, 8, IRON);
  pix(ctx, 10, 20, 12, 2, IRON_HI);
  if (on) {
    pix(ctx, 14, 6, 4, 16, WOOD);
    pix(ctx, 15, 6, 2, 14, WOOD_HI);
    pix(ctx, 13, 4, 6, 5, GOLD);
    pix(ctx, 14, 5, 4, 3, '#fff3a0');
  } else {
    pix(ctx, 8, 16, 14, 4, WOOD);
    pix(ctx, 8, 17, 12, 2, WOOD_HI);
    pix(ctx, 6, 15, 5, 5, DUST_OFF);
    pix(ctx, 7, 16, 3, 3, DUST_OFF_HI);
  }
}

export function drawTorch(ctx: CanvasRenderingContext2D, on: boolean, pulse: number): void {
  pix(ctx, 14, 12, 4, 16, WOOD_DK);
  pix(ctx, 15, 12, 2, 14, WOOD);
  if (on) {
    const h = 10 + Math.round(2 * pulse);
    pix(ctx, 12, 12 - h + 6, 8, h, FLAME);
    pix(ctx, 14, 12 - h + 4, 4, h - 2, FLAME_HI);
    pix(ctx, 15, 12 - h + 2, 2, 4, '#fff6c8');
  } else {
    pix(ctx, 13, 8, 6, 6, '#3a2a12');
    pix(ctx, 14, 9, 4, 4, '#5a3a18');
  }
}

export function drawLamp(ctx: CanvasRenderingContext2D, on: boolean, pulse: number): void {
  pix(ctx, 8, 8, 16, 16, OUT);
  pix(ctx, 10, 10, 12, 12, on ? FLAME_HI : '#2a2818');
  if (on) {
    pix(ctx, 12, 12, 8, 8, pulse > 0.4 ? '#fff6c8' : FLAME_HI);
    pix(ctx, 14, 14, 4, 4, '#ffffff');
  } else {
    pix(ctx, 12, 12, 8, 8, '#3a3820');
  }
  pix(ctx, 7, 7, 18, 3, IRON);
  pix(ctx, 7, 22, 18, 3, IRON_DK);
  pix(ctx, 14, 4, 4, 4, IRON_HI);
}

export function drawPiston(ctx: CanvasRenderingContext2D, on: boolean): void {
  pix(ctx, 4, 8, on ? 16 : 20, 16, IRON_DK);
  pix(ctx, 5, 9, on ? 14 : 18, 14, IRON);
  pix(ctx, 6, 10, 10, 3, IRON_HI);
  const fx = on ? 18 : 16;
  pix(ctx, fx, 6, 10, 20, WOOD_DK);
  pix(ctx, fx + 1, 7, 8, 18, WOOD);
  pix(ctx, fx + 2, 8, 6, 2, WOOD_HI);
}

export function cellPowered(
  state: BenchState,
  sim: SimState,
  i: number,
  visual: CellKind,
): boolean {
  if (visual === 'dust' || visual === 'broken') return Boolean(sim.condPower[i]);
  if (visual === 'lever') return Boolean(state.leverOn[i]);
  if (visual === 'torch') return Boolean(sim.torchOn[i]);
  if (visual === 'lamp') return Boolean(sim.lampOn[i]);
  if (visual === 'piston') return Boolean(sim.pistonOn[i]);
  return false;
}

export function visualOf(puzzle: RedstonePuzzle, state: BenchState, i: number): CellKind {
  return kindAt(puzzle, state, i);
}

export function createBenchRenderer(canvas: HTMLCanvasElement): BenchRenderer {
  const main = canvas.getContext('2d');
  if (!main) {
    return {
      resize: () => undefined,
      draw: () => undefined,
      destroy: () => undefined,
      cellSize: () => MIN_CELL,
    };
  }
  const off = document.createElement('canvas');
  off.width = SRC;
  off.height = SRC;
  const octx = off.getContext('2d');
  let cell = MIN_CELL;
  let dpr = 1;

  const resize = (cssWidth: number, cssHeight?: number): void => {
    const w = Math.max(160, cssWidth);
    const h = Math.max(100, cssHeight ?? w * (RS_ROWS / RS_COLS));
    cell = w / RS_COLS;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
  };

  const draw = (view: BenchView, timeMs: number): void => {
    if (!octx) return;
    const { puzzle, state, sim, hover, celebrate, reducedMotion, sparks } = view;
    const pulse = reducedMotion ? 0.6 : 0.5 + 0.5 * Math.sin(timeMs / 180);
    main.setTransform(dpr, 0, 0, dpr, 0, 0);
    main.imageSmoothingEnabled = false;
    main.fillStyle = '#120e0c';
    main.fillRect(0, 0, cell * RS_COLS, cell * RS_ROWS);

    for (let i = 0; i < RS_SIZE; i++) {
      const { c, r } = cellXY(i);
      const kind = puzzle.cells[i];
      const visual = visualOf(puzzle, state, i);
      const on = cellPowered(state, sim, i, visual);
      octx.imageSmoothingEnabled = false;
      octx.clearRect(0, 0, SRC, SRC);

      if (kind === 'empty') drawEmpty(octx, false);
      else drawStone(octx, i);

      if (visual === 'dust' || visual === 'broken') {
        const arms = dustArms(puzzle, state, i);
        drawDust(octx, visual === 'dust' && on, arms, pulse, visual === 'broken' && !state.repaired[i]);
      } else if (visual === 'lever') {
        drawLever(octx, on);
      } else if (visual === 'torch') {
        drawTorch(octx, on, pulse);
      } else if (visual === 'lamp') {
        drawLamp(octx, on, pulse);
      } else if (visual === 'piston') {
        drawPiston(octx, on);
      }

      const dx = c * cell;
      const dy = r * cell;
      if (on && (visual === 'dust' || visual === 'lamp' || visual === 'torch' || visual === 'lever')) {
        main.save();
        main.globalCompositeOperation = 'lighter';
        const cx = dx + cell / 2;
        const cy = dy + cell / 2;
        const rad = cell * (visual === 'lamp' ? 0.9 : 0.55);
        const g = main.createRadialGradient(cx, cy, 2, cx, cy, rad);
        const hue = visual === 'dust' ? '226,61,61' : '255,229,102';
        g.addColorStop(0, `rgba(${hue},${0.28 + 0.18 * pulse})`);
        g.addColorStop(1, `rgba(${hue},0)`);
        main.fillStyle = g;
        main.beginPath();
        main.arc(cx, cy, rad, 0, Math.PI * 2);
        main.fill();
        main.restore();
      }
      main.drawImage(off, 0, 0, SRC, SRC, dx, dy, cell, cell);
    }

    if (hover !== null && hover >= 0 && hover < RS_SIZE) {
      const { c, r } = cellXY(hover);
      main.strokeStyle = GOLD;
      main.lineWidth = 2;
      main.strokeRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
    }

    for (const s of sparks) {
      const a = Math.max(0, s.life / s.max);
      main.fillStyle = `rgba(255, 180, 80, ${a})`;
      main.fillRect(s.x, s.y, 3, 3);
    }

    if (celebrate) {
      main.fillStyle = `rgba(255, 229, 102, ${0.08 + 0.08 * pulse})`;
      main.fillRect(0, 0, cell * RS_COLS, cell * RS_ROWS);
    }
  };

  return {
    resize,
    draw,
    destroy: () => undefined,
    cellSize: () => cell,
  };
}

export function tickSparks(sparks: Spark[], dt: number, cssW: number, cssH: number): Spark[] {
  const next: Spark[] = [];
  for (const s of sparks) {
    const life = s.life - dt;
    if (life <= 0) continue;
    const x = s.x + s.vx * dt;
    const y = s.y + s.vy * dt;
    if (x < 0 || y < 0 || x > cssW || y > cssH) continue;
    next.push({ ...s, x, y, life, vy: s.vy + 0.00004 * dt });
  }
  return next;
}

export function spawnSparks(cellIndex: number, cell: number, count: number): Spark[] {
  const { c, r } = cellXY(cellIndex);
  const cx = c * cell + cell / 2;
  const cy = r * cell + cell / 2;
  const out: Spark[] = [];
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    out.push({
      x: cx,
      y: cy,
      vx: Math.cos(ang) * 0.04,
      vy: Math.sin(ang) * 0.04 - 0.02,
      life: 420,
      max: 420,
    });
  }
  return out;
}

export function legendKinds(puzzle: RedstonePuzzle): CellKind[] {
  const seen = new Set<CellKind>();
  const order: CellKind[] = ['lever', 'dust', 'empty', 'broken', 'torch', 'lamp', 'piston', 'stone'];
  for (const k of puzzle.cells) seen.add(k);
  return order.filter((k) => seen.has(k));
}
