import { expect, run, test } from '../../english/__tests__/harness';
import { hoverAnchor, idleFrameIndex, idleBob, idleShift, pickHit, visibleGrowthMarks, DEFAULT_GROWTH } from '../../../components/hero/village/drawAmbient';

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

void run();
