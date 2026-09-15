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
  NpcId,
  NpcState,
  Period,
  PriceBand,
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
  dailyChestGold: [10, 15],
  rareEveryNDays: 3,
  gameGoldDailyCap: 35,
  gameGoldWeeklyCap: 100,
  redeemMinTasks: 5,
  taskDefaultXp: 10,
  taskDefaultGold: 5,
  periodStartHours: { afternoon: 12, evening: 18 },
  periodGating: true,
  chestOpenHour: 18,
  minDueForChest: 3,
  incomeDayGold: 45,
  quizGoldPerHit: 2,
  quizXpPerHit: 6,
  challengeGoldWeeklyCap: 60,
  achievementGoldCap: 40,
  buildCostMultiplier: 2,
  merchantBuy: { materials: 10, gold: 3, dailyCap: 2 },
  savingsTargetPct: 20,
  interestRatePct: 5,
  interestCapGold: 20,
  maxOpenGoals: 2,
  lateMissionUntilHour: 12,
  lateMissionGoldPct: 50,
  repairRefundPct: 50,
  seasonWeeks: 13,
  levelCap: 40,
};

export const PRICE_BANDS: PriceBand[] = [
  { id: 'mimo', days: 0.5 },
  { id: 'pequeno', days: 1 },
  { id: 'medio', days: 3 },
  { id: 'grande', days: 7 },
  { id: 'enorme', days: 20, onlyGoal: true },
  { id: 'temporada', days: 50, onlyGoal: true },
];

export const LEVEL_REWARDS: Record<number, { rare?: 'esmeralda' | 'diamante'; cosmeticId?: string }> = {
  5: { rare: 'esmeralda' },
  10: { rare: 'diamante', cosmeticId: 'milestone_10' },
  15: { rare: 'esmeralda' },
  20: { rare: 'diamante', cosmeticId: 'milestone_20' },
  25: { rare: 'esmeralda' },
  30: { rare: 'diamante', cosmeticId: 'milestone_30' },
  35: { rare: 'esmeralda' },
  40: { rare: 'diamante', cosmeticId: 'milestone_40' },
};

export function emptyNpcState(): NpcState {
  return { points: 0, tier: 0, lastTalkDate: null, seen: [], quest: { chapter: 0, progress: 0, doneAt: null } };
}

export function emptyNpcs(): Record<NpcId, NpcState> {
  return {
    sabio: emptyNpcState(),
    comerciante: emptyNpcState(),
    ferreiro: emptyNpcState(),
    olheiro: emptyNpcState(),
  };
}

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
    npcs: emptyNpcs(),
    cracks: [],
    stars: [],
    trophies: {},
    plan: { date: '', order: [], focusTaskId: null },
    newItems: [],
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
    minLevel: 5,
  },
  {
    id: 'pickaxe_iron',
    slot: 'pickaxe',
    level: 2,
    label: 'Picareta de ferro',
    effect: '+1 material na primeira missão de cada período',
    cost: { ferro: 8, pedra: 4 },
    rare: {},
    minLevel: 10,
  },
  {
    id: 'pickaxe_gold',
    slot: 'pickaxe',
    level: 3,
    label: 'Picareta de ouro',
    effect: '+1 na primeira missão de cada período; Baú do Dia com +1 material',
    cost: { ferro: 10, redstone: 6 },
    rare: { esmeralda: 1 },
    minLevel: 20,
  },
  {
    id: 'pickaxe_diamond',
    slot: 'pickaxe',
    level: 4,
    label: 'Picareta de diamante',
    effect: '+1 material em toda missão',
    cost: { ferro: 12, redstone: 8 },
    rare: { diamante: 2 },
    minLevel: 30,
  },
  {
    id: 'boots',
    slot: 'boots',
    level: 1,
    label: 'Botas',
    effect: '+20% XP nas missões (arredondado)',
    cost: { madeira: 5, ferro: 3 },
    rare: {},
    minLevel: 10,
  },
  {
    id: 'helmet',
    slot: 'helmet',
    level: 1,
    label: 'Capacete',
    effect: 'Absorve 1 missão perdida por semana',
    cost: { ferro: 6, pedra: 3 },
    rare: {},
    minLevel: 15,
  },
  {
    id: 'lamp',
    slot: 'lamp',
    level: 1,
    label: 'Lanterna',
    effect: 'Mostra contratos e prova de amanhã; 1 dica grátis por dia',
    cost: { redstone: 4, ferro: 2 },
    rare: {},
    minLevel: 15,
  },
  {
    id: 'cape',
    slot: 'cape',
    level: 1,
    label: 'Capa',
    effect: 'Visual (estilo conta)',
    cost: { madeira: 6, redstone: 4 },
    rare: { esmeralda: 1 },
    minLevel: 25,
  },
];

