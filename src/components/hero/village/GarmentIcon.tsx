import React from 'react';

type Kind = 'shirt' | 'pants' | 'cape' | 'scarf';

function rgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function tone(hex: string, add: number): string {
  const [r, g, b] = rgb(hex);
  const t = (c: number) => Math.max(0, Math.min(255, c + add));
  return `rgb(${t(r)},${t(g)},${t(b)})`;
}

const GarmentIcon: React.FC<{ kind: Kind; hex?: string; ghost?: boolean; size?: number }> = ({
  kind,
  hex = '#8B5A2B',
  ghost = false,
  size = 32,
}) => {
  const fill = ghost ? '#5a534c' : hex;
  const lite = ghost ? '#7a736c' : tone(fill, 42);
  const dark = ghost ? '#3a342f' : tone(fill, -48);
  const line = '#120e0c';
  const clasp = ghost ? '#8a7a4a' : '#E8B923';
  return (
    <svg
      className={`mn-garment mc-pixel ${ghost ? 'is-ghost' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
    >
      {kind === 'shirt' ? (
        <>
          <rect x="1" y="3" width="4" height="4" fill={fill} />
          <rect x="11" y="3" width="4" height="4" fill={fill} />
          <rect x="3" y="4" width="10" height="10" fill={fill} />
          <rect x="6" y="2" width="4" height="3" fill={fill} />
          <rect x="1" y="3" width="4" height="1" fill={lite} />
          <rect x="11" y="3" width="4" height="1" fill={lite} />
          <rect x="6" y="2" width="4" height="1" fill={lite} />
          <rect x="4" y="12" width="8" height="2" fill={dark} />
          <rect x="1" y="6" width="1" height="1" fill={dark} />
          <rect x="14" y="6" width="1" height="1" fill={dark} />
          <rect x="7" y="3" width="2" height="1" fill={line} />
          <rect x="1" y="3" width="14" height="1" fill={line} opacity="0.35" />
        </>
      ) : kind === 'pants' ? (
        <>
          <rect x="4" y="2" width="8" height="5" fill={fill} />
          <rect x="3" y="6" width="4" height="8" fill={fill} />
          <rect x="9" y="6" width="4" height="8" fill={fill} />
          <rect x="4" y="2" width="8" height="1" fill={lite} />
          <rect x="3" y="12" width="4" height="2" fill={dark} />
          <rect x="9" y="12" width="4" height="2" fill={dark} />
          <rect x="7" y="6" width="2" height="3" fill={dark} />
          <rect x="4" y="2" width="8" height="1" fill={line} opacity="0.4" />
        </>
      ) : kind === 'scarf' ? (
        <>
          <rect x="2" y="4" width="12" height="3" fill={fill} />
          <rect x="2" y="4" width="12" height="1" fill={lite} />
          <rect x="2" y="7" width="4" height="7" fill={fill} />
          <rect x="2" y="7" width="1" height="7" fill={lite} />
          <rect x="2" y="12" width="4" height="2" fill={dark} />
          <rect x="7" y="4" width="2" height="3" fill={clasp} />
        </>
      ) : (
        <>
          <rect x="1" y="5" width="5" height="10" fill={fill} />
          <rect x="10" y="5" width="5" height="9" fill={fill} />
          <rect x="3" y="3" width="10" height="4" fill={fill} />
          <rect x="1" y="5" width="5" height="1" fill={lite} />
          <rect x="10" y="5" width="5" height="1" fill={lite} />
          <rect x="3" y="3" width="10" height="1" fill={lite} />
          <rect x="1" y="13" width="5" height="2" fill={dark} />
          <rect x="10" y="12" width="5" height="2" fill={dark} />
          <rect x="7" y="4" width="2" height="3" fill={clasp} />
        </>
      )}
    </svg>
  );
};

export default GarmentIcon;
