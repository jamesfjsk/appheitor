/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useRef } from 'react';

/** Obra caída: pedaços do próprio sprite, não rabisco em cima do prédio intacto. */

function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, HTMLCanvasElement>();

function mound(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(42, 28, 16, 0.55)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.88, w * 0.42, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(86, 58, 34, 0.6)';
  ctx.beginPath();
  ctx.ellipse(w * 0.46, h * 0.82, w * 0.32, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(24, 16, 10, 0.45)';
  ctx.beginPath();
  ctx.ellipse(w * 0.58, h * 0.92, w * 0.24, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
}

function beam(ctx: CanvasRenderingContext2D, x: number, y: number, bw: number, bh: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.restore();
}

function bakeRuins(sprite: CanvasImageSource, w: number, h: number, seed: string): HTMLCanvasElement {
  const src = 'src' in sprite ? String((sprite as HTMLImageElement).src || '') : '';
  const key = `ruin|${seed}|${src}|${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d');
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!tctx || !ctx) return off;
  tctx.imageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  tctx.drawImage(sprite, 0, 0, w, h);

  mound(ctx, w, h);

  const rng = mulberry(seedOf(seed) || 1);
  const chunk = (
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number,
    rot: number, alpha: number,
  ) => {
    const x = Math.max(0, Math.round(sx));
    const y = Math.max(0, Math.round(sy));
    let cw = Math.max(1, Math.round(sw));
    let ch = Math.max(1, Math.round(sh));
    if (x >= w || y >= h) return;
    if (x + cw > w) cw = w - x;
    if (y + ch > h) ch = h - y;
    const tw = Math.max(2, Math.round(dw));
    const th = Math.max(2, Math.round(dh));
    if (cw < 2 || ch < 2) return;
    ctx.save();
    ctx.translate(Math.round(dx + tw / 2), Math.round(dy + th / 2));
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.drawImage(tmp, x, y, cw, ch, Math.round(-tw / 2), Math.round(-th / 2), tw, th);
    ctx.restore();
  };

  chunk(w * 0.08, 0, w * 0.84, h * 0.42, w * 0.1, h * 0.5, w * 0.82, h * 0.34, 0.48, 1);
  chunk(0, h * 0.22, w * 0.36, h * 0.52, w * 0.04, h * 0.4, w * 0.32, h * 0.4, -0.22, 1);
  chunk(w * 0.3, h * 0.4, w * 0.38, h * 0.4, w * 0.28, h * 0.58, w * 0.38, h * 0.28, 0.04, 1);
  chunk(w * 0.6, h * 0.48, w * 0.38, h * 0.42, w * 0.54, h * 0.62, w * 0.36, h * 0.24, 0.16, 1);
  chunk(0, 0, w * 0.3, h * 0.26, w * 0.14, h * 0.6, w * 0.24, h * 0.18, -0.32, 1);
  for (let i = 0; i < 3; i++) {
    const sw = w * (0.14 + rng() * 0.12);
    const sh = h * (0.1 + rng() * 0.1);
    chunk(
      w * (0.2 + rng() * 0.45), h * (0.28 + rng() * 0.4), sw, sh,
      w * (0.16 + rng() * 0.5), h * (0.64 + rng() * 0.16),
      sw, sh * 0.7,
      (rng() - 0.5) * 0.5, 0.92,
    );
  }

  beam(ctx, w * 0.34, h * 0.78, w * 0.3, Math.max(3, h * 0.05), -0.28, '#3a2818');
  beam(ctx, w * 0.62, h * 0.8, w * 0.24, Math.max(3, h * 0.045), 0.22, '#2a1a10');

  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(36, 22, 12, 0.18)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  cache.set(key, off);
  if (cache.size > 24) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return off;
}

export function paintRuinedSprite(
  ctx: CanvasRenderingContext2D,
  sprite: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  seed: string,
  shakeX = 0,
  alpha = 1,
): void {
  const w = Math.max(1, Math.round(dw));
  const h = Math.max(1, Math.round(dh));
  const baked = bakeRuins(sprite, w, h, seed);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(baked, dx + shakeX, dy, dw, dh);
  ctx.restore();
}

export function paintLotRuins(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  shakeX = 0,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x + shakeX, y);
  mound(ctx, w, h);
  beam(ctx, w * 0.32, h * 0.7, w * 0.28, h * 0.1, -0.3, '#3a2818');
  beam(ctx, w * 0.58, h * 0.66, w * 0.3, h * 0.12, 0.22, '#24160e');
  beam(ctx, w * 0.46, h * 0.78, w * 0.36, h * 0.08, 0.08, '#4a3220');
  ctx.restore();
}

export const RuinThumb: React.FC<{ src: string; seed: string; size?: number; className?: string }> = ({
  src, seed, size = 96, className = '',
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const img = new Image();
    img.onload = () => {
      const ctx = el.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, el.width, el.height);
      paintRuinedSprite(ctx, img, 0, 0, el.width, el.height, seed);
    };
    img.src = src;
  }, [src, seed]);
  return <canvas ref={ref} width={size} height={size} className={`mc-pixel ${className}`.trim()} />;
};