export const GEAR_BY_ID: Record<string, GearDef> = Object.fromEntries(GEAR.map((g) => [g.id, g]));

const cosmetic = (
  id: string,
  slot: CosmeticItem['slot'],
  label: string,
  basePrice: number,
  free = false,
  premium = false,
  minLevel = 0
): CosmeticItem => ({
  id,
  slot,
  label,
  basePrice,
  free,
  premium,
  minLevel: free ? 0 : minLevel,
});

export const COSMETICS: CosmeticItem[] = [
  cosmetic('skin_1', 'skin', 'Pele clara', 0, true),
  cosmetic('skin_2', 'skin', 'Pele média', 0, true),
  cosmetic('skin_3', 'skin', 'Pele morena', 0, true),
  cosmetic('skin_4', 'skin', 'Pele escura', 0, true),
  cosmetic('hair_1', 'hair', 'Cabelo curto', 0, true),
  cosmetic('hair_2', 'hair', 'Cabelo com franja', 20, false, false, 5),
  cosmetic('hair_3', 'hair', 'Cabelo cacheado', 20, false, false, 5),
  cosmetic('hair_4', 'hair', 'Cabelo comprido', 20, false, false, 5),
  cosmetic('shirt_1', 'shirt', 'Camisa marrom', 0, true),
  cosmetic('shirt_2', 'shirt', 'Camisa verde', 0, true),
  cosmetic('shirt_3', 'shirt', 'Camisa azul', 0, true),
  cosmetic('shirt_4', 'shirt', 'Camisa vermelha', 0, true),
  cosmetic('shirt_5', 'shirt', 'Camisa cinza', 0, true),
  cosmetic('shirt_6', 'shirt', 'Camisa amarela', 0, true),
  cosmetic('shirt_7', 'shirt', 'Camisa branca', 0, true),
  cosmetic('shirt_8', 'shirt', 'Camisa preta', 0, true),
  cosmetic('shirt_team', 'shirt', 'Camisa do time', 40, false, false, 5),
  cosmetic('pants_1', 'pants', 'Calça marrom', 0, true),
  cosmetic('pants_2', 'pants', 'Calça azul', 0, true),
  cosmetic('pants_3', 'pants', 'Calça verde', 0, true),
  cosmetic('pants_4', 'pants', 'Calça cinza', 0, true),
  cosmetic('pants_5', 'pants', 'Calça preta', 0, true),
  cosmetic('pants_6', 'pants', 'Calça bege', 0, true),
  cosmetic('pants_7', 'pants', 'Calça vermelha', 0, true),
  cosmetic('pants_8', 'pants', 'Calça branca', 0, true),
  cosmetic('hat_cap', 'hat', 'Boné', 30, false, false, 5),
  cosmetic('hat_deco', 'hat', 'Capacete decorativo', 60, false, false, 10),
  cosmetic('hat_crown', 'hat', 'Coroa', 200, false, true, 25),
  cosmetic('cape_red', 'cape', 'Capa vermelha', 80, false, false, 20),
  cosmetic('cape_blue', 'cape', 'Capa azul', 120, false, true, 25),
  cosmetic('pet_wolf', 'pet', 'Lobo', 120, false, false, 15),
  cosmetic('pet_cat', 'pet', 'Gato', 120, false, false, 15),
  cosmetic('pet_parrot', 'pet', 'Papagaio', 150, false, false, 15),
];

export const COSMETIC_BY_ID: Record<string, CosmeticItem> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export const FREE_COSMETIC_IDS: string[] = COSMETICS.filter((c) => c.free).map((c) => c.id);

/** Câmera canônica do minerador (low top-down). Retrato, HUD, cena e editor. */
export const ISO_MINER = '/assets/village/char/miner-iso.png';
export const ISO_NPC: Record<string, string> = {
  sabio: '/assets/village/npc/sabio-iso.png',
  comerciante: '/assets/village/npc/comerciante-iso.png',
  ferreiro: '/assets/village/npc/ferreiro-iso.png',
  olheiro: '/assets/village/npc/olheiro-iso.png',
};

