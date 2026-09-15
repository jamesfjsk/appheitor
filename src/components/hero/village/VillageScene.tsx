import React, { useEffect, useRef, useState } from 'react';
import type { BuildingId } from '../../../types/english';
import { buildingSprite, ISO_MINER, ISO_NPC, NPC_LABEL, PET_SPRITE } from '../../../config/village';
import type { VillageDoc } from '../../../types/village';
import { paintCharacterLook } from './drawCharacter';

const BACKDROP = '/assets/village/scene/backdrop-day.png';
const CLOUDS = '/assets/village/scene/clouds.png';
const ANCHORS_URL = '/assets/village/scene/anchors.json';

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
};

const FALLBACK: SceneAnchors = {
  size: { w: 1280, h: 640 },
  spriteScale: 1.5,
  lots: [
    { id: 'fornalha', x: 170, y: 178, w: 160, h: 88 },
    { id: 'bau', x: 365, y: 178, w: 155, h: 88 },
    { id: 'cerca', x: 205, y: 315, w: 165, h: 86 },
    { id: 'torre', x: 410, y: 315, w: 160, h: 86 },
    { id: 'mesa', x: 245, y: 450, w: 170, h: 82 },
    { id: 'campinho', x: 455, y: 450, w: 170, h: 82 },
    { id: 'cofre', x: 750, y: 548, w: 170, h: 84 },
  ],
  character: { x: 700, y: 445, h: 96 },
  npcs: {
    sabio: { x: 800, y: 215, h: 96 },
    comerciante: { x: 1090, y: 385, h: 96 },
    ferreiro: { x: 125, y: 505, h: 96 },
    olheiro: { x: 1180, y: 130, h: 96 },
  },
  hotspots: { mine: { x: 500, y: 0, w: 170, h: 150 } },
  lights: [
    { id: 'mina', x: 585, y: 75, r: 90 },
    { id: 'fogueira', x: 890, y: 400, r: 70 },
  ],
  water: { x: 1040, y: 455, w: 210, h: 135 },
  smokeOffset: { dx: 100, dy: -70 },
};

type Hotspot = { id: string; x: number; y: number; w: number; h: number };
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
  const gap = 8;
  const margin = 8;
  const headX = npc.x;
  const headY = npc.y - npc.h * 0.88;

  let side: 'bottom' | 'left' | 'right' = 'bottom';
  let bx = headX - bw / 2;
  let by = headY - bh - tail - gap;

  if (by < margin) {
    by = Math.max(margin, Math.min(sceneH - bh - margin, headY - bh / 2));
    if (headX > sceneW * 0.55) {
      side = 'right';
      bx = headX - 28 - tail - gap - bw;
    } else {
      side = 'left';
      bx = headX + 28 + tail + gap;
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

  ctx.fillStyle = '#f6f2ec';
  ctx.strokeStyle = '#17130f';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const radius = 12;
  const balloon = () => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bh, radius);
    else ctx.rect(bx, by, bw, bh);
  };
  const tailPath = () => {
    ctx.beginPath();
    if (side === 'bottom') {
      ctx.moveTo(pivotX - 9, by + bh - 2);
      ctx.lineTo(pivotX, by + bh + tail);
      ctx.lineTo(pivotX + 9, by + bh - 2);
    } else if (side === 'right') {
      ctx.moveTo(bx + bw - 2, pivotY - 9);
      ctx.lineTo(bx + bw + tail, pivotY);
      ctx.lineTo(bx + bw - 2, pivotY + 9);
    } else {
      ctx.moveTo(bx + 2, pivotY - 9);
      ctx.lineTo(bx - tail, pivotY);
      ctx.lineTo(bx + 2, pivotY + 9);
    }
    ctx.closePath();
  };

  balloon();
  ctx.fill();
  tailPath();
  ctx.fill();
  tailPath();
  ctx.stroke();
  balloon();
  ctx.stroke();
  ctx.fillStyle = '#f6f2ec';
  if (side === 'bottom') ctx.fillRect(pivotX - 8, by + bh - 5, 16, 8);
  else if (side === 'right') ctx.fillRect(bx + bw - 5, pivotY - 8, 8, 16);
  else ctx.fillRect(bx - 3, pivotY - 8, 8, 16);

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

interface Props {
  village: VillageDoc;
  buildings: Record<BuildingId, number>;
  hour: number;
  gated: boolean;
  reducedMotion: boolean;
  speech: Speech | null;
  onClickSpot: (id: string) => void;
  onDismissSpeech: () => void;
  className?: string;
}

