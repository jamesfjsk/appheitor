// ========================================
// Entrega do Comerciante v2: sala, zonas de queda, correção e resultado.
// Puro: sem React, sem Firebase. A tela só desenha o que daqui sai.
// ========================================

import type { ContractOutcome, MerchantContent, MerchantPlacement, MerchantSpot, MerchantStep, Relation } from '../../types/english';
import { MERCHANT_CATALOGS, RELATION_EN, RELATION_PT, type MerchantCatalogs, type MerchantSpotDef } from '../../config/englishBase';
import { NUMBER_WORDS } from '../../config/englishLevels';
import { merchantMaterial } from '../../config/englishRewards';
import { createRng, seededShuffle } from './shuffle';

export type AnchorRole = 'floor' | 'wall' | 'counter';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MerchantAnchor extends Rect {
  id: string;
  role: AnchorRole;
}

export interface MerchantSceneDef {
  size: { w: number; h: number };
  merchant: Rect & { face?: 'left' | 'right' };
  tray: Rect;
  rail?: Rect;
  spots: MerchantAnchor[];
}

export interface StageSlot {
  spot: MerchantSpot;
  anchor: MerchantAnchor;
  /** Lado livre: next to é ao lado, nunca embaixo nem “perto” */
  nextSide: 'left' | 'right';
}

export interface ZoneHit {
  relation: Relation;
  rect: Rect;
}

/** Mesmo texto da função de voz (`functions/src/index.ts`) */
export const TTS_INSTRUCTIONS =
  'fale devagar e com clareza, tom acolhedor, para uma criança de 10 anos aprendendo inglês, pausa curta entre as palavras';
export const TTS_SPEED = 0.9;
export const TTS_SPEED_SLOW = 0.75;

export const MERCHANT_BACKDROP = '/assets/village/scenes/comerciante/backdrop.png';
export const MERCHANT_ANCHORS_URL = '/assets/village/scenes/comerciante/anchors.json';
export const MERCHANT_SPRITE = '/assets/village/npc/comerciante-iso.png';
export const DESIGN = { w: 1280, h: 720 };

/** Quatro pontos fixos: dois no chão, um na parede, um no balcão. */
export const DEFAULT_MERCHANT_SCENE: MerchantSceneDef = {
  size: { w: 1280, h: 720 },
  merchant: { x: 36, y: 318, w: 210, h: 292, face: 'right' },
  tray: { x: 268, y: 588, w: 620, h: 84 },
  rail: { x: 0, y: 676, w: 1280, h: 44 },
  spots: [
    { id: 'floor-a', role: 'floor', x: 320, y: 400, w: 150, h: 136 },
    { id: 'floor-b', role: 'floor', x: 540, y: 414, w: 168, h: 136 },
    { id: 'wall', role: 'wall', x: 690, y: 128, w: 176, h: 176 },
    { id: 'counter', role: 'counter', x: 920, y: 378, w: 168, h: 126 },
  ],
};

/** O Comerciante ocupa a esquerda: next to não nasce em cima dele. */
const MERCHANT_BLOCK: Rect = { x: 0, y: 260, w: 260, h: 380 };

const WALL_IDS = new Set(['window', 'door', 'shelf', 'fence']);
const COUNTER_IDS = new Set(['table', 'bench', 'oven']);

export function roleOf(spotId: string): AnchorRole {
  if (WALL_IDS.has(spotId)) return 'wall';
  if (COUNTER_IDS.has(spotId)) return 'counter';
  return 'floor';
}

export function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function parseMerchantScene(raw: unknown): MerchantSceneDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<MerchantSceneDef>;
  if (!o.size || !o.merchant || !o.tray || !Array.isArray(o.spots) || o.spots.length < 4) return null;
  const spots = o.spots.filter((s) => s && typeof s.x === 'number' && typeof s.w === 'number') as MerchantAnchor[];
  if (spots.length < 4) return null;
  return {
    size: { w: Number(o.size.w) || DESIGN.w, h: Number(o.size.h) || DESIGN.h },
    merchant: o.merchant,
    tray: o.tray,
    rail: o.rail,
    spots: spots.slice(0, 4),
  };
}

/** Pedido 1 = 1 móvel; 2 = 2; 3 em diante = 3. O pedido sempre entra. */
export function liveCountForStep(stepIndex: number): number {
  return Math.min(3, Math.max(1, stepIndex + 1));
}

export function liveSlotsForStep(
  slots: StageSlot[],
  step: { spot: string } | undefined,
  stepIndex: number
): StageSlot[] {
  const n = liveCountForStep(stepIndex);
  if (!step || slots.length <= n) return slots.slice(0, n);
  const ask = slots.find((s) => s.spot.id === step.spot);
  const rest = slots.filter((s) => s.spot.id !== step.spot);
  const out: StageSlot[] = [];
  if (ask) out.push(ask);
  for (const s of rest) {
    if (out.length >= n) break;
    out.push(s);
  }
  return out;
}

