// ========================================
// Phaser: a bancada como cena de jogo (WebGL, partículas, tween).
// As regras continuam em redstone.ts; isto só é o mundo.
// ========================================

import Phaser from 'phaser';
import {
  RS_COLS,
  RS_ROWS,
  RS_SIZE,
  TOOLS,
  cellXY,
  dustArms,
  kitLeft,
  kitOf,
  neighbors,
  type BenchState,
  type RedstonePuzzle,
  type SimState,
  type Tool,
} from '../../services/village/redstone';
import {
  TILE_SRC,
  cellPowered,
  drawDust,
  drawEmpty,
  drawLamp,
  drawLever,
  drawPiston,
  drawStone,
  drawTorch,
  visualOf,
} from '../../components/hero/english/base/drawRedstone';

export const GAME_W = 1280;
export const GAME_H = 720;
const CELL_MAX = 104;
const SLOT = 92;
const SLOT_GAP = 18;
const TRAY_H = 168;
const TRAY_LABEL: Record<Tool, string> = {
  hand: 'MÃO',
  dust: 'PÓ',
  lever: 'ALAV.',
  torch: 'TOCHA',
};

export type PlayView = {
  puzzle: RedstonePuzzle;
  state: BenchState;
  sim: SimState;
  inputOn: boolean;
  celebrate: boolean;
  reducedMotion: boolean;
  tool: Tool;
};

