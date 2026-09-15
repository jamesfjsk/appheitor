import type { Material } from '../types/english';
import type { Item, ItemRarity, ItemSlot, ItemState } from '../types/items';
import { REWARD_ICONS } from './rewardIcons';
import {
  COSMETICS,
  COSMETIC_ICON,
  GEAR,
  GEAR_SPRITE,
  HAT_SPRITE,
  CAPE_SPRITE,
  PET_SPRITE,
  SKIN_SPRITE,
  cosmeticHasSprite,
} from './village';
import { MATERIAL_ICONS, MATERIAL_LABELS } from './englishBase';

const FRAME: Record<ItemRarity, string> = {
  comum: '/assets/village/ui/frame-comum.png',
  raro: '/assets/village/ui/frame-raro.png',
  epico: '/assets/village/ui/frame-epico.png',
  exclusivo: '/assets/village/ui/frame-exclusivo.png',
};

const FRAME_COLOR: Record<ItemRarity, string> = {
  comum: '#8B5A2B',
  raro: '#4a6d8c',
  epico: '#E8B923',
  exclusivo: '#5ec8e8',
};

function cosmeticRarity(id: string, premium: boolean, slot: string): ItemRarity {
  if (id.startsWith('milestone') || id.includes('crown')) return 'epico';
  if (premium) return 'epico';
  if (slot === 'pet' || slot === 'cape') return 'raro';
  return 'comum';
}

function gearRarity(id: string, slot: string): ItemRarity {
  if (id.includes('diamond') || slot === 'cape' && id === 'cape') return id.includes('diamond') ? 'exclusivo' : 'epico';
  if (id.includes('gold') || slot === 'lamp' || slot === 'cape') return 'epico';
  if (id.includes('iron') || slot === 'boots' || slot === 'helmet') return 'raro';
  return 'comum';
}

function cosmeticIcon(id: string, slot: string): string {
  if (COSMETIC_ICON[id]) return COSMETIC_ICON[id];
  if (slot === 'skin') return SKIN_SPRITE[id] || '/assets/village/char/miner-base.png';
  if (slot === 'hat') return HAT_SPRITE[id] || '/assets/village/items/cap.png';
  if (slot === 'cape') return CAPE_SPRITE[id] || '/assets/village/items/cape.png';
  if (slot === 'pet') return PET_SPRITE[id] || '/assets/village/pets/lobo.png';
  return '/assets/village/items/mochila.png';
}

export const ITEMS: Item[] = [
  ...COSMETICS.filter((c) => cosmeticHasSprite(c.id)).map((c): Item => ({
    id: c.id,
    name: c.label,
    kind: 'cosmetic',
    slot: c.slot as ItemSlot,
    icon: cosmeticIcon(c.id, c.slot),
    rarity: cosmeticRarity(c.id, c.premium, c.slot),
    description: c.free ? 'Peça inicial do minerador.' : `Custa ${c.basePrice} gold.`,
    price: c.free ? undefined : c.basePrice,
    minLevel: c.minLevel,
    source: c.free ? 'gratis' : 'loja',
  })),
  ...GEAR.map((g): Item => ({
    id: g.id,
    name: g.label,
    kind: 'gear',
    slot: g.slot,
    icon: GEAR_SPRITE[g.id] || '/assets/village/items/pickaxe-ferro.png',
    rarity: gearRarity(g.id, g.slot),
    description: g.effect,
    cost: g.cost,
    rareCost: g.rare,
    minLevel: g.minLevel,
    source: 'oficina',
  })),
  ...(Object.keys(MATERIAL_LABELS) as Material[]).map((m): Item => ({
    id: m,
    name: MATERIAL_LABELS[m],
    kind: 'material',
    icon: MATERIAL_ICONS[m],
    rarity: m === 'redstone' ? 'raro' : 'comum',
    description: m === 'madeira' ? 'Vem das missões da manhã.' : m === 'pedra' ? 'Vem das missões da tarde.' : m === 'ferro' ? 'Vem das missões da noite.' : 'Vem da Mina e da Queima.',
    source: 'evento',
  })),
  {
    id: 'gold',
    name: 'Gold',
    kind: 'rare',
    icon: '/assets/village/rewards/dinheiro.png',
    rarity: 'epico',
    description: 'Moeda da Vila. Compra prêmios e roupas, ou vai para o Cofrinho.',
    source: 'evento',
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    kind: 'rare',
    icon: '/assets/english/ui/emerald.webp',
    rarity: 'epico',
    description: 'Raro de marco: prova 8/8, Baú e patentes.',
    source: 'patente',
  },
  {
    id: 'diamante',
    name: 'Diamante',
    kind: 'rare',
    icon: '/assets/english/ui/diamond.webp',
    rarity: 'exclusivo',
    description: 'Raro de marco: patentes e Baú das tochas.',
    source: 'patente',
  },
  ...REWARD_ICONS.map((r): Item => ({
    id: `reward:${r.id}`,
    name: r.label,
    kind: 'reward_icon',
    icon: r.file,
    rarity: 'comum',
    description: 'Prêmio de verdade cadastrado pelo pai.',
    source: 'evento',
  })),
  ...[10, 20, 30, 40].map((n): Item => ({
    id: `milestone_${n}`,
    name: `Marco ${n}`,
    kind: 'milestone',
    icon: '/assets/village/items/crown.png',
    rarity: 'exclusivo',
    description: 'Cosmético de marco. Em breve, se o PNG ainda não chegou.',
    minLevel: n,
    source: 'marco',
  })),
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function itemFrame(rarity: ItemRarity): { src: string; color: string } {
  return { src: FRAME[rarity], color: FRAME_COLOR[rarity] };
}

export function itemState(args: {
  owned: boolean;
  equipped: boolean;
  isNew: boolean;
  minLevel?: number;
  level: number;
  forSale: boolean;
}): ItemState {
  if (args.isNew) return 'novo';
  if (args.equipped) return 'equipado';
  if (args.owned) return 'seu';
  if (typeof args.minLevel === 'number' && args.level < args.minLevel) return 'bloqueado';
  if (args.forSale) return 'a_venda';
  return 'em_breve';
}

export const SLOT_LABEL: Record<ItemSlot, string> = {
  skin: 'Pele',
  hair: 'Cabelo',
  shirt: 'Camisa',
  pants: 'Calça',
  hat: 'Chapéu',
  cape: 'Capa',
  pet: 'Pet',
  pickaxe: 'Picareta',
  helmet: 'Capacete',
  boots: 'Botas',
  lamp: 'Lanterna',
};
