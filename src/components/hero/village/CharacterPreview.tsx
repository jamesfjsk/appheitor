import React, { useEffect, useRef } from 'react';
import { ISO_MINER, PET_SPRITE, lookBodySrc } from '../../../config/village';
import type { VillageCharacter, VillageGear } from '../../../types/village';
import { lookKey, lookOverlaySrc, paintCharacterLook } from './drawCharacter';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

interface Props {
  character: VillageCharacter;
  gear?: VillageGear;
  size?: number;
  className?: string;
}

const CharacterPreview: React.FC<Props> = ({ character, gear, size = 96, className = '' }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = lookKey(character, gear);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    const petSrc = character.pet ? PET_SPRITE[character.pet] : null;
    const overlay = lookOverlaySrc(character, gear);
    void (async () => {
      try {
        const [base, iso, pet, cape, pickaxe] = await Promise.all([
          loadImage(lookBodySrc(character)),
          loadImage(ISO_MINER),
          petSrc ? loadImage(petSrc).catch(() => null) : Promise.resolve(null),
          overlay.cape ? loadImage(overlay.cape).catch(() => null) : Promise.resolve(null),
          overlay.pickaxe ? loadImage(overlay.pickaxe).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        paintCharacterLook(ctx, base, null, character, { pet, cape, pickaxe, gear, iso }, 'iso');
      } catch {
        if (!cancelled) ctx.clearRect(0, 0, 64, 64);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [character, gear, key]);

  return (
    <canvas
      ref={ref}
      width={64}
      height={64}
      className={`mc-pixel ${className}`}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
      aria-label="Minerador"
    />
  );
};

export default CharacterPreview;
