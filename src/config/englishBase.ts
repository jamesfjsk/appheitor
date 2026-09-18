// ========================================
// Arena de Inglês: catálogo da Base (construções, materiais, lugares e itens do Comerciante)
// Módulo puro: sem Firebase, sem React, sem import.meta.env.
// Os caminhos de imagem apontam para public/ e foram conferidos no disco.
// ========================================

import type {
  BaseDoc,
  BuildingId,
  Contract,
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
  merchant: '/assets/village/npc/comerciante-iso.png',
  letter: '/assets/english/ui/base/c_letter.webp',
  note: '/assets/english/ui/base/c_note.webp',
  forge: '/assets/village/npc/ferreiro-iso.png',
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
  labelEn: string;
  /** PT, o que a construção é */
  description: string;
  /** Efeito dos níveis 1, 2 e 3 (fonte: docs/VILA_CONSTRUCOES.md) */
  effects: [string, string, string];
  /** Resumo de uma linha (nível 1), para listas */
  effect: string;
  icon: string;
  /** Custo para chegar ao nível 1, 2 e 3 (índice = nível - 1) */
  costs: [MaterialCost, MaterialCost, MaterialCost];
  /** Só aparece quando Fornalha e Baú estão no nível 1 */
  requiresCore: boolean;
  /** Níveis que já existem em código (0 = nada comprável). Padrão 3. */
  liveMaxLevel?: number;
  /** Quando liveMaxLevel impede a compra */
  opensIn?: string;
  /** Fora da grade 3x2 da Mina; só na cena da Vila */
  hideOnBaseMap?: boolean;
}

export const BUILDING_MAX_LEVEL = 3;
export const TERRAIN_ICON = '/assets/english/ui/base/b_terreno.webp';

const cost = (madeira: number, pedra: number, ferro: number, redstone: number): MaterialCost => ({ madeira, pedra, ferro, redstone });

