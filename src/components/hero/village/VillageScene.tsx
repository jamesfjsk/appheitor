import React, { useEffect, useRef, useState } from 'react';
import type { BuildingId } from '../../../types/english';
import { buildingSprite, houseSprite, ISO_MINER, ISO_NPC, LOT_SCENE_LABEL, NPC_LABEL, PET_SPRITE, SCENE_PROPS, type SceneProp } from '../../../config/village';
import type { VillageDoc } from '../../../types/village';
import { paintCharacterLook } from './drawCharacter';

const BACKDROP = '/assets/village/scene/backdrop-day.png?v=hover1';
const CLOUDS = '/assets/village/scene/clouds.png';
const MOON = '/assets/english/ui/moon.webp';
const ANCHORS_URL = '/assets/village/scene/anchors.json';
const SKY_H = 86;

type Lot = { id: string; x: number; y: number; w: number; h: number };
type Actor = { x: number; y: number; h: number };
type Light = { id: string; x: number; y: number; r: number };
type Speech = { npc: string; text: string };

export type SceneAnchors = {
  size: { w: number; h: number };
  spriteScale: number;
  lots: Lot[];
  character: Actor;
  npcs: Record<string, Actor>;
  hotspots?: Record<string, { x: number; y: number; w: number; h: number }>;
  lights: Light[];
  water: { x: number; y: number; w: number; h: number };
  smokeOffset: { dx: number; dy: number };
  house?: Lot;
  props?: SceneProp[];
};

const FALLBACK: SceneAnchors = {
  size: { w: 1280, h: 640 },
  spriteScale: 1,
  lots: [
    { id: 'fornalha', x: 147, y: 198, w: 102, h: 78 },
    { id: 'bau', x: 144, y: 348, w: 105, h: 78 },
    { id: 'cerca', x: 468, y: 234, w: 90, h: 63 },
    { id: 'torre', x: 1064, y: 48, w: 90, h: 112 },
    { id: 'mesa', x: 723, y: 234, w: 90, h: 63 },
    { id: 'cofre', x: 472, y: 422, w: 104, h: 80 },
    { id: 'agenda', x: 584, y: 412, w: 112, h: 92 },
    { id: 'mercado', x: 708, y: 414, w: 112, h: 90 },
    { id: 'campinho', x: 940, y: 334, w: 168, h: 112 },
  ],
  character: { x: 640, y: 365, h: 80 },
  npcs: {
    sabio: { x: 848, y: 268, h: 74 },
    comerciante: { x: 838, y: 468, h: 74 },
    ferreiro: { x: 78, y: 250, h: 74 },
    olheiro: { x: 1114, y: 79, h: 52 },
  },
  hotspots: { mine: { x: 545, y: 32, w: 210, h: 138 } },
  lights: [
    { id: 'mina', x: 640, y: 95, r: 90 },
    { id: 'fogueira', x: 1045, y: 198, r: 70 },
    { id: 'casa', x: 986, y: 148, r: 55 },
    { id: 'forja', x: 90, y: 230, r: 50 },
  ],
  water: { x: 1125, y: 345, w: 145, h: 125 },
  smokeOffset: { dx: 51, dy: 8 },
  house: { id: 'casa', x: 938, y: 110, w: 96, h: 74 },
  props: SCENE_PROPS,
};

type Hotspot = { id: string; x: number; y: number; w: number; h: number; label?: string };
type Smoke = { x: number; y: number; r: number; a: number; vy: number };
type Layer = {
  id: string;
  y: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  hit?: Hotspot;
};

