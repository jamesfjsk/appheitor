import { expect, run, test } from './harness';
import { createRun, pickaxeFor } from '../../../components/hero/english/mine/engine';
import type { MineWord, RunPlan } from '../../../components/hero/english/mine/types';

const word: MineWord = {
  id: 'oak',
  word: 'oak',
  translation: 'carvalho',
  image: null,
  audio: null,
  hex: null,
};

const plan = (): RunPlan => ({
  words: [{ word, level: 1 }],
  pool: [word],
  seed: 1,
});

test('picareta forjada é o piso da Mina; combo sobe, errar não cai abaixo', () => {
  expect(pickaxeFor(0)).toBe(0);
  expect(pickaxeFor(0, 2)).toBe(2);
  expect(pickaxeFor(3, 0)).toBe(1);
  expect(pickaxeFor(3, 2)).toBe(2);
  expect(pickaxeFor(15, 2)).toBe(4);
  expect(pickaxeFor(0, 4)).toBe(4);

  const wood = createRun(plan(), { totalBlocks: 1 });
  expect(wood.pickaxe).toBe(0);
  const iron = createRun(plan(), { totalBlocks: 1, pickaxeFloor: 2 });
  expect(iron.pickaxe).toBe(2);
  expect(iron.config.pickaxeFloor).toBe(2);
  const diamond = createRun(plan(), { totalBlocks: 1, pickaxeFloor: 4 });
  expect(diamond.pickaxe).toBe(4);
});

void run();