/** Ordem = grade 3x2 do mapa. n1 soma 3 materiais, n2 soma 5, n3 soma 8; sempre >= 1 ferro. */
export const BUILDINGS: BuildingDef[] = [
  {
    id: 'fornalha',
    label: 'Fornalha',
    labelEn: 'Furnace',
    description: 'O motor de materiais da Vila.',
    effects: [
      'Seu primeiro contrato do dia rende +1 material.',
      'Fundição: troca 3 por 1 de madeira, pedra e ferro aqui.',
      'Queima: 5 madeira viram 1 redstone uma vez por dia.',
    ],
    effect: 'Seu primeiro contrato do dia rende +1 material.',
    icon: '/assets/village/buildings/fornalha-1.png',
    costs: [cost(1, 1, 1, 0), cost(1, 2, 1, 1), cost(2, 3, 2, 1)],
    requiresCore: false,
  },
  {
    id: 'bau',
    label: 'Armazém',
    labelEn: 'Storage',
    description: 'O armazém da Vila.',
    effects: [
      'Você vê o inventário e libera Torre, Mesa e Campinho.',
      'O Baú do Dia dá +1 material.',
      'A esmeralda do Baú do Dia vem a cada 2 dias completos.',
    ],
    effect: 'Você vê o inventário e libera Torre, Mesa e Campinho.',
    icon: '/assets/village/buildings/bau-1.png',
    costs: [cost(2, 0, 1, 0), cost(2, 1, 1, 1), cost(3, 2, 2, 1)],
    requiresCore: false,
  },
  {
    id: 'cerca',
    label: 'Cerca',
    labelEn: 'Fence',
    description: 'Uma cerca simples. Protege as tochas num dia ruim.',
    effects: [
      'Uma vez por mês, um dia perdido não zera as tochas.',
      'A rachadura do conserto some sozinha depois de 1 dia.',
      'A penalidade por missão perdida nunca passa de 1 gold por dia.',
    ],
    effect: 'Uma vez por mês, um dia perdido não zera as tochas.',
    icon: '/assets/village/buildings/cerca-1.png?v=cerh3',
    costs: [cost(1, 1, 1, 0), cost(2, 1, 1, 1), cost(3, 2, 2, 1)],
    requiresCore: false,
  },
  {
    id: 'torre',
    label: 'Torre',
    labelEn: 'Tower',
    description: 'O lugar do progresso.',
    effects: [
      'Abre as conquistas e a estrela de temporada.',
      'Recordes e Troféu da semana.',
      'Você pode propor desafios e vê o Mapa de habilidades.',
    ],
    effect: 'Abre as conquistas e a estrela de temporada.',
    icon: '/assets/village/buildings/torre-1.png',
    costs: [cost(0, 2, 1, 0), cost(1, 2, 1, 1), cost(1, 3, 2, 2)],
    requiresCore: true,
  },
  {
    id: 'mesa',
    label: 'Biblioteca',
    labelEn: 'Library',
    description: 'A casa do Sábio e da prova do dia.',
    effects: [
      'Você escolhe o tema da história de amanhã na Mina.',
      'Estante de erros e Diário.',
      '1 dica grátis por dia no Recado; o Sábio responde ao Diário.',
    ],
    effect: 'Você escolhe o tema da história de amanhã na Mina.',
    icon: '/assets/village/buildings/mesa-1.png',
    costs: [cost(1, 0, 1, 1), cost(1, 1, 1, 2), cost(2, 1, 2, 3)],
    requiresCore: true,
    liveMaxLevel: 1,
    opensIn: 'Etapa 3',
  },
  {
    id: 'campinho',
    label: 'Campinho',
    labelEn: 'Pitch',
    description: 'O campo de futebol da Vila.',
    effects: [
      'Libera o pet do Campinho e o Gol de Placa.',
      'No sábado e domingo, missões pagam +1 material.',
      'Torneio mensal do Gol de Placa, com recorde na Torre.',
    ],
    effect: 'Libera o pet do Campinho e o Gol de Placa.',
    icon: '/assets/village/buildings/campinho-1.png',
    costs: [cost(1, 1, 1, 0), cost(2, 1, 1, 1), cost(2, 2, 2, 2)],
    requiresCore: true,
    liveMaxLevel: 0,
    opensIn: 'Etapa 4',
  },
  {
    id: 'arena',
    label: 'Arena',
    labelEn: 'Arena',
    description: 'O coliseu da Vila. Um dia você joga com o pai.',
    effects: [
      'O Olheiro cuida da Arena. Jogos com o pai: xadrez, Lig 4.',
      'Melhor de 3 e recorde na Torre.',
      'Troféu da Arena e partida na Placa.',
    ],
    effect: 'O Olheiro cuida da Arena. Jogos com o pai: xadrez, Lig 4.',
    icon: '/assets/village/buildings/arena-1.png',
    costs: [cost(1, 1, 1, 0), cost(2, 1, 1, 1), cost(2, 2, 2, 2)],
    requiresCore: false,
    liveMaxLevel: 0,
    opensIn: 'Etapa 4B',
    hideOnBaseMap: true,
  },
  {
    id: 'cofre',
    label: 'Cofre',
    labelEn: 'Vault',
    description: 'A poupança da Vila.',
    effects: [
      'Abre o Cofrinho com 1 meta.',
      '2 metas e o bônus de paciência (5% por semana, teto 20).',
      'Faixa prêmio da temporada e Extrato mensal.',
    ],
    effect: 'Abre o Cofrinho com 1 meta.',
    icon: '/assets/village/buildings/cofre-1.png',
    costs: [cost(1, 1, 1, 0), cost(2, 1, 1, 1), cost(3, 2, 2, 1)],
    requiresCore: false,
    hideOnBaseMap: true,
  },
  {
    id: 'agenda',
    label: 'Agenda',
    labelEn: 'Agenda',
    description: 'Provas, treinos, eventos e lembretes.',
    effects: [
      'Abre a Agenda da Vila.',
      'Agenda não tem níveis.',
      'Agenda não tem níveis.',
    ],
    effect: 'Abre a Agenda da Vila.',
    icon: '/assets/village/buildings/agenda-1.png',
    costs: [cost(1, 1, 1, 0), cost(1, 2, 1, 1), cost(2, 3, 2, 1)],
    requiresCore: false,
    liveMaxLevel: 1,
    hideOnBaseMap: true,
  },
  {
    id: 'mercado',
    label: 'Mercado',
    labelEn: 'Market',
    description: 'A barraca do Comerciante.',
    effects: [
      'Abre o Mercado: prêmios, Loja da Vila e Comerciante.',
      'Mercado não tem níveis por agora.',
      'Mercado não tem níveis por agora.',
    ],
    effect: 'Abre o Mercado: prêmios, Loja da Vila e Comerciante.',
    icon: '/assets/village/buildings/mercado-1.png',
    costs: [cost(1, 1, 1, 0), cost(2, 1, 1, 1), cost(3, 2, 2, 1)],
    requiresCore: false,
    liveMaxLevel: 1,
    hideOnBaseMap: true,
  },
];