const cache = new Map<string, HTMLImageElement>();
const failed = new Set<string>();

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
  scale: number,
) {
  ctx.font = '14px Fredoka, system-ui, sans-serif';
  const lines = wrap(ctx, text, 220);
  const textW = Math.max(...lines.map((ln) => ctx.measureText(ln).width), 48);
  const padX = 14;
  const lineH = 20;
  const bw = Math.min(268, Math.ceil(textW + padX * 2));
  const bh = 12 + lines.length * lineH;
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

  bx = Math.min(sceneW - bw - margin, Math.max(margin, bx));
  by = Math.min(sceneH - bh - margin, Math.max(margin, by));

  const pivotX = side === 'bottom' ? Math.min(bx + bw - 22, Math.max(bx + 22, headX)) : side === 'right' ? bx + bw : bx;
  const pivotY = side === 'bottom' ? by + bh : Math.min(by + bh - 18, Math.max(by + 18, headY));

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.scale(scale, scale);
  ctx.translate(-pivotX, -pivotY);
  ctx.globalAlpha = Math.max(0.35, scale);

  ctx.fillStyle = '#f6f2ec';
  ctx.strokeStyle = '#17130f';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const r = Math.min(12, bw / 2, bh / 2);
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
  ctx.arcTo(bx, by + bh, bx, by, r);
  ctx.arcTo(bx, by, bx + bw, by, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  if (side === 'bottom') {
    ctx.moveTo(pivotX - 9, by + bh - 1);
    ctx.lineTo(pivotX, by + bh + tail);
    ctx.lineTo(pivotX + 9, by + bh - 1);
  } else if (side === 'right') {
    ctx.moveTo(bx + bw - 1, pivotY - 9);
    ctx.lineTo(bx + bw + tail, pivotY);
    ctx.lineTo(bx + bw - 1, pivotY + 9);
  } else {
    ctx.moveTo(bx + 1, pivotY - 9);
    ctx.lineTo(bx - tail, pivotY);
    ctx.lineTo(bx + 1, pivotY + 9);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f6f2ec';
  if (side === 'bottom') ctx.fillRect(pivotX - 8, by + bh - 4, 16, 6);
  else if (side === 'right') ctx.fillRect(bx + bw - 4, pivotY - 8, 6, 16);
  else ctx.fillRect(bx - 2, pivotY - 8, 6, 16);

  ctx.fillStyle = '#1f1a17';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((ln, i) => ctx.fillText(ln, bx + padX, by + 22 + i * lineH));
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

function outline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, night: boolean) {
  ctx.save();
  ctx.strokeStyle = night ? 'rgba(255, 196, 90, 0.75)' : 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 8);
    ctx.stroke();
  } else {
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  }
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
  lot: { id?: string; x: number; y: number; w: number; h: number },
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

function label(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number) {
  ctx.save();
  ctx.font = '700 13px Fredoka, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#17130f';
  ctx.fillStyle = '#f6f2ec';
  ctx.strokeText(text, cx, y);
  ctx.fillText(text, cx, y);
  ctx.restore();
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
  return hour >= 19 || hour < 6;
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
): Lamp[] {
  const lamps: Lamp[] = [];
  anchors.lights.forEach((l) => {
    if (l.id === 'mina') lamps.push({ x: l.x, y: l.y, r: 56, rgb: [255, 210, 140], base: 0.34, flicker: 0.04 });
    if (l.id === 'fogueira') lamps.push({ x: l.x, y: l.y, r: 42, rgb: [255, 150, 70], base: 0.38, flicker: 0.12 });
    if (l.id === 'casa') lamps.push({ x: l.x, y: l.y, r: 68, rgb: [255, 196, 90], base: 0.44, flicker: 0.05 });
    if (l.id === 'forja') lamps.push({ x: l.x, y: l.y, r: 40, rgb: [255, 130, 50], base: 0.3, flicker: 0.1 });
  });
  const furnace = anchors.lots.find((l) => l.id === 'fornalha');
  if (furnace && (buildings.fornalha || 0) >= 1) {
    lamps.push({
      x: furnace.x + furnace.w * 0.5,
      y: furnace.y + furnace.h * 0.48,
      r: 32,
      rgb: [255, 140, 60],
      base: 0.32,
      flicker: 0.1,
    });
  }
  const torre = anchors.lots.find((l) => l.id === 'torre');
  if (torre && (buildings.torre || 0) >= 1) {
    lamps.push({
      x: torre.x + torre.w * 0.5,
      y: torre.y + 8,
      r: 16,
      rgb: [255, 214, 140],
      base: 0.22,
      flicker: 0.06,
    });
  }
  return lamps;
}

function paintLamp(ctx: CanvasRenderingContext2D, lamp: Lamp, elapsed: number, reduced: boolean) {
  const wave = reduced ? 1 : 1 + lamp.flicker * Math.sin(elapsed * 5.2 + lamp.x * 0.02);
  const a = lamp.base * wave;
  const g = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.r);
  g.addColorStop(0, `rgba(${lamp.rgb[0]},${lamp.rgb[1]},${lamp.rgb[2]},${Math.min(0.36, a)})`);
  g.addColorStop(0.18, `rgba(${lamp.rgb[0]},${lamp.rgb[1]},${lamp.rgb[2]},${a * 0.14})`);
  g.addColorStop(0.55, `rgba(${lamp.rgb[0]},${lamp.rgb[1]},${lamp.rgb[2]},${a * 0.04})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
  ctx.fill();
}

function skyPair(hour: number): [string, string] {
  if (hour >= 6 && hour < 10) return ['#9fd3ff', '#e8f4ff'];
  if (hour >= 10 && hour < 16) return ['#79bdf2', '#cfe9ff'];
  if (hour >= 16 && hour < 19) return ['#f5a463', '#ffd9a3'];
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
  for (let i = 0; i < 2; i++) {
    const x = ((elapsed * (28 + i * 10) + i * 420) % (W + 80)) - 40;
    const y = 36 + i * 22 + Math.sin(elapsed * 1.4 + i) * 8;
    ctx.strokeStyle = '#17130f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x, y - 4);
    ctx.lineTo(x + 7, y);
    ctx.stroke();
  }
}

function paintCampfire(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number, reduced: boolean) {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 38);
  glow.addColorStop(0, `rgba(255, 170, 50, ${reduced ? 0.28 : 0.34 + 0.08 * Math.sin(elapsed * 6)})`);
  glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.fill();
  const n = reduced ? 3 : 7;
  for (let i = 0; i < n; i++) {
    const t = elapsed * (2.8 + i * 0.15) + i;
    const fx = x + Math.sin(t) * (4 + i);
    const fy = y - 6 - (i * 3 + (t % 10));
    ctx.fillStyle = i % 2 ? `rgba(255, 210, 80, ${0.5 - i * 0.05})` : `rgba(255, 90, 20, ${0.55 - i * 0.04})`;
    ctx.beginPath();
    ctx.arc(fx, fy, reduced ? 3 : 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
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
  houseSmoke?: boolean;
  className?: string;
}

const VillageScene: React.FC<Props> = ({
  village, buildings, hour, gated, reducedMotion, speech, onClickSpot, onDismissSpeech, houseSmoke = false, className = '',
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const spots = useRef<Hotspot[]>([]);
  const hover = useRef<Hotspot | undefined>(undefined);
  const smoke = useRef<Smoke[]>([]);
  const chimney = useRef<Smoke[]>([]);
  const embers = useRef<Smoke[]>([]);
  const dust = useRef<Smoke[]>([]);
  const flies = useRef(Array.from({ length: 10 }, (_, i) => ({
    x: 200 + i * 90,
    y: 180 + (i % 4) * 70,
    p: i * 0.7,
  })));
  const t0 = useRef(performance.now());
  const last = useRef(0);
  const speechAt = useRef(0);
  const [cursor, setCursor] = useState('default');
  const [anchors, setAnchors] = useState<SceneAnchors>(FALLBACK);
  const [tick, setTick] = useState(0);
  const lookCanvas = useRef<HTMLCanvasElement | null>(null);
  const lookKey = useRef('');

  useEffect(() => {
    let alive = true;
        fetch(`${ANCHORS_URL}?v=hover4`)
      .then((r) => r.json())
      .then((j: SceneAnchors) => {
        if (alive && j?.size?.w) {
          setAnchors({ ...FALLBACK, ...j, props: j.props?.length ? j.props : FALLBACK.props });
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
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!lookCanvas.current) {
      lookCanvas.current = document.createElement('canvas');
      lookCanvas.current.width = 64;
      lookCanvas.current.height = 64;
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
      const bob = (phase: number) => {
        if (reducedMotion) return 0;
        return Math.floor((elapsed * 1000 + phase) / 600) % 2 === 0 ? 0 : -2;
      };

      ctx.clearRect(0, 0, W, H);

      const moon = img(MOON, bump);
      paintSky(ctx, W, night, hour, elapsed, reducedMotion, moon);

      if (!reducedMotion) {
        const clouds = img(CLOUDS, bump);
        if (clouds) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, SKY_H);
          ctx.clip();
          if (!night) {
            const x1 = ((elapsed * 12) % (W + 512)) - 512;
            const x2 = ((elapsed * 8 + 400) % (W + 512)) - 512;
            ctx.globalAlpha = 0.55;
            ctx.drawImage(clouds, x1, 8, 512, 128);
            ctx.globalAlpha = 0.32;
            ctx.drawImage(clouds, x2, 40, 512, 128);
          } else {
            ctx.globalAlpha = 0.18;
            ctx.drawImage(clouds, 80, 10, 512, 128);
          }
          ctx.restore();
        }
        if (!night) paintBirds(ctx, W, elapsed);
      }

      const ground = img(BACKDROP, bump);
      if (ground) ctx.drawImage(ground, 0, 0, W, H);
      else {
        ctx.fillStyle = '#5b9b3a';
        ctx.fillRect(0, 0, W, H);
      }

      const layers: Layer[] = [];
      const hits: Hotspot[] = [];

      anchors.lots.forEach((lot) => {
        const bid = lot.id as BuildingId;
        const level = buildings[bid] || 0;
        const src = buildingSprite(bid, level);
        const sprite = img(src, bump);
        const kind = lot.id === 'campinho' ? 'campinho' : 'lot';
        const { destW, destH, dx, dy } = spriteBox(lot, level === 0, kind);
        const name = LOT_SCENE_LABEL[lot.id];
        const skipSprite = lot.id === 'torre';
        const hit: Hotspot = skipSprite || level === 0
          ? { id: `build:${lot.id}`, x: lot.x, y: lot.y, w: lot.w, h: lot.h, label: name }
          : { id: `build:${lot.id}`, x: dx, y: dy, w: destW, h: destH, label: name };
        hits.push(hit);
        layers.push({
          id: hit.id,
          y: lot.y + lot.h,
          hit,
          draw: (c) => {
            if (sprite && !skipSprite) {
              const drawn = gated ? graySprite(sprite, destW, destH) : sprite;
              c.drawImage(drawn, dx, dy, destW, destH);
              if (gated) lockIcon(c, dx + destW / 2 - 14, dy + 8);
            }
            if (village.cracks.includes(lot.id)) {
              c.strokeStyle = '#17130f';
              c.lineWidth = 2;
              c.beginPath();
              c.moveTo(dx + destW * 0.2, dy + destH * 0.3);
              c.lineTo(dx + destW * 0.55, dy + destH * 0.7);
              c.moveTo(dx + destW * 0.35, dy + destH * 0.25);
              c.lineTo(dx + destW * 0.8, dy + destH * 0.6);
              c.moveTo(dx + destW * 0.15, dy + destH * 0.55);
              c.lineTo(dx + destW * 0.7, dy + destH * 0.85);
              c.stroke();
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
        const hit: Hotspot = { id: 'house', x: dx, y: dy, w: destW, h: destH, label: 'Casa' };
        hits.push(hit);
        layers.push({
          id: 'house',
          y: houseLot.y + houseLot.h,
          hit,
          draw: (c) => {
            if (!sprite) return;
            groundShadow(c, houseLot.x + houseLot.w / 2, houseLot.y + houseLot.h - 6, destW * 1.1, night);
            c.drawImage(sprite, dx, dy, destW, destH);
          },
        });
      }

      const miner = img(ISO_MINER, bump);
      const petSrc = village.character.pet ? PET_SPRITE[village.character.pet] : null;
      const pet = petSrc ? img(petSrc, bump) : null;
      const ch = anchors.character;
      const charH = ch.h;
      const charW = charH;
      const charBob = bob(0);
      const charHit: Hotspot = {
        id: 'character',
        x: ch.x - charW / 2,
        y: ch.y - charH + charBob,
        w: charW,
        h: charH,
        label: village.characterName || 'Heitor',
      };
      hits.push(charHit);
      layers.push({
        id: 'character',
        y: ch.y,
        hit: charHit,
        draw: (c) => {
          groundShadow(c, ch.x, ch.y - 2, charW, night);
          if (!miner) return;
          const key = `${ISO_MINER}|${village.character.skin}|${village.character.hair}|${village.character.shirt}|${village.character.pants}|${village.character.hat || ''}|${village.character.cape || ''}|${village.character.pet || ''}`;
          const off = lookCanvas.current;
          if (off && lookKey.current !== key) {
            const lctx = off.getContext('2d');
            if (lctx) {
              paintCharacterLook(lctx, miner, null, village.character, pet, 'iso');
              lookKey.current = key;
            }
          }
          if (off) c.drawImage(off, ch.x - charW / 2, ch.y - charH + charBob, charW, charH);
        },
      });

      Object.entries(anchors.npcs).forEach(([npc, a], i) => {
        if (!a) return;
        const spr = img(ISO_NPC[npc], bump);
        const nBob = bob(220 * (i + 1));
        const nW = a.h;
        const nH = a.h;
        const hit: Hotspot = {
          id: `npc:${npc}`,
          x: a.x - nW / 2,
          y: a.y - nH + nBob,
          w: nW,
          h: nH,
          label: NPC_LABEL[npc] || npc,
        };
        hits.push(hit);
        layers.push({
          id: hit.id,
          y: a.y,
          hit,
          draw: (c) => {
            groundShadow(c, a.x, a.y - 2, nW, night);
            if (spr) c.drawImage(spr, a.x - nW / 2, a.y - nH + nBob, nW, nH);
          },
        });
      });

      const mine = anchors.hotspots?.mine;
      if (mine) {
        const hit: Hotspot = { id: 'mine', x: mine.x, y: mine.y, w: mine.w, h: mine.h, label: 'Mina' };
        hits.push(hit);
        layers.push({
          id: 'mine',
          y: mine.y + mine.h,
          hit,
          draw: (c) => {
            if (gated) lockIcon(c, mine.x + mine.w / 2 - 14, mine.y + mine.h - 36);
          },
        });
      }

      const props = anchors.props?.length ? anchors.props : SCENE_PROPS;
      props.forEach((prop) => {
        const sprite = img(prop.sprite, bump);
        const badge = prop.badge ? img(prop.badge, bump) : null;
        const hit: Hotspot = { id: prop.id, x: prop.x, y: prop.y, w: prop.w, h: prop.h, label: prop.label };
        hits.push(hit);
        layers.push({
          id: prop.id,
          y: prop.y + prop.h,
          hit,
          draw: (c) => {
            groundShadow(c, prop.x + prop.w / 2, prop.y + prop.h - 4, prop.w * 1.15, night);
            if (sprite) c.drawImage(sprite, prop.x, prop.y, prop.w, prop.h);
            if (badge) {
              const bw = Math.round(prop.w * 0.42);
              c.drawImage(badge, prop.x + prop.w / 2 - bw / 2, prop.y + prop.h * 0.22, bw, bw);
            }
          },
        });
      });

      layers.sort((a, b) => a.y - b.y);
      layers.forEach((layer) => layer.draw(ctx));
      spots.current = hits;

      const furnace = anchors.lots.find((l) => l.id === 'fornalha');
      const furnaceLv = buildings.fornalha || 0;
      if (furnace && furnaceLv >= 1 && !reducedMotion) {
        if (smoke.current.length < 5 && Math.random() < 0.08) {
          smoke.current.push({
            x: furnace.x + anchors.smokeOffset.dx,
            y: furnace.y + anchors.smokeOffset.dy,
            r: 4,
            a: 0.5,
            vy: 20,
          });
        }
        smoke.current = smoke.current.filter((p) => p.a > 0.04);
        smoke.current.forEach((p) => {
          p.y -= p.vy / 30;
          p.r += 0.08;
          p.a -= 0.008;
          ctx.fillStyle = `rgba(200,200,200,${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (houseLot && houseSmoke) {
        if (reducedMotion) {
          ctx.fillStyle = 'rgba(214, 206, 196, 0.38)';
          ctx.beginPath();
          ctx.arc(chimneyX, chimneyY - 8, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          if (chimney.current.length < 7 && Math.random() < 0.14) {
            chimney.current.push({
              x: chimneyX + (Math.random() - 0.5) * 6,
              y: chimneyY,
              r: 3.2,
              a: 0.5,
              vy: 16 + Math.random() * 8,
            });
          }
          chimney.current = chimney.current.filter((p) => p.a > 0.04);
          chimney.current.forEach((p) => {
            p.y -= p.vy / 30;
            p.x += Math.sin((elapsed + p.y) * 0.9) * 0.18;
            p.r += 0.07;
            p.a -= 0.007;
            ctx.fillStyle = `rgba(214, 206, 196, ${p.a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      } else {
        chimney.current = [];
      }

      const water = anchors.water;
      if (water) {
        const wa = night
          ? (reducedMotion ? 0.06 : 0.05 + 0.05 * Math.sin(elapsed * 1.2))
          : (reducedMotion ? 0.12 : 0.1 + 0.1 * Math.sin(elapsed * 1.4));
        ctx.fillStyle = night ? `rgba(140,170,210,${wa})` : `rgba(180,220,255,${wa})`;
        ctx.fillRect(water.x, water.y + water.h * 0.45, water.w, water.h * 0.2);
        if (!reducedMotion) {
          for (let i = 0; i < 6; i++) {
            const sx = water.x + 18 + ((i * 37 + elapsed * 12) % (water.w - 36));
            const sy = water.y + water.h * 0.5 + Math.sin(elapsed * 2 + i) * 6;
            ctx.fillStyle = `rgba(255,255,255,${0.18 + 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 3 + i))})`;
            ctx.fillRect(sx, sy, 2, 2);
          }
        }
      }

      const camp = anchors.lights.find((l) => l.id === 'fogueira');
      if (camp) paintCampfire(ctx, camp.x, camp.y, elapsed, reducedMotion);
      if (camp && !reducedMotion) {
        if (embers.current.length < 10 && Math.random() < 0.2) {
          embers.current.push({
            x: camp.x + (Math.random() - 0.5) * 16,
            y: camp.y - 4,
            r: 1.6,
            a: 0.7,
            vy: 18 + Math.random() * 14,
          });
        }
        embers.current = embers.current.filter((p) => p.a > 0.05);
        embers.current.forEach((p) => {
          p.y -= p.vy / 30;
          p.x += Math.sin((elapsed + p.y) * 1.4) * 0.4;
          p.a -= 0.012;
          ctx.fillStyle = `rgba(255, 160, 50, ${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      const mineHole = anchors.hotspots?.mine;
      if (mineHole && !reducedMotion) {
        if (dust.current.length < 6 && Math.random() < 0.07) {
          dust.current.push({
            x: mineHole.x + mineHole.w * 0.45 + (Math.random() - 0.5) * 24,
            y: mineHole.y + mineHole.h * 0.7,
            r: 3,
            a: 0.28,
            vy: 8,
          });
        }
        dust.current = dust.current.filter((p) => p.a > 0.04);
        dust.current.forEach((p) => {
          p.y -= p.vy / 30;
          p.x += 0.3;
          p.r += 0.05;
          p.a -= 0.006;
          ctx.fillStyle = `rgba(160, 140, 110, ${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.save();
      if (hour >= 6 && hour < 10) {
        ctx.fillStyle = 'rgba(255,240,210,0.16)';
        ctx.fillRect(0, 0, W, H);
      } else if (hour >= 16 && hour < 19) {
        ctx.fillStyle = 'rgba(255,130,60,0.2)';
        ctx.fillRect(0, 0, W, H);
      } else if (night) {
        ctx.fillStyle = 'rgba(8, 14, 32, 0.5)';
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();

      if (night) {
        nightLamps(anchors, buildings).forEach((lamp) => paintLamp(ctx, lamp, elapsed, reducedMotion));
        if (!reducedMotion) {
          flies.current.forEach((f, i) => {
            const x = f.x + Math.sin(elapsed * 0.8 + f.p) * 28;
            const y = f.y + Math.cos(elapsed * 0.6 + i) * 16;
            const a = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * 4.2 + i));
            ctx.fillStyle = `rgba(255, 230, 120, ${a})`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      const over = hover.current;
      if (over) {
        outline(ctx, over.x, over.y, over.w, over.h, night);
        if (!reducedMotion) {
          for (let i = 0; i < 3; i++) {
            const ang = elapsed * 2.4 + i * 2.1;
            const sx = over.x + over.w / 2 + Math.cos(ang) * (over.w * 0.38);
            const sy = over.y + over.h / 2 + Math.sin(ang) * (over.h * 0.38);
            ctx.fillStyle = night ? 'rgba(255, 210, 90, 0.7)' : 'rgba(255,255,255,0.8)';
            ctx.fillRect(sx, sy, 2, 2);
          }
        }
        if (over.label) {
          const below = over.y + over.h + 16;
          label(ctx, over.label, over.x + over.w / 2, below > 628 ? over.y - 8 : below);
        }
      }

      if (speech) {
        const npc = anchors.npcs[speech.npc];
        if (npc) {
          const grow = reducedMotion ? 1 : Math.min(1, (now - speechAt.current) / 150);
          drawSpeechBubble(ctx, speech.text, npc, W, H, 0.8 + 0.2 * grow);
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
  }, [village, buildings, hour, gated, reducedMotion, anchors, speech, tick, houseSmoke]);

  const hitAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * anchors.size.w;
    const y = ((e.clientY - rect.top) / rect.height) * anchors.size.h;
    return [...spots.current].reverse().find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
  };

  return (
    <canvas
      ref={ref}
      className={`mn-scene w-full ${className}`.trim()}
      style={{ aspectRatio: `${anchors.size.w} / ${anchors.size.h}`, cursor, imageRendering: 'pixelated' }}
      onClick={(e) => {
        const hit = hitAt(e);
        if (hit) onClickSpot(hit.id);
        else if (speech) onDismissSpeech();
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
