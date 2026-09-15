// ========================================
// Vila: catálogo, preços, efeitos, loot e documento inicial
// Módulo puro.
// ========================================

import type { BuildingId, Material } from '../types/english';
import type {
  CosmeticItem,
  EconomySettings,
  GearDef,
  HabitDef,
  ModuleSettings,
  Period,
  VillageCharacter,
  VillageDoc,
  VillageGear,
  VillageSettings,
} from '../types/village';
import { buildingSprite as baseBuildingSprite } from './englishBase';

export const CATALOG_VERSION = 1;

export const MATERIAL_BY_PERIOD: Record<Period, Material> = {
  morning: 'madeira',
  afternoon: 'pedra',
  evening: 'ferro',
};

export const DEFAULT_VILLAGE_SETTINGS: VillageSettings = {
  shopEnabled: true,
  effectsEnabled: true,
  goldPriceMultiplier: 1,
  team: { name: '', color1: '#5b9b3a', color2: '#ffffff' },
};

export const DEFAULT_ECONOMY: EconomySettings = {
  materialsPerTask: 1,
  dailyChestGold: [5, 15],
  rareEveryNDays: 3,
  gameGoldDailyCap: 35,
  redeemMinTasks: 5,
  taskDefaultXp: 10,
  taskDefaultGold: 5,
  periodStartHours: { afternoon: 12, evening: 18 },
  periodGating: true,
  chestOpenHour: 18,
  minDueForChest: 3,
};

export const DEFAULT_MODULES: ModuleSettings = {
  shop: true,
  effects: true,
  bank: false,
  interest: false,
  logic: false,
  lines: false,
  dilemmas: false,
  mineShift: false,
  football: false,
  chat: false,
  tts: true,
  aiGeneration: true,
  music: false,
};

export const EMPTY_GEAR: VillageGear = {
  pickaxe: 0,
  helmet: 0,
  boots: 0,
  lamp: 0,
  cape: 0,
};

export const DEFAULT_CHARACTER: VillageCharacter = {
  skin: 'skin_1',
  hair: 'hair_1',
  shirt: 'shirt_1',
  pants: 'pants_1',
  hat: null,
  cape: null,
  pet: null,
};

export function initialVillageDoc(userId: string, nowIso: string): VillageDoc {
  return {
    userId,
    createdAt: nowIso,
    updatedAt: nowIso,
    name: 'Vila do Heitor',
    characterName: 'Heitor',
    onboardedAt: null,
    rare: { diamante: 0, esmeralda: 0 },
    gear: { ...EMPTY_GEAR },
    character: { ...DEFAULT_CHARACTER },
    owned: [],
    claimed: {},
    shield: { helmetWeek: null },
    fullDays: 0,
    fullDaysStart: null,
    records: {},
    decor: [],
    noticesDismissed: [],
    habits: {},
    season: 0,
  };
}

export const GEAR: GearDef[] = [
  {
    id: 'pickaxe_stone',
    slot: 'pickaxe',
    level: 1,
    label: 'Picareta de pedra',
    effect: '+1 material na primeira missão do dia',
    cost: { pedra: 6, madeira: 2 },
    rare: {},
  },
  {
    id: 'pickaxe_iron',
    slot: 'pickaxe',
    level: 2,
    label: 'Picareta de ferro',
    effect: '+1 material na primeira missão de cada período',
    cost: { ferro: 8, pedra: 4 },
    rare: {},
  },
  {
    id: 'pickaxe_gold',
    slot: 'pickaxe',
    level: 3,
    label: 'Picareta de ouro',
    effect: '+1 na primeira missão de cada período; Baú do Dia com +1 material',
    cost: { ferro: 10, redstone: 6 },
    rare: { esmeralda: 1 },
  },
  {
    id: 'pickaxe_diamond',
    slot: 'pickaxe',
    level: 4,
    label: 'Picareta de diamante',
    effect: '+1 material em toda missão',
    cost: { ferro: 12, redstone: 8 },
    rare: { diamante: 2 },
  },
  {
    id: 'boots',
    slot: 'boots',
    level: 1,
    label: 'Botas',
    effect: '+20% XP nas missões (arredondado)',
    cost: { madeira: 5, ferro: 3 },
    rare: {},
  },
  {
    id: 'helmet',
    slot: 'helmet',
    level: 1,
    label: 'Capacete',
    effect: 'Visual nesta etapa (absorve missão perdida na Etapa 2)',
    cost: { ferro: 6, pedra: 3 },
    rare: {},
  },
  {
    id: 'lamp',
    slot: 'lamp',
    level: 1,
    label: 'Lanterna',
    effect: 'Visual nesta etapa',
    cost: { redstone: 4, ferro: 2 },
    rare: {},
  },
  {
    id: 'cape',
    slot: 'cape',
    level: 1,
    label: 'Capa',
    effect: 'Visual nesta etapa',
    cost: { madeira: 6, redstone: 4 },
    rare: { esmeralda: 1 },
  },
];

export const GEAR_BY_ID: Record<string, GearDef> = Object.fromEntries(GEAR.map((g) => [g.id, g]));

