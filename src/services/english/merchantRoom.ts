// ========================================
// Arena de Inglês: sala do Comerciante gerada por código (seção 4.2)
// Sorteio de lugares, itens, passos e frases de reserva por semente; a IA só
// reescreve as frases. Módulo puro, roda em Node.
// ========================================

import type { MerchantContent, MerchantPlacement, MerchantSpot, MerchantStep, Relation } from '../../types/english';
import {
  MERCHANT_CATALOGS,
  RELATION_EN,
  RELATION_PT,
  type MerchantCatalogs,
  type MerchantItemDef,
  type MerchantSpotDef,
} from '../../config/englishBase';
import { NUMBER_WORDS } from '../../config/englishLevels';
import { createRng, pickOne, randInt, seededShuffle } from './shuffle';

/** Nível 1 = in/on; depois entram under e next to. Uma regra por sessão. */
export function lessonRelations(level: number): Relation[] {
  return clampLevel(level) === 1 ? ['in', 'on'] : ['in', 'on', 'under', 'next_to'];
}

/** Sobe pelo que ele acertou de primeira, no molde da Vagoneta. Nunca desce. */
export function merchantLevelFromSkill(done: number, perfect: number): 1 | 2 | 3 {
  const d = Math.max(0, Math.floor(Number(done) || 0));
  const p = Math.max(0, Math.floor(Number(perfect) || 0));
  if (d >= 7 && p >= 5) return 3;
  if (d >= 3 && p >= 3) return 2;
  return 1;
}

export function merchantStepKey(step: { item: string; relation: string; spot: string }): string {
  return `${step.item} ${step.relation} ${step.spot}`.toLowerCase();
}

export interface MerchantRoomOpts {
  /** Entregas já feitas: muda quantidade e enche a bandeja. */
  done?: number;
  /** Pedidos já usados (item+relação+lugar). Não voltam. */
  avoidSteps?: string[];
}

/** O par que um brasileiro troca: in/on, under/next to. */
export const CONTRAST_OF: Record<Relation, Relation> = {
  in: 'on',
  on: 'in',
  under: 'next_to',
  next_to: 'under',
};

/** Chave da sala para não repetir o mesmo trio item+preposição+lugar em 14 dias. */
export function merchantKey(steps: { item: string; relation: string; spot: string }[]): string {
  return steps.map((s) => `${s.item} ${s.relation} ${s.spot}`).join(' ').toLowerCase();
}

export interface MerchantRoom {
  spots: MerchantSpot[];
  items: { id: string; stock: number }[];
  steps: MerchantStep[];
}

export interface RoomEvaluation {
  hits: number;
  perStep: boolean[];
}

const clampLevel = (level: number): 1 | 2 | 3 => Math.min(3, Math.max(1, Math.round(level || 1))) as 1 | 2 | 3;

/** Lugares na sala: 4 (n1), 5 (n2), 6 (n3) */
export function roomSizeFor(level: number): number {
  return 3 + clampLevel(level);
}

/** Passos: 2 (n1), 3 (n2), 4 (n3) */
export function stepsFor(level: number): number {
  return 1 + clampLevel(level);
}

/** Chance de a bandeja ter 1 unidade a mais do item pedido (obriga a contar) */
const EXTRA_STOCK_CHANCE = 0.35;

const toSpot = (s: MerchantSpotDef): MerchantSpot => ({ id: s.id, label: s.label, image: s.image, relations: [...s.relations] });

/**
 * Sala-lição: uma preposição do nível em todos os pedidos (menos o último no
 * n2/n3, que contrapõe o par típico). Item nunca repete; lugar só no n3;
 * pedido 1 sempre qty 1; bandeja = passos + 1 distrator.
 */
