// ========================================
// Mine Rush: renderização em canvas 2D (sem React, sem estado de jogo)
// Quem chama draw() é a tela (MineRush.tsx) dentro do seu requestAnimationFrame.
// draw() nunca altera o MineState; só guarda acumuladores visuais próprios (rolagem, troca de estrato).
//
// Convenções combinadas com o motor:
// - Particle.x: fração da largura (0..1), sendo (lane + 0.5) / 3 o centro de cada pista em z = 0;
//   Particle.y: altura acima da linha de impacto em frações da altura (positivo = para cima); size em px CSS.
// - BlockRow.z: 1 = fundo do túnel, 0 = linha de impacto (frente do carrinho). Valores < 0 continuam
//   sendo desenhados um pouco abaixo da linha até sumirem.
// - BlockRow.phase 'announce': a fileira está parada em z = 1 esperando o áudio do pedido. Aqui ela
//   balança de leve, recebe pouca névoa e ganha um ícone "ouvindo" por cima; em 'moving' o ícone some.
// ========================================

import { BlockFace, BlockRow, Lane, MineState, PICKAXES, RenderAssets, RenderOptions, Stratum } from './types';

export interface MineRenderer {
  resize(opts: RenderOptions): void;
  draw(state: MineState, assets: RenderAssets, timeMs: number): void;
  destroy(): void;
}

// ---------- geometria (frações do canvas) ----------
const VP_X = 0.5;             // ponto de fuga
const VP_Y = 0.14;
const IMPACT_Y = 0.8;         // linha de impacto (z = 0)
const DEPTH = 1.2;            // quanto maior, menor o bloco no fundo (escala = 1 / (1 + DEPTH * z)); 1.2 deixa a fileira parada (z = 1) com ~45% do tamanho, legível
const LANE_X0: readonly number[] = [0.2, 0.5, 0.8];   // centro das pistas em z = 0
const TRACK_HALF = 0.42;      // meia largura do leito do trilho em z = 0
const RAIL_HALF = 0.075;      // meia distância entre os dois trilhos de uma pista em z = 0
const BLOCK_FRAC = 0.26;      // lado do bloco em z = 0 (fração da largura, limitado pela altura)
const SLEEPERS = 14;
const MAX_PARTICLES = 40;
const MAX_PARTICLES_REDUCED = 12;
const STRATUM_FADE_MS = 900;

const TILE = 16;
const TILE_SCALE = 4;         // cada pixel da textura vira 4 px CSS

// fileira parada ('announce')
const ANNOUNCE_BOB_PX = 2.5;   // amplitude do balanço vertical
const FAR_FOG_MAX = 0.25;      // névoa máxima sobre uma fileira (legível no fundo e sem salto de brilho no "go")
const LISTEN_STEP_MS = 220;    // ritmo das ondas do ícone "ouvindo"

// ---------- cores ----------
const FOG: Record<Stratum, string> = { surface: '#1b1408', stone: '#0b0b10' };
const SKY_TOP = '#5aa6e8';
const SKY_BOTTOM = '#a9d8f5';
const CEIL_STONE = '#2a2a30';

const PAL_GRASS = ['#4f9a2a', '#5fb032', '#3f7f22', '#6cc23a', '#57a52d', '#4f9a2a'];
const PAL_DIRT = ['#6b4a2b', '#7a5533', '#5c3f22', '#86603a', '#6b4a2b', '#734f2e'];
const PAL_ROOT = ['#4a3118', '#3d2812', '#563a1e', '#4a3118'];
const PAL_GRAVEL = ['#8a8178', '#6f665e', '#9a9188', '#7d7369', '#6b4a2b'];
const PAL_STONE = ['#7f7f7f', '#8c8c8c', '#6e6e6e', '#9a9a9a', '#858585', '#777777'];
const PAL_FLOOR = ['#3a332c', '#433a31', '#302a24', '#4a4037'];
const PAL_ORE_BASE = ['#7a7a7a', '#868686', '#6b6b6b', '#929292', '#808080'];
const ORE_NORMAL = ['#e7c34a', '#d9a92c', '#f4d874'];   // ouro
const ORE_RETRY = ['#e03a2f', '#c42a20', '#ff6a5c'];    // redstone: palavra que voltou
const GREEN_GLOW = '#5cff5c';
const SIGN_BG = '#f1e3bf';
const SIGN_EDGE = '#8a6a3a';
const TEXT_FILL = '#fffaf0';
const TEXT_STROKE = '#1b1208';
const RAIL = '#9c9c9c';
const RAIL_DARK = '#4a4a4a';
const SLEEPER = '#5a3d20';
const LISTEN = '#ffd83d';       // ícone "ouvindo": alto-falante e ondas acesas
const LISTEN_OFF = '#6e5a1e';   // ondas apagadas (mantêm a silhueta)
const TRANSPARENT = 'rgba(0,0,0,0)';

