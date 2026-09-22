import { expect, run, test } from './harness';
import type { MerchantContent, MerchantSpot, MerchantStep } from '../../../types/english';
import { MERCHANT_CATALOGS } from '../../../config/englishBase';
import {
  DEFAULT_MERCHANT_SCENE,
  addPlacement,
  assignAnchors,
  buildMerchantOutcome,
  correctionFix,
  correctionLine,
  gradeLine,
  missKind,
  praiseLine,
  hitSlot,
  itemDrawPos,
  liveCountForStep,
  liveSlotsForStep,
  parseMerchantScene,
  pickStageSpots,
  relationAtPoint,
  remainingStock,
  roleOf,
  sentenceBits,
  zonesFor,
  zonesOverlap,
} from '../merchantPlay';

const box: MerchantSpot = { id: 'box', label: 'box', image: '', relations: ['in', 'on', 'next_to'] };
const table: MerchantSpot = { id: 'table', label: 'table', image: '', relations: ['on', 'under', 'next_to'] };
const windowSpot: MerchantSpot = { id: 'window', label: 'window', image: '', relations: ['next_to', 'under'] };
const chest: MerchantSpot = { id: 'chest', label: 'chest', image: '', relations: ['in', 'on', 'next_to'] };

const content = (spots: MerchantSpot[], steps: MerchantStep[]): MerchantContent => ({
  spots,
  items: steps.map((s) => ({ id: s.item, stock: s.qty })).concat([{ id: 'bone', stock: 1 }]),
  steps,
  sentences: steps.map(() => ''),
  gapped: steps.map(() => ''),
  translation: steps.map(() => ''),
});

test('roleOf: parede, balcão e chão', () => {
  expect(roleOf('window')).toBe('wall');
  expect(roleOf('door')).toBe('wall');
  expect(roleOf('table')).toBe('counter');
  expect(roleOf('box')).toBe('floor');
  expect(roleOf('chest')).toBe('floor');
});

test('liveSlotsForStep: 1, depois 2, depois 3; o pedido sempre entra', () => {
  const slots = assignAnchors([windowSpot, table, box, chest], DEFAULT_MERCHANT_SCENE.spots);
  const s1 = liveSlotsForStep(slots, { spot: 'table' }, 0);
  const s2 = liveSlotsForStep(slots, { spot: 'box' }, 1);
  const s3 = liveSlotsForStep(slots, { spot: 'chest' }, 2);
  expect(liveCountForStep(0)).toBe(1);
  expect(liveCountForStep(1)).toBe(2);
  expect(liveCountForStep(2)).toBe(3);
  expect(liveCountForStep(5)).toBe(3);
  expect(s1).toHaveLength(1);
  expect(s1[0].spot.id).toBe('table');
  expect(s2).toHaveLength(2);
  expect(s2.some((s) => s.spot.id === 'box')).toBeTruthy();
  expect(s2.some((s) => s.spot.id !== 'box')).toBeTruthy();
  expect(s3).toHaveLength(3);
  expect(s3.some((s) => s.spot.id === 'chest')).toBeTruthy();
  expect(new Set(s3.map((s) => s.spot.id)).size).toBe(3);
});

test('pickStageSpots: pedidos primeiro, teto 4', () => {
  const spots = [box, table, windowSpot, chest, { id: 'bed', label: 'bed', image: '', relations: ['on'] as MerchantSpot['relations'] }];
  const steps: MerchantStep[] = [
    { item: 'apple', qty: 1, relation: 'on', spot: 'table' },
    { item: 'key', qty: 1, relation: 'in', spot: 'chest' },
  ];
  const picked = pickStageSpots(content(spots, steps), 4);
  expect(picked.map((s) => s.id)).toEqual(['table', 'chest', 'box', 'window']);
  expect(picked).toHaveLength(4);
});

test('assignAnchors com semente: banco e baú trocam de lugar; mesma semente repete', () => {
  const movable = assignAnchors([table, box, chest], DEFAULT_MERCHANT_SCENE.spots, 7);
  const again = assignAnchors([table, box, chest], DEFAULT_MERCHANT_SCENE.spots, 7);
  expect(movable.map((s) => `${s.spot.id}:${s.anchor.id}`)).toEqual(again.map((s) => `${s.spot.id}:${s.anchor.id}`));
  let moved = false;
  for (let seed = 1; seed <= 40; seed++) {
    const a = assignAnchors([table, box], DEFAULT_MERCHANT_SCENE.spots, seed);
    const b = assignAnchors([table, box], DEFAULT_MERCHANT_SCENE.spots, seed + 17);
    if (a.find((s) => s.spot.id === 'table')?.anchor.id !== b.find((s) => s.spot.id === 'table')?.anchor.id) {
      moved = true;
      break;
    }
  }
  expect(moved).toBeTruthy();
  const wall = assignAnchors([windowSpot, table], DEFAULT_MERCHANT_SCENE.spots, 3);
  expect(wall.find((s) => s.spot.id === 'window')?.anchor.role).toBe('wall');
});