export function buildMerchantRoom(
  seed: number,
  level: number,
  spotsCatalog: MerchantSpotDef[] = MERCHANT_CATALOGS.spots,
  itemsCatalog: MerchantItemDef[] = MERCHANT_CATALOGS.items,
  opts: MerchantRoomOpts = {}
): MerchantRoom {
  const rng = createRng(seed);
  const lv = clampLevel(level);
  const done = Math.max(0, Math.floor(opts.done ?? 0));
  const banned = new Set((opts.avoidSteps ?? []).map((k) => k.toLowerCase()));
  const size = Math.min(roomSizeFor(lv), spotsCatalog.length);
  const count = Math.min(stepsFor(lv), size, Math.max(0, itemsCatalog.length - 1));
  const pool = lessonRelations(lv);
  const need = lv < 3 ? count : 1;
  const viable = pool.filter((r) => spotsCatalog.filter((s) => s.relations.includes(r)).length >= need);
  const focus = pickOne(rng, viable.length ? viable : pool);
  const support = seededShuffle(
    spotsCatalog.filter((s) => s.relations.includes(focus)),
    rng
  );
  const decoys = seededShuffle(
    spotsCatalog.filter((s) => !s.relations.includes(focus)),
    rng
  );
  const keep = Math.min(support.length, Math.max(count, size - (decoys.length ? 1 : 0)));
  const spots = [...support.slice(0, keep), ...decoys, ...support.slice(keep)].slice(0, size);
  const contrast = CONTRAST_OF[focus];
  let reservedId: string | null = null;
  if (lv >= 2 && count >= 3 && contrast) {
    const extra = spotsCatalog.find((s) => s.relations.includes(contrast) && !spots.some((x) => x.id === s.id));
    const held = spots.find((s) => s.relations.includes(contrast)) ?? extra;
    if (held) {
      reservedId = held.id;
      if (!spots.some((s) => s.id === held.id)) spots[spots.length - 1] = held;
    }
  }
  const extraTray = Math.min(2, Math.floor(done / 3));
  const chosen = seededShuffle(itemsCatalog, rng).slice(0, count + 1 + extraTray);
  const usedSpots = new Set<string>();
  const steps: MerchantStep[] = [];
  for (let i = 0; i < count; i++) {
    const canContrast = i === count - 1 && Boolean(reservedId);
    const want: Relation = canContrast ? contrast : focus;
    const itemId = chosen[i].id;
    const free = (list: typeof spots) =>
      list.filter((s) => !banned.has(merchantStepKey({ item: itemId, relation: want, spot: s.id })));
    const open = free(
      spots.filter(
        (s) =>
          s.relations.includes(want) &&
          !usedSpots.has(s.id) &&
          (canContrast || !reservedId || s.id !== reservedId)
      )
    );
    const fallback = free(spots.filter((s) => s.relations.includes(want)));
    const spot = pickOne(rng, open.length ? open : fallback.length ? fallback : spots);
    const qtyMax = lv === 1 ? 2 : 3;
    const qty = (
      i === 0 && done < 2 ? 1 : i === 0 ? ((done % 2 === 0 ? 2 : 1) as 1 | 2) : randInt(rng, 1, qtyMax)
    ) as 1 | 2 | 3;
    steps.push({ item: itemId, qty, relation: want, spot: spot.id });
    usedSpots.add(spot.id);
  }
  const items = chosen.map((it, i) => {
    if (i < count) {
      const qty = steps[i].qty;
      const extra = qty < 3 && rng() < EXTRA_STOCK_CHANCE ? 1 : 0;
      return { id: it.id, stock: qty + extra };
    }
    return { id: it.id, stock: randInt(rng, 1, 3) };
  });
  return { spots: spots.map(toSpot), items, steps };
}

const findItem = (catalogs: MerchantCatalogs, id: string): MerchantItemDef | undefined => catalogs.items.find((i) => i.id === id);
const findSpot = (catalogs: MerchantCatalogs, id: string): MerchantSpotDef | undefined => catalogs.spots.find((s) => s.id === id);

const startsWithVowel = (w: string): boolean => /^[aeiou]/i.test(w);

/** "the torch" (único na bandeja), "an apple" (há mais de um), "two apples" */
export function itemPhrase(step: MerchantStep, def: MerchantItemDef, stock?: number): string {
  if (step.qty >= 2) return `${NUMBER_WORDS[step.qty]} ${def.plural}`;
  if (def.pluralOnly) return `the ${def.label}`;
  if (stock !== undefined && stock > 1) return `${startsWithVowel(def.label) ? 'an' : 'a'} ${def.label}`;
  return `the ${def.label}`;
}

const PT_NUMBERS: Record<1 | 2 | 3, { m: string; f: string }> = {
  1: { m: 'um', f: 'uma' },
  2: { m: 'dois', f: 'duas' },
  3: { m: 'três', f: 'três' },
};

