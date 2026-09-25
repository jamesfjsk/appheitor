import { expect, run, test } from './harness';
import { LEVELS } from '../../../config/englishLevels';
import { forgeItemMixFor, forgeStepDown, forgeTargetFor, lastForgeScore } from '../prompts';
import { validateForge } from '../validators';

test('forgeItemMixFor: ordem respeita o nível', () => {
  expect(forgeItemMixFor(1, 'order')).toEqual({ scramble: 2, gap: 4, typed: 0 });
  expect(forgeItemMixFor(2, 'order')).toEqual({ scramble: 3, gap: 3, typed: 0 });
  expect(forgeItemMixFor(3, 'order')).toEqual({ scramble: 4, gap: 1, typed: 1 });
});

test('forgeItemMixFor: forma continua sem scramble', () => {
  expect(forgeItemMixFor(1, 'form')).toEqual({ scramble: 0, gap: 4, typed: 2 });
  expect(forgeItemMixFor(2, 'form')).toEqual({ scramble: 0, gap: 3, typed: 3 });
  expect(forgeItemMixFor(3, 'form')).toEqual({ scramble: 0, gap: 2, typed: 4 });
});

test('other cai no rodízio; word_order continua ordem', () => {
  const targets = LEVELS[1].forgeTargets;
  const byOther = forgeTargetFor({ targets, dayIndex: 2, tag: 'other', yesterdayScore: 4, yesterdayMax: 6 });
  expect(byOther).toEqual(targets[2 % targets.length]);
  expect(byOther.kind === 'order' || byOther.kind === 'form').toBe(true);
  const byOrder = forgeTargetFor({ targets, dayIndex: 0, tag: 'word_order', yesterdayScore: 4, yesterdayMax: 6 });
  expect(byOrder.kind).toBe('order');
  expect(byOrder.id).toBe('tag_word_order');
});

test('forgeStepDown: 0 de 6 e 1 de 6 descem; 2 de 6 não', () => {
  expect(forgeStepDown(0, 6)).toBe(true);
  expect(forgeStepDown(1, 6)).toBe(true);
  expect(forgeStepDown(2, 6)).toBe(false);
  const targets = LEVELS[1].forgeTargets;
  const down = forgeTargetFor({ targets, dayIndex: 0, tag: 'word_order', yesterdayScore: 0, yesterdayMax: 6 });
  expect(down.kind).toBe('form');
  const stay = forgeTargetFor({ targets, dayIndex: 0, tag: 'word_order', yesterdayScore: 2, yesterdayMax: 6 });
  expect(stay.kind).toBe('order');
});

const forgePlan = (date: string, score: number | null, max = 6) => ({
  date,
  contracts: {
    c4: score === null ? { type: 'forge', result: null } : { type: 'forge', result: { score, max } },
  },
});

test('lastForgeScore: a aberta de ontem não esconde a concluída de anteontem', () => {
  const down = lastForgeScore([forgePlan('2026-09-23', 0), forgePlan('2026-09-24', null)], '2026-09-25');
  expect(down).toEqual({ score: 0, max: 6 });
  expect(forgeStepDown(down.score, down.max)).toBe(true);
  const stay = lastForgeScore([forgePlan('2026-09-23', 4), forgePlan('2026-09-24', null)], '2026-09-25');
  expect(stay).toEqual({ score: 4, max: 6 });
  expect(forgeStepDown(stay.score, stay.max)).toBe(false);
  const none = lastForgeScore([forgePlan('2026-09-24', null)], '2026-09-25');
  expect(none).toEqual({ score: 0, max: 0 });
  expect(forgeStepDown(none.score, none.max)).toBe(false);
});

test('validador: scramble de 6 peças no nível 1 cai; o de 5 fica', () => {
  const long = validateForge({
    target: 'ordem',
    items: [
      { kind: 'scramble', words: ['put', 'the', 'torch', 'on', 'the', 'table'], answer: 'Put the torch on the table.', rule: 'O verbo vem primeiro.' },
      { kind: 'gap', sentence: '___ the book.', options: ['Put', 'The', 'On'], answer: 0, rule: 'Verbo primeiro.' },
      { kind: 'gap', sentence: 'Open ___ door.', options: ['the', 'a', 'an'], answer: 0, rule: 'The marca a porta.' },
      { kind: 'gap', sentence: 'Give ___ the map.', options: ['me', 'I', 'my'], answer: 0, rule: 'Me vem depois do verbo.' },
      { kind: 'gap', sentence: 'Take the ___ .', options: ['key', 'keys', 'keyes'], answer: 0, rule: 'O objeto vem depois do verbo.' },
      { kind: 'gap', sentence: 'Close the ___.', options: ['box', 'boxes', 'boxs'], answer: 0, rule: 'O objeto fecha o pedido.' },
    ],
  }, 1, 1);
  expect(long.ok).toBe(false);
  expect(long.problems.some((p) => p.includes('scramble_longo'))).toBe(true);

  const five = validateForge({
    target: 'ordem',
    items: [
      { kind: 'scramble', words: ['open', 'the', 'red', 'door'], answer: 'Open the red door.', rule: 'O verbo vem primeiro.' },
      { kind: 'scramble', words: ['give', 'me', 'two', 'apples'], answer: 'Give me two apples.', rule: 'Give + me + o que.' },
      { kind: 'gap', sentence: '___ the book on the bed.', options: ['Put', 'The', 'On'], answer: 0, rule: 'Verbo primeiro.' },
      { kind: 'gap', sentence: 'Put the map ___ the table.', options: ['on', 'the', 'put'], answer: 0, rule: 'O lugar vem no fim.' },
      { kind: 'gap', sentence: '___ the blue box.', options: ['Open', 'The', 'Box'], answer: 0, rule: 'Verbo primeiro.' },
      { kind: 'gap', sentence: 'Take the key ___ the bag.', options: ['and', 'the', 'take'], answer: 0, rule: 'And junta os objetos.' },
    ],
  }, 1, 2);
  expect(five.ok).toBe(true);
  expect(five.problems.some((p) => p.includes('scramble_longo'))).toBe(false);
  expect(five.content.items.filter((it) => it.kind === 'scramble')).toHaveLength(2);
});

void run();
