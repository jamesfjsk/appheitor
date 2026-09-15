import { expect, run, test } from './harness';
import { createRng, mixSeed, randInt, seedFromString, seededShuffle, shuffleOptions } from '../shuffle';

test('seedFromString é determinístico e distingue strings', () => {
  expect(seedFromString('uid_2026-09-14')).toBe(seedFromString('uid_2026-09-14'));
  expect(seedFromString('uid_2026-09-14')).not.toBe(seedFromString('uid_2026-09-15'));
  expect(seedFromString('')).not.toBe(0);
});

test('createRng repete a sequência e fica em [0, 1)', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) {
    const v = a();
    expect(v).toBe(b());
    expect(v >= 0 && v < 1).toBeTruthy();
  }
  expect(randInt(createRng(7), 1, 3) >= 1).toBeTruthy();
});

test('mixSeed deriva sementes diferentes por sal', () => {
  expect(mixSeed(1, 'q0')).not.toBe(mixSeed(1, 'q1'));
  expect(mixSeed(1, 'q0')).toBe(mixSeed(1, 'q0'));
});

test('seededShuffle preserva os elementos e não altera o original', () => {
  const src = [1, 2, 3, 4, 5, 6];
  const out = seededShuffle(src, 99);
  expect(src).toEqual([1, 2, 3, 4, 5, 6]);
  expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  expect(seededShuffle(src, 99)).toEqual(out);
});

test('shuffleOptions nunca devolve a ordem original em 1000 sementes e remapeia answer', () => {
  const options = ['a', 'b', 'c', 'd'];
  for (let seed = 1; seed <= 1000; seed++) {
    const r = shuffleOptions(options, 2, seed);
    expect(r.options.join('')).not.toBe('abcd');
    expect(r.options[r.answer]).toBe('c');
    expect([...r.options].sort().join('')).toBe('abcd');
  }
});

test('shuffleOptions com 2 opções sempre troca', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const r = shuffleOptions(['yes', 'no'], 0, seed);
    expect(r.options).toEqual(['no', 'yes']);
    expect(r.answer).toBe(1);
  }
});

test('shuffleOptions com valores repetidos ainda muda a ordem visível', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = shuffleOptions(['a', 'a', 'b'], 2, seed);
    expect(r.options.join('')).not.toBe('aab');
    expect(r.options[r.answer]).toBe('b');
  }
});

test('shuffleOptions com todos iguais ou 1 opção não trava', () => {
  expect(shuffleOptions(['x', 'x'], 0, 3).options).toEqual(['x', 'x']);
  expect(shuffleOptions(['only'], 0, 3)).toEqual({ options: ['only'], answer: 0 });
  expect(shuffleOptions([], 0, 3).options).toEqual([]);
});

void run();