export const NPC_LABEL: Record<string, string> = {
  sabio: 'Sábio',
  comerciante: 'Comerciante',
  ferreiro: 'Ferreiro',
  olheiro: 'Olheiro',
};

/** Sprite de pele (inpaint no rosto, vista lateral — só fallback). */
export const SKIN_SPRITE: Record<string, string> = {
  skin_1: '/assets/village/char/miner-skin-4.png',
  skin_2: '/assets/village/char/miner-base.png',
  skin_3: '/assets/village/char/miner-skin-2.png',
  skin_4: '/assets/village/char/miner-skin-3.png',
};

export const SKIN_HEX: Record<string, string> = {
  skin_1: '#F0C49A',
  skin_2: '#D4A06A',
  skin_3: '#A0673A',
  skin_4: '#6B3D22',
};

export const SHIRT_HEX: Record<string, string> = {
  shirt_1: '#8B5A2B',
  shirt_2: '#5B9B3A',
  shirt_3: '#3D6EA8',
  shirt_4: '#B33A2B',
  shirt_5: '#7A7A7A',
  shirt_6: '#D4B03A',
  shirt_7: '#E8E0D4',
  shirt_8: '#2A2420',
};

export const HAIR_HEX: Record<string, string> = {
  hair_1: '#3D2918',
  hair_2: '#6B4423',
  hair_3: '#8B5A2B',
  hair_4: '#1A120C',
};

export const HAT_HEX: Record<string, string> = {
  hat_cap: '#3D6EA8',
  hat_deco: '#8B8B8B',
  hat_crown: '#E8B923',
};

export const CAPE_HEX: Record<string, string> = {
  cape_red: '#B33A2B',
  cape_blue: '#3D6EA8',
};

export const PANTS_HEX: Record<string, string> = {
  pants_1: '#6B4A2B',
  pants_2: '#2F4F8A',
  pants_3: '#3D6B2A',
  pants_4: '#6A6A6A',
  pants_5: '#1E1A18',
  pants_6: '#C4A574',
  pants_7: '#A33A32',
  pants_8: '#EDE6D9',
};

export const HAT_SPRITE: Record<string, string> = {
  hat_cap: '/assets/village/char/miner-cap.png',
  hat_deco: '/assets/village/char/miner-iron-helmet.png',
  hat_crown: '/assets/village/char/miner-crown.png',
};

export const CAPE_SPRITE: Record<string, string> = {
  cape_red: '/assets/village/char/miner-cape.png',
  cape_blue: '/assets/village/char/miner-cape.png',
};

export const PET_SPRITE: Record<string, string> = {
  pet_wolf: '/assets/village/pets/lobo.png',
  pet_cat: '/assets/village/pets/gato.png',
  pet_parrot: '/assets/village/pets/papagaio.png',
};

export const NPC_PORTRAIT: Record<string, string> = {
  ferreiro: ISO_NPC.ferreiro,
  comerciante: ISO_NPC.comerciante,
  sabio: ISO_NPC.sabio,
  olheiro: ISO_NPC.olheiro,
};

export const GEAR_SPRITE: Record<string, string> = {
  pickaxe_stone: '/assets/village/items/pickaxe-pedra.png',
  pickaxe_iron: '/assets/village/items/pickaxe-ferro.png',
  pickaxe_gold: '/assets/village/items/pickaxe-ouro.png',
  pickaxe_diamond: '/assets/village/items/diamond-pickaxe.png',
  boots: '/assets/village/items/boots.png',
  helmet: '/assets/village/items/iron-helmet.png',
  lamp: '/assets/village/items/lantern.png',
  cape: '/assets/village/items/cape.png',
};

export const COSMETIC_ICON: Record<string, string> = {
  hat_cap: '/assets/village/items/cap.png',
  hat_deco: '/assets/village/items/helmet-deco.png',
  hat_crown: '/assets/village/items/crown.png',
  cape_red: '/assets/village/items/cape.png',
  cape_blue: '/assets/village/items/cape.png',
  pet_wolf: '/assets/village/pets/lobo.png',
  pet_cat: '/assets/village/pets/gato.png',
  pet_parrot: '/assets/village/pets/papagaio.png',
};

