import type { Material } from './english';
import type { GearSlot } from './village';

export type ItemKind = 'cosmetic' | 'gear' | 'material' | 'rare' | 'reward_icon' | 'milestone';
export type ItemRarity = 'comum' | 'raro' | 'epico' | 'exclusivo';
export type ItemSource = 'loja' | 'oficina' | 'patente' | 'marco' | 'npc' | 'evento' | 'gratis';
export type ItemSlot =
  | 'skin'
  | 'hair'
  | 'shirt'
  | 'pants'
  | 'hat'
  | 'cape'
  | 'pet'
  | GearSlot;

export type ItemState = 'bloqueado' | 'a_venda' | 'seu' | 'equipado' | 'novo' | 'em_breve';

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  slot?: ItemSlot;
  icon: string;
  sprite?: string;
  rarity: ItemRarity;
  description: string;
  price?: number;
  cost?: Partial<Record<Material, number>>;
  rareCost?: { diamante?: number; esmeralda?: number };
  minLevel?: number;
  stage?: number;
  source: ItemSource;
  qty?: number;
}

export interface ItemSlotView {
  item: Item;
  state: ItemState;
  qty?: number;
  isNew?: boolean;
}