// ---------- ícone "ouvindo" (pixel art) ----------
// Alto-falante ('S') com três ondas ('1', '2', '3'); '.' é transparente. O contorno escuro é calculado.
const LISTEN_ICON: readonly string[] = [
  '..........3...',
  '...S...2...3..',
  '..SS.1..2...3.',
  'SSSS..1..2...3',
  'SSSS..1..2...3',
  'SSSS..1..2...3',
  '..SS.1..2...3.',
  '...S...2...3..',
  '..........3...',
];
const LISTEN_PAD = 1;         // margem de 1 px para o contorno

// ---------- ruído determinístico ----------
function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick(pal: readonly string[], x: number, y: number, seed: number): string {
  return pal[Math.floor(hash(x, y, seed) * pal.length) % pal.length];
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Textura em pixels: paint(x, y) devolve a cor de cada pixel (alpha 0 deixa o pixel transparente) */
function makeTexture(w: number, h: number, paint: (x: number, y: number) => string): HTMLCanvasElement | null {
  const c = makeCanvas(w, h);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      g.fillStyle = paint(x, y);
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Parede da superfície: grama, terra com faixas de raízes e cascalho (16 x 64) */
function paintSurface(x: number, y: number): string {
  const row = y % 64;
  if (row < 3) return pick(PAL_GRASS, x, y, 11);
  if (row < 5) return hash(x, y, 12) < 0.4 ? pick(PAL_GRASS, x, y, 11) : pick(PAL_DIRT, x, y, 13);
  if (row >= 30 && row < 33) return hash(x, y, 14) < 0.75 ? pick(PAL_ROOT, x, y, 15) : pick(PAL_DIRT, x, y, 13);
  if (row >= 46 && row < 49) return pick(PAL_GRAVEL, x, y, 16);
  return pick(PAL_DIRT, x, y, 13);
}

/** Parede de pedra: cinza com veios de carvão (16 x 64) */
function paintStone(x: number, y: number): string {
  const n = hash(x, y, 21);
  if (n < 0.035) return '#2e2e2e';
  if (n < 0.05) return '#3c3c3c';
  // linhas de "junção" entre blocos a cada 8 px
  if (y % 8 === 7 && hash(x, y, 22) < 0.6) return '#5f5f5f';
  if (x % 8 === 7 && hash(x, y, 23) < 0.6) return '#5f5f5f';
  return pick(PAL_STONE, x, y, 24);
}

function paintFloor(x: number, y: number): string {
  return pick(PAL_FLOOR, x, y, 31);
}

function makeOre(ore: readonly string[], seed: number): HTMLCanvasElement | null {
  return makeTexture(TILE, TILE, (x, y) => {
    const edge = x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1;
    if (edge) return hash(x, y, seed) < 0.5 ? '#5a5a5a' : '#646464';
    // pepitas em pequenos grupos
    const cx = Math.floor(x / 4);
    const cy = Math.floor(y / 4);
    const cluster = hash(cx, cy, seed + 1) < 0.35;
    if (cluster && hash(x, y, seed + 2) < 0.55) return pick(ore, x, y, seed + 3);
    return pick(PAL_ORE_BASE, x, y, seed + 4);
  });
}

/** Caractere do ícone "ouvindo" na posição (x, y); fora do desenho conta como transparente */
function listenPixel(x: number, y: number): string {
  if (y < 0 || y >= LISTEN_ICON.length) return '.';
  const row = LISTEN_ICON[y];
  return x < 0 || x >= row.length ? '.' : row.charAt(x);
}

/** Sprite do ícone com `lit` ondas acesas (0..3), 1 px por unidade; é escalado na hora de desenhar */
function makeListenSprite(lit: number): HTMLCanvasElement | null {
  const w = LISTEN_ICON[0].length + LISTEN_PAD * 2;
  const h = LISTEN_ICON.length + LISTEN_PAD * 2;
  return makeTexture(w, h, (x, y) => {
    const ix = x - LISTEN_PAD;
    const iy = y - LISTEN_PAD;
    const c = listenPixel(ix, iy);
    if (c === 'S') return LISTEN;
    if (c !== '.') return Number(c) <= lit ? LISTEN : LISTEN_OFF;
    // contorno: pixel vazio encostado (8 direções) em algum pixel do ícone
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && listenPixel(ix + dx, iy + dy) !== '.') return TEXT_STROKE;
      }
    }
    return TRANSPARENT;
  });
}