export const DISTRICT_ICONS: Record<string, string> = {
  mine: '/assets/village/items/lantern.png',
  library: '/assets/village/rewards/livro.png',
  workshop: '/assets/village/items/iron-helmet.png',
  market: '/assets/village/buildings/mercado-1.png',
  tower: '/assets/village/buildings/torre-1.png',
  bank: '/assets/village/buildings/cofre-1.png',
  pack: '/assets/village/items/mochila.png',
  agenda: '/assets/english/ui/clock.webp',
  house: '/assets/village/buildings/casa-1.png',
  chest: '/assets/village/buildings/bau-1.png',
  arena: '/assets/english/ui/sword.webp',
};

export function houseTier(season: number): 1 | 2 | 3 {
  const n = Math.max(1, Math.floor(Number(season) || 1));
  return (n >= 3 ? 3 : n) as 1 | 2 | 3;
}

export function houseSprite(season: number): string {
  return `/assets/village/buildings/casa-${houseTier(season)}.png`;
}

export function houseTitle(season: number): string {
  const t = houseTier(season);
  return t === 1 ? 'Cabana' : t === 2 ? 'Casa' : 'Sobrado';
}

export const HOTBAR_ICONS: Record<string, string> = {
  Vila: ISO_MINER,
  Missões: '/assets/village/buildings/casa-1.png',
  Mina: '/assets/village/items/lantern.png',
  Oficina: '/assets/village/items/iron-helmet.png',
  Mochila: '/assets/village/items/mochila.png',
  Ferraria: '/assets/village/items/iron-helmet.png',
};

/** Cosméticos sem sprite próprio não entram na Loja nem no editor. */
export function cosmeticHasSprite(id: string): boolean {
  if (SKIN_SPRITE[id] || SHIRT_HEX[id] || PANTS_HEX[id] || HAT_SPRITE[id] || PET_SPRITE[id]) return true;
  if (HAIR_HEX[id] || CAPE_HEX[id] || HAT_HEX[id]) return true;
  if (id === 'shirt_team') return true;
  return false;
}

export function characterBaseSrc(character: VillageCharacter, gear?: VillageGear): string {
  if (character.hat && HAT_SPRITE[character.hat]) return HAT_SPRITE[character.hat];
  if (character.cape && CAPE_SPRITE[character.cape]) return CAPE_SPRITE[character.cape];
  if (gear && gear.pickaxe >= 4) return '/assets/village/char/miner-diamond-pickaxe.png';
  if (gear && gear.helmet === 1) return '/assets/village/char/miner-iron-helmet.png';
  if (character.shirt === 'shirt_team') return '/assets/village/char/miner-football.png';
  return SKIN_SPRITE[character.skin] || '/assets/village/char/miner-base.png';
}

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

export function characterSpriteSrc(gear: VillageGear, shirt: string, skin = 'skin_2'): string {
  return characterBaseSrc({ ...DEFAULT_CHARACTER, shirt, skin }, gear);
}

export const DISTRICT_LABELS: Record<string, string> = {
  mine: 'Mina / Mine',
  library: 'Biblioteca / Library',
  workshop: 'Ferraria / Forge',
  market: 'Mercado / Market',
  tower: 'Torre / Tower',
  bank: 'Banco / Bank',
  pack: 'Mochila / Pack',
  agenda: 'Agenda / Agenda',
  house: 'Casa / House',
  chest: 'Baú do Dia / Daily chest',
  arena: 'Arena / Arena',
};

/** Nome na cena: o mesmo da antiga grade, no lugar certo. */
export const LOT_SCENE_LABEL: Record<string, string> = {
  fornalha: 'Ferraria',
  bau: 'Armazém',
  cerca: 'Cerca',
  torre: 'Torre',
  mesa: 'Biblioteca',
  campinho: 'Campinho',
  cofre: 'Cofre',
  agenda: 'Agenda',
  mercado: 'Mercado',
};

export type SceneProp = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sprite: string;
  label: string;
  badge?: string;
};

export const SCENE_PROPS: SceneProp[] = [
  { id: 'pack', x: 548, y: 378, w: 40, h: 40, sprite: '/assets/village/items/mochila.png', label: 'Mochila' },
  { id: 'arena', x: 1018, y: 68, w: 44, h: 44, sprite: '/assets/english/ui/sword.webp', label: 'Arena' },
];