function itemPhrasePt(step: MerchantStep, def: MerchantItemDef, stock?: number): string {
  if (step.qty >= 2) return `${PT_NUMBERS[step.qty][def.ptGender]} ${def.ptPlural}`;
  if (def.pluralOnly) return `${def.ptGender === 'f' ? 'as' : 'os'} ${def.ptPlural}`;
  if (stock !== undefined && stock > 1) return `${PT_NUMBERS[1][def.ptGender]} ${def.pt}`;
  return `${def.ptGender === 'f' ? 'a' : 'o'} ${def.pt}`;
}

/** "em cima de" + "a mesa" -> "em cima da mesa" */
function spotPhrasePt(relation: Relation, spot: MerchantSpotDef): string {
  const base = RELATION_PT[relation];
  return `${base.slice(0, -2)}d${spot.ptGender === 'f' ? 'a' : 'o'} ${spot.pt}`;
}

/** Aberturas por passo; todas dentro da allowlist do validador */
const OPENERS: { en: string; pt: string }[] = [
  { en: 'Put', pt: 'Coloque' },
  { en: 'Then put', pt: 'Depois coloque' },
  { en: 'Now put', pt: 'Agora coloque' },
  { en: 'Please put', pt: 'Por favor, coloque' },
];

/** Frases de reserva corretas por código, com tradução; `items` dá o estoque para escolher a/an ou the */
export function offlineSentences(
  steps: MerchantStep[],
  catalogs: MerchantCatalogs = MERCHANT_CATALOGS,
  items?: { id: string; stock: number }[]
): { sentences: string[]; translations: string[] } {
  const sentences: string[] = [];
  const translations: string[] = [];
  steps.forEach((step, i) => {
    const def = findItem(catalogs, step.item);
    const spot = findSpot(catalogs, step.spot);
    if (!def || !spot) {
      sentences.push('');
      translations.push('');
      return;
    }
    const stock = items?.find((it) => it.id === step.item)?.stock;
    const opener = OPENERS[i % OPENERS.length];
    sentences.push(`${opener.en} ${itemPhrase(step, def, stock)} ${RELATION_EN[step.relation]} the ${spot.label}.`);
    translations.push(`${opener.pt} ${itemPhrasePt(step, def, stock)} ${spotPhrasePt(step.relation, spot)}.`);
  });
  return { sentences, translations };
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blank = (text: string, word: string): string => text.replace(new RegExp(`\\b${escapeRe(word)}\\b`, 'gi'), '___');

/** Mesma frase com item e lugar trocados por ___ (o número fica) */
export function gapped(sentences: string[], steps: MerchantStep[], catalogs: MerchantCatalogs = MERCHANT_CATALOGS): string[] {
  return sentences.map((sentence, i) => {
    const step = steps[i];
    if (!step) return sentence;
    const def = findItem(catalogs, step.item);
    const spot = findSpot(catalogs, step.spot);
    let out = sentence;
    if (def) {
      out = blank(out, def.plural);
      out = blank(out, def.label);
    }
    if (spot) out = blank(out, spot.label);
    return out;
  });
}

/** Compara o estado final da sala com os passos (item, qty, relação, lugar); cada colocação vale uma vez */
export function evaluateRoom(steps: MerchantStep[], placements: MerchantPlacement[]): RoomEvaluation {
  const used = new Set<number>();
  const perStep = steps.map((step) => {
    const idx = placements.findIndex(
      (p, i) => !used.has(i) && p.item === step.item && p.qty === step.qty && p.relation === step.relation && p.spot === step.spot
    );
    if (idx < 0) return false;
    used.add(idx);
    return true;
  });
  return { hits: perStep.filter(Boolean).length, perStep };
}

/** Contrato do Comerciante inteiro por código (reserva infinita) */
export function buildMerchantContent(seed: number, level: number, catalogs: MerchantCatalogs = MERCHANT_CATALOGS): MerchantContent {
  const room = buildMerchantRoom(seed, level, catalogs.spots, catalogs.items);
  const { sentences, translations } = offlineSentences(room.steps, catalogs, room.items);
  return {
    spots: room.spots,
    items: room.items,
    steps: room.steps,
    sentences,
    gapped: gapped(sentences, room.steps, catalogs),
    translation: translations,
  };
}
