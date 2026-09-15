// ========================================
// Arena de Inglês: catálogo da Base (construções, materiais, lugares e itens do Comerciante)
// Módulo puro: sem Firebase, sem React, sem import.meta.env.
// Os caminhos de imagem apontam para public/ e foram conferidos no disco.
// ========================================

import type {
  BaseDoc,
  BuildingId,
  ContractType,
  Material,
  MerchantItem,
  MerchantSpot,
  Relation,
} from '../types/english';

export type MaterialCost = Record<Material, number>;
export type PtGender = 'm' | 'f';

export const MATERIALS: Material[] = ['madeira', 'pedra', 'ferro', 'redstone'];

export const MATERIAL_LABELS: Record<Material, string> = {
  madeira: 'Madeira',
  pedra: 'Pedra',
  ferro: 'Ferro',
  redstone: 'Redstone',
};

export const MATERIAL_ICONS: Record<Material, string> = {
  madeira: '/assets/english/ui/base/mat_madeira.webp',
  pedra: '/assets/english/ui/base/mat_pedra.webp',
  ferro: '/assets/english/ui/base/mat_ferro.webp',
  redstone: '/assets/english/ui/base/mat_redstone.webp',
};

export const CONTRACT_TYPES: ContractType[] = ['merchant', 'letter', 'note', 'forge'];

export const CONTRACT_LABELS: Record<ContractType, string> = {
  merchant: 'Comerciante',
  letter: 'Carta',
  note: 'Recado',
  forge: 'Ferraria',
};

export const CONTRACT_ICONS: Record<ContractType, string> = {
  merchant: '/assets/english/ui/base/c_merchant.webp',
  letter: '/assets/english/ui/base/c_letter.webp',
  note: '/assets/english/ui/base/c_note.webp',
  forge: '/assets/english/ui/base/c_forge.webp',
};

/** Material que cada tipo de contrato paga (seção 1) */
export const CONTRACT_MATERIAL: Record<ContractType, Material> = {
  merchant: 'madeira',
  letter: 'pedra',
  note: 'ferro',
  forge: 'redstone',
};

// ---------- Construções ----------

export interface BuildingDef {
  id: BuildingId;
  label: string;
  /** PT, o que a construção é */
  description: string;
  /** PT, o que ela faz (Etapa 1 ou aviso de Etapa 2) */
  effect: string;
  icon: string;
  /** Custo para chegar ao nível 1, 2 e 3 (índice = nível - 1) */
  costs: [MaterialCost, MaterialCost, MaterialCost];
  /** Só aparece quando Fornalha e Baú estão no nível 1 */
  requiresCore: boolean;
}

export const BUILDING_MAX_LEVEL = 3;
export const TERRAIN_ICON = '/assets/english/ui/base/b_terreno.webp';

const cost = (madeira: number, pedra: number, ferro: number, redstone: number): MaterialCost => ({ madeira, pedra, ferro, redstone });

/** Ordem = grade 3x2 do mapa. n1 soma 3 materiais, n2 soma 5, n3 soma 8; sempre >= 1 ferro. */
export const BUILDINGS: BuildingDef[] = [
  {
    id: 'fornalha',
    label: 'Fornalha',
    description: 'Derrete minério e aquece a base.',
    effect: 'Nível 1: +1 material no primeiro contrato do dia.',
    icon: '/assets/english/ui/base/b_fornalha.webp',
    costs: [cost(1, 1, 1, 0), cost(1, 2, 1, 1), cost(2, 3, 2, 1)],
    requiresCore: false,
  },
  {
    id: 'bau',
    label: 'Baú',
    description: 'Guarda os materiais da base.',
    effect: 'Nível 1: libera a Torre, a Mesa e o Campinho.',
    icon: '/assets/english/ui/base/b_bau.webp',
    costs: [cost(2, 0, 1, 0), cost(2, 1, 1, 1), cost(3, 2, 2, 1)],
    requiresCore: false,
  },
  {
    id: 'cerca',
    label: 'Cerca',
    description: 'Protege o terreno dos monstros.',
    effect: 'Efeito chega na Etapa 2.',
    icon: '/assets/english/ui/base/b_cerca.webp',
    costs: [cost(1, 1, 1, 0), cost(2, 1, 1, 1), cost(3, 2, 2, 1)],
    requiresCore: false,
  },
  {
    id: 'torre',
    label: 'Torre',
    description: 'Vigia a mina e o campinho.',
    effect: 'Efeito chega na Etapa 2.',
    icon: '/assets/english/ui/base/b_torre.webp',
    costs: [cost(0, 2, 1, 0), cost(1, 2, 1, 1), cost(1, 3, 2, 2)],
    requiresCore: true,
  },
  {
    id: 'mesa',
    label: 'Mesa de Encantamento',
    description: 'Encanta os contratos do dia seguinte.',
    effect: 'Nível 1: você escolhe o tema da história de amanhã.',
    icon: '/assets/english/ui/base/b_mesa.webp',
    costs: [cost(1, 0, 1, 1), cost(1, 1, 1, 2), cost(2, 1, 2, 3)],
    requiresCore: true,
  },
  {
    id: 'campinho',
    label: 'Campinho',
    description: 'Campo de futebol da vila.',
    effect: 'Efeito chega na Etapa 2 (distrito de futebol).',
    icon: '/assets/english/ui/base/b_campinho.webp',
    costs: [cost(1, 1, 1, 0), cost(2, 1, 1, 1), cost(2, 2, 2, 2)],
    requiresCore: true,
  },
];

