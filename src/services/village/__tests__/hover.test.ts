import { expect, run, test } from '../../english/__tests__/harness';
import { hoverAnchor, hoverLabelPos, idleFrameIndex, idleBob, idleShift, pickHit, visibleGrowthMarks, DEFAULT_GROWTH, wrapDrift, breezeSway, paintWind, paintSkyLife, skipLotSprite } from '../../../components/hero/village/drawAmbient';
import { previewBuildingLevel } from '../../../config/village';

test('cerca: âncora no portão, não no rodapé da caixa AABB', () => {
  const fence = { x: 400, y: 500, w: 480, h: 72, hover: 'fence' as const };
  const a = hoverAnchor(fence);
  expect(a.x).toBe(640);
  expect(a.y < fence.y + fence.h - 8).toBe(true);
  expect(a.y > fence.y + 20).toBe(true);
});

test('pickHit pega o de cima e ignora fora da caixa', () => {
  const a = { x: 0, y: 0, w: 100, h: 100 };
  const b = { x: 40, y: 40, w: 20, h: 20 };
  expect(pickHit([a, b], 50, 50)).toBe(b);
  expect(pickHit([a, b], 200, 200)).toBe(undefined);
});

test('lote estreito ancora nos pés, não no centro', () => {
  const lot = { x: 147, y: 198, w: 102, h: 78, hover: 'building' as const };
  const a = hoverAnchor(lot);
  expect(a.y).toBe(lot.y + lot.h - 2);
});

test('placa do nome fica acima do sprite, não nos pés', () => {
  const npc = { x: 800, y: 200, w: 74, h: 74, hover: 'npc' as const };
  const label = hoverLabelPos(npc);
  expect(label.y < npc.y).toBe(true);
  expect(label.y + 18 <= npc.y).toBe(true);
  const mine = { x: 545, y: 32, w: 210, h: 138, hover: 'spot' as const };
  const mineLabel = hoverLabelPos(mine);
  expect(mineLabel.y < 32).toBe(true);
  expect(mineLabel.y + 18 < mine.y + mine.h / 2).toBe(true);
});

test('idle: pisca de vez em quando e respeita reducedMotion', () => {
  expect(idleFrameIndex(0, 1)).toBe(0);
  expect(idleFrameIndex(2900, 4)).toBe(1);
  expect(idleFrameIndex(2000, 4)).toBe(0);
  expect(idleBob(0, 0, false, true)).toBe(0);
  expect(idleShift(0, 0, true)).toBe(0);
});

test('crescimento: estágio 1 vazio, 2 e 3 acumulam marcas', () => {
  expect(visibleGrowthMarks(DEFAULT_GROWTH, 3).length).toBe(0);
  expect(visibleGrowthMarks(DEFAULT_GROWTH, 10).some((m) => m.kind === 'flowers')).toBe(true);
  expect(visibleGrowthMarks(DEFAULT_GROWTH, 10).some((m) => m.kind === 'bunting')).toBe(false);
  expect(visibleGrowthMarks(DEFAULT_GROWTH, 18).some((m) => m.kind === 'bunting')).toBe(true);
  expect(visibleGrowthMarks(DEFAULT_GROWTH, 18).some((m) => m.kind === 'bench')).toBe(true);
});

test('vento: deriva anda e volta ao começo', () => {
  expect(wrapDrift(0, 100, 10, 0)).toBe(0);
  expect(wrapDrift(2, 100, 10, 0)).toBe(20);
  expect(wrapDrift(10, 100, 10, 0)).toBe(0);
  expect(breezeSway(0, 0, 2)).toBe(0);
  expect(Math.abs(breezeSway(Math.PI / 1.4, 0, 2) - 2) < 0.05).toBe(true);
});

function fakeCtx() {
  const marks: string[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    imageSmoothingEnabled: false,
    fillRect() { marks.push('rect'); },
    beginPath() { marks.push('path'); },
    rect() {},
    arc() { marks.push('arc'); },
    moveTo() {},
    quadraticCurveTo() {},
    stroke() { marks.push('stroke'); },
    fill() { marks.push('fill'); },
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    clip() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
  };
  return { marks, ctx: ctx as unknown as CanvasRenderingContext2D };
}

test('céu e vento pintam de dia; noite some; reduced só desacelera', () => {
  const day = fakeCtx();
  paintSkyLife(day.ctx, 1280, 1.5, false, false, () => true);
  expect(day.marks.filter((m) => m === 'arc').length > 10).toBe(true);
  const night = fakeCtx();
  paintSkyLife(night.ctx, 1280, 1.5, true, false, () => true);
  expect(night.marks.length).toBe(0);
  const calm = fakeCtx();
  paintWind(calm.ctx, 1280, 640, 2, false, true);
  expect(calm.marks.filter((m) => m === 'arc').length > 6).toBe(true);
  const breeze = fakeCtx();
  paintWind(breeze.ctx, 1280, 640, 2, false, false);
  expect(breeze.marks.filter((m) => m === 'arc').length > 14).toBe(true);
});

test('torre construída desenha o sprite do nível; cerca construída usa o muro', () => {
  expect(skipLotSprite('torre', false)).toBe(false);
  expect(skipLotSprite('torre', true)).toBe(false);
  expect(skipLotSprite('cerca', false)).toBe(true);
  expect(skipLotSprite('cerca', true)).toBe(false);
  expect(skipLotSprite('fornalha', false)).toBe(false);
});

test('preview da Torre no localhost não mexe nos outros lotes', () => {
  expect(previewBuildingLevel('torre', 0)).toBe(0);
  expect(previewBuildingLevel('fornalha', 2)).toBe(2);
});

void run();