/** Lugares do pedido primeiro; completa até 4 com o resto da sala. */
export function pickStageSpots(content: MerchantContent, limit = 4): MerchantSpot[] {
  const byId = new Map(content.spots.map((s) => [s.id, s]));
  const picked: MerchantSpot[] = [];
  const push = (spot: MerchantSpot | undefined): void => {
    if (!spot || picked.some((s) => s.id === spot.id) || picked.length >= limit) return;
    picked.push(spot);
  };
  for (const step of content.steps) push(byId.get(step.spot));
  for (const spot of content.spots) push(spot);
  return picked;
}

/** Lado com mais ar: next to mora aí, colado no móvel, não no vão de baixo. */
export function sideFor(anchor: Rect, others: Rect[]): 'left' | 'right' {
  const left = others.reduce((gap, o) => {
    if (o.x + o.w <= anchor.x + 1) return Math.min(gap, anchor.x - (o.x + o.w));
    return gap;
  }, anchor.x);
  const right = others.reduce((gap, o) => {
    if (o.x >= anchor.x + anchor.w - 1) return Math.min(gap, o.x - (anchor.x + anchor.w));
    return gap;
  }, DESIGN.w - (anchor.x + anchor.w));
  return right >= left ? 'right' : 'left';
}

/** Parede fica na parede. O resto (banco, baú, mesa) troca de chão/balcão. */
export function rolesFor(spotId: string): AnchorRole[] {
  if (WALL_IDS.has(spotId)) return ['wall'];
  return ['floor', 'counter'];
}

export function assignAnchors(spots: MerchantSpot[], anchors: MerchantAnchor[], seed?: number): StageSlot[] {
  if (seed == null) {
    const unused = [...anchors];
    const take = (role: AnchorRole): MerchantAnchor => {
      const i = unused.findIndex((a) => a.role === role);
      if (i >= 0) return unused.splice(i, 1)[0];
      return unused.shift() as MerchantAnchor;
    };
    const placed = spots.map((spot) => ({ spot, anchor: take(roleOf(spot.id)) }));
    const boxes = placed.map((s) => s.anchor);
    return placed.map((s) => ({
      ...s,
      nextSide: sideFor(s.anchor, [...boxes.filter((b) => b.id !== s.anchor.id), MERCHANT_BLOCK]),
    }));
  }
  const rng = createRng(seed);
  const pile = {
    floor: seededShuffle(anchors.filter((a) => a.role === 'floor'), rng),
    wall: seededShuffle(anchors.filter((a) => a.role === 'wall'), rng),
    counter: seededShuffle(anchors.filter((a) => a.role === 'counter'), rng),
  };
  const take = (roles: AnchorRole[]): MerchantAnchor => {
    for (const role of roles) {
      const next = pile[role].shift();
      if (next) return next;
    }
    for (const role of ['floor', 'counter', 'wall'] as AnchorRole[]) {
      const next = pile[role].shift();
      if (next) return next;
    }
    return anchors[0];
  };
  const placed = seededShuffle(spots, rng).map((spot) => ({ spot, anchor: take(rolesFor(spot.id)) }));
  const boxes = placed.map((s) => s.anchor);
  return placed.map((s) => ({
    ...s,
    nextSide: sideFor(s.anchor, [...boxes.filter((b) => b.id !== s.anchor.id), MERCHANT_BLOCK]),
  }));
}

/**
 * Quatro lugares que não se cruzam.
 * on = em cima; in = dentro; under = embaixo (janela: no chão da parede);
 * next to = ao lado (uma faixa), nunca “perto” nem o vão de baixo.
 */
export function zonesFor(
  anchor: MerchantAnchor,
  allowed: Relation[],
  nextSide: 'left' | 'right' = 'right'
): ZoneHit[] {
  const { x, y, w, h, role } = anchor;
  const padW = Math.max(88, Math.round(w * 0.55));
  const padH = Math.max(48, Math.round(h * 0.42));
  const on: ZoneHit = {
    relation: 'on',
    rect: { x: x + w * 0.14, y: y - h * 0.18, w: w * 0.72, h: Math.max(44, h * 0.32) },
  };
  const inside: ZoneHit = {
    relation: 'in',
    rect: { x: x + w * 0.22, y: y + h * 0.3, w: w * 0.56, h: h * 0.44 },
  };
  const under: ZoneHit =
    role === 'wall'
      ? { relation: 'under', rect: { x: x + w * 0.12, y: Math.max(y + h + 28, 348), w: w * 0.76, h: 64 } }
      : { relation: 'under', rect: { x: x + w * 0.22, y: y + h * 0.98, w: w * 0.56, h: Math.max(48, h * 0.38) } };
  const next_to: ZoneHit = {
    relation: 'next_to',
    rect:
      nextSide === 'left'
        ? { x: x - padW - 6, y: y + h * 0.3, w: padW, h: padH }
        : { x: x + w + 6, y: y + h * 0.3, w: padW, h: padH },
  };
  return [on, inside, under, next_to].filter((z) => allowed.includes(z.relation));
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Zona mais miúda que contém o ponto; null = chão / vazio (escorrega). */
export function relationAtPoint(
  x: number,
  y: number,
  spot: MerchantSpot,
  anchor: MerchantAnchor,
  nextSide: 'left' | 'right' = 'right'
): Relation | null {
  const hits = zonesFor(anchor, spot.relations, nextSide).filter((z) => contains(z.rect, x, y));
  if (!hits.length) return null;
  hits.sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h);
  return hits[0].relation;
}

