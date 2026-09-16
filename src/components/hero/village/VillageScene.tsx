import React, { useEffect, useRef, useState } from 'react';
import type { BuildingId } from '../../../types/english';
import { buildingSprite, crackedLabel, houseSprite, ISO_MINER, ISO_MINER_IDLE, ISO_MINER_WALK, ISO_NPC, ISO_NPC_WALK, LOT_SCENE_LABEL, NPC_LABEL, PET_SPRITE, SCENE_PROPS, visibleCracks, type SceneProp } from '../../../config/village';
import type { NpcId, VillageDoc, VillageSceneEvent } from '../../../types/village';
import { npcTarget, npcTouch, npcHopPx, lookFacing, npcWalk, heroClickPlan, heroWalkAlong, arrivePulse, DEFAULT_WALK_GRAPH, HERO_ARRIVE_HOLD_MS, type WalkGraph } from '../../../services/village/npcBehavior';
import { buildingLevelSum, villageGrowthStage } from '../../../services/village/season';
import { isNightHour } from '../../../utils/clock';
import { paintCharacterLook } from './drawCharacter';
import { paintLotRuins, paintRuinedSprite } from './drawDamage';
import {
  defaultFireflies,
  idleBob,
  idleFrameIndex,
  idleShift,
  paintCampFlame,
  paintCharBlink,
  paintClosedSign,
  paintEmber,
  paintFireflies,
  paintGlow,
  paintHover,
  paintHoverLabel,
  paintHourSky,
  paintMotes,
  paintPixelHeart,
  paintPixelPanel,
  paintPixelTail,
  paintPuff,
  paintWater,
  pickHit,
  paintGrowthMark,
  paintEmptyLot,
  paintSitLog,
  visibleGrowthMarks,
  DEFAULT_GROWTH,
  type GrowthMark,
  type HoverKind,
} from './drawAmbient';

const NPC_EYES: Record<string, { y: number; left: number; right: number }> = {
  sabio: { y: 19 / 64, left: 25 / 64, right: 38 / 64 },
  ferreiro: { y: 18 / 64, left: 25 / 64, right: 36 / 64 },
  comerciante: { y: 20 / 64, left: 24 / 64, right: 37 / 64 },
  olheiro: { y: 20 / 64, left: 24 / 64, right: 37 / 64 },
};

const BACKDROP = '/assets/village/scene/backdrop-day.png?v=arena13';
const CLOUDS = '/assets/village/scene/clouds.png';
const MOON = '/assets/english/ui/moon.webp';
const ANCHORS_URL = '/assets/village/scene/anchors.json?v=cerh7';
const SKY_H = 86;

function fenceSouthSrc(level: number): string {
  const n = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  return `/assets/village/scene/wall/cerca-south-${n}.png?v=cerh3`;
}

type Lot = { id: string; x: number; y: number; w: number; h: number; destW?: number; landmark?: boolean };
type WallPiece = {
  kind: 'south' | 'ne' | 'nw' | 'corner';
  x: number; y: number; w: number; h: number;
  torch?: boolean;
  flip?: boolean;
};
type Actor = { x: number; y: number; h: number };
type Light = { id: string; x: number; y: number; r: number };
type Speech = { npc: string; text: string };

export type SceneAnchors = {
  size: { w: number; h: number };
  spriteScale: number;
  lots: Lot[];
  wall?: WallPiece[];
  character: Actor;
  npcs: Record<string, Actor>;
  npcSpots?: Record<string, Record<string, { x: number; y: number } | null>>;
  hotspots?: Record<string, {
    x: number; y: number; w: number; h: number;
    type?: string; label?: string; sprite?: string; minFullDays?: number;
  }>;
  lights: Light[];
  water: { x: number; y: number; w: number; h: number };
  smokeOffset: { dx: number; dy: number };
  house?: Lot;
  props?: SceneProp[];
  growth?: Array<{ stage: number; minLevels: number; src?: string; marks?: GrowthMark[] }>;
  walk?: WalkGraph;
};

const FALLBACK: SceneAnchors = {
  size: { w: 1280, h: 640 },
  spriteScale: 1,
  lots: [
    { id: 'fornalha', x: 147, y: 198, w: 102, h: 78 },
    { id: 'bau', x: 144, y: 348, w: 105, h: 78 },
    { id: 'cerca', x: 600, y: 528, w: 80, h: 48 },
    { id: 'torre', x: 1064, y: 48, w: 90, h: 112 },
    { id: 'mesa', x: 723, y: 234, w: 90, h: 63 },
    { id: 'cofre', x: 472, y: 422, w: 104, h: 80 },
    { id: 'agenda', x: 584, y: 412, w: 112, h: 92 },
    { id: 'mercado', x: 708, y: 414, w: 112, h: 90 },
    { id: 'arena', x: 929, y: 318, w: 186, h: 146, destW: 148, landmark: true },
  ],
  character: { x: 640, y: 365, h: 80 },
  npcs: {
    sabio: { x: 848, y: 268, h: 74 },
    comerciante: { x: 838, y: 468, h: 74 },
    ferreiro: { x: 78, y: 250, h: 74 },
    olheiro: { x: 1114, y: 79, h: 52 },
  },
  lights: [
    { id: 'mina', x: 640, y: 96, r: 52 },
    { id: 'fogueira', x: 1020, y: 210, r: 54 },
    { id: 'poste-l', x: 382, y: 430, r: 40 },
    { id: 'poste-r', x: 876, y: 442, r: 40 },
  ],
  water: { x: 1125, y: 345, w: 145, h: 125 },
  smokeOffset: { dx: 51, dy: 8 },
  house: { id: 'casa', x: 938, y: 110, w: 96, h: 74 },
  props: SCENE_PROPS,
  npcSpots: {
    comerciante: { morning: { x: 1172, y: 486 }, afternoon: { x: 996, y: 228 }, night: null },
    sabio: { day: { x: 620, y: 180 }, night: { x: 1052, y: 228 } },
  },
  hotspots: {
    mine: { x: 545, y: 32, w: 210, h: 138, type: 'district', label: 'Mina' },
    reserva: { x: 468, y: 234, w: 90, h: 63, type: 'future', label: 'Em breve' },
    chest_streak: {
      x: 253, y: 348, w: 48, h: 48, type: 'chest_streak', label: 'Baú das tochas',
      sprite: '/assets/village/items/chest_streak.png', minFullDays: 7,
    },
  },
  wall: [
    { kind: 'south', x: 400, y: 500, w: 480, h: 72 },
  ],
  growth: DEFAULT_GROWTH,
  walk: DEFAULT_WALK_GRAPH,
};

type Hotspot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  sprite?: HTMLImageElement | null;
  pixel?: boolean;
  hover?: HoverKind;
};
type Smoke = { x: number; y: number; r: number; a: number; vy: number; vx?: number };
type Layer = {
  id: string;
  y: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  hit?: Hotspot;
};

const cache = new Map<string, HTMLImageElement>();
const failed = new Set<string>();

function bakeCharSheet(
  dest: HTMLCanvasElement,
  sheet: HTMLImageElement,
  character: VillageDoc['character'],
  pet: CanvasImageSource | null,
): number {
  const n = Math.max(1, Math.floor(sheet.naturalWidth / 64));
  dest.width = 64 * n;
  dest.height = 64;
  const src = document.createElement('canvas');
  src.width = 64;
  src.height = 64;
  const painted = document.createElement('canvas');
  painted.width = 64;
  painted.height = 64;
  const sctx = src.getContext('2d');
  const pctx = painted.getContext('2d');
  const dctx = dest.getContext('2d');
  if (!sctx || !pctx || !dctx) return 1;
  sctx.imageSmoothingEnabled = false;
  pctx.imageSmoothingEnabled = false;
  dctx.imageSmoothingEnabled = false;
  for (let i = 0; i < n; i++) {
    sctx.clearRect(0, 0, 64, 64);
    sctx.drawImage(sheet, i * 64, 0, 64, 64, 0, 0, 64, 64);
    paintCharacterLook(pctx, src, null, character, pet, 'iso');
    dctx.drawImage(painted, i * 64, 0);
  }
  return n;
}