test('assignAnchors: janela na parede, mesa no balcão, caixa no chão', () => {
  const slots = assignAnchors([windowSpot, table, box, chest], DEFAULT_MERCHANT_SCENE.spots);
  expect(slots.find((s) => s.spot.id === 'window')?.anchor.role).toBe('wall');
  expect(slots.find((s) => s.spot.id === 'table')?.anchor.role).toBe('counter');
  expect(slots.find((s) => s.spot.id === 'box')?.anchor.role).toBe('floor');
  expect(slots.find((s) => s.spot.id === 'chest')?.anchor.role).toBe('floor');
  expect(new Set(slots.map((s) => s.anchor.id)).size).toBe(4);
});

test('relationAtPoint: on / in / under / next_to no lugar certo', () => {
  const a = DEFAULT_MERCHANT_SCENE.spots[0];
  const onZ = zonesFor(a, ['on'])[0];
  const nextZ = zonesFor(a, ['next_to'], 'right')[0];
  const on = relationAtPoint(onZ.rect.x + onZ.rect.w / 2, onZ.rect.y + onZ.rect.h / 2, box, a);
  const inside = relationAtPoint(a.x + a.w * 0.5, a.y + a.h * 0.5, box, a);
  const beside = relationAtPoint(nextZ.rect.x + nextZ.rect.w / 2, nextZ.rect.y + nextZ.rect.h / 2, box, a, 'right');
  expect(on).toBe('on');
  expect(inside).toBe('in');
  expect(beside).toBe('next_to');
  expect(relationAtPoint(a.x + a.w * 0.5, a.y + a.h * 1.1, table, a)).toBe('under');
  expect(relationAtPoint(10, 10, box, a)).toBe(null);
});

test('next to é ao lado: tapete não cruza o de embaixo', () => {
  const bench = DEFAULT_MERCHANT_SCENE.spots[3];
  const furniture: MerchantSpot = { id: 'bench', label: 'bench', image: '', relations: ['on', 'under', 'next_to'] };
  expect(zonesOverlap(bench, furniture.relations, 'right')).toBeFalsy();
  const next = zonesFor(bench, ['next_to'], 'right')[0];
  const under = zonesFor(bench, ['under'], 'right')[0];
  expect(next.rect.x >= bench.x + bench.w).toBeTruthy();
  expect(under.rect.y >= bench.y + bench.h * 0.9).toBeTruthy();
  expect(relationAtPoint(next.rect.x + 20, next.rect.y + 20, furniture, bench, 'right')).toBe('next_to');
  expect(relationAtPoint(under.rect.x + under.rect.w / 2, under.rect.y + 12, furniture, bench, 'right')).toBe('under');
});

test('hitSlot escolhe a zona mais miúda', () => {
  const slots = assignAnchors([box, table], DEFAULT_MERCHANT_SCENE.spots.slice(0, 2));
  const a = slots[0].anchor;
  const hit = hitSlot(a.x + a.w * 0.5, a.y + a.h * 0.5, slots);
  expect(hit?.slot.spot.id).toBe(slots[0].spot.id);
  expect(hit?.relation).toBe('in');
});

test('itemDrawPos: on em cima, in mais baixo (metade), under abaixo, next_to ao lado', () => {
  const a = DEFAULT_MERCHANT_SCENE.spots[0];
  const on = itemDrawPos(a, 'on');
  const inside = itemDrawPos(a, 'in');
  const under = itemDrawPos(a, 'under');
  const next = itemDrawPos(a, 'next_to');
  expect(on.y < inside.y).toBeTruthy();
  expect(inside.clip).toBeTruthy();
  expect(under.y > a.y + a.h).toBeTruthy();
  expect(next.x > a.x + a.w).toBeTruthy();
});

test('correctionLine: On the box, not in.', () => {
  const step: MerchantStep = { item: 'lamp', qty: 1, relation: 'on', spot: 'box' };
  expect(correctionLine(step, { item: 'lamp', qty: 1, relation: 'in', spot: 'box' }, MERCHANT_CATALOGS)).toBe(
    'On é em cima, não dentro. Box é caixa. Em cima da caixa.'
  );
  expect(correctionLine(step, { item: 'lamp', qty: 1, relation: 'on', spot: 'table' }, MERCHANT_CATALOGS)).toBe(
    'Box é caixa. On é em cima. Em cima da caixa.'
  );
});