export function hitSlot(x: number, y: number, slots: StageSlot[]): { slot: StageSlot; relation: Relation } | null {
  const found: { slot: StageSlot; relation: Relation; area: number }[] = [];
  for (const slot of slots) {
    const rel = relationAtPoint(x, y, slot.spot, slot.anchor, slot.nextSide);
    if (!rel) continue;
    const zone = zonesFor(slot.anchor, [rel], slot.nextSide).find((z) => contains(z.rect, x, y));
    found.push({ slot, relation: rel, area: zone ? zone.rect.w * zone.rect.h : 9e9 });
  }
  if (!found.length) return null;
  found.sort((a, b) => a.area - b.area);
  return { slot: found[0].slot, relation: found[0].relation };
}

/** Centro do item no tapete da relação. next to usa o lado livre. */
export function itemDrawPos(
  anchor: MerchantAnchor,
  relation: Relation,
  stackIndex = 0,
  nextSide: 'left' | 'right' = 'right'
): { x: number; y: number; clip: boolean } {
  const ox = stackIndex * 12;
  const oy = stackIndex * -8;
  const z = zonesFor(anchor, [relation], nextSide)[0];
  if (!z) {
    return { x: anchor.x + anchor.w / 2 + ox, y: anchor.y + anchor.h / 2 + oy, clip: false };
  }
  return {
    x: z.rect.x + z.rect.w / 2 + ox,
    y: z.rect.y + z.rect.h / 2 + oy,
    clip: relation === 'in',
  };
}

/** Os tapetes de um lugar não se atravessam (on / in / under / next to). */
export function zonesOverlap(anchor: MerchantAnchor, allowed: Relation[], nextSide: 'left' | 'right' = 'right'): boolean {
  const zs = zonesFor(anchor, allowed, nextSide);
  for (let i = 0; i < zs.length; i++) {
    for (let j = i + 1; j < zs.length; j++) {
      if (overlap(zs[i].rect, zs[j].rect)) return true;
    }
  }
  return false;
}

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const prepPt = (r: Relation): string => RELATION_PT[r].replace(/ de$/, '');

/** "em cima de" + janela → "em cima da janela" */
function placePt(relation: Relation, spot: MerchantSpotDef): string {
  const base = RELATION_PT[relation];
  return `${base.slice(0, -2)}d${spot.ptGender === 'f' ? 'a' : 'o'} ${spot.pt}`;
}

/** Em português: traduz a palavra e aponta o lugar. Ensina a acertar de novo. */
export function correctionLine(
  step: MerchantStep,
  placed: MerchantPlacement | null,
  catalogs: MerchantCatalogs = MERCHANT_CATALOGS
): string {
  const spot = catalogs.spots.find((s) => s.id === step.spot);
  const item = catalogs.items.find((i) => i.id === step.item);
  const enRel = RELATION_EN[step.relation];
  const ptRel = prepPt(step.relation);
  const spotEn = spot?.label ?? step.spot;
  const spotWord = spot?.pt ?? step.spot;
  const itemEn = item?.label ?? step.item;
  const itemWord = item?.pt ?? step.item;
  const where = spot ? placePt(step.relation, spot) : `${ptRel} ${spotWord}`;

  if (placed && placed.relation !== step.relation) {
    return `${cap(enRel)} é ${ptRel}, não ${prepPt(placed.relation)}. ${cap(spotEn)} é ${spotWord}. ${cap(where)}.`;
  }
  if (placed && placed.item !== step.item) {
    return `${cap(itemEn)} é ${itemWord}. ${cap(enRel)} é ${ptRel}. ${cap(where)}.`;
  }
  if (placed && placed.qty !== step.qty) {
    const n = NUMBER_WORDS[step.qty] ?? String(step.qty);
    return `Pediu ${n}. ${cap(enRel)} é ${ptRel}. ${cap(where)}.`;
  }
  return `${cap(spotEn)} é ${spotWord}. ${cap(enRel)} é ${ptRel}. ${cap(where)}.`;
}