// ---------- utilidades ----------
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function fontFor(px: number): string {
  return `bold ${px}px "Segoe UI", system-ui, -apple-system, Roboto, sans-serif`;
}

/** Reduz a fonte até o texto caber em maxWidth; devolve o tamanho usado (já aplicado em ctx.font) */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, px: number, minPx: number): number {
  let size = Math.max(minPx, Math.floor(px));
  ctx.font = fontFor(size);
  for (let i = 0; i < 12 && size > minPx && ctx.measureText(text).width > maxWidth; i++) {
    size = Math.max(minPx, Math.floor(size * 0.88));
    ctx.font = fontFor(size);
  }
  return size;
}

function drawOutlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, px * 0.22);
  ctx.strokeStyle = TEXT_STROKE;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = TEXT_FILL;
  ctx.fillText(text, x, y);
}

function imageReady(img: HTMLImageElement | undefined): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

interface Layout {
  w: number;
  h: number;
  vpx: number;
  vpy: number;
  impactY: number;
  block0: number;   // lado do bloco em z = 0
}

interface BlockStyle {
  retry: boolean;
  dim: boolean;
  glow: boolean;
  pulse: number;    // 0..1
  fog: number;      // 0..1 (escurecimento por distância)
  labelBelow: string | null;
}

export function createRenderer(canvas: HTMLCanvasElement): MineRenderer {
  const ctx = canvas.getContext('2d');

  let opts: RenderOptions = { width: canvas.width || 360, height: canvas.height || 640, dpr: 1, reduceEffects: false };
  let layout: Layout = computeLayout(opts);

  // texturas (geradas uma vez, determinísticas)
  const texSurface = makeTexture(TILE, 64, paintSurface);
  const texStone = makeTexture(TILE, 64, paintStone);
  const texFloor = makeTexture(TILE, TILE, paintFloor);
  const oreNormal = makeOre(ORE_NORMAL, 41);
  const oreRetry = makeOre(ORE_RETRY, 51);
  // ícone "ouvindo": um sprite por quantidade de ondas acesas (0..3)
  const listenSprites = [0, 1, 2, 3].map(makeListenSprite);

  let patSurface: CanvasPattern | null = null;
  let patStone: CanvasPattern | null = null;
  let patFloor: CanvasPattern | null = null;
  if (ctx) {
    patSurface = texSurface ? ctx.createPattern(texSurface, 'repeat') : null;
    patStone = texStone ? ctx.createPattern(texStone, 'repeat') : null;
    patFloor = texFloor ? ctx.createPattern(texFloor, 'repeat') : null;
  }

  // acumuladores visuais (não fazem parte do estado do jogo)
  let lastTime: number | null = null;
  let scrollU = 0;            // unidades de trilho percorridas (1 = uma janela inteira)
  let curStratum: Stratum | null = null;
  let prevStratum: Stratum | null = null;
  let stratumChangedAt = 0;
  let destroyed = false;

  function computeLayout(o: RenderOptions): Layout {
    const w = Math.max(1, o.width);
    const h = Math.max(1, o.height);
    return {
      w,
      h,
      vpx: w * VP_X,
      vpy: h * VP_Y,
      impactY: h * IMPACT_Y,
      block0: Math.min(w * BLOCK_FRAC, h * 0.2),
    };
  }

  const scaleAt = (z: number): number => 1 / (1 + DEPTH * Math.max(z, -0.3));
  const yAt = (z: number): number => layout.vpy + (layout.impactY - layout.vpy) * scaleAt(z);
  const xAt = (x0: number, z: number): number => layout.vpx + (x0 * layout.w - layout.vpx) * scaleAt(z);

  function patternFor(s: Stratum): CanvasPattern | null {
    return s === 'surface' ? patSurface : patStone;
  }

  /** Preenche um polígono com um padrão pixelado, deslocado verticalmente (rolagem) */
  function fillPolyPattern(g: CanvasRenderingContext2D, pts: number[][], pat: CanvasPattern | null, fallback: string, offsetY: number): void {
    g.save();
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.clip();
    if (pat) {
      g.translate(0, offsetY);
      g.scale(TILE_SCALE, TILE_SCALE);
      g.fillStyle = pat;
      const cw = layout.w / TILE_SCALE;
      const ch = layout.h / TILE_SCALE;
      g.fillRect(-cw, -ch * 3, cw * 3, ch * 5);
    } else {
      g.fillStyle = fallback;
      g.fillRect(0, 0, layout.w, layout.h);
    }
    g.restore();
  }

  function drawWalls(g: CanvasRenderingContext2D, stratum: Stratum, offsetY: number): void {
    const { w, h, vpx, vpy } = layout;
    const floorL = xAt(LANE_X0[1] - TRACK_HALF, -0.3);
    const floorR = xAt(LANE_X0[1] + TRACK_HALF, -0.3);
    const pat = patternFor(stratum);
    const fallback = stratum === 'surface' ? '#6b4a2b' : '#7f7f7f';

    // teto: céu na superfície, pedra escura no estrato de pedra
    if (stratum === 'surface') {
      const sky = g.createLinearGradient(0, 0, 0, vpy);
      sky.addColorStop(0, SKY_TOP);
      sky.addColorStop(1, SKY_BOTTOM);
      g.fillStyle = sky;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      g.lineTo(vpx, vpy);
      g.closePath();
      g.fill();
    } else {
      fillPolyPattern(g, [[0, 0], [w, 0], [vpx, vpy]], patStone, CEIL_STONE, -offsetY * 0.5);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      g.lineTo(vpx, vpy);
      g.closePath();
      g.fill();
    }

    // paredes laterais
    fillPolyPattern(g, [[0, 0], [vpx, vpy], [floorL, h], [0, h]], pat, fallback, offsetY);
    fillPolyPattern(g, [[w, 0], [vpx, vpy], [floorR, h], [w, h]], pat, fallback, offsetY);

    // sombra da parede direita (luz vem da esquerda)
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath();
    g.moveTo(w, 0);
    g.lineTo(vpx, vpy);
    g.lineTo(floorR, h);
    g.lineTo(w, h);
    g.closePath();
    g.fill();

    // leito do trilho
    fillPolyPattern(g, [[floorL, h], [floorR, h], [vpx, vpy]], patFloor, '#3a332c', offsetY * 0.6);
  }

  function drawFog(g: CanvasRenderingContext2D, stratum: Stratum): void {
    const { vpx, vpy, h } = layout;
    const grad = g.createRadialGradient(vpx, vpy, 0, vpx, vpy, h * 0.5);
    const c = FOG[stratum];
    grad.addColorStop(0, c);
    grad.addColorStop(0.35, hexAlpha(c, 0.75));
    grad.addColorStop(1, hexAlpha(c, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, layout.w, layout.h);
  }

  function drawRails(g: CanvasRenderingContext2D): void {
    const zNear = -0.3;
    const zFar = 9;
    // dormentes (atravessam as 3 pistas)
    g.fillStyle = SLEEPER;
    for (let k = 0; k < SLEEPERS; k++) {
      let u = (k / SLEEPERS - scrollU) % 1;
      if (u < 0) u += 1;
      const z = zNear + u * 1.6;
      const s = scaleAt(z);
      const y = yAt(z);
      const xl = xAt(LANE_X0[0] - RAIL_HALF * 1.6, z);
      const xr = xAt(LANE_X0[2] + RAIL_HALF * 1.6, z);
      const th = Math.max(1, 5 * s);
      g.fillRect(Math.round(xl), Math.round(y - th / 2), Math.round(xr - xl), Math.round(th));
    }
    // trilhos: 2 por pista, como trapézios convergindo ao ponto de fuga
    for (let l = 0; l < 3; l++) {
      for (const side of [-1, 1]) {
        const x0 = LANE_X0[l] + side * RAIL_HALF;
        const xn = xAt(x0, zNear);
        const xf = xAt(x0, zFar);
        const yn = yAt(zNear);
        const yf = yAt(zFar);
        const wn = 4;
        const wf = 1;
        g.fillStyle = RAIL_DARK;
        g.beginPath();
        g.moveTo(xn - wn, yn + 2);
        g.lineTo(xn + wn, yn + 2);
        g.lineTo(xf + wf, yf + 1);
        g.lineTo(xf - wf, yf + 1);
        g.closePath();
        g.fill();
        g.fillStyle = RAIL;
        g.beginPath();
        g.moveTo(xn - wn * 0.6, yn);
        g.lineTo(xn + wn * 0.6, yn);
        g.lineTo(xf + wf * 0.5, yf);
        g.lineTo(xf - wf * 0.5, yf);
        g.closePath();
        g.fill();
      }
    }
  }

  function drawCart(g: CanvasRenderingContext2D, state: MineState, timeMs: number): void {
    const { w, h, impactY } = layout;
    const cx = xAt(lerp(LANE_X0[0], LANE_X0[2], clamp01(state.cartX / 2)), 0);
    const cw = Math.min(w * 0.2, h * 0.16);
    const u = cw / 16;                       // unidade de pixel do sprite (16 de largura)
    const running = state.status === 'running';
    const frame = running && !opts.reduceEffects ? Math.floor(timeMs / 170) % 2 : 0;
    const bounce = frame === 1 ? u * 0.35 : 0;
    const tilt = running && !opts.reduceEffects ? (frame === 1 ? 0.025 : -0.025) : 0;

    g.save();
    g.translate(Math.round(cx), Math.round(impactY + u * 1.5 + bounce));
    g.rotate(tilt);
    const px = (x: number, y: number, ww: number, hh: number, color: string): void => {
      g.fillStyle = color;
      g.fillRect(Math.round((x - 8) * u), Math.round(y * u), Math.ceil(ww * u), Math.ceil(hh * u));
    };
    // sombra no chão
    px(1, 9.5, 14, 1.5, 'rgba(0,0,0,0.35)');
    // rodas
    px(2, 7, 3, 3, '#2b2b2b');
    px(11, 7, 3, 3, '#2b2b2b');
    px(3, 8, 1, 1, '#8a8a8a');
    px(12, 8, 1, 1, '#8a8a8a');
    // corpo
    px(1, 2, 14, 6, '#4a4a4a');
    px(1, 2, 14, 1, '#7a7a7a');
    px(1, 7, 14, 1, '#2f2f2f');
    px(1, 2, 1, 6, '#5e5e5e');
    px(14, 2, 1, 6, '#333333');
    // tábuas de madeira
    px(4, 3, 1, 4, '#6b4a2b');
    px(11, 3, 1, 4, '#6b4a2b');
    // carga: pepitas com a cor da picareta atual
    const pick = PICKAXES[Math.max(0, Math.min(PICKAXES.length - 1, state.pickaxe))];
    px(3, 1, 3, 1.2, pick.color);
    px(7, 0.6, 3, 1.6, pick.color);
    px(11, 1, 2, 1.2, pick.color);
    // picareta apoiada na lateral — cabeça cresce e brilha nas tops
    px(12.5, -3, 1, 5, '#8a5a2b');
    px(11, -3.5, 4, 1.2, pick.color);
    px(11, -2.5, 1, 1, pick.color);
    px(14, -2.5, 1, 1, pick.color);
    if (state.pickaxe >= 3) {
      px(10.4, -4.1, 5.4, 1.1, pick.color);
      px(12.2, -5.1, 1, 1, state.pickaxe >= 4 ? '#e8ffff' : '#fff8c0');
    }
    if (state.pickaxe >= 4) {
      px(10, -3.4, 6.2, 1.5, pick.color);
      px(14.2, -4.8, 1, 1, '#ffffff');
    }
    g.restore();
  }

  function drawFace(g: CanvasRenderingContext2D, face: BlockFace, assets: RenderAssets, x: number, y: number, size: number): void {
    const inset = size * 0.1;
    const inner = size - inset * 2;
    const ix = x + inset;
    const iy = y + inset;
    const word = face.word;
    const kind = face.kind === 'image' && !word.image ? (word.hex ? 'color' : 'text') : face.kind;

    if (kind === 'color' && word.hex) {
      g.fillStyle = '#1b1b1b';
      g.fillRect(Math.round(ix), Math.round(iy), Math.round(inner), Math.round(inner));
      const b = Math.max(1, size * 0.03);
      g.fillStyle = word.hex;
      g.fillRect(Math.round(ix + b), Math.round(iy + b), Math.round(inner - b * 2), Math.round(inner - b * 2));
      return;
    }

    if (kind === 'image' && word.image) {
      const img = assets.images.get(word.image);
      if (imageReady(img)) {
        const ratio = img.naturalWidth / img.naturalHeight;
        let dw = inner;
        let dh = inner;
        if (ratio > 1) dh = inner / ratio;
        else dw = inner * ratio;
        const dx = ix + (inner - dw) / 2;
        const dy = iy + (inner - dh) / 2;
        g.drawImage(img, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
        return;
      }
      // imagem ainda não carregou: cai para a palavra escrita
    }

    // placa de madeira com a palavra (modos 'intro' e 'translation_to_word' usam sempre esta face)
    const text = face.text ?? word.word;
    g.fillStyle = SIGN_EDGE;
    g.fillRect(Math.round(ix), Math.round(iy), Math.round(inner), Math.round(inner));
    const b = Math.max(1, size * 0.03);
    g.fillStyle = SIGN_BG;
    g.fillRect(Math.round(ix + b), Math.round(iy + b), Math.round(inner - b * 2), Math.round(inner - b * 2));
    const px = fitFont(g, text, inner * 0.9, size * 0.28, 7);
    drawOutlinedText(g, text, x + size / 2, y + size / 2, px);
  }

  function drawBlock(g: CanvasRenderingContext2D, face: BlockFace, assets: RenderAssets, cx: number, bottomY: number, size: number, st: BlockStyle): void {
    const x = Math.round(cx - size / 2);
    const y = Math.round(bottomY - size);
    const s = Math.round(size);
    const ore = st.retry ? oreRetry : oreNormal;

    // brilho verde por trás (sem shadowBlur: caro no celular)
    if (st.glow) {
      const a = 0.35 + 0.35 * st.pulse;
      g.fillStyle = hexAlpha(GREEN_GLOW, a);
      const pad = s * (0.1 + 0.06 * st.pulse);
      g.fillRect(Math.round(x - pad), Math.round(y - pad), Math.round(s + pad * 2), Math.round(s + pad * 2));
    }

    // corpo do minério
    if (ore) g.drawImage(ore, x, y, s, s);
    else {
      g.fillStyle = '#7f7f7f';
      g.fillRect(x, y, s, s);
    }
    // bisel (luz da esquerda/cima)
    const bev = Math.max(1, Math.round(s * 0.05));
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fillRect(x, y, s, bev);
    g.fillRect(x, y, bev, s);
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.fillRect(x, y + s - bev, s, bev);
    g.fillRect(x + s - bev, y, bev, s);

    drawFace(g, face, assets, x, y, s);

    if (st.glow) {
      const lw = Math.max(2, s * 0.08);
      g.lineWidth = lw;
      g.strokeStyle = GREEN_GLOW;
      g.globalAlpha = 0.6 + 0.4 * st.pulse;
      g.strokeRect(x + lw / 2, y + lw / 2, s - lw, s - lw);
      g.globalAlpha = 1;
    }
    if (st.dim) {
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(x, y, s, s);
    }
    if (st.fog > 0.01) {
      g.fillStyle = hexAlpha(FOG.stone, st.fog);
      g.fillRect(x, y, s, s);
    }
    if (st.labelBelow) {
      const px = fitFont(g, st.labelBelow, s * 1.4, s * 0.22, 9);
      drawOutlinedText(g, st.labelBelow, cx, bottomY + px * 0.9, px);
    }
  }

  /** Ícone "ouvindo" acima da fileira parada: as ondas acendem uma a uma (todas acesas com reduceEffects) */
  function drawListenIndicator(g: CanvasRenderingContext2D, cx: number, topY: number, blockSize: number, timeMs: number): void {
    const lit = opts.reduceEffects ? 3 : Math.floor(timeMs / LISTEN_STEP_MS) % 4;
    const sprite = listenSprites[lit];
    if (!sprite) return;
    // unidade de pixel proporcional ao bloco, entre 2 e 5 px para ficar legível sem cobrir o túnel
    const u = Math.max(2, Math.min(5, Math.round(blockSize / 10)));
    const w = sprite.width * u;
    const h = sprite.height * u;
    g.drawImage(sprite, Math.round(cx - w / 2), Math.round(topY - u * 2 - h), w, h);
  }

  function drawRow(g: CanvasRenderingContext2D, row: BlockRow, assets: RenderAssets, timeMs: number, highlighted: boolean): void {
    const z = row.z;
    if (z < -0.2 || z > 1.05) return;
    const s = scaleAt(z);
    const size = layout.block0 * s;
    const waiting = row.phase === 'announce';
    // parada no fundo: balanço leve (só visual) para dizer que está esperando o áudio
    const bob = waiting && !opts.reduceEffects ? Math.sin(timeMs / 400) * ANNOUNCE_BOB_PX : 0;
    const bottomY = yAt(z) + bob;
    const depthFog = opts.reduceEffects ? 0 : 0.6 * Math.pow(clamp01(z), 1.6);
    // limita a névoa no fundo: a fileira parada precisa ser lida e não pode escurecer de repente ao descer
    const fog = Math.min(FAR_FOG_MAX, depthFog);
    const pulse = opts.reduceEffects ? 1 : 0.5 + 0.5 * Math.sin(timeMs / 110);
    const slowPulse = opts.reduceEffects ? 1 : 0.5 + 0.5 * Math.sin(timeMs / 260);
    const resolved = row.resolved;

    for (let l = 0; l < 3; l++) {
      const lane = l as Lane;
      // bloco já quebrado: não desenha (as partículas mostram a quebra)
      if (resolved === 'hit' && lane === row.correctLane) continue;
      const isCorrect = lane === row.correctLane;
      const style: BlockStyle = {
        retry: row.retry,
        dim: highlighted && !isCorrect,
        glow: highlighted && isCorrect,
        pulse: highlighted ? pulse : slowPulse,
        fog: highlighted ? 0 : fog,
        labelBelow: highlighted && isCorrect ? row.target.word : null,
      };
      drawBlock(g, row.faces[l], assets, xAt(LANE_X0[l], z), bottomY, size, style);
    }

    if (waiting) drawListenIndicator(g, xAt(LANE_X0[1], z), bottomY - size, size, timeMs);
  }

  function drawParticles(g: CanvasRenderingContext2D, state: MineState): void {
    const max = opts.reduceEffects ? MAX_PARTICLES_REDUCED : MAX_PARTICLES;
    const list = state.particles;
    const n = Math.min(list.length, max);
    for (let i = 0; i < n; i++) {
      const p = list[i];
      if (p.life <= 0) continue;
      const size = Math.max(1, p.size);
      g.globalAlpha = clamp01(p.life);
      g.fillStyle = p.color;
      // x na convenção do motor: centro da pista l = (l + 0.5) / 3; leva para a pista em z = 0
      const laneU = p.x * 3 - 0.5;
      const sx = xAt(LANE_X0[0] + (LANE_X0[1] - LANE_X0[0]) * laneU, 0);
      const sy = layout.impactY - p.y * layout.h;
      g.fillRect(Math.round(sx - size / 2), Math.round(sy - size / 2), Math.round(size), Math.round(size));
    }
    g.globalAlpha = 1;
  }

  function drawImpactLine(g: CanvasRenderingContext2D): void {
    const y = Math.round(yAt(0));
    const xl = xAt(LANE_X0[0] - RAIL_HALF * 1.8, 0);
    const xr = xAt(LANE_X0[2] + RAIL_HALF * 1.8, 0);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(Math.round(xl), y, Math.round(xr - xl), 2);
  }

  return {
    resize(o: RenderOptions): void {
      if (destroyed) return;
      const dpr = Math.min(2, Math.max(1, o.dpr || 1));
      opts = { ...o, dpr };
      layout = computeLayout(opts);
      const pw = Math.max(1, Math.round(opts.width * dpr));
      const ph = Math.max(1, Math.round(opts.height * dpr));
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      canvas.style.width = `${opts.width}px`;
      canvas.style.height = `${opts.height}px`;
    },

    draw(state: MineState, assets: RenderAssets, timeMs: number): void {
      if (destroyed || !ctx) return;
      const g = ctx;

      // acumuladores visuais
      const dt = lastTime === null ? 0 : Math.min(100, Math.max(0, timeMs - lastTime));
      lastTime = timeMs;
      if (state.status === 'running') {
        scrollU += dt / Math.max(500, state.windowMs);
        if (scrollU > 1000) scrollU -= 1000;
      }
      if (curStratum !== state.stratum) {
        prevStratum = curStratum;
        curStratum = state.stratum;
        stratumChangedAt = timeMs;
      }
      const fade = prevStratum && !opts.reduceEffects ? clamp01((timeMs - stratumChangedAt) / STRATUM_FADE_MS) : 1;
      if (fade >= 1) prevStratum = null;

      g.setTransform(opts.dpr, 0, 0, opts.dpr, 0, 0);
      g.imageSmoothingEnabled = false;
      g.globalAlpha = 1;
      g.clearRect(0, 0, layout.w, layout.h);

      // cenário
      const texH = 64 * TILE_SCALE;
      const offsetY = ((scrollU * texH * 0.9) % texH + texH) % texH;
      if (prevStratum) drawWalls(g, prevStratum, offsetY);
      if (prevStratum) g.globalAlpha = fade;
      drawWalls(g, curStratum, offsetY);
      g.globalAlpha = 1;
      drawRails(g);
      drawImpactLine(g);
      drawFog(g, curStratum);

      // fileiras: do fundo para a frente
      const hl = state.highlightRow;
      const rows = state.rows.filter((r) => !hl || (r !== hl && r.index !== hl.index)).sort((a, b) => b.z - a.z);
      for (const row of rows) drawRow(g, row, assets, timeMs, false);
      if (hl && state.highlightMs > 0) drawRow(g, hl, assets, timeMs, true);

      drawCart(g, state, timeMs);
      drawParticles(g, state);

      // vinheta na base para o HUD apoiar
      if (!opts.reduceEffects) {
        const vg = g.createLinearGradient(0, layout.h * 0.86, 0, layout.h);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = vg;
        g.fillRect(0, layout.h * 0.86, layout.w, layout.h * 0.14);
      }
    },

    destroy(): void {
      destroyed = true;
      patSurface = null;
      patStone = null;
      patFloor = null;
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}

/** '#rrggbb' + alpha -> 'rgba(...)' */
function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255;
  const gg = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${gg},${b},${clamp01(a).toFixed(3)})`;
}
