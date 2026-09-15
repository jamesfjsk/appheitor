import React, { useEffect, useRef } from 'react';
import { PET_SPRITE, characterBaseSrc } from '../../../config/village';
import type { VillageCharacter, VillageGear } from '../../../types/village';
import { TORSO_MASK_SRC, paintCharacterLook } from './drawCharacter';

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

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    const petSrc = character.pet ? PET_SPRITE[character.pet] : null;
    void (async () => {
      try {
        const [base, torso, pet] = await Promise.all([
          loadImage(characterBaseSrc(character, gear)),
          loadImage(TORSO_MASK_SRC).catch(() => null),
          petSrc ? loadImage(petSrc).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        paintCharacterLook(ctx, base, torso, character, pet);
      } catch {
        if (!cancelled) {
          ctx.clearRect(0, 0, 64, 64);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [character, gear]);

  return (
    <canvas
      ref={ref}
      width={64}
      height={64}
      className={`mc-pixel ${className}`}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
      aria-label="Como o minerador vai ficar"
    />
  );
};

export default CharacterPreview;