const PT_N = ['Nenhuma', 'Uma', 'Duas', 'Três', 'Quatro'];

export function gradeLine(firstHits: number, steps: MerchantStep[], firstOk: boolean[]): string {
  const n = steps.length;
  if (n <= 0) return 'O armazém ficou quieto.';
  if (firstHits >= n) return 'Tudo no lugar. Pode guardar.';
  if (firstHits === 0) return 'Nada no lugar certo desta vez. Olha de novo as preposições.';
  const miss = steps.find((_, i) => !firstOk[i]);
  const prep = miss ? RELATION_EN[miss.relation] : 'in';
  return `${PT_N[firstHits] ?? String(firstHits)} de ${n}. A preposição '${prep}' escapou.`;
}

export function thanksLine(stepIndex: number, total: number): string {
  if (stepIndex >= total - 1) return 'No lugar. O armazém agradece.';
  return 'No lugar. Guardo isso.';
}

function itemSaid(step: MerchantStep, item: { pt: string; ptPlural: string; ptGender: 'm' | 'f'; pluralOnly?: boolean }): string {
  if (step.qty >= 2) {
    const n = step.qty === 2 ? (item.ptGender === 'f' ? 'duas' : 'dois') : 'três';
    return `${n} ${item.ptPlural}`;
  }
  if (item.pluralOnly) return `${item.ptGender === 'f' ? 'as' : 'os'} ${item.ptPlural}`;
  return `${item.ptGender === 'f' ? 'a' : 'o'} ${item.pt}`;
}

/** Acerto: fala o que ele fez, com a regra. O índice troca a boca. */
export function praiseLine(
  step: MerchantStep,
  variant: number,
  catalogs: MerchantCatalogs = MERCHANT_CATALOGS
): string {
  const spot = catalogs.spots.find((s) => s.id === step.spot);
  const item = catalogs.items.find((i) => i.id === step.item);
  const enRel = RELATION_EN[step.relation];
  const ptRel = prepPt(step.relation);
  const thing = item ? itemSaid(step, item) : step.item;
  const where = spot ? placePt(step.relation, spot) : `${ptRel} ${step.spot}`;
  const lines = [
    `Isso mesmo. Você colocou ${thing} ${where}.`,
    `Muito bom. ${cap(enRel)} é ${ptRel}. ${cap(thing)} foi ${where}.`,
    `Acertou. Você colocou ${thing} corretamente ${where}.`,
    `Isso. Pediu ${enRel}, e ${thing} ficou ${where}.`,
  ];
  return lines[((variant % lines.length) + lines.length) % lines.length];
}

export const NEXT_ORDER = 'Outro pedido. Ouve de novo.';

export function addPlacement(prev: MerchantPlacement[], next: MerchantPlacement): MerchantPlacement[] {
  const i = prev.findIndex((p) => p.item === next.item && p.relation === next.relation && p.spot === next.spot);
  if (i < 0) return [...prev, next];
  const copy = [...prev];
  copy[i] = { ...copy[i], qty: copy[i].qty + next.qty };
  return copy;
}

export function remainingStock(items: { id: string; stock: number }[], placements: MerchantPlacement[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const it of items) map.set(it.id, it.stock);
  for (const p of placements) map.set(p.item, (map.get(p.item) ?? 0) - p.qty);
  return map;
}

export interface SentenceBit {
  text: string;
  word: boolean;
}

export function sentenceBits(sentence: string): SentenceBit[] {
  return sentence.split(/(\s+|[.,!?])/).filter((s) => s.length > 0).map((text) => ({
    text,
    word: /[A-Za-z]/.test(text),
  }));
}

export function buildMerchantOutcome(args: {
  steps: MerchantStep[];
  firstOk: boolean[];
  lastOk: boolean[];
  placements: MerchantPlacement[];
  listens: number[];
  attempts: number[];
  deliveries: number;
  textShown: boolean;
  glossaryHovers: string[];
}): ContractOutcome {
  const firstHits = args.firstOk.filter(Boolean).length;
  const finalHits = args.lastOk.filter(Boolean).length;
  const summary = args.placements.map((p) => `${p.qty} ${p.item} ${RELATION_EN[p.relation]} the ${p.spot}`).join('; ');
  return {
    score: firstHits,
    max: args.steps.length,
    materialEarned: merchantMaterial(firstHits, args.steps.length, args.textShown),
    answer: summary,
    details: {
      listens: args.listens,
      textShown: args.textShown,
      deliveries: args.deliveries,
      perStep: args.firstOk,
      placements: args.placements,
      firstHits,
      finalHits,
      attempts: args.attempts,
      glossaryHovers: args.glossaryHovers,
    },
  };
}