const VillageScene: React.FC<Props> = ({
  village, buildings, hour, gated, reducedMotion, speech, onClickSpot, onDismissSpeech, className = '',
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const spots = useRef<Hotspot[]>([]);
  const hover = useRef<Hotspot | undefined>(undefined);
  const smoke = useRef<Smoke[]>([]);
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
    fetch(ANCHORS_URL)
      .then((r) => r.json())
      .then((j: SceneAnchors) => { if (alive && j?.size?.w) setAnchors(j); })
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

      if (!night && !reducedMotion) {
        const clouds = img(CLOUDS, bump);
        if (clouds) {
          const x1 = ((elapsed * 12) % (W + 512)) - 512;
          const x2 = ((elapsed * 8 + 400) % (W + 512)) - 512;
          ctx.globalAlpha = 0.5;
          ctx.drawImage(clouds, x1, 8, 512, 128);
          ctx.globalAlpha = 0.3;
          ctx.drawImage(clouds, x2, 40, 512, 128);
          ctx.globalAlpha = 1;
        }
      } else if (night && !reducedMotion) {
        const clouds = img(CLOUDS, bump);
        if (clouds) {
          ctx.globalAlpha = 0.15;
          ctx.drawImage(clouds, 80, 10, 512, 128);
          ctx.globalAlpha = 1;
        }
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
        const level = lot.id === 'cofre' ? 0 : (buildings[lot.id as BuildingId] || 0);
        const src = buildingSprite(lot.id === 'cofre' ? 'bau' : lot.id as BuildingId, lot.id === 'cofre' ? 0 : level);
        const sprite = img(src, bump);
        const destW = level === 0 ? lot.w * 0.6 : lot.w;
        const destH = destW;
        const dx = lot.x + lot.w / 2 - destW / 2;
        const dy = lot.y + lot.h - destH;
        const hit: Hotspot = { id: `build:${lot.id}`, x: lot.x, y: lot.y, w: lot.w, h: lot.h };
        hits.push(hit);
        layers.push({
          id: hit.id,
          y: lot.y + lot.h,
          hit,
          draw: (c) => {
            if (!sprite) return;
            const drawn = gated ? graySprite(sprite, destW, destH) : sprite;
            c.drawImage(drawn, dx, dy, destW, destH);
            if (gated) lockIcon(c, lot.x + lot.w / 2 - 14, lot.y + 8);
          },
        });
      });

      const miner = img(ISO_MINER, bump);
      const petSrc = village.character.pet ? PET_SPRITE[village.character.pet] : null;
      const pet = petSrc ? img(petSrc, bump) : null;
      const ch = anchors.character;
      const charH = ch.h;
      const charW = charH;
      const charBob = bob(0);
      const charHit: Hotspot = { id: 'character', x: ch.x - charW / 2, y: ch.y - charH + charBob, w: charW, h: charH };
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
          label(c, village.characterName || 'Heitor', ch.x, ch.y - charH - 6 + charBob);
        },
      });

      Object.entries(anchors.npcs).forEach(([npc, a], i) => {
        if (!a) return;
        const spr = img(ISO_NPC[npc], bump);
        const nBob = bob(220 * (i + 1));
        const nW = a.h;
        const nH = a.h;
        const hit: Hotspot = { id: `npc:${npc}`, x: a.x - nW / 2, y: a.y - nH + nBob, w: nW, h: nH };
        hits.push(hit);
        layers.push({
          id: hit.id,
          y: a.y,
          hit,
          draw: (c) => {
            groundShadow(c, a.x, a.y - 2, nW, night);
            if (spr) c.drawImage(spr, a.x - nW / 2, a.y - nH + nBob, nW, nH);
            label(c, NPC_LABEL[npc] || npc, a.x, a.y + 16);
          },
        });
      });

      const mine = anchors.hotspots?.mine;
      if (mine) {
        hits.push({ id: 'mine', x: mine.x, y: mine.y, w: mine.w, h: mine.h });
      }

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

      const water = anchors.water;
      if (water) {
        const wa = night
          ? (reducedMotion ? 0.06 : 0.05 + 0.05 * Math.sin(elapsed * 1.2))
          : (reducedMotion ? 0.12 : 0.1 + 0.1 * Math.sin(elapsed * 1.4));
        ctx.fillStyle = night ? `rgba(140,170,210,${wa})` : `rgba(180,220,255,${wa})`;
        ctx.fillRect(water.x, water.y + water.h * 0.45, water.w, water.h * 0.2);
      }

      ctx.save();
      if (hour >= 6 && hour < 10) {
        ctx.fillStyle = 'rgba(255,240,210,0.12)';
        ctx.fillRect(0, 0, W, H);
      } else if (hour >= 16 && hour < 19) {
        ctx.fillStyle = 'rgba(255,150,80,0.16)';
        ctx.fillRect(0, 0, W, H);
      } else if (night) {
        ctx.fillStyle = 'rgba(8, 14, 32, 0.48)';
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();

      if (night) {
        nightLamps(anchors, buildings).forEach((lamp) => paintLamp(ctx, lamp, elapsed, reducedMotion));
        if (!reducedMotion) {
          const camp = anchors.lights.find((l) => l.id === 'fogueira');
          if (camp) {
            for (let i = 0; i < 5; i++) {
              const x = camp.x + Math.sin(elapsed * 0.35 + i * 1.7) * 18 + (i - 2) * 4;
              const y = camp.y - 16 + Math.cos(elapsed * 0.5 + i * 0.9) * 8;
              const a = 0.18 + 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 3.6 + i));
              ctx.fillStyle = `rgba(255, 220, 120, ${a})`;
              ctx.beginPath();
              ctx.arc(x, y, 1.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      const over = hover.current;
      if (over) {
        outline(ctx, over.x, over.y, over.w, over.h, night);
        if (gated && (over.id.startsWith('build:') || over.id === 'mine')) {
          ctx.save();
          ctx.font = '700 13px Fredoka, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#17130f';
          ctx.fillRect(over.x + over.w / 2 - 90, over.y - 28, 180, 22);
          ctx.fillStyle = '#f6f2ec';
          ctx.fillText('Faça a prova do dia', over.x + over.w / 2, over.y - 12);
          ctx.restore();
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

    draw(performance.now());
    const onVis = () => { if (!document.hidden) { last.current = 0; draw(performance.now()); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [village, buildings, hour, gated, reducedMotion, anchors, speech, tick]);

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
        hover.current = next;
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
