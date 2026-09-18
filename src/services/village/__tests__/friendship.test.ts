import { expect, run, test } from '../../english/__tests__/harness';
import { claimKey } from '../claims';
import { tierGifts } from '../friendship';

test('tierGifts paga 3 e 5 nos dois saltos e não repete chave antiga', () => {
  const none = tierGifts('sabio', 2, 2, {});
  expect(none.length).toBe(0);
  const emerald = tierGifts('comerciante', 2, 3, {});
  expect(emerald).toEqual([{ key: 'npcgift:comerciante:3', rare: 'esmeralda' }]);
  const diamond = tierGifts('ferreiro', 4, 5, {});
  expect(diamond).toEqual([{ key: 'npcgift:ferreiro:5', rare: 'diamante' }]);
  const both = tierGifts('olheiro', 2, 5, {});
  expect(both.length).toBe(2);
  expect(both[0].rare).toBe('esmeralda');
  expect(both[1].rare).toBe('diamante');
  const paid = { 'npcgift:sabio:3': '2026-09-01' };
  expect(tierGifts('sabio', 2, 3, paid).length).toBe(0);
  const old = { [claimKey('friend', 'sabio:3')]: '2026-09-01' };
  expect(tierGifts('sabio', 2, 3, old).length).toBe(0);
});

run();