function bake(draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const src = document.createElement('canvas');
  src.width = TILE_SRC;
  src.height = TILE_SRC;
  const sctx = src.getContext('2d');
  if (!sctx) return src;
  sctx.imageSmoothingEnabled = false;
  draw(sctx);
  const out = document.createElement('canvas');
  out.width = TILE_SRC * 2;
  out.height = TILE_SRC * 2;
  const octx = out.getContext('2d');
  if (!octx) return src;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

export class BenchScene extends Phaser.Scene {
  private onTile: (i: number) => void = () => undefined;
  private onTool: (tool: Tool) => void = () => undefined;
  private view: PlayView | null = null;
  private bases: Phaser.GameObjects.Image[] = [];
  private dust: Phaser.GameObjects.Image[] = [];
  private devices: Phaser.GameObjects.Image[] = [];
  private glows: Phaser.GameObjects.Image[] = [];
  private lampMarks: Phaser.GameObjects.Rectangle[] = [];
  private hover: Phaser.GameObjects.Rectangle | null = null;
  private embers: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private burst: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private lastPower: boolean[] = [];
  private lastOn: boolean[] = [];
  private lastHash = '';
  private flowDist: number[] = [];
  private flowT = 0;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private pulse = 0.6;
  private didWin = false;
  private ready = false;
  private ox = 0;
  private oy = 0;
  private cell = CELL_MAX;
  private trayY = 0;
  private cave: Phaser.GameObjects.Graphics | null = null;
  private table: Phaser.GameObjects.Graphics | null = null;
  private traySlots: Phaser.GameObjects.Rectangle[] = [];
  private trayIcons: Phaser.GameObjects.Image[] = [];
  private trayCounts: Phaser.GameObjects.Text[] = [];
  private trayLabs: Phaser.GameObjects.Text[] = [];
  private trayFrame: Phaser.GameObjects.Rectangle | null = null;
  private trayTitle: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'bench' });
  }

  setOnTile(fn: (i: number) => void): void {
    this.onTile = fn;
  }

  setOnTool(fn: (tool: Tool) => void): void {
    this.onTool = fn;
  }

  sync(view: PlayView): void {
    if (this.lastHash !== view.puzzle.layoutHash) {
      this.lastHash = view.puzzle.layoutHash;
      this.lastPower = [];
      this.lastOn = [];
      this.flowDist = [];
    }
    this.view = view;
    if (!this.ready) return;
    this.paintBoard();
    if (view.celebrate && !this.didWin) {
      this.didWin = true;
      this.winJuice();
    }
    if (!view.celebrate) this.didWin = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a100c');
    this.bakeTextures();
    this.layout();
    this.drawCave();
    this.drawTable();
    this.buildBoard();
    this.buildTray();
    this.hover = this.add.rectangle(0, 0, this.cell - 4, this.cell - 4).setStrokeStyle(2, 0xffd83d, 0.9).setVisible(false);
    this.hover.setDepth(8);

    this.embers = this.add.particles(this.scale.width / 2, this.scale.height + 8, 'spark', {
      speed: { min: 18, max: 70 },
      angle: { min: 250, max: 290 },
      lifespan: 2800,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.7, end: 0 },
      quantity: 1,
      frequency: 70,
      blendMode: Phaser.BlendModes.ADD,
      emitting: true,
      gravityY: -12,
    });
    this.embers.setDepth(12);

    this.burst = this.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 140 },
      lifespan: 500,
      scale: { start: 1.2, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.burst.setDepth(13);

    this.smoke = this.add.particles(0, 0, 'spark', {
      speed: { min: 8, max: 28 },
      angle: { min: 250, max: 290 },
      lifespan: 700,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.55, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      gravityY: -40,
    });
    this.smoke.setDepth(13);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      this.layout();
      this.applyLayout();
    });
    this.ready = true;
    if (this.view) this.paintBoard();
  }

  update(time: number): void {
    if (!this.ready) return;
    const reduced = this.view?.reducedMotion;
    this.pulse = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(time / 180);
    this.flowT = time / 140;
    this.pulseGlows();
  }

  private trayNeeded(): boolean {
    if (!this.view) return false;
    const k = kitOf(this.view.puzzle);
    return k.dust + k.lever + k.torch > 0;
  }

  private layout(): void {
    const w = Math.max(320, this.scale.width);
    const h = Math.max(280, this.scale.height);
    const side = 48;
    const topPad = 12;
    const trayH = this.trayNeeded() ? TRAY_H : 36;
    const maxBoardW = w - side * 2;
    const maxBoardH = h - trayH - topPad;
    this.cell = Math.max(36, Math.min(CELL_MAX, Math.floor(maxBoardW / RS_COLS), Math.floor(maxBoardH / RS_ROWS)));
    const boardW = RS_COLS * this.cell;
    const boardH = RS_ROWS * this.cell;
    this.ox = Math.floor((w - boardW) / 2);
    this.oy = topPad + 8;
    this.trayY = this.oy + boardH + 24;
  }

  private applyLayout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setSize(w, h);
    this.cameras.main.setScroll(0, 0);
    this.drawCave();
    this.drawTable();
    const cell = this.cell;
    for (let i = 0; i < RS_SIZE; i++) {
      const { c, r } = cellXY(i);
      const x = this.ox + c * cell + cell / 2;
      const y = this.oy + r * cell + cell / 2;
      this.bases[i]?.setPosition(x, y).setDisplaySize(cell, cell).setData('oy', y);
      this.dust[i]?.setPosition(x, y).setDisplaySize(cell, cell);
      this.devices[i]?.setPosition(x, y).setDisplaySize(cell, cell).setData('oy', y);
      this.glows[i]?.setPosition(x, y).setDisplaySize(cell * 1.8, cell * 1.8);
      this.lampMarks[i]?.setPosition(x, y).setSize(cell - 8, cell - 8);
    }
    this.hover?.setSize(cell - 4, cell - 4);
    this.placeTray();
    this.embers?.setPosition(this.scale.width / 2, this.scale.height + 8);
    if (this.view) this.paintBoard();
  }

  private bakeTextures(): void {
    const add = (key: string, canvas: HTMLCanvasElement) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, canvas);
    };
    for (let i = 0; i < RS_SIZE; i++) add(`rs-stone-${i}`, bake((ctx) => drawStone(ctx, i)));
    add('rs-empty', bake((ctx) => drawEmpty(ctx, false)));
    add('rs-empty-hint', bake((ctx) => drawEmpty(ctx, true)));
    add('rs-lever-off', bake((ctx) => drawLever(ctx, false)));
    add('rs-lever-on', bake((ctx) => drawLever(ctx, true)));
    add('rs-torch-off', bake((ctx) => drawTorch(ctx, false, 0)));
    add('rs-torch-on', bake((ctx) => drawTorch(ctx, true, 1)));
    add('rs-lamp-off', bake((ctx) => drawLamp(ctx, false, 0)));
    add('rs-lamp-on', bake((ctx) => drawLamp(ctx, true, 1)));
    add('rs-piston-off', bake((ctx) => drawPiston(ctx, false)));
    add('rs-piston-on', bake((ctx) => drawPiston(ctx, true)));
    add('rs-dust-icon', bake((ctx) => drawDust(ctx, true, { n: true, e: true, s: true, w: true }, 1, false)));
    add('rs-hand', bake((ctx) => {
      ctx.fillStyle = '#e8b38a';
      ctx.fillRect(10, 14, 12, 14);
      ctx.fillRect(8, 10, 4, 10);
      ctx.fillRect(12, 6, 4, 12);
      ctx.fillRect(16, 8, 4, 10);
      ctx.fillRect(20, 12, 4, 8);
      ctx.fillStyle = '#6b4a28';
      ctx.fillRect(10, 24, 12, 6);
    }));

    const glow = document.createElement('canvas');
    glow.width = 64;
    glow.height = 64;
    const gctx = glow.getContext('2d');
    if (gctx) {
      const g = gctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
      g.addColorStop(0.4, 'rgba(226, 61, 61, 0.45)');
      g.addColorStop(1, 'rgba(226, 61, 61, 0)');
      gctx.fillStyle = g;
      gctx.fillRect(0, 0, 64, 64);
    }
    add('rs-glow', glow);

    const spark = document.createElement('canvas');
    spark.width = 8;
    spark.height = 8;
    const sctx = spark.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#ffe566';
      sctx.fillRect(2, 2, 4, 4);
      sctx.fillStyle = '#fff6c8';
      sctx.fillRect(3, 3, 2, 2);
    }
    add('spark', spark);
  }

  private drawCave(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    if (!this.cave) this.cave = this.add.graphics().setDepth(0);
    const g = this.cave;
    g.clear();
    g.fillGradientStyle(0x2a1a12, 0x2a1a12, 0x100c0a, 0x100c0a, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(w / 2, Math.min(90, h * 0.12), Math.min(1100, w * 0.86), 240);
  }

  private drawTable(): void {
    if (!this.table) this.table = this.add.graphics().setDepth(2);
    const g = this.table;
    g.clear();
    const pad = 28;
    const boardW = RS_COLS * this.cell;
    const boardH = RS_ROWS * this.cell;
    g.fillStyle(0x0d0b0a, 1);
    g.fillRoundedRect(this.ox - pad - 6, this.oy - pad - 6, boardW + pad * 2 + 12, boardH + pad * 2 + 18, 12);
    g.fillStyle(0x5a3a22, 1);
    g.fillRoundedRect(this.ox - pad, this.oy - pad, boardW + pad * 2, boardH + pad * 2, 10);
    g.fillStyle(0x3a2414, 1);
    g.fillRoundedRect(this.ox - 10, this.oy - 10, boardW + 20, boardH + 20, 6);
    g.lineStyle(4, 0x0d0b0a, 1);
    g.strokeRoundedRect(this.ox - pad, this.oy - pad, boardW + pad * 2, boardH + pad * 2, 10);
  }

  private buildBoard(): void {
    for (let i = 0; i < RS_SIZE; i++) {
      const { c, r } = cellXY(i);
      const x = this.ox + c * this.cell + this.cell / 2;
      const y = this.oy + r * this.cell + this.cell / 2;
      const base = this.add.image(x, y, `rs-stone-${i}`).setDisplaySize(this.cell, this.cell).setDepth(3);
      base.setData('oy', y);
      const glow = this.add.image(x, y, 'rs-glow').setDisplaySize(this.cell * 1.8, this.cell * 1.8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(4);
      const dust = this.add.image(x, y, 'rs-empty').setDisplaySize(this.cell, this.cell).setDepth(5).setVisible(false);
      const device = this.add.image(x, y, 'rs-lever-off').setDisplaySize(this.cell, this.cell).setDepth(6).setVisible(false);
      device.setData('oy', y);
      const mark = this.add.rectangle(x, y, this.cell - 8, this.cell - 8).setVisible(false).setDepth(7);
      this.bases.push(base);
      this.glows.push(glow);
      this.dust.push(dust);
      this.devices.push(device);
      this.lampMarks.push(mark);
    }
  }

  private paintBoard(): void {
    const view = this.view;
    if (!view) return;
    const { puzzle, state, sim, tool, inputOn } = view;
    const holding = inputOn && tool !== 'hand';
    for (let i = 0; i < RS_SIZE; i++) {
      const kind = puzzle.cells[i];
      const visual = visualOf(puzzle, state, i);
      const on = cellPowered(state, sim, i, visual);
      const base = this.bases[i];
      const device = this.devices[i];
      const mark = this.lampMarks[i];
      if (!base || !device) continue;
      if (kind === 'empty') {
        const placeHere = holding && (state.placed[i] ?? 'none') === 'none';
        base.setTexture(placeHere ? 'rs-empty-hint' : 'rs-empty');
      } else {
        base.setTexture(`rs-stone-${i}`);
      }
      if (visual === 'dust' || visual === 'broken') {
        device.setVisible(false);
      } else if (visual === 'lever') {
        device.setVisible(true).setTexture(on ? 'rs-lever-on' : 'rs-lever-off');
      } else if (visual === 'torch') {
        device.setVisible(true).setTexture(on ? 'rs-torch-on' : 'rs-torch-off');
      } else if (visual === 'lamp') {
        device.setVisible(true).setTexture(on ? 'rs-lamp-on' : 'rs-lamp-off');
      } else if (visual === 'piston') {
        device.setVisible(true).setTexture(on ? 'rs-piston-on' : 'rs-piston-off');
      } else {
        device.setVisible(false);
      }
      const homeY = Number(device.getData('oy'));
      if (visual === 'piston') device.setY(homeY + (on ? Math.round(this.cell * 0.08) : 0));
      else if (Number.isFinite(homeY)) device.setY(homeY);
      mark?.setVisible(false);
    }
    this.bakeFlow();
    this.detectPower();
    this.paintDust();
    this.paintTray();
    this.pulseGlows();
    if (view.reducedMotion) this.embers?.stop();
    else this.embers?.start();
  }

  private paintDust(): void {
    const view = this.view;
    if (!view) return;
    const { puzzle, state, sim } = view;
    for (let i = 0; i < RS_SIZE; i++) {
      const img = this.dust[i];
      if (!img) continue;
      const visual = visualOf(puzzle, state, i);
      if (visual !== 'dust' && visual !== 'broken') {
        img.setVisible(false);
        continue;
      }
      const on = visual === 'dust' && cellPowered(state, sim, i, visual);
      const arms = dustArms(puzzle, state, i);
      const key = `rs-dust-${i}-${on ? 1 : 0}-${arms.n ? 1 : 0}${arms.e ? 1 : 0}${arms.s ? 1 : 0}${arms.w ? 1 : 0}-${visual}`;
      if (!this.textures.exists(key)) {
        const baked = bake((dctx) => {
          dctx.clearRect(0, 0, TILE_SRC, TILE_SRC);
          drawDust(dctx, on, arms, on ? 1 : 0, visual === 'broken' && !state.repaired[i]);
        });
        this.textures.addCanvas(key, baked);
      }
      img.setVisible(true).setTexture(key).setDisplaySize(this.cell, this.cell);
    }
  }

  private pulseGlows(): void {
    const view = this.view;
    if (!view) return;
    for (let i = 0; i < RS_SIZE; i++) {
      const visual = visualOf(view.puzzle, view.state, i);
      const on = cellPowered(view.state, view.sim, i, visual);
      const glow = this.glows[i];
      if (!glow) continue;
      const hot = on && (visual === 'dust' || visual === 'lamp' || visual === 'torch' || visual === 'lever' || visual === 'piston');
      const bloom = visual === 'lamp' && on ? 0.55 + 0.4 * this.pulse : hot ? 0.28 + 0.28 * this.pulse : 0;
      const d = this.flowDist[i] ?? 99;
      const wave = !view.reducedMotion && visual === 'dust' && on && d < 90
        ? Math.max(0, Math.sin(this.flowT - d * 0.85))
        : 0;
      glow.setAlpha(Math.min(1, bloom + wave * 0.5));
      if (visual === 'lamp' && on) glow.setTint(0xffe566);
      else if (visual === 'torch' && on) glow.setTint(0xff8a1a);
      else if (on) glow.setTint(0xe23d3d);
    }
  }

  private bakeFlow(): void {
    const view = this.view;
    if (!view) return;
    const dist = Array.from({ length: RS_SIZE }, () => 99);
    const q: number[] = [];
    const push = (i: number, d: number): void => {
      if (d >= dist[i]) return;
      dist[i] = d;
      q.push(i);
    };
    for (let i = 0; i < RS_SIZE; i++) {
      const visual = visualOf(view.puzzle, view.state, i);
      if (visual === 'lever' && view.state.leverOn[i]) push(i, 0);
      if (visual === 'torch' && view.sim.torchOn[i]) push(i, 0);
    }
    for (let n = 0; n < q.length; n++) {
      const i = q[n] as number;
      for (const j of neighbors(i)) {
        const k = visualOf(view.puzzle, view.state, j);
        if (k === 'dust' || k === 'broken') push(j, dist[i] + 1);
      }
    }
    this.flowDist = dist;
  }

  private detectPower(): void {
    const view = this.view;
    if (!view) return;
    const now = view.sim.condPower;
    const reduced = view.reducedMotion;
    if (this.lastPower.length === now.length) {
      for (let i = 0; i < now.length; i++) {
        if (now[i] && !this.lastPower[i] && !reduced) {
          const delay = Math.min(320, (this.flowDist[i] ?? 0) * 55);
          const idx = i;
          this.time.delayedCall(delay, () => {
            if (!this.view) return;
            const { c, r } = cellXY(idx);
            this.burst?.explode(10, this.ox + c * this.cell + this.cell / 2, this.oy + r * this.cell + this.cell / 2);
          });
        }
      }
    }
    this.lastPower = now.slice();
    const onNow = Array.from({ length: RS_SIZE }, (_, i) => {
      const visual = visualOf(view.puzzle, view.state, i);
      return cellPowered(view.state, view.sim, i, visual);
    });
    if (this.lastOn.length === onNow.length && !reduced) {
      for (let i = 0; i < RS_SIZE; i++) {
        if (!onNow[i] || this.lastOn[i]) continue;
        const visual = visualOf(view.puzzle, view.state, i);
        const { c, r } = cellXY(i);
        const x = this.ox + c * this.cell + this.cell / 2;
        const y = this.oy + r * this.cell + this.cell / 2;
        const device = this.devices[i];
        if (visual === 'torch') this.smoke?.explode(10, x, y - 8);
        if (visual === 'lamp') {
          this.burst?.explode(18, x, y);
          const glow = this.glows[i];
          if (glow) {
            this.tweens.add({ targets: glow, alpha: 0.95, duration: 140, yoyo: true });
          }
        }
        if (visual === 'lever' && device) {
          this.tweens.add({
            targets: device,
            scaleY: 0.82,
            duration: 80,
            yoyo: true,
          });
        }
      }
    }
    this.lastOn = onNow;
  }

  failJuice(): void {
    if (this.view?.reducedMotion) return;
    this.cameras.main.shake(160, 0.008);
  }

  private winJuice(): void {
    const view = this.view;
    if (!view || view.reducedMotion) return;
    for (let i = 0; i < RS_SIZE; i++) {
      const visual = visualOf(view.puzzle, view.state, i);
      if (visual !== 'lamp' && visual !== 'piston') continue;
      if (!cellPowered(view.state, view.sim, i, visual) && visual === 'lamp') continue;
      if (visual === 'piston' && !view.sim.pistonOn[i]) continue;
      const { c, r } = cellXY(i);
      this.burst?.explode(22, this.ox + c * this.cell + this.cell / 2, this.oy + r * this.cell + this.cell / 2);
    }
  }

  private trayOriginX(): number {
    const n = TOOLS.length;
    const w = n * SLOT + (n - 1) * SLOT_GAP;
    return Math.floor((this.scale.width - w) / 2);
  }

  private buildTray(): void {
    const wood = this.add.rectangle(0, 0, TOOLS.length * (SLOT + SLOT_GAP) + 28, SLOT + 52, 0x5a3a22).setStrokeStyle(4, 0x0d0b0a).setDepth(14);
    this.trayFrame = wood;
    this.trayTitle = this.add.text(0, 0, 'BANDEJA', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#c8b89a',
    }).setOrigin(0.5).setDepth(15);
    for (let i = 0; i < TOOLS.length; i++) {
      const slot = this.add.rectangle(0, 0, SLOT, SLOT, 0x241c18).setStrokeStyle(3, 0x0d0b0a).setDepth(15);
      const icon = this.add.image(0, 0, trayIcon(TOOLS[i] as Tool)).setDisplaySize(48, 48).setDepth(16);
      const count = this.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffe566',
      }).setOrigin(0.5).setDepth(16);
      const lab = this.add.text(0, 0, TRAY_LABEL[TOOLS[i] as Tool], {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f6f2ec',
      }).setOrigin(0.5).setDepth(16);
      this.traySlots.push(slot);
      this.trayIcons.push(icon);
      this.trayCounts.push(count);
      this.trayLabs.push(lab);
    }
    this.placeTray();
  }

  private placeTray(): void {
    const ox = this.trayOriginX();
    const y = this.trayY + SLOT / 2;
    this.trayFrame?.setPosition(this.scale.width / 2, y + 8);
    this.trayTitle?.setPosition(this.scale.width / 2, this.trayY - 16);
    for (let i = 0; i < TOOLS.length; i++) {
      const x = ox + i * (SLOT + SLOT_GAP) + SLOT / 2;
      this.traySlots[i]?.setPosition(x, y);
      this.trayIcons[i]?.setPosition(x, y - 8);
      this.trayCounts[i]?.setPosition(x, y + 26);
      this.trayLabs[i]?.setPosition(x, y + 46);
    }
  }

  private paintTray(): void {
    const view = this.view;
    const show = this.trayNeeded();
    this.trayFrame?.setVisible(show);
    this.trayTitle?.setVisible(show);
    const left = view ? kitLeft(view.puzzle, view.state) : { dust: 0, lever: 0, torch: 0 };
    for (let i = 0; i < TOOLS.length; i++) {
      const tool = TOOLS[i] as Tool;
      const on = Boolean(view?.inputOn && view.tool === tool);
      this.traySlots[i]?.setVisible(show).setStrokeStyle(3, on ? 0xffd83d : 0x0d0b0a);
      this.trayIcons[i]?.setVisible(show);
      this.trayLabs[i]?.setVisible(show);
      const n = tool === 'hand' ? '' : String(left[tool]);
      this.trayCounts[i]?.setVisible(show).setText(n);
      const empty = tool !== 'hand' && left[tool] <= 0;
      const dim = !view?.inputOn || empty;
      this.trayIcons[i]?.setAlpha(dim ? 0.35 : 1);
      this.traySlots[i]?.setAlpha(view?.inputOn ? 1 : 0.55);
      this.trayLabs[i]?.setAlpha(view?.inputOn ? 1 : 0.55);
    }
  }

  private toolAt(worldX: number, worldY: number): Tool | null {
    if (this.view?.puzzle.mode === 'order') return null;
    if (worldY < this.trayY - 8 || worldY > this.trayY + SLOT + 28) return null;
    const ox = this.trayOriginX();
    for (let i = 0; i < TOOLS.length; i++) {
      const x = ox + i * (SLOT + SLOT_GAP);
      if (worldX >= x && worldX <= x + SLOT) return TOOLS[i] as Tool;
    }
    return null;
  }

  private cellAt(worldX: number, worldY: number): number | null {
    const x = worldX - this.ox;
    const y = worldY - this.oy;
    const boardW = RS_COLS * this.cell;
    const boardH = RS_ROWS * this.cell;
    if (x < 0 || y < 0 || x >= boardW || y >= boardH) return null;
    const c = Math.floor(x / this.cell);
    const r = Math.floor(y / this.cell);
    return r * RS_COLS + c;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.hover) return;
    if (this.toolAt(p.worldX, p.worldY)) {
      this.hover.setVisible(false);
      return;
    }
    const i = this.cellAt(p.worldX, p.worldY);
    if (i === null || !this.view?.inputOn) {
      this.hover.setVisible(false);
      return;
    }
    const { c, r } = cellXY(i);
    this.hover.setPosition(this.ox + c * this.cell + this.cell / 2, this.oy + r * this.cell + this.cell / 2).setVisible(true);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.view?.inputOn) return;
    const tool = this.toolAt(p.worldX, p.worldY);
    if (tool) {
      this.onTool(tool);
      return;
    }
    const i = this.cellAt(p.worldX, p.worldY);
    if (i === null) return;
    const img = this.bases[i];
    if (img) {
      const oy = Number(img.getData('oy')) || img.y;
      this.tweens.add({
        targets: img,
        y: oy + 5,
        duration: 70,
        yoyo: true,
        onComplete: () => img.setY(oy),
      });
    }
    this.onTile(i);
  }
}

function trayIcon(tool: Tool): string {
  if (tool === 'dust') return 'rs-dust-icon';
  if (tool === 'lever') return 'rs-lever-off';
  if (tool === 'torch') return 'rs-torch-on';
  return 'rs-hand';
}