function img(src: string, onReady?: () => void): HTMLImageElement | null {
  if (failed.has(src)) return null;
  const hit = cache.get(src);
  if (hit) return hit.complete && hit.naturalWidth > 0 ? hit : null;
  const el = new Image();
  el.onload = () => onReady?.();
  el.onerror = () => failed.add(src);
  el.src = src;
  cache.set(src, el);
  return el.complete && el.naturalWidth > 0 ? el : null;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5);
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  npc: { x: number; y: number; h: number },
  sceneW: number,
  sceneH: number,
  appear: number,
  header?: { name: string; hearts: number },
) {
  ctx.font = '14px Fredoka, system-ui, sans-serif';
  const lines = wrap(ctx, text, 220);
  const textW = Math.max(...lines.map((ln) => ctx.measureText(ln).width), 48);
  const padX = 14;
  const lineH = 20;
  const headH = header ? 22 : 0;
  const bw = Math.min(268, Math.max(120, Math.ceil(textW + padX * 2)));
  const bh = 12 + lines.length * lineH + headH;
  const tail = 12;
  const margin = 8;
  const headX = npc.x;
  const headY = npc.y - npc.h * 0.88;

  let side: 'bottom' | 'left' | 'right' = 'bottom';
  let bx = headX - bw / 2;
  let by = headY - bh - tail - 8;

  if (by < margin) {
    by = Math.max(margin, Math.min(sceneH - bh - margin, headY - bh / 2));
    const spriteHalf = npc.h * 0.5;
    if (headX > sceneW * 0.55) {
      side = 'right';
      bx = headX - spriteHalf - tail - 4 - bw;
    } else {
      side = 'left';
      bx = headX + spriteHalf + tail + 4;
    }
  }

  bx = Math.round(Math.min(sceneW - bw - margin, Math.max(margin, bx)));
  by = Math.round(Math.min(sceneH - bh - margin, Math.max(margin, by)));

  const pivotX = side === 'bottom' ? Math.min(bx + bw - 22, Math.max(bx + 22, Math.round(headX))) : side === 'right' ? bx + bw : bx;
  const pivotY = side === 'bottom' ? by + bh : Math.min(by + bh - 18, Math.max(by + 18, Math.round(headY)));

  ctx.save();
  ctx.globalAlpha = Math.max(0.4, appear);
  ctx.translate(0, Math.round((1 - appear) * 6));

  paintPixelPanel(ctx, bx, by, bw, bh, 'paper');
  paintPixelTail(ctx, pivotX, pivotY, side, '#f4ead8');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (header) {
    ctx.fillStyle = '#8d5728';
    ctx.fillRect(bx + 2, by + 2, bw - 4, 20);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(bx + 3, by + 2, bw - 6, 2);
    ctx.fillStyle = '#f3e6c8';
    ctx.font = '12px Fredoka, system-ui, sans-serif';
    ctx.fillText(header.name, bx + padX, by + 16);
    for (let i = 0; i < 5; i++) {
      paintPixelHeart(ctx, bx + padX + 92 + i * 16, by + 6, i < header.hearts);
    }
    ctx.font = '14px Fredoka, system-ui, sans-serif';
  }
  ctx.fillStyle = '#1f1a17';
  lines.forEach((ln, i) => ctx.fillText(ln, bx + padX, by + 22 + headH + i * lineH));
  ctx.restore();
}

function groundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spriteW: number,
  night: boolean,
) {
  const rx = spriteW * 0.13;
  ctx.save();
  ctx.translate(cx + 3, cy + 1);
  ctx.scale(1, 0.22);
  ctx.globalCompositeOperation = 'multiply';
  const core = night ? 0.22 : 0.12;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(40, 28, 16, ${core})`);
  g.addColorStop(0.5, `rgba(40, 28, 16, ${core * 0.25})`);
  g.addColorStop(1, 'rgba(40, 28, 16, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lockIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#17130f';
  ctx.fillRect(x + 6, y + 14, 16, 14);
  ctx.strokeStyle = '#17130f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 14, y + 14, 6, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}

function spriteBox(
  lot: { id?: string; x: number; y: number; w: number; h: number; destW?: number },
  empty: boolean,
  kind: 'lot' | 'campinho' | 'house' = 'lot',
): { destW: number; destH: number; dx: number; dy: number } {
  if (kind === 'campinho') {
    const destW = empty ? 88 : 120;
    return {
      destW,
      destH: destW,
      dx: lot.x + lot.w / 2 - destW / 2,
      dy: lot.y + lot.h / 2 - destW / 2,
    };
  }
  if (lot.destW) {
    const destW = empty ? Math.round(lot.destW * 0.55) : lot.destW;
    return {
      destW,
      destH: destW,
      dx: lot.x + lot.w / 2 - destW / 2,
      dy: lot.y + lot.h - destW + 6,
    };
  }
  if (kind === 'house') {
    const destW = 104;
    return {
      destW,
      destH: destW,
      dx: lot.x + lot.w / 2 - destW / 2,
      dy: lot.y + lot.h - destW,
    };
  }
  if (lot.id === 'agenda' || lot.id === 'mercado') {
    const destW = empty ? 72 : 100;
    return {
      destW,
      destH: destW,
      dx: lot.x + lot.w / 2 - destW / 2,
      dy: lot.y + lot.h - destW,
    };
  }
  if (lot.id === 'cerca') {
    if (empty) {
      const destW = 48;
      return {
        destW,
        destH: destW,
        dx: lot.x + lot.w / 2 - destW / 2,
        dy: lot.y + lot.h / 2 - destW / 2,
      };
    }
    const destW = lot.w;
    const destH = lot.h;
    return {
      destW,
      destH,
      dx: lot.x,
      dy: lot.y,
    };
  }
  const destW = empty
    ? Math.min(76, Math.max(64, lot.w - 14))
    : Math.min(112, Math.max(92, lot.w + 6));
  return {
    destW,
    destH: destW,
    dx: lot.x + lot.w / 2 - destW / 2,
    dy: empty ? lot.y + lot.h / 2 - destW / 2 : lot.y + lot.h - destW,
  };
}

/** Boca da chaminé da Fornalha, no sprite sentado no lote (não no canto do pad). */
function forgeChimney(lot: { x: number; y: number; w: number; h: number }, level: number): { x: number; y: number } {
  const box = spriteBox(lot, level <= 0, 'lot');
  const fx = level >= 3 ? 0.41 : level >= 2 ? 0.33 : 0.35;
  const fy = level >= 2 ? 0.12 : 0.14;
  return { x: box.dx + box.destW * fx, y: box.dy + box.destH * fy };
}

function graySprite(source: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  if (octx) {
    octx.imageSmoothingEnabled = false;
    octx.filter = 'grayscale(1) brightness(0.6)';
    octx.drawImage(source, 0, 0, w, h);
  }
  return off;
}

function nightOf(hour: number) {
  return isNightHour(hour);
}

function isSkyPixel(r: number, g: number, b: number, y: number) {
  if (y > 122) return false;
  if (b > 180 && g > 120 && r < 170 && b > r + 40) return true;
  if (b > 200 && g > 160 && r < 210 && b >= g) return true;
  if (r > 175 && g > 185 && b > 200 && Math.abs(r - g) < 45 && Math.abs(g - b) < 55) return true;
  return false;
}

function skyWeight(r: number, g: number, b: number, y: number) {
  if (y > 122) return 0;
  if (isSkyPixel(r, g, b, y)) return 1;
  if (y < 108 && b > 128 && b >= g - 4 && b > r + 6 && g > 78 && r < 210) {
    const how = Math.min(1, (b - r) / 85);
    if (how > 0.22 && !(g > b + 18)) return how * 0.9;
  }
  return 0;
}

type NightStar = { x: number; y: number; s: number; p: number };
type NightBake = { canvas: HTMLCanvasElement; stars: NightStar[] };

const nightBake = new Map<string, NightBake>();
let nightShade: HTMLCanvasElement | null = null;

function bakeNight(source: HTMLImageElement): NightBake {
  const key = `${source.src}|n4`;
  const hit = nightBake.get(key);
  if (hit) return hit;
  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) {
    const empty = { canvas, stars: [] as NightStar[] };
    nightBake.set(key, empty);
    return empty;
  }
  c.drawImage(source, 0, 0);
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const wt = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      wt[y * w + x] = skyWeight(d[i], d[i + 1], d[i + 2], y);
    }
  }
  const dil = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (wt[p] >= 0.95) continue;
      const n = Math.max(wt[p - 1], wt[p + 1], wt[p - w], wt[p + w]);
      if (n < 0.55) continue;
      const i = p * 4;
      const g = d[i + 1];
      const b = d[i + 2];
      if (g > b + 22) continue;
      dil[p] = n * 0.72;
    }
  }
  const sky: number[] = [];
  for (let y = 0; y < h; y++) {
    const t = Math.min(1, y / 108);
    const sr = 8 + t * 14;
    const sg = 14 + t * 20;
    const sb = 48 + t * 38;
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const wSky = Math.max(wt[p], dil[p]);
      const i = p * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (wSky > 0.04) {
        const cloud = r > 200 && g > 200 && b > 200 ? 1 : 0;
        d[i] = Math.round(r * (1 - wSky) + (sr + cloud * 32) * wSky);
        d[i + 1] = Math.round(g * (1 - wSky) + (sg + cloud * 26) * wSky);
        d[i + 2] = Math.round(b * (1 - wSky) + (sb + cloud * 18) * wSky);
        if (wSky > 0.7 && (x + y * 3) % 11 === 0) sky.push(x, y);
      } else if (y < 138) {
        d[i] = Math.round(r * 0.7 + 6);
        d[i + 1] = Math.round(g * 0.72 + 10);
        d[i + 2] = Math.min(255, Math.round(b * 0.88 + 26));
      }
    }
  }
  c.putImageData(img, 0, 0);
  const stars: NightStar[] = [];
  const pairs = Math.floor(sky.length / 2);
  for (let i = 0; i < 96 && pairs > 0; i++) {
    const idx = ((i * 37 + 11) % pairs) * 2;
    stars.push({
      x: sky[idx],
      y: sky[idx + 1],
      s: i % 12 === 0 ? 2 : 1,
      p: i * 0.73,
    });
  }
  const baked = { canvas, stars };
  nightBake.set(key, baked);
  return baked;
}

function paintNightSky(
  ctx: CanvasRenderingContext2D,
  stars: NightStar[],
  elapsed: number,
  reduced: boolean,
  moon: HTMLImageElement | null,
) {
  ctx.save();
  stars.forEach((st) => {
    const tw = reduced ? 0.8 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 1.7 + st.p));
    ctx.globalAlpha = tw;
    ctx.fillStyle = st.s > 1 ? '#fff4c4' : '#e4ecff';
    ctx.fillRect(st.x, st.y, st.s, st.s);
  });
  ctx.globalAlpha = 1;
  const mx = 236;
  const my = 14;
  ctx.fillStyle = 'rgba(186, 206, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(mx + 20, my + 20, 36, 0, Math.PI * 2);
  ctx.fill();
  if (moon) ctx.drawImage(moon, mx, my, 40, 40);
  else {
    ctx.fillStyle = '#efe9c6';
    ctx.beginPath();
    ctx.arc(mx + 20, my + 20, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

type Lamp = {
  x: number;
  y: number;
  r: number;
  rgb: [number, number, number];
  base: number;
  flicker: number;
};

function nightLamps(
  anchors: SceneAnchors,
  buildings: Record<BuildingId, number>,
  extraLamps: Array<{ x: number; y: number }> = [],
): Lamp[] {
  const lamps: Lamp[] = [];
  anchors.lights.forEach((l) => {
    if (l.id === 'mina') lamps.push({ x: l.x, y: l.y, r: 52, rgb: [255, 214, 150], base: 0.36, flicker: 0.03 });
    if (l.id === 'fogueira') lamps.push({ x: l.x, y: l.y, r: 54, rgb: [255, 150, 70], base: 0.62, flicker: 0.14 });
    if (l.id.startsWith('poste')) lamps.push({ x: l.x, y: l.y, r: 38, rgb: [255, 196, 92], base: 0.52, flicker: 0.05 });
  });
  const house = anchors.house;
  if (house) {
    lamps.push({
      x: house.x + house.w * 0.55,
      y: house.y + house.h * 0.38,
      r: 48,
      rgb: [255, 196, 90],
      base: 0.42,
      flicker: 0.04,
    });
  }
  const furnace = anchors.lots.find((l) => l.id === 'fornalha');
  if (furnace && (buildings.fornalha || 0) >= 1) {
    lamps.push({
      x: furnace.x + furnace.w * 0.52,
      y: furnace.y + furnace.h * 0.55,
      r: 46,
      rgb: [255, 140, 60],
      base: 0.55,
      flicker: 0.12,
    });
  }
  extraLamps.forEach((m) => {
    lamps.push({ x: m.x, y: m.y - 20, r: 30, rgb: [255, 196, 92], base: 0.46, flicker: 0.07 });
  });
  return lamps;
}

function paintLamp(ctx: CanvasRenderingContext2D, lamp: Lamp, elapsed: number, reduced: boolean) {
  const wave = reduced ? 1 : 1 + lamp.flicker * Math.sin(elapsed * 5.2 + lamp.x * 0.02);
  const a = lamp.base * wave;
  const g = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.r);
  g.addColorStop(0, `rgba(${lamp.rgb[0]},${lamp.rgb[1]},${lamp.rgb[2]},${Math.min(0.55, a)})`);
  g.addColorStop(0.22, `rgba(${lamp.rgb[0]},${lamp.rgb[1]},${lamp.rgb[2]},${a * 0.22})`);
  g.addColorStop(0.6, `rgba(${lamp.rgb[0]},${lamp.rgb[1]},${lamp.rgb[2]},${a * 0.07})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
  ctx.fill();
}