export const BUILDING_BY_ID: Record<BuildingId, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
) as Record<BuildingId, BuildingDef>;

/** Custo para subir a construção ao nível alvo (1..3); null fora da faixa */
export function buildingCost(id: BuildingId, targetLevel: number): MaterialCost | null {
  if (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > BUILDING_MAX_LEVEL) return null;
  return { ...BUILDING_BY_ID[id].costs[targetLevel - 1] };
}

/** Ícone do lote: terreno vazio no nível 0 */
export function buildingIcon(id: BuildingId, level: number): string {
  return level >= 1 ? BUILDING_BY_ID[id].icon : TERRAIN_ICON;
}

const VILLAGE_BUILDING_FILES = new Set([
  'fornalha-1',
  'fornalha-2',
  'fornalha-3',
  'bau-1',
  'campinho-1',
]);

export const BUILDING_PLACA = '/assets/village/buildings/placa.png';

/** Sprite da Vila por nível; placa no 0; cai no ícone da Base se o PNG ainda não existir. */
export function buildingSprite(id: BuildingId, level: number): string {
  if (level <= 0) return BUILDING_PLACA;
  const key = `${id}-${level}`;
  if (VILLAGE_BUILDING_FILES.has(key)) return `/assets/village/buildings/${key}.png`;
  return buildingIcon(id, level);
}

/** Torre, Mesa e Campinho só aparecem com Fornalha e Baú no nível 1 ou mais */
export function isBuildingUnlocked(id: BuildingId, buildings: Record<BuildingId, number>): boolean {
  if (!BUILDING_BY_ID[id].requiresCore) return true;
  return buildings.fornalha >= 1 && buildings.bau >= 1;
}

export function canAfford(materials: MaterialCost, costToPay: MaterialCost): boolean {
  return MATERIALS.every((m) => (materials[m] ?? 0) >= costToPay[m]);
}

/** Quanto falta de cada material (0 quando já tem) */
export function missingMaterials(materials: MaterialCost, costToPay: MaterialCost): MaterialCost {
  return cost(
    Math.max(0, costToPay.madeira - (materials.madeira ?? 0)),
    Math.max(0, costToPay.pedra - (materials.pedra ?? 0)),
    Math.max(0, costToPay.ferro - (materials.ferro ?? 0)),
    Math.max(0, costToPay.redstone - (materials.redstone ?? 0))
  );
}

/** "Base nível N" = soma dos níveis das construções */
export function baseLevel(buildings: Record<BuildingId, number>): number {
  return BUILDINGS.reduce((sum, b) => sum + (buildings[b.id] ?? 0), 0);
}

/** Fornalha "pela metade": com isso faltam exatamente 1 pedra + 1 madeira para o nível 1 */
export const INITIAL_MATERIALS: MaterialCost = cost(0, 0, 1, 0);

export const INITIAL_BUILDINGS: Record<BuildingId, number> = {
  fornalha: 0,
  bau: 0,
  cerca: 0,
  torre: 0,
  mesa: 0,
  campinho: 0,
};

export function initialBaseDoc(userId: string, nowIso: string, level = 1): BaseDoc {
  return {
    userId,
    level,
    materials: { ...INITIAL_MATERIALS },
    buildings: { ...INITIAL_BUILDINGS },
    scaffoldStage: 0,
    noteStreak3: 0,
    vocab: {},
    contractsDone: 0,
    daysPlayed: 0,
    streakDays: 0,
    lastPlayedDate: '',
    themeRequest: null,
    updatedAt: nowIso,
  };
}

// ---------- Comerciante ----------

export const RELATIONS: Relation[] = ['on', 'in', 'under', 'next_to'];

export const RELATION_EN: Record<Relation, string> = {
  on: 'on',
  in: 'in',
  under: 'under',
  next_to: 'next to',
};

/** Termina em "de" para contrair com o artigo do lugar (da mesa, do baú) */
export const RELATION_PT: Record<Relation, string> = {
  on: 'em cima de',
  in: 'dentro de',
  under: 'embaixo de',
  next_to: 'ao lado de',
};

export interface MerchantSpotDef extends MerchantSpot {
  pt: string;
  ptGender: PtGender;
}

