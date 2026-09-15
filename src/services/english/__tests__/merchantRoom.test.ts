import { expect, run, test } from './harness';
import type { MerchantStep } from '../../../types/english';
import { MERCHANT_CATALOGS, MERCHANT_ITEMS, MERCHANT_SPOTS } from '../../../config/englishBase';
import { buildMerchantContent, buildMerchantRoom, evaluateRoom, gapped, offlineSentences, roomSizeFor, stepsFor } from '../merchantRoom';

test('sala válida em 1000 sementes por nível (invariantes da seção 4.2)', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 1000; seed++) {
      const room = buildMerchantRoom(seed, level, MERCHANT_SPOTS, MERCHANT_ITEMS);
      const fail = (msg: string): never => {
        throw new Error(`semente ${seed} nível ${level}: ${msg}`);
      };
      if (room.spots.length < 4 || room.spots.length > 6) fail(`${room.spots.length} lugares`);
      if (room.spots.length !== roomSizeFor(level)) fail('tamanho da sala');
      if (new Set(room.spots.map((s) => s.id)).size !== room.spots.length) fail('lugar repetido na sala');
      if (room.steps.length !== stepsFor(level)) fail(`${room.steps.length} passos`);
      if (room.items.length !== room.steps.length + 1) fail('bandeja sem o distrator');
      const itemIds = room.steps.map((s) => s.item);
      if (new Set(itemIds).size !== itemIds.length) fail('item repetido');
      const spotIds = room.steps.map((s) => s.spot);
      if (level < 3 && new Set(spotIds).size !== spotIds.length) fail('lugar repetido fora do nível 3');
      for (const step of room.steps) {
        const spot = room.spots.find((s) => s.id === step.spot);
        if (!spot) fail('passo com lugar fora da sala');
        if (spot && !spot.relations.includes(step.relation)) fail(`relação ${step.relation} não permitida em ${step.spot}`);
        if (step.qty < 1 || step.qty > 3) fail('qty fora de 1-3');
        const tray = room.items.find((it) => it.id === step.item);
        if (!tray) fail('item do passo fora da bandeja');
        if (tray && tray.stock < step.qty) fail('estoque menor que a quantidade');
        if (tray && tray.stock > 3) fail('estoque acima de 3');
        if (!MERCHANT_ITEMS.some((it) => it.id === step.item)) fail('item fora do catálogo');
      }
      const distractor = room.items[room.items.length - 1];
      if (itemIds.includes(distractor.id)) fail('distrator é item de passo');
      if (distractor.stock < 1 || distractor.stock > 3) fail('estoque do distrator');
    }
  }
});

test('mesma semente, mesma sala; sementes diferentes variam', () => {
  const a = buildMerchantRoom(123, 2);
  const b = buildMerchantRoom(123, 2);
  expect(a).toEqual(b);
  const c = buildMerchantRoom(124, 2);
  expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
});

const steps: MerchantStep[] = [
  { item: 'torch', qty: 1, relation: 'next_to', spot: 'door' },
  { item: 'apple', qty: 2, relation: 'on', spot: 'table' },
  { item: 'key', qty: 3, relation: 'in', spot: 'chest' },
];
const tray = [
  { id: 'torch', stock: 1 },
  { id: 'apple', stock: 2 },
  { id: 'key', stock: 3 },
];

test('offlineSentences: artigo, plural, preposição e tradução corretos', () => {
  const { sentences, translations } = offlineSentences(steps, MERCHANT_CATALOGS, tray);
  expect(sentences).toEqual(['Put the torch next to the door.', 'Then put two apples on the table.', 'Now put three keys in the chest.']);
  expect(translations).toEqual([
    'Coloque a tocha ao lado da porta.',
    'Depois coloque duas maçãs em cima da mesa.',
    'Agora coloque três chaves dentro do baú.',
  ]);
});

