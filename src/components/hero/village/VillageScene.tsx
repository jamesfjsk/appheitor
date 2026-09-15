import React, { useEffect, useRef } from 'react';
import { BUILDINGS, type BuildingId } from '../../../config/englishBase';
import { buildingSprite, characterSpriteSrc } from '../../../config/village';
import type { VillageDoc } from '../../../types/village';

const TILE = '/assets/village/tiles/grass-path.png';
const SABIO = '/assets/village/npc/sabio.png';
const COMERCIANTE = '/assets/village/npc/comerciante.png';
const W = 1280;
const H = 460;

type Hotspot = { id: string; x: number; y: number; w: number; h: number };

const cache = new Map<string, HTMLImageElement>();
function img(src: string): HTMLImageElement | null {
  const hit = cache.get(src);
  if (hit) return hit.complete ? hit : null;
  const el = new Image();
  el.src = src;
  cache.set(src, el);
  return el.complete ? el : null;
}

function sky(ctx: CanvasRenderingContext2D, hour: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (hour >= 21 || hour < 6) {
    g.addColorStop(0, '#0b1020');
    g.addColorStop(1, '#1a2238');
  } else if (hour >= 18) {
    g.addColorStop(0, '#c45c2d');
    g.addColorStop(1, '#2f2a27');
  } else if (hour >= 16) {
    g.addColorStop(0, '#7eb6d9');
    g.addColorStop(1, '#e8d5a3');
  } else {
    g.addColorStop(0, '#7ec8e3');
    g.addColorStop(1, '#cfe7a5');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (hour >= 21 || hour < 6) {
    ctx.fillStyle = '#f5f5f5';
    for (let i = 0; i < 28; i++) {
      const x = (i * 97) % W;
      const y = (i * 53) % 160;
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function lock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#17130f';
  ctx.fillRect(x + 10, y + 18, 28, 22);
  ctx.strokeStyle = '#17130f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 24, y + 18, 10, Math.PI, 0);
  ctx.stroke();
}

interface Props {
  village: VillageDoc;
  buildings: Record<BuildingId, number>;
  hour: number;
  gated: boolean;
  reducedMotion: boolean;
  onClickSpot: (id: string) => void;
}

const VillageScene: React.FC<Props> = ({ village, buildings, hour, gated, reducedMotion, onClickSpot }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const spots = useRef<Hotspot[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || W;
      const cssH = Math.round(cssW * (H / W));
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr * (cssW / W), 0, 0, dpr * (cssH / H), 0, 0);
      ctx.imageSmoothingEnabled = false;
      sky(ctx, hour);
      const tile = img(TILE);
      if (tile) {
        for (let x = 0; x < W; x += 64) {
          for (let y = 220; y < H; y += 64) ctx.drawImage(tile, x, y, 64, 64);
        }
      } else {
        ctx.fillStyle = '#5b9b3a';
        ctx.fillRect(0, 220, W, H - 220);
      }

      const lots: Hotspot[] = [];
      BUILDINGS.forEach((b, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 80 + col * 240;
        const y = 200 + row * 110;
        const level = buildings[b.id] || 0;
        const src = buildingSprite(b.id, level);
        const sprite = img(src) || img(b.icon);
        if (sprite) ctx.drawImage(sprite, x, y, 96, 96);
        else {
          ctx.fillStyle = '#5a5048';
          ctx.fillRect(x, y, 96, 96);
        }
        if (b.id === 'fornalha' && level >= 1 && !reducedMotion) {
          ctx.fillStyle = `rgba(200,200,200,${0.4 + (frame.current % 40) / 80})`;
          ctx.fillRect(x + 40, y - 8 - (frame.current % 20), 10, 16);
        }
        lots.push({ id: `build:${b.id}`, x, y, w: 96, h: 96 });
      });

      const bob = reducedMotion ? 0 : (Math.floor(frame.current / 20) % 2);
      const charSrc = characterSpriteSrc(village.gear, village.character.shirt);
      const miner = img(charSrc);
      const cx = 980;
      const cy = 250 + bob;
      if (miner) ctx.drawImage(miner, cx, cy, 64, 64);
      lots.push({ id: 'character', x: cx, y: cy, w: 64, h: 64 });

      const sabio = img(SABIO);
      if (sabio) ctx.drawImage(sabio, 1080, 240, 64, 64);
      lots.push({ id: 'npc:sabio', x: 1080, y: 240, w: 64, h: 64 });
      const merc = img(COMERCIANTE);
      if (merc) ctx.drawImage(merc, 1180, 250, 64, 64);
      lots.push({ id: 'npc:comerciante', x: 1180, y: 250, w: 64, h: 64 });

      if (gated) {
        ['build:fornalha', 'character'].forEach(() => undefined);
        lock(ctx, 80, 200);
        lock(ctx, 320, 200);
        lock(ctx, 980, 250);
      }

      spots.current = lots;
      if (!document.hidden && !reducedMotion) {
        frame.current += 1;
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    const onVis = () => { if (!document.hidden) draw(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [village, buildings, hour, gated, reducedMotion]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const hit = [...spots.current].reverse().find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (hit) onClickSpot(hit.id);
  };

  return (
    <canvas
      ref={ref}
      className="w-full rounded-lg border-4 border-[#17130f] cursor-pointer"
      style={{ aspectRatio: `${W} / ${H}` }}
      onClick={onClick}
      role="img"
      aria-label="Vila"
    />
  );
};

export default VillageScene;