export interface MerchantItemDef extends MerchantItem {
  pt: string;
  ptPlural: string;
  ptGender: PtGender;
  /** Palavra só no plural (boots): nunca leva a/an */
  pluralOnly?: boolean;
}

const spot = (id: string, pt: string, ptGender: PtGender, image: string, relations: Relation[]): MerchantSpotDef => ({
  id,
  label: id,
  pt,
  ptGender,
  image,
  relations,
});

/** 12 lugares; relações permitidas conforme a seção 3 (floor/wall ficaram de fora: sem imagem) */
export const MERCHANT_SPOTS: MerchantSpotDef[] = [
  spot('door', 'porta', 'f', '/assets/english/images/object_door.webp', ['next_to', 'under']),
  spot('window', 'janela', 'f', '/assets/english/ui/base/s_window.webp', ['next_to', 'under']),
  spot('fence', 'cerca', 'f', '/assets/english/ui/base/s_fence.webp', ['next_to', 'under']),
  spot('chest', 'baú', 'm', '/assets/english/ui/chest.webp', ['in', 'on', 'next_to']),
  spot('box', 'caixa', 'f', '/assets/english/ui/base/s_box.webp', ['in', 'on', 'next_to']),
  spot('oven', 'forno', 'm', '/assets/english/ui/base/s_oven.webp', ['in', 'on', 'next_to']),
  spot('barrel', 'barril', 'm', '/assets/english/ui/base/s_barrel.webp', ['in', 'on', 'next_to']),
  spot('table', 'mesa', 'f', '/assets/english/images/object_table.webp', ['on', 'under', 'next_to']),
  spot('bed', 'cama', 'f', '/assets/english/ui/bed.webp', ['on', 'under', 'next_to']),
  spot('shelf', 'prateleira', 'f', '/assets/english/ui/base/s_shelf.webp', ['on', 'under', 'next_to']),
  spot('rug', 'tapete', 'm', '/assets/english/ui/base/s_rug.webp', ['on', 'under', 'next_to']),
  spot('bench', 'banco', 'm', '/assets/english/ui/base/s_bench.webp', ['on', 'under', 'next_to']),
];

const item = (
  id: string,
  plural: string,
  pt: string,
  ptPlural: string,
  ptGender: PtGender,
  image: string,
  pluralOnly?: boolean
): MerchantItemDef => ({ id, label: id, plural, pt, ptPlural, ptGender, image, ...(pluralOnly ? { pluralOnly } : {}) });

/** 17 itens portáteis; nenhum id coincide com um lugar */
export const MERCHANT_ITEMS: MerchantItemDef[] = [
  item('torch', 'torches', 'tocha', 'tochas', 'f', '/assets/english/ui/torch.webp'),
  item('sword', 'swords', 'espada', 'espadas', 'f', '/assets/english/ui/sword.webp'),
  item('book', 'books', 'livro', 'livros', 'm', '/assets/english/images/object_book.webp'),
  item('ball', 'balls', 'bola', 'bolas', 'f', '/assets/english/images/object_ball.webp'),
  item('apple', 'apples', 'maçã', 'maçãs', 'f', '/assets/english/ui/apple.webp'),
  item('banana', 'bananas', 'banana', 'bananas', 'f', '/assets/english/images/fruit_banana.webp'),
  item('orange', 'oranges', 'laranja', 'laranjas', 'f', '/assets/english/images/fruit_orange.webp'),
  item('map', 'maps', 'mapa', 'mapas', 'm', '/assets/english/ui/map.webp'),
  item('clock', 'clocks', 'relógio', 'relógios', 'm', '/assets/english/ui/clock.webp'),
  item('bucket', 'buckets', 'balde', 'baldes', 'm', '/assets/english/ui/base/i_bucket.webp'),
  item('bone', 'bones', 'osso', 'ossos', 'm', '/assets/english/ui/base/i_bone.webp'),
  item('cake', 'cakes', 'bolo', 'bolos', 'm', '/assets/english/ui/base/i_cake.webp'),
  item('key', 'keys', 'chave', 'chaves', 'f', '/assets/english/ui/base/i_key.webp'),
  item('lamp', 'lamps', 'lâmpada', 'lâmpadas', 'f', '/assets/english/ui/base/i_lamp.webp'),
  item('boots', 'boots', 'botas', 'botas', 'f', '/assets/english/ui/base/i_boots.webp', true),
  item('helmet', 'helmets', 'capacete', 'capacetes', 'm', '/assets/english/ui/base/i_helmet.webp'),
  item('potion', 'potions', 'poção', 'poções', 'f', '/assets/english/ui/base/i_potion.webp'),
];

export interface MerchantCatalogs {
  spots: MerchantSpotDef[];
  items: MerchantItemDef[];
}

export const MERCHANT_CATALOGS: MerchantCatalogs = { spots: MERCHANT_SPOTS, items: MERCHANT_ITEMS };