test('offlineSentences: a/an quando há mais na bandeja, the para boots, plural irregular', () => {
  const s1 = offlineSentences([{ item: 'apple', qty: 1, relation: 'on', spot: 'table' }], MERCHANT_CATALOGS, [{ id: 'apple', stock: 2 }]);
  expect(s1.sentences[0]).toBe('Put an apple on the table.');
  expect(s1.translations[0]).toBe('Coloque uma maçã em cima da mesa.');
  const s2 = offlineSentences([{ item: 'torch', qty: 1, relation: 'under', spot: 'bed' }], MERCHANT_CATALOGS, [{ id: 'torch', stock: 3 }]);
  expect(s2.sentences[0]).toBe('Put a torch under the bed.');
  const s3 = offlineSentences([{ item: 'boots', qty: 1, relation: 'next_to', spot: 'fence' }], MERCHANT_CATALOGS, [{ id: 'boots', stock: 2 }]);
  expect(s3.sentences[0]).toBe('Put the boots next to the fence.');
  expect(s3.translations[0]).toBe('Coloque as botas ao lado da cerca.');
  const s4 = offlineSentences([{ item: 'torch', qty: 3, relation: 'in', spot: 'barrel' }]);
  expect(s4.sentences[0]).toBe('Put three torches in the barrel.');
  expect(s4.translations[0]).toBe('Coloque três tochas dentro do barril.');
  const s5 = offlineSentences([{ item: 'map', qty: 2, relation: 'on', spot: 'rug' }]);
  expect(s5.translations[0]).toBe('Coloque dois mapas em cima do tapete.');
});

test('gapped troca item e lugar por ___ e mantém o número', () => {
  const g = gapped(['Put the torch next to the door.', 'Then put two apples on the table.', 'Now put three keys in the chest.'], steps);
  expect(g).toEqual(['Put the ___ next to the ___.', 'Then put two ___ on the ___.', 'Now put three ___ in the ___.']);
  const ai = gapped(['Can you put the Torch next to the door, please?'], [steps[0]]);
  expect(ai[0]).toBe('Can you put the ___ next to the ___, please?');
  const single = gapped(['Put an orange on the shelf.'], [{ item: 'orange', qty: 1, relation: 'on', spot: 'shelf' }]);
  expect(single[0]).toBe('Put an ___ on the ___.');
});

test('evaluateRoom compara item, quantidade, relação e lugar; colocação vale uma vez', () => {
  const perfect = evaluateRoom(steps, [
    { item: 'key', qty: 3, relation: 'in', spot: 'chest' },
    { item: 'torch', qty: 1, relation: 'next_to', spot: 'door' },
    { item: 'apple', qty: 2, relation: 'on', spot: 'table' },
  ]);
  expect(perfect).toEqual({ hits: 3, perStep: [true, true, true] });
  const wrongQty = evaluateRoom(steps, [
    { item: 'torch', qty: 1, relation: 'next_to', spot: 'door' },
    { item: 'apple', qty: 1, relation: 'on', spot: 'table' },
    { item: 'key', qty: 3, relation: 'on', spot: 'chest' },
  ]);
  expect(wrongQty).toEqual({ hits: 1, perStep: [true, false, false] });
  expect(evaluateRoom(steps, []).hits).toBe(0);
  const twin: MerchantStep[] = [steps[0], { ...steps[0], item: 'sword' }];
  expect(evaluateRoom(twin, [{ item: 'torch', qty: 1, relation: 'next_to', spot: 'door' }]).hits).toBe(1);
});

test('buildMerchantContent monta o contrato inteiro', () => {
  const c = buildMerchantContent(77, 1);
  expect(c.sentences).toHaveLength(c.steps.length);
  expect(c.gapped).toHaveLength(c.steps.length);
  expect(c.translation).toHaveLength(c.steps.length);
  c.gapped.forEach((g) => expect(g.split('___').length - 1).toBe(2));
  c.sentences.forEach((s) => expect(s).toMatch(/^(Put|Then put|Now put|Please put) .+ the \w+\.$/));
});

void run();