function paintNightLighting(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  lamps: Lamp[],
  elapsed: number,
  reduced: boolean,
) {
  if (!nightShade) nightShade = document.createElement('canvas');
  if (nightShade.width !== W || nightShade.height !== H) {
    nightShade.width = W;
    nightShade.height = H;
  }
  const d = nightShade.getContext('2d');
  if (!d) return;
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, W, H);
  const veil = d.createLinearGradient(0, 56, 0, H);
  veil.addColorStop(0, 'rgba(8, 12, 32, 0)');
  veil.addColorStop(0.12, 'rgba(10, 16, 40, 0.38)');
  veil.addColorStop(0.32, 'rgba(8, 14, 36, 0.58)');
  veil.addColorStop(1, 'rgba(6, 10, 28, 0.7)');
  d.fillStyle = veil;
  d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-out';
  lamps.forEach((lamp) => {
    const wave = reduced ? 1 : 1 + lamp.flicker * Math.sin(elapsed * 5.2 + lamp.x * 0.02);
    const rad = lamp.r * 1.45;
    const g = d.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, rad);
    g.addColorStop(0, `rgba(0,0,0,${0.88 * wave})`);
    g.addColorStop(0.4, `rgba(0,0,0,${0.5 * wave})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath();
    d.arc(lamp.x, lamp.y, rad, 0, Math.PI * 2);
    d.fill();
  });
  d.globalCompositeOperation = 'source-over';
  ctx.drawImage(nightShade, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lamps.forEach((lamp) => paintLamp(ctx, lamp, elapsed, reduced));
  ctx.restore();
}

function skyPair(hour: number): [string, string] {
  if (hour >= 6 && hour < 10) return ['#9fd3ff', '#e8f4ff'];
  if (hour >= 10 && hour < 16) return ['#79bdf2', '#cfe9ff'];
  if (hour >= 16 && hour < 18) return ['#f5a463', '#ffd9a3'];
  return ['#0e1a3a', '#243a6b'];
}

function paintSky(
  ctx: CanvasRenderingContext2D,
  W: number,
  night: boolean,
  hour: number,
  elapsed: number,
  reduced: boolean,
  moon: HTMLImageElement | null,
) {
  const [top, bot] = skyPair(hour);
  const g = ctx.createLinearGradient(0, 0, 0, SKY_H);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, SKY_H);
  if (night) {
    ctx.fillStyle = '#f4f0c8';
    for (let i = 0; i < 30; i++) {
      const x = ((i * 97) % (W - 24)) + 12;
      const y = ((i * 53) % (SKY_H - 28)) + 8;
      const tw = reduced ? 0.7 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * 2.1 + i));
      ctx.globalAlpha = tw;
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    if (moon) ctx.drawImage(moon, W - 88, 12, 48, 48);
  } else if (!reduced) {
    ctx.fillStyle = 'rgba(255, 220, 90, 0.95)';
    ctx.beginPath();
    ctx.arc(W - 70, 42, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 140, 0.18)';
    ctx.beginPath();
    ctx.arc(W - 70, 42, 28, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintBirds(ctx: CanvasRenderingContext2D, W: number, elapsed: number) {
  ctx.fillStyle = '#17130f';
  for (let i = 0; i < 2; i++) {
    const x = Math.round(((elapsed * (28 + i * 10) + i * 420) % (W + 80)) - 40);
    const y = Math.round(36 + i * 22 + Math.sin(elapsed * 1.4 + i) * 8);
    ctx.fillRect(x - 6, y, 3, 2);
    ctx.fillRect(x - 3, y - 3, 3, 2);
    ctx.fillRect(x, y - 4, 2, 2);
    ctx.fillRect(x + 2, y - 3, 3, 2);
    ctx.fillRect(x + 5, y, 3, 2);
  }
}

interface Props {
  village: VillageDoc;
  buildings: Record<BuildingId, number>;
  hour: number;
  gated: boolean;
  reducedMotion: boolean;
  speech: Speech | null;
  onClickSpot: (id: string) => void;
  onDismissSpeech: () => void;
  /** Cartão/distrito já aberto: cancela a caminhada pendente. */
  frozen?: boolean;
  houseSmoke?: boolean;
  buildFx?: { id: BuildingId; at: number } | null;
  repairFx?: { ids: string[]; at: number } | null;
  className?: string;
  date?: string;
  event?: VillageSceneEvent | null;
}

const VillageScene: React.FC<Props> = ({
  village, buildings, hour, gated, reducedMotion, speech, onClickSpot, onDismissSpeech, frozen = false, houseSmoke = false, buildFx = null, repairFx = null, className = '', date, event = null,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const spots = useRef<Hotspot[]>([]);
  const hover = useRef<Hotspot | undefined>(undefined);
  const smoke = useRef<Smoke[]>([]);
  const chimney = useRef<Smoke[]>([]);
  const embers = useRef<Smoke[]>([]);
  const dust = useRef<Smoke[]>([]);
  const rubble = useRef<Smoke[]>([]);
  const lastBuildAt = useRef(0);
  const lastRepairAt = useRef(0);
  const crackShakeUntil = useRef(0);
  const flies = useRef(defaultFireflies());
  const t0 = useRef(performance.now());
  const last = useRef(0);
  const speechAt = useRef(0);
  const [cursor, setCursor] = useState('default');
  const [anchors, setAnchors] = useState<SceneAnchors>(FALLBACK);
  const [tick, setTick] = useState(0);
  const lookCanvas = useRef<HTMLCanvasElement | null>(null);
  const idleCanvas = useRef<HTMLCanvasElement | null>(null);
  const lookKey = useRef('');
  const npcClickAt = useRef(0);
  const npcClickId = useRef('');
  const npcLast = useRef<Record<string, { x: number; y: number; t: number }>>({});
  const heroPos = useRef<{ x: number; y: number } | null>(null);
  const heroTrip = useRef<{
    points: Array<{ x: number; y: number }>;
    start: number;
    duration: number;
    spotId: string;
    shakeId: string | null;
    fired: boolean;
  } | null>(null);
  const onClickSpotRef = useRef(onClickSpot);
  onClickSpotRef.current = onClickSpot;

  useEffect(() => {
    let alive = true;
    fetch(ANCHORS_URL)
      .then((r) => r.json())
      .then((j: SceneAnchors) => {
        if (alive && j?.size?.w) {
          setAnchors({
            ...FALLBACK,
            ...j,
            props: j.props?.length ? j.props : FALLBACK.props,
            walk: j.walk?.nodes ? j.walk : FALLBACK.walk,
          });
        }
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!speech) return;
    speechAt.current = performance.now();
    const t = window.setTimeout(onDismissSpeech, 6000);
    return () => window.clearTimeout(t);
  }, [speech, onDismissSpeech]);

  useEffect(() => {
    if (!frozen) return;
    const trip = heroTrip.current;
    if (trip && !trip.fired) trip.fired = true;
    heroTrip.current = null;
  }, [frozen]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!lookCanvas.current) {
      lookCanvas.current = document.createElement('canvas');
      lookCanvas.current.width = 64;
      lookCanvas.current.height = 64;
    }
    if (!idleCanvas.current) {
      idleCanvas.current = document.createElement('canvas');
      idleCanvas.current.width = 64;
      idleCanvas.current.height = 64;
    }
    let raf = 0;
    let alive = true;
    let visible = true;
    const bump = () => setTick((n) => n + 1);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting !== false;
    });
    io.observe(canvas);

    const W = anchors.size.w;
    const H = anchors.size.h;

    const draw = (now: number) => {
      if (!alive) return;
      const wait = reducedMotion ? 1000 : 1000 / 30;
      if (now - last.current < wait && last.current !== 0) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last.current = now;
      void date;
      const hidden = document.hidden || !visible;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || W;
      const cssH = Math.round(cssW * (H / W));
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      ctx.setTransform(dpr * (cssW / W), 0, 0, dpr * (cssH / H), 0, 0);
      ctx.imageSmoothingEnabled = false;

      const night = nightOf(hour);
      const elapsed = (now - t0.current) / 1000;
      const heroHome = anchors.character;
      if (!heroPos.current) heroPos.current = { x: heroHome.x, y: heroHome.y };
      const trip = heroTrip.current;
      let hx = heroPos.current.x;
      let hy = heroPos.current.y;
      let walking = false;
      let step: 0 | 1 = 0;
      let walkFace: 1 | -1 | null = null;
      let movedT = 1;
      let walkAlong = 0;
      if (trip) {
        const moved = heroWalkAlong(trip.points, now - trip.start, trip.duration);
        hx = moved.x;
        hy = moved.y;
        walking = moved.walking;
        step = moved.step;
        walkFace = moved.face;
        movedT = moved.t;
        walkAlong = moved.along;
        heroPos.current = { x: hx, y: hy };
      }
      const pulseOf = (id: string) => {
        if (!trip || trip.shakeId !== id) return { shakeX: 0, scale: 1 };
        return arrivePulse(trip.duration - (now - trip.start));
      };
      if (trip && movedT >= 1 && !trip.fired) {
        const hold = trip.duration <= 200 ? 0 : HERO_ARRIVE_HOLD_MS;
        if (now - trip.start >= trip.duration + hold) {
          trip.fired = true;
          heroTrip.current = null;
          onClickSpotRef.current(trip.spotId);
        }
      }

      ctx.clearRect(0, 0, W, H);

      const moon = img(MOON, bump);
      const ground = img(BACKDROP, bump);
      const nightGround = night && ground ? bakeNight(ground) : null;

      if (!ground) {
        paintSky(ctx, W, night, hour, elapsed, reducedMotion, moon);
      } else if (!night) {
        paintSky(ctx, W, false, hour, elapsed, reducedMotion, moon);
      }

      if (!reducedMotion && !night) {
        const clouds = img(CLOUDS, bump);
        if (clouds) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, SKY_H);
          ctx.clip();
          const x1 = ((elapsed * 12) % (W + 512)) - 512;
          const x2 = ((elapsed * 8 + 400) % (W + 512)) - 512;
          ctx.globalAlpha = 0.55;
          ctx.drawImage(clouds, x1, 8, 512, 128);
          ctx.globalAlpha = 0.32;
          ctx.drawImage(clouds, x2, 40, 512, 128);
          ctx.restore();
        }
        paintBirds(ctx, W, elapsed);
      }

      if (nightGround) {
        ctx.drawImage(nightGround.canvas, 0, 0, W, H);
      } else if (ground) {
        ctx.drawImage(ground, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#5b9b3a';
        ctx.fillRect(0, 0, W, H);
      }

      const sum = buildingLevelSum(buildings as Record<string, number>);
      const stage = villageGrowthStage(sum);
      (anchors.growth || DEFAULT_GROWTH).forEach((g) => {
        if (g.stage > stage || g.minLevels > sum) return;
        if (!g.src) return;
        const layer = img(g.src, bump);
        if (layer) ctx.drawImage(layer, 0, 0, W, H);
      });
      const growthMarks = visibleGrowthMarks(anchors.growth, sum);

      const layers: Layer[] = [];
      const hits: Hotspot[] = [];
      const cracks = visibleCracks(village.cracks);
      growthMarks.forEach((mark, i) => {
        layers.push({
          id: `growth:${mark.kind}:${i}`,
          y: mark.kind === 'bunting' ? Math.min(mark.y, mark.y2 ?? mark.y) : mark.y,
          draw: (c) => paintGrowthMark(c, mark, night, elapsed),
        });
      });

      anchors.lots.forEach((lot) => {
        const bid = lot.id as BuildingId;
        const level = buildings[bid] || 0;
        const cracked = cracks.includes(lot.id);
        const reserved = Boolean(lot.landmark);
        const visualLevel = reserved ? Math.max(1, level) : (cracked ? Math.max(1, level) : level);
        const empty = level === 0 && !cracked && !reserved;
        const src = buildingSprite(bid, visualLevel);
        const sprite = img(src, bump);
        const kind = lot.id === 'campinho' ? 'campinho' : 'lot';
        const { destW, destH, dx, dy } = spriteBox(lot, empty, kind);
        const name = cracked ? crackedLabel(lot.id) : LOT_SCENE_LABEL[lot.id];
        const skipSprite = (lot.id === 'torre' && !cracked) || (lot.id === 'cerca' && !empty);
        const fenceBuilt = lot.id === 'cerca' && !empty;
        const hit: Hotspot = skipSprite || empty
          ? { id: `build:${lot.id}`, x: lot.x, y: lot.y, w: lot.w, h: lot.h, label: name, hover: 'spot' }
          : {
            id: `build:${lot.id}`,
            x: dx,
            y: dy,
            w: destW,
            h: destH,
            label: name,
            sprite,
            pixel: Boolean(sprite),
            hover: 'building',
          };
        if (!fenceBuilt) hits.push(hit);
        layers.push({
          id: hit.id,
          y: lot.y + lot.h + (empty && lot.id !== 'cerca' && lot.id !== 'torre' ? 12 : 0),
          hit: fenceBuilt ? undefined : hit,
          draw: (c) => {
            let dw = destW;
            let dh = destH;
            let ox = dx;
            let oy = dy;
            if (buildFx && buildFx.id === bid && !reducedMotion) {
              const t = Math.min(1, Math.max(0, (now - buildFx.at) / 200));
              const pop = 0.8 + 0.2 * t;
              dw = destW * pop;
              dh = destH * pop;
              ox = dx + (destW - dw) / 2;
              oy = dy + destH - dh;
            }
            const repairing = Boolean(repairFx?.ids.includes(lot.id));
            const heal = repairing ? (reducedMotion ? 1 : Math.min(1, Math.max(0, (now - (repairFx?.at ?? now)) / 380))) : 0;
            const pulse = pulseOf(lot.id);
            if (pulse.scale !== 1) {
              dw *= pulse.scale;
              dh *= pulse.scale;
              ox = dx + (destW - dw) / 2;
              oy = dy + destH - dh;
            }
            const shaking = cracked && !repairing && !reducedMotion && now < crackShakeUntil.current;
            const shakeX = (shaking ? Math.sin(now / 38) * 2 : 0) + pulse.shakeX;
            if (empty && lot.id !== 'cerca' && lot.id !== 'torre') {
              paintEmptyLot(c, lot.x + pulse.shakeX, lot.y, lot.w, lot.h, night, lot.id === 'mesa' ? '#e8b923' : '#7ecb4a');
              return;
            }
            if (cracked && heal < 1) {
              if (lot.id === 'torre') paintLotRuins(c, ox, oy, dw, dh, shakeX, 1 - heal);
              if (sprite) paintRuinedSprite(c, sprite, ox, oy, dw, dh, lot.id, shakeX, 1 - heal);
              else paintLotRuins(c, ox, oy, dw, dh, shakeX, 1 - heal);
              if (heal > 0 && sprite && lot.id !== 'torre') {
                c.save();
                c.globalAlpha = heal;
                c.drawImage(gated ? graySprite(sprite, Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh))) : sprite, ox, oy, dw, dh);
                c.restore();
              }
            } else if (sprite && !skipSprite && !empty) {
              const drawn = gated ? graySprite(sprite, Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh))) : sprite;
              c.drawImage(drawn, ox + shakeX, oy, dw, dh);
              if (gated) lockIcon(c, ox + dw / 2 - 14, oy + 8);
            }
          },
        });
      });

      const fenceLv = buildings.cerca || 0;
      const fenceDown = cracks.includes('cerca');
      if (fenceLv >= 1 || fenceDown) {
        const south = img(fenceSouthSrc(Math.max(1, fenceLv)), bump);
        const fenceName = fenceDown ? crackedLabel('cerca') : 'Cerca';
        (anchors.wall || []).forEach((piece, i) => {
          const sprite = south;
          const sw = sprite ? (sprite.naturalWidth || piece.w) : piece.w;
          const sh = sprite ? (sprite.naturalHeight || piece.h) : piece.h;
          const dx = piece.x;
          const dy = piece.y + piece.h - sh;
          const hit: Hotspot = {
            id: 'build:cerca',
            x: dx,
            y: dy,
            w: sw,
            h: sh,
            label: fenceName,
            sprite,
            pixel: Boolean(sprite),
            hover: 'fence',
          };
          hits.push(hit);
          layers.push({
            id: `wall:${i}`,
            y: dy + sh,
            hit,
            draw: (c) => {
              if (!sprite) return;
              const pulse = pulseOf('cerca');
              const ox = dx + pulse.shakeX;
              groundShadow(c, dx + sw / 2, dy + sh - 2, sw, night);
              if (fenceDown) paintRuinedSprite(c, sprite, ox, dy, sw, sh, 'cerca', 0);
              else c.drawImage(sprite, ox, dy);
              if (!fenceDown && fenceLv >= 3 && night) {
                paintGlow(c, ox + sw * 0.445, dy + 14, 16, [255, 150, 50], 0.3);
                paintGlow(c, ox + sw * 0.555, dy + 14, 16, [255, 150, 50], 0.3);
              }
            },
          });
        });
      }

      if (event?.kind === 'build' && event.lot && !reducedMotion) {
        const lot = anchors.lots.find((l) => l.id === event.lot);
        const age = now - event.at;
        if (lot && age < 1200) {
          layers.push({
            id: 'fx:build',
            y: lot.y + lot.h,
            draw: (c) => {
              const t = age / 1200;
              const cx = lot.x + lot.w / 2;
              const cy = lot.y + lot.h * 0.35;
              paintGlow(c, cx, cy, 28, [255, 210, 90], (1 - t) * 0.45);
              for (let i = 0; i < 16; i++) {
                const px = cx + Math.sin(i * 1.7 + age / 80) * (14 + t * 28);
                const py = cy - t * 36 - (i % 3) * 6;
                c.fillStyle = i % 2 ? `rgba(255,210,80,${1 - t})` : `rgba(210,170,110,${1 - t})`;
                c.fillRect(px, py, i % 3 === 0 ? 4 : 3, i % 3 === 0 ? 4 : 3);
              }
            },
          });
        }
      }

      Object.entries(anchors.hotspots || {}).forEach(([id, box]) => {
        const kind = box.type || id;
        if (kind === 'chest_streak' && (village.fullDays || 0) < (box.minFullDays ?? 7)) return;
        const label = box.label || (id === 'mine' ? 'Mina' : id);
        const spotSprite = box.sprite ? img(box.sprite, bump) : null;
        const hit: Hotspot = {
          id,
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          label,
          sprite: spotSprite || undefined,
          pixel: Boolean(spotSprite),
          hover: id === 'mine' ? 'spot' : (spotSprite ? 'building' : 'spot'),
        };
        hits.push(hit);
        layers.push({
          id,
          y: box.y + box.h,
          hit,
          draw: (c) => {
            const pulse = pulseOf(id);
            if (box.sprite) {
              const sprite = img(box.sprite, bump);
              if (sprite) c.drawImage(sprite, box.x + pulse.shakeX, box.y, box.w, box.h);
            } else if (kind === 'future') {
              paintEmptyLot(c, box.x + pulse.shakeX, box.y, box.w, box.h, night, '#7ecb4a');
            }
          },
        });
      });

      const houseLot = anchors.house;
      let chimneyX = 0;
      let chimneyY = 0;
      if (houseLot) {
        const sprite = img(houseSprite(village.season), bump);
        const { destW, destH, dx, dy } = spriteBox(houseLot, false, 'house');
        chimneyX = dx + destW * 0.32;
        chimneyY = dy + destH * 0.26;
        const hit: Hotspot = {
          id: 'house',
          x: dx,
          y: dy,
          w: destW,
          h: destH,
          label: 'Casa',
          sprite,
          pixel: Boolean(sprite),
          hover: 'building',
        };
        hits.push(hit);
        layers.push({
          id: 'house',
          y: houseLot.y + houseLot.h,
          hit,
          draw: (c) => {
            if (!sprite) return;
            const pulse = pulseOf('house');
            const dw = destW * pulse.scale;
            const dh = destH * pulse.scale;
            const ox = dx + (destW - dw) / 2 + pulse.shakeX;
            const oy = dy + destH - dh;
            groundShadow(c, houseLot.x + houseLot.w / 2, houseLot.y + houseLot.h - 6, destW * 1.1, night);
            c.drawImage(sprite, ox, oy, dw, dh);
          },
        });
      }

      const miner = img(ISO_MINER, bump);
      const walkSheet = img(ISO_MINER_WALK, bump);
      const idleSheet = img(ISO_MINER_IDLE, bump);
      const petSrc = village.character.pet ? PET_SPRITE[village.character.pet] : null;
      const pet = petSrc ? img(petSrc, bump) : null;
      const charH = heroHome.h;
      const charW = charH;
      const walkCols = walkSheet && walkSheet.naturalWidth >= 128 ? Math.floor(walkSheet.naturalWidth / 64) : 1;
      const idleCols = idleSheet && idleSheet.naturalWidth >= 128 ? Math.floor(idleSheet.naturalWidth / 64) : 1;
      const hasWalk = walkCols > 1;
      const hasIdle = idleCols > 1;
      let extraBob = 0;
      if (event && !reducedMotion) {
        const age = now - event.at;
        if (event.kind === 'task_done' && age < 540) extraBob = (Math.floor(age / 180) % 2) * -4;
        if (event.kind === 'level_up' && age < 800) extraBob = -Math.abs(Math.sin(age / 90)) * 10;
      }
      if (walking && !hasWalk) extraBob += step === 0 ? 0 : -4;
      const charBob = (walking && hasWalk ? 0 : idleBob(now, 0, walking, reducedMotion)) + extraBob;
      const drawW = walking && !hasWalk && step === 0 ? charW * 1.06 : charW;
      const drawH = walking && !hasWalk && step === 0 ? charH * 0.92 : charH;
      const useWalk = hasWalk && walking;
      const fi = useWalk
        ? Math.floor(walkAlong / 20) % walkCols
        : idleFrameIndex(now, hasIdle ? idleCols : 1, 0);
      const charHit: Hotspot = {
        id: 'character',
        x: hx - charW / 2,
        y: hy - charH + charBob,
        w: charW,
        h: charH,
        label: village.characterName || 'Heitor',
        hover: 'npc',
      };
      hits.push(charHit);
      layers.push({
        id: 'character',
        y: hy,
        hit: charHit,
        draw: (c) => {
          groundShadow(c, hx, hy - 2, charW, night);
          if (!miner) return;
          const key = `${ISO_MINER}|${ISO_MINER_WALK}|${ISO_MINER_IDLE}|${walkCols}|${idleCols}|${village.character.skin}|${village.character.hair}|${village.character.shirt}|${village.character.pants}|${village.character.hat || ''}|${village.character.cape || ''}|${village.character.pet || ''}`;
          const walkOff = lookCanvas.current;
          const idleOff = idleCanvas.current;
          if (lookKey.current !== key) {
            if (walkOff) bakeCharSheet(walkOff, walkSheet && walkSheet.naturalWidth >= 64 ? walkSheet : miner, village.character, pet);
            if (idleOff) bakeCharSheet(idleOff, idleSheet && idleSheet.naturalWidth >= 128 ? idleSheet : miner, village.character, pet);
            lookKey.current = key;
          }
          const off = useWalk ? walkOff : idleOff;
          if (off) {
            const face = walkFace ?? (hover.current ? lookFacing(hx, hover.current.x + hover.current.w / 2) : 1);
            const ox = hx - drawW / 2;
            const oy = hy - drawH + charBob;
            const sx = fi * 64;
            c.save();
            if (face < 0) {
              c.translate(hx, 0);
              c.scale(-1, 1);
              c.drawImage(off, sx, 0, 64, 64, -drawW / 2, oy, drawW, drawH);
            } else {
              c.drawImage(off, sx, 0, 64, 64, ox, oy, drawW, drawH);
            }
            c.restore();
            if (event?.kind === 'level_up' && !reducedMotion) {
              const age = now - event.at;
              if (age < 900) {
                for (let i = 0; i < 6; i++) {
                  const ang = (age / 120) + i * 1.05;
                  c.fillStyle = 'rgba(255,220,80,0.85)';
                  c.fillRect(hx + Math.cos(ang) * 22, hy - charH - 8 + Math.sin(ang) * 10, 3, 3);
                }
              }
            }
          }
        },
      });

      const npcLive: Record<string, { x: number; y: number; h: number }> = {};
      const walkingNow: string[] = [];
      Object.entries(anchors.npcs).forEach(([npc, a], i) => {
        if (!a) return;
        const home = { x: a.x, y: a.y };
        const target = npcTarget(npc as NpcId, hour, anchors.npcSpots, home);
        const prev = npcLast.current[npc] || { x: target.x, y: target.y, t: now };
        const dt = Math.min(0.08, Math.max(0, (now - prev.t) / 1000));
        const walked = npcWalk(prev, { x: target.x, y: target.y }, dt, reducedMotion);
        npcLast.current[npc] = { x: walked.x, y: walked.y, t: now };
        const pos = { ...target, x: walked.x, y: walked.y };
        npcLive[npc] = { x: pos.x, y: pos.y, h: a.h };
        if (pos.hidden) {
          if (pos.sign) {
            const board = { x: a.x - 40, y: a.y - 52, w: 80, h: 36 };
            const hit: Hotspot = { id: `npc:${npc}`, x: board.x, y: board.y, w: board.w, h: board.h, label: pos.sign, hover: 'spot' };
            hits.push(hit);
            layers.push({
              id: hit.id,
              y: a.y,
              hit,
              draw: (c) => {
                const box = paintClosedSign(c, a.x, a.y - 18, pos.sign || '');
                hit.x = box.x;
                hit.y = box.y;
                hit.w = box.w;
                hit.h = box.h;
              },
            });
          }
          return;
        }
        const spr = img(ISO_NPC[npc], bump);
        const walkSpr = ISO_NPC_WALK[npc] ? img(ISO_NPC_WALK[npc], bump) : null;
        const walkCols = walkSpr && walkSpr.naturalWidth >= 128 ? Math.floor(walkSpr.naturalWidth / 64) : 1;
        const hasWalk = walkCols > 1;
        const touch = npcClickId.current === npc ? npcTouch(now, npcClickAt.current, speech?.npc === npc) : { jump: false, talking: false, waving: false };
        const walking = walked.walking;
        if (walking) walkingNow.push(npc);
        const sit = pos.sitting && !walked.walking;
        const hop = npcClickId.current === npc ? npcHopPx(now, npcClickAt.current, reducedMotion) : 0;
        const useWalk = hasWalk && walking;
        const nBob = sit
          ? 0
          : hop + (useWalk ? 0 : idleBob(now, i + 1, walking || touch.talking, reducedMotion) + (walking && walked.step ? -5 : 0));
        const walkFace = walking ? lookFacing(prev.x, target.x) : lookFacing(pos.x, hx);
        const nShift = useWalk ? 0 : walking ? (walked.step ? 3 : -2) * walkFace : (sit ? 0 : idleShift(now, i + 1, reducedMotion));
        const wave = touch.waving && !reducedMotion && !sit && !walking;
        const nW = sit
          ? Math.round(a.h * 1.12)
          : useWalk
            ? a.h
            : walking && !walked.step
              ? Math.round(a.h * 1.08)
              : wave ? a.h * 1.08 : a.h;
        const nH = sit
          ? Math.round(a.h * 0.7)
          : useWalk
            ? a.h
            : walking && !walked.step
              ? Math.round(a.h * 0.9)
              : wave ? a.h * 0.9 : a.h;
        const pad = 10;
        const nx = pos.x + nShift;
        const hit: Hotspot = {
          id: `npc:${npc}`,
          x: nx - nW / 2 - pad,
          y: pos.y - nH + nBob - (sit ? 8 : 0) - pad,
          w: nW + pad * 2,
          h: nH + pad * 2 + (sit ? 8 : 0),
          label: NPC_LABEL[npc] || npc,
          hover: 'npc',
        };
        hits.push(hit);
        layers.push({
          id: hit.id,
          y: pos.y,
          hit,
          draw: (c) => {
            groundShadow(c, nx, pos.y - 2, nW, night);
            if (sit) paintSitLog(c, nx, pos.y);
            const sheet = useWalk && walkSpr ? walkSpr : spr;
            if (!sheet) return;
            c.save();
            const face = walking ? walkFace : lookFacing(nx, hx);
            const oy = pos.y - nH + nBob - (sit ? 8 : 0);
            const fi = useWalk ? Math.floor((pos.x + pos.y) / 10) % walkCols : 0;
            const sx = useWalk ? fi * 64 : 0;
            const sw = useWalk ? 64 : sheet.naturalWidth || nW;
            const sh = useWalk ? 64 : sheet.naturalHeight || nH;
            if (face < 0) {
              c.translate(nx, 0);
              c.scale(-1, 1);
              c.drawImage(sheet, sx, 0, sw, sh, -nW / 2, oy, nW, nH);
            } else {
              c.drawImage(sheet, sx, 0, sw, sh, nx - nW / 2, oy, nW, nH);
            }
            c.restore();
            if (walking && !reducedMotion) {
              paintPuff(c, {
                x: nx - face * 7,
                y: pos.y - (walked.step ? 1 : 3),
                r: walked.step ? 3 : 2,
                a: 0.42,
                vy: 0,
              }, 'dust');
            }
            if (!useWalk) paintCharBlink(c, nx - nW / 2, oy, nW, nH, now, i + 2, face, reducedMotion, NPC_EYES[npc]);
          },
        });
      });
      canvas.dataset.npcWalk = walkingNow.join(',');

      const props = anchors.props?.length ? anchors.props : SCENE_PROPS;
      props.forEach((prop) => {
        const sprite = img(prop.sprite, bump);
        const badge = prop.badge ? img(prop.badge, bump) : null;
        const hit: Hotspot = {
          id: prop.id,
          x: prop.x,
          y: prop.y,
          w: prop.w,
          h: prop.h,
          label: prop.label,
          sprite,
          pixel: Boolean(sprite),
          hover: 'building',
        };
        hits.push(hit);
        layers.push({
          id: prop.id,
          y: prop.y + prop.h,
          hit,
          draw: (c) => {
            const pulse = pulseOf(prop.id);
            groundShadow(c, prop.x + prop.w / 2, prop.y + prop.h - 4, prop.w * 1.15, night);
            if (sprite) c.drawImage(sprite, prop.x + pulse.shakeX, prop.y, prop.w * pulse.scale, prop.h * pulse.scale);
            if (badge) {
              const bw = Math.round(prop.w * 0.42);
              c.drawImage(badge, prop.x + prop.w / 2 - bw / 2 + pulse.shakeX, prop.y + prop.h * 0.22, bw, bw);
            }
          },
        });
      });

      layers.sort((a, b) => a.y - b.y);
      layers.forEach((layer) => layer.draw(ctx));
      spots.current = hits;

      if (cracks.length) {
        if (crackShakeUntil.current === 0) crackShakeUntil.current = now + 480;
      } else if (!repairFx) {
        crackShakeUntil.current = 0;
      }

      if (repairFx && lastRepairAt.current !== repairFx.at) {
        lastRepairAt.current = repairFx.at;
        repairFx.ids.forEach((rid) => {
          const fxLot = anchors.lots.find((l) => l.id === rid);
          if (!fxLot || reducedMotion) return;
          for (let i = 0; i < 10; i++) {
            rubble.current.push({
              x: fxLot.x + fxLot.w * (0.25 + Math.random() * 0.5),
              y: fxLot.y + fxLot.h * (0.4 + Math.random() * 0.4),
              r: 2 + Math.random() * 3,
              a: 0.55,
              vy: 10 + Math.random() * 20,
              vx: (Math.random() - 0.5) * 24,
            });
          }
        });
      }

      if (!reducedMotion) {
        cracks.forEach((cid) => {
          const lot = anchors.lots.find((l) => l.id === cid);
          if (!lot) return;
          if (rubble.current.length < 22 && Math.random() < 0.12) {
            rubble.current.push({
              x: lot.x + lot.w * (0.3 + Math.random() * 0.4),
              y: lot.y + lot.h * 0.35,
              r: 1.4 + Math.random() * 1.8,
              a: 0.4,
              vy: 6 + Math.random() * 10,
              vx: (Math.random() - 0.5) * 8,
            });
          }
        });
      }

      const furnace = anchors.lots.find((l) => l.id === 'fornalha');
      const furnaceLv = buildings.fornalha || 0;
      const forgeLit = Boolean(furnace && furnaceLv >= 1 && !cracks.includes('fornalha'));
      let forgeMouth = { x: 0, y: 0 };
      if (forgeLit && furnace) {
        forgeMouth = forgeChimney(furnace, furnaceLv);
        if (!reducedMotion) {
          if (smoke.current.length < 14 && Math.random() < 0.18) {
            smoke.current.push({
              x: forgeMouth.x + (Math.random() - 0.5) * 6,
              y: forgeMouth.y,
              r: 2.2 + Math.random() * 1.4,
              a: 0.48,
              vy: 14 + Math.random() * 10,
            });
          }
          smoke.current = smoke.current.filter((p) => p.a > 0.04);
          smoke.current.forEach((p) => {
            p.y -= p.vy / 30;
            p.x += Math.sin((elapsed + p.y) * 0.7) * 0.12;
            p.r += 0.08;
            p.a -= 0.008;
          });
        }
      } else {
        smoke.current = [];
      }

      if (buildFx && lastBuildAt.current !== buildFx.at) {
        lastBuildAt.current = buildFx.at;
        smoke.current = [];
        const fxLot = anchors.lots.find((l) => l.id === buildFx.id);
        rubble.current = fxLot
          ? Array.from({ length: reducedMotion ? 0 : 12 }, () => ({
            x: fxLot.x + fxLot.w * (0.25 + Math.random() * 0.5),
            y: fxLot.y + fxLot.h * (0.45 + Math.random() * 0.4),
            r: 2 + Math.random() * 3.2,
            a: 0.58,
            vy: 10 + Math.random() * 22,
            vx: (Math.random() - 0.5) * 28,
          }))
          : [];
      }
      if (buildFx && !reducedMotion) {
        const fxLot = anchors.lots.find((l) => l.id === buildFx.id);
        const age = (now - buildFx.at) / 1000;
        if (fxLot && age < 0.85 && rubble.current.length < 18 && Math.random() < 0.4) {
          rubble.current.push({
            x: fxLot.x + fxLot.w * (0.3 + Math.random() * 0.4),
            y: fxLot.y + fxLot.h * 0.7,
            r: 2 + Math.random() * 2.5,
            a: 0.45,
            vy: 8 + Math.random() * 16,
            vx: (Math.random() - 0.5) * 20,
          });
        }
        rubble.current = rubble.current.filter((p) => p.a > 0.04);
        rubble.current.forEach((p) => {
          p.x += (p.vx || 0) / 30;
          p.y -= p.vy / 30;
          p.r += 0.1;
          p.a -= 0.016;
        });
      } else if (!buildFx) {
        rubble.current = [];
      }

      if (houseLot && houseSmoke) {
        if (reducedMotion) {
          paintPuff(ctx, { x: chimneyX, y: chimneyY - 8, r: 4, a: 0.38, vy: 0 }, 'smoke');
        } else {
          if (chimney.current.length < 10 && Math.random() < 0.16) {
            chimney.current.push({
              x: chimneyX + (Math.random() - 0.5) * 6,
              y: chimneyY,
              r: 2.4,
              a: 0.48,
              vy: 14 + Math.random() * 8,
            });
          }
          chimney.current = chimney.current.filter((p) => p.a > 0.04);
          chimney.current.forEach((p) => {
            p.y -= p.vy / 30;
            p.x += Math.sin((elapsed + p.y) * 0.9) * 0.18;
            p.r += 0.05;
            p.a -= 0.007;
            paintPuff(ctx, p, 'smoke');
          });
        }
      } else {
        chimney.current = [];
      }

      const water = anchors.water;
      if (water) paintWater(ctx, water, elapsed, night, reducedMotion);

      const camp = anchors.lights.find((l) => l.id === 'fogueira');
      if (camp) {
        const flicker = reducedMotion ? 0.22 : 0.18 + 0.1 * Math.sin(elapsed * 7.5);
        paintGlow(ctx, camp.x, camp.y - 6, 42, [255, 140, 40], flicker);
        paintCampFlame(ctx, camp.x, camp.y - 8, elapsed, reducedMotion);
        if (!reducedMotion) {
          if (embers.current.length < 14 && Math.random() < 0.22) {
            embers.current.push({
              x: camp.x + (Math.random() - 0.5) * 14,
              y: camp.y - 4,
              r: 1.4,
              a: 0.75,
              vy: 16 + Math.random() * 16,
            });
          }
          embers.current = embers.current.filter((p) => p.a > 0.05);
          embers.current.forEach((p) => {
            p.y -= p.vy / 30;
            p.x += Math.sin((elapsed + p.y) * 1.4) * 0.4;
            p.a -= 0.012;
            paintEmber(ctx, p);
          });
        }
      }

      const mineHole = anchors.hotspots?.mine;
      if (mineHole && !reducedMotion) {
        if (dust.current.length < 8 && Math.random() < 0.08) {
          dust.current.push({
            x: mineHole.x + mineHole.w * 0.45 + (Math.random() - 0.5) * 24,
            y: mineHole.y + mineHole.h * 0.7,
            r: 2.2,
            a: 0.28,
            vy: 8,
          });
        }
        dust.current = dust.current.filter((p) => p.a > 0.04);
        dust.current.forEach((p) => {
          p.y -= p.vy / 30;
          p.x += 0.3;
          p.r += 0.04;
          p.a -= 0.006;
          paintPuff(ctx, p, 'dust');
        });
      }

      if (!night) paintHourSky(ctx, W, H, hour);
      paintMotes(ctx, elapsed, night, reducedMotion);

      if (night) {
        const lamps = nightLamps(anchors, buildings, growthMarks.filter((m) => m.kind === 'lamp'));
        paintNightLighting(ctx, W, H, lamps, elapsed, reducedMotion);
        if (nightGround) paintNightSky(ctx, nightGround.stars, elapsed, reducedMotion, moon);
        if (!reducedMotion) paintFireflies(ctx, flies.current, elapsed);
      }

      if (forgeLit) {
        const pulse = reducedMotion ? 0.22 : 0.18 + 0.12 * Math.sin(elapsed * 6.4);
        paintGlow(ctx, forgeMouth.x, forgeMouth.y + 18, 26, [255, 120, 40], pulse);
        if (reducedMotion) {
          paintPuff(ctx, { x: forgeMouth.x, y: forgeMouth.y - 6, r: 4, a: 0.4, vy: 0 }, 'smoke');
        } else {
          smoke.current.forEach((p) => paintPuff(ctx, p, 'smoke'));
        }
      }
      rubble.current.forEach((p) => paintPuff(ctx, p, 'rubble'));

      const over = hover.current;
      if (over) {
        const mark = paintHover(ctx, over, night, elapsed, reducedMotion);
        const talking = Boolean(speech && over.id === `npc:${speech.npc}`);
        if (over.label && !talking) paintHoverLabel(ctx, over.label, mark.x, mark.y);
      }

      if (speech) {
        const npc = npcLive[speech.npc] || anchors.npcs[speech.npc];
        if (npc) {
          const appear = reducedMotion ? 1 : Math.min(1, (now - speechAt.current) / 160);
          const hearts = village.npcs[speech.npc as NpcId]?.tier ?? 0;
          drawSpeechBubble(ctx, speech.text, npc, W, H, appear, {
            name: NPC_LABEL[speech.npc] || speech.npc,
            hearts,
          });
        }
      }

      if (!hidden && !reducedMotion) raf = requestAnimationFrame(draw);
    };

    last.current = 0;
    draw(performance.now());
    const onVis = () => { if (!document.hidden) { last.current = 0; draw(performance.now()); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [village, buildings, hour, gated, reducedMotion, anchors, speech, tick, houseSmoke, buildFx, repairFx, event, date]);

  const hitAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * anchors.size.w;
    const y = ((e.clientY - rect.top) / rect.height) * anchors.size.h;
    return pickHit(spots.current, x, y);
  };

  return (
    <canvas
      ref={ref}
      className={`mn-scene w-full ${className}`.trim()}
      data-growth-stage={villageGrowthStage(buildingLevelSum(buildings))}
      style={{ aspectRatio: `${anchors.size.w} / ${anchors.size.h}`, cursor, imageRendering: 'pixelated' }}
      onClick={(e) => {
        if (frozen) return;
        const hit = hitAt(e);
        if (!hit) {
          if (speech) onDismissSpeech();
          return;
        }
        if (hit.id.startsWith('npc:')) {
          npcClickId.current = hit.id.slice(4);
          npcClickAt.current = performance.now();
        }
        const from = heroPos.current || { x: anchors.character.x, y: anchors.character.y };
        const plan = heroClickPlan(hit.id, from, hit, anchors.size, reducedMotion, anchors.walk || DEFAULT_WALK_GRAPH);
        if (plan.immediate) {
          heroPos.current = plan.to;
          heroTrip.current = null;
          onClickSpot(hit.id);
          setTick((n) => n + 1);
          return;
        }
        heroTrip.current = {
          points: plan.points,
          start: performance.now(),
          duration: plan.durationMs,
          spotId: hit.id,
          shakeId: plan.shakeId,
          fired: false,
        };
        setTick((n) => n + 1);
      }}
      onMouseMove={(e) => {
        const next = hitAt(e);
        const prev = hover.current;
        hover.current = next;
        if (prev?.id !== next?.id) setTick((n) => n + 1);
        const cur = next ? 'pointer' : 'default';
        if (cur !== cursor) setCursor(cur);
      }}
      onMouseLeave={() => {
        hover.current = undefined;
        setCursor('default');
      }}
      role="img"
      aria-label="Vila"
    />
  );
};

export default VillageScene;