test('praiseLine: confirma item e lugar; o índice troca a frase', () => {
  const step: MerchantStep = { item: 'potion', qty: 1, relation: 'in', spot: 'barrel' };
  const a = praiseLine(step, 0);
  const b = praiseLine(step, 1);
  const c = praiseLine(step, 2);
  expect(a).toContain('poção');
  expect(a).toContain('dentro do barril');
  expect(c).toContain('corretamente');
  expect(a).not.toBe(b);
  expect(b).not.toBe(c);
  expect(praiseLine(step, 4)).toBe(a);
});

test('gradeLine e thanks', () => {
  const steps: MerchantStep[] = [
    { item: 'lamp', qty: 1, relation: 'on', spot: 'box' },
    { item: 'key', qty: 1, relation: 'in', spot: 'chest' },
    { item: 'apple', qty: 2, relation: 'under', spot: 'table' },
  ];
  expect(gradeLine(3, steps, [true, true, true])).toBe('Tudo no lugar. Pode guardar.');
  expect(gradeLine(2, steps, [true, true, false])).toContain("under");
  expect(gradeLine(0, steps, [false, false, false])).toContain('preposições');
});

test('buildMerchantOutcome: firstHits paga; attempts entra em details', () => {
  const steps: MerchantStep[] = [
    { item: 'lamp', qty: 1, relation: 'on', spot: 'box' },
    { item: 'key', qty: 1, relation: 'in', spot: 'chest' },
  ];
  const out = buildMerchantOutcome({
    steps,
    firstOk: [true, false],
    lastOk: [true, true],
    placements: [
      { item: 'lamp', qty: 1, relation: 'on', spot: 'box' },
      { item: 'key', qty: 1, relation: 'in', spot: 'chest' },
    ],
    listens: [1, 2],
    attempts: [1, 2],
    deliveries: 3,
    textShown: true,
    glossaryHovers: ['box'],
    misses: [[], ['relation']],
  });
  expect(out.score).toBe(1);
  expect(out.max).toBe(2);
  expect(out.details?.firstHits).toBe(1);
  expect(out.details?.finalHits).toBe(2);
  expect(out.details?.attempts).toEqual([1, 2]);
  expect(out.details?.textShown).toBe(true);
  expect(out.details?.misses).toEqual([{ step: 0, kinds: [] }, { step: 1, kinds: ['relation'] }]);
  expect(out.materialEarned).toBe(2);
});

test('addPlacement soma quantidade no mesmo lugar e recusa o segundo tapete', () => {
  const a = addPlacement([], { item: 'apple', qty: 1, relation: 'on', spot: 'table' });
  const b = addPlacement(a, { item: 'apple', qty: 1, relation: 'on', spot: 'table' });
  expect(b).toEqual([{ item: 'apple', qty: 2, relation: 'on', spot: 'table' }]);
  expect(remainingStock([{ id: 'apple', stock: 3 }], b).get('apple')).toBe(1);
  const refused = addPlacement(a, { item: 'apple', qty: 1, relation: 'in', spot: 'box' });
  expect(refused).toBe(a);
  expect(refused).toEqual([{ item: 'apple', qty: 1, relation: 'on', spot: 'table' }]);
});

test('missKind e correctionFix: en na tela, pt na boca', () => {
  const step: MerchantStep = { item: 'lamp', qty: 1, relation: 'on', spot: 'box' };
  expect(missKind(step, { item: 'lamp', qty: 1, relation: 'in', spot: 'box' })).toBe('relation');
  expect(missKind(step, { item: 'key', qty: 1, relation: 'on', spot: 'box' })).toBe('item');
  expect(missKind(step, { item: 'lamp', qty: 2, relation: 'on', spot: 'box' })).toBe('qty');
  expect(missKind(step, { item: 'lamp', qty: 1, relation: 'on', spot: 'table' })).toBe('spot');
  const fix = correctionFix(step, { item: 'lamp', qty: 1, relation: 'in', spot: 'box' });
  expect(fix.en).toBe('On the box, not in.');
  expect(fix.pt).toContain('em cima');
});

test('under da parede usa baseY', () => {
  const wall = DEFAULT_MERCHANT_SCENE.spots.find((s) => s.id === 'wall');
  expect(wall?.baseY).toBe(440);
  const z = zonesFor(wall!, ['under']);
  expect(z[0].rect.y).toBe(440);
});

test('sentenceBits marca palavra e pontuação', () => {
  const bits = sentenceBits('Put the torch next to the door.');
  expect(bits.filter((b) => b.word).map((b) => b.text)).toContain('torch');
  expect(bits.some((b) => b.text === '.')).toBeTruthy();
});

test('parseMerchantScene recusa lixo e aceita o JSON da cena', () => {
  expect(parseMerchantScene(null)).toBe(null);
  expect(parseMerchantScene({ size: { w: 10, h: 10 } })).toBe(null);
  const ok = parseMerchantScene(DEFAULT_MERCHANT_SCENE);
  expect(ok?.spots).toHaveLength(4);
});

void run();