const cosmetic = (
  id: string,
  slot: CosmeticItem['slot'],
  label: string,
  basePrice: number,
  free = false,
  premium = false
): CosmeticItem => ({ id, slot, label, basePrice, free, premium });

export const COSMETICS: CosmeticItem[] = [
  cosmetic('skin_1', 'skin', 'Pele clara', 0, true),
  cosmetic('skin_2', 'skin', 'Pele média', 0, true),
  cosmetic('skin_3', 'skin', 'Pele morena', 0, true),
  cosmetic('skin_4', 'skin', 'Pele escura', 0, true),
  cosmetic('hair_1', 'hair', 'Cabelo curto', 0, true),
  cosmetic('hair_2', 'hair', 'Cabelo com franja', 20),
  cosmetic('hair_3', 'hair', 'Cabelo cacheado', 20),
  cosmetic('hair_4', 'hair', 'Cabelo comprido', 20),
  cosmetic('shirt_1', 'shirt', 'Camisa marrom', 0, true),
  cosmetic('shirt_2', 'shirt', 'Camisa verde', 0, true),
  cosmetic('shirt_3', 'shirt', 'Camisa azul', 0, true),
  cosmetic('shirt_4', 'shirt', 'Camisa vermelha', 0, true),
  cosmetic('shirt_5', 'shirt', 'Camisa cinza', 0, true),
  cosmetic('shirt_6', 'shirt', 'Camisa amarela', 0, true),
  cosmetic('shirt_7', 'shirt', 'Camisa branca', 0, true),
  cosmetic('shirt_8', 'shirt', 'Camisa preta', 0, true),
  cosmetic('shirt_team', 'shirt', 'Camisa do time', 40),
  cosmetic('pants_1', 'pants', 'Calça marrom', 0, true),
  cosmetic('pants_2', 'pants', 'Calça azul', 0, true),
  cosmetic('pants_3', 'pants', 'Calça verde', 0, true),
  cosmetic('pants_4', 'pants', 'Calça cinza', 0, true),
  cosmetic('pants_5', 'pants', 'Calça preta', 0, true),
  cosmetic('pants_6', 'pants', 'Calça bege', 0, true),
  cosmetic('pants_7', 'pants', 'Calça vermelha', 0, true),
  cosmetic('pants_8', 'pants', 'Calça branca', 0, true),
  cosmetic('hat_cap', 'hat', 'Boné', 30),
  cosmetic('hat_deco', 'hat', 'Capacete decorativo', 60),
  cosmetic('hat_crown', 'hat', 'Coroa', 200, false, true),
  cosmetic('cape_red', 'cape', 'Capa vermelha', 80),
  cosmetic('cape_blue', 'cape', 'Capa azul', 120, false, true),
  cosmetic('pet_wolf', 'pet', 'Lobo', 120),
  cosmetic('pet_cat', 'pet', 'Gato', 120),
  cosmetic('pet_parrot', 'pet', 'Papagaio', 150),
];

export const COSMETIC_BY_ID: Record<string, CosmeticItem> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export const FREE_COSMETIC_IDS: string[] = COSMETICS.filter((c) => c.free).map((c) => c.id);

export const HABITS: HabitDef[] = [
  { id: 'agua', label: 'Água', period: 'any', confirmLabel: 'Bebi', npc: 'ferreiro' },
  { id: 'postura', label: 'Postura', period: 'any', confirmLabel: 'Ajeitei', npc: 'ferreiro' },
  { id: 'alongar', label: 'Alongar', period: 'morning', confirmLabel: 'Alonguei', npc: 'ferreiro' },
  { id: 'tela', label: 'Tela', period: 'evening', confirmLabel: 'Desliguei', npc: 'sabio' },
  { id: 'arrumar', label: 'Arrumar', period: 'afternoon', confirmLabel: 'Arrumei', npc: 'comerciante' },
  { id: 'sono', label: 'Sono', period: 'evening', confirmLabel: 'Vou dormir', npc: 'sabio' },
  { id: 'gentileza', label: 'Gentileza', period: 'any', confirmLabel: 'Fiz', npc: 'olheiro' },
];

export const HABIT_BY_ID: Record<string, HabitDef> = Object.fromEntries(HABITS.map((h) => [h.id, h]));

export const PLACA_SPRITE = '/assets/village/buildings/placa.png';

export function buildingSprite(id: BuildingId, level: number): string {
  return baseBuildingSprite(id, level);
}

export function characterSpriteSrc(gear: VillageGear, shirt: string): string {
  if (gear.pickaxe >= 4) return '/assets/village/char/miner-diamond-pickaxe.png';
  if (gear.helmet === 1) return '/assets/village/char/miner-iron-helmet.png';
  if (shirt === 'shirt_team') return '/assets/village/char/miner-football.png';
  return '/assets/village/char/miner-base.png';
}

export const DISTRICT_LABELS: Record<string, string> = {
  mine: 'Mina / Mine',
  library: 'Biblioteca / Library',
  workshop: 'Oficina / Workshop',
  market: 'Mercado / Market',
  tower: 'Torre / Tower',
  map: 'Mapa / Map',
  timer: 'Ampulheta / Hourglass',
};