export const BUILDING_BY_ID: Record<BuildingId, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
) as Record<BuildingId, BuildingDef>;

/** Custo para subir a construção ao nível alvo (1..3); null fora da faixa. Multiplica madeira, pedra e ferro. */
export function buildingCost(id: BuildingId, targetLevel: number, multiplier = 1): MaterialCost | null {
  if (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > BUILDING_MAX_LEVEL) return null;
  const base = BUILDING_BY_ID[id].costs[targetLevel - 1];
  const m = multiplier > 0 ? multiplier : 1;
  return {
    madeira: base.madeira * m,
    pedra: base.pedra * m,
    ferro: base.ferro * m,
    redstone: base.redstone,
  };
}

/** Caminho em `public/` sem querystring de cache (`?v=`). */
export function publicFilePath(src: string): string {
  const cut = src.search(/[?#]/);
  return cut >= 0 ? src.slice(0, cut) : src;
}

/** Ícone do lote: fantasma do n1 no nível 0 (cinza na UI), sprite próprio nos níveis 1-3. */
export function buildingIcon(id: BuildingId, level: number): string {
  const n = level <= 0 ? 1 : Math.min(BUILDING_MAX_LEVEL, level);
  const v = id === 'cerca' ? '?v=cerh3' : '';
  return `/assets/village/buildings/${id}-${n}.png${v}`;
}

export const BUILDING_PLACA = '/assets/village/buildings/placa.png';

export function buildingSprite(id: BuildingId, level: number): string {
  if (level <= 0) return BUILDING_PLACA;
  const v = id === 'cerca' ? 'cerh3' : 'arena7';
  return `/assets/village/buildings/${id}-${level}.png?v=${v}`;
}

/** Torre, Mesa e Campinho só aparecem com Fornalha e Baú no nível 1 ou mais */
export function isBuildingUnlocked(id: BuildingId, buildings: Record<BuildingId, number>): boolean {
  if (id === 'arena') return true;
  if (id === 'cerca') return (buildings.fornalha || 0) >= 1;
  if (id === 'cofre') return (buildings.bau || 0) >= 1;
  if (id === 'agenda' || id === 'mercado') return true;
  if (!BUILDING_BY_ID[id].requiresCore) return true;
  return (buildings.fornalha || 0) >= 1 && (buildings.bau || 0) >= 1;
}

/** Nível 0 = ainda não construída. */
export function buildingEffectNow(id: BuildingId, level: number): string {
  if (level <= 0) return 'Ainda não construída.';
  return BUILDING_BY_ID[id].effects[Math.min(BUILDING_MAX_LEVEL, level) - 1];
}

export function buildingEffectNext(id: BuildingId, level: number): string | null {
  if (level >= BUILDING_MAX_LEVEL) return null;
  return BUILDING_BY_ID[id].effects[level];
}

/** Motivo se este nível ainda não pode ser comprado; null se a etapa já entrega. */
export function buildingOpensLater(id: BuildingId, targetLevel: number): string | null {
  const def = BUILDING_BY_ID[id];
  const max = def.liveMaxLevel ?? BUILDING_MAX_LEVEL;
  if (targetLevel <= max) return null;
  return def.opensIn || 'Em breve';
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
  arena: 0,
  cofre: 0,
  agenda: 0,
  mercado: 0,
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

/** Regeneração / retomada: contratos `done` nunca saem do plano. */
export function keepDoneContracts(
  existing: Record<string, Contract>,
  built: Record<string, Contract>,
  builtOrder: string[],
): { contracts: Record<string, Contract>; order: string[] } {
  const doneEntries = Object.entries(existing).filter(([, c]) => c.status === 'done');
  if (!doneEntries.length) return { contracts: built, order: builtOrder };
  const done = Object.fromEntries(doneEntries);
  const contracts = { ...built, ...done };
  const doneIds = doneEntries.map(([id]) => id);
  const order = [...doneIds, ...builtOrder.filter((id) => !done[id])];
  return { contracts, order };
}
