import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, run, test } from './harness';
import {
  LEVELS,
  NUMBER_WORDS,
  edLemma,
  findForbiddenTokens,
  ingLemma,
  isTokenForbidden,
  letterWordRange,
  levelFor,
  tokenize,
} from '../../../config/englishLevels';
import {
  BUILDINGS,
  BUILDING_BY_ID,
  BUILDING_MAX_LEVEL,
  CONTRACT_ICONS,
  INITIAL_MATERIALS,
  MATERIALS,
  MATERIAL_ICONS,
  MERCHANT_ITEMS,
  MERCHANT_SPOTS,
  TERRAIN_ICON,
  baseLevel,
  buildingCost,
  buildingIcon,
  buildingEffectNow,
  buildingOpensLater,
  canAfford,
  initialBaseDoc,
  isBuildingUnlocked,
  missingMaterials,
} from '../../../config/englishBase';

// ---------- tokens proibidos ----------

test('sem falso positivo em red/bed/need/king/morning/evening', () => {
  expect(findForbiddenTokens('The red bed. I need a king in the morning and evening.', 1)).toEqual([]);
  expect(findForbiddenTokens('seed feed speed building', 1)).toEqual([]);
});

test('verdadeiro positivo em was/went/running/played no nível 1', () => {
  const found = findForbiddenTokens('He was here. We went home. I am running. They played ball.', 1);
  expect(found).toContain('was');
  expect(found).toContain('went');
  expect(found).toContain('running');
  expect(found).toContain('played');
  expect(found).toHaveLength(4);
});

test('-ing depois de like/love é permitido nos níveis 1 e 2; livre no 3', () => {
  expect(findForbiddenTokens('I like running and I love swimming.', 1)).toEqual([]);
  expect(findForbiddenTokens('She likes reading.', 2)).toEqual([]);
  expect(findForbiddenTokens('I am running.', 1)).toEqual(['running']);
  expect(findForbiddenTokens('I am running.', 2)).toEqual(['running']);
  expect(findForbiddenTokens('I am running.', 3)).toEqual([]);
});

test('was/were só no nível 3; going to proibido no 3, going sozinho não', () => {
  expect(findForbiddenTokens('I was here', 2)).toEqual(['was']);
  expect(findForbiddenTokens('We were happy', 3)).toEqual([]);
  expect(findForbiddenTokens('I am going to run', 3)).toEqual(['going']);
  expect(findForbiddenTokens('I am going home', 3)).toEqual([]);
  expect(findForbiddenTokens('I am going home', 1)).toEqual(['going']);
});

test('-ed por lema: used/opened/carried/stopped sim; seed/bed não', () => {
  expect(edLemma('used')).toBe('use');
  expect(edLemma('opened')).toBe('open');
  expect(edLemma('carried')).toBe('carry');
  expect(edLemma('stopped')).toBe('stop');
  expect(edLemma('seed')).toBe(null);
  expect(edLemma('bed')).toBe(null);
  expect(ingLemma('building')).toBe(null);
  expect(ingLemma('swimming')).toBe('swim');
  expect(ingLemma('making')).toBe('make');
  expect(isTokenForbidden('played', 3)).toBeTruthy();
  expect(isTokenForbidden('did', 3)).toBeTruthy();
  expect(isTokenForbidden("can't", 1)).toBeTruthy();
  expect(isTokenForbidden("can't", 2)).toBeFalsy();
});

test('tokenize preserva apóstrofo e ignora pontuação', () => {
  expect(tokenize("Don't put it there, please!")).toEqual(["don't", 'put', 'it', 'there', 'please']);
});

// ---------- cartão dos níveis ----------

test('levelFor limita a 1..3', () => {
  expect(levelFor(0).level).toBe(1);
  expect(levelFor(2).level).toBe(2);
  expect(levelFor(9).level).toBe(3);
  expect(levelFor(Number.NaN).level).toBe(1);
});

test('tabela dos níveis: maxWords, Carta, glossário, moldes e temas', () => {
  expect([LEVELS[1].maxWords, LEVELS[2].maxWords, LEVELS[3].maxWords]).toEqual([7, 9, 11]);
  expect(LEVELS[1].letterWords).toEqual([40, 60]);
  expect(LEVELS[2].letterWords).toEqual([60, 90]);
  expect(LEVELS[3].letterWords).toEqual([80, 120]);
  expect(LEVELS[1].glossarySize).toEqual([4, 6]);
  expect(LEVELS[2].glossarySize).toEqual([6, 8]);
  expect(LEVELS[3].glossarySize).toEqual([8, 10]);
  for (const lv of [LEVELS[1], LEVELS[2], LEVELS[3]]) {
    expect(lv.noteTemplates.length >= 4).toBeTruthy();
    lv.noteTemplates.forEach((t) => expect(t).toContain('___'));
    expect(lv.vocabThemes.length >= 4).toBeTruthy();
    expect(lv.forgeTargets.length >= 4).toBeTruthy();
    expect(lv.grammar.length >= 4).toBeTruthy();
    // os moldes respeitam o próprio nível
    lv.noteTemplates.forEach((t) => expect(findForbiddenTokens(t, lv.level)).toEqual([]));
  }
  expect(letterWordRange(1, 'notice')).toEqual([25, 45]);
  expect(letterWordRange(3, 'list')).toEqual([30, 50]);
  expect(letterWordRange(2, 'dialogue')).toEqual([60, 90]);
  expect(NUMBER_WORDS[2]).toBe('two');
  expect(NUMBER_WORDS).toHaveLength(21);
});

// ---------- catálogo da base ----------

const pub = join(process.cwd(), 'public');

test('9 construções: custos somam 3/5/8 com ferro >= 1; ícones existem', () => {
  expect(BUILDINGS).toHaveLength(9);
  for (const b of BUILDINGS) {
    b.costs.forEach((c, i) => {
      const total = MATERIALS.reduce((s, m) => s + c[m], 0);
      expect(total).toBe([3, 5, 8][i]);
      expect(c.ferro >= 1).toBeTruthy();
    });
    expect(existsSync(join(pub, b.icon))).toBeTruthy();
  }
  expect(existsSync(join(pub, TERRAIN_ICON))).toBeTruthy();
  expect(buildingCost('fornalha', 1)).toEqual({ madeira: 1, pedra: 1, ferro: 1, redstone: 0 });
  expect(buildingCost('fornalha', 1, 2)).toEqual({ madeira: 2, pedra: 2, ferro: 2, redstone: 0 });
  expect(buildingCost('fornalha', 4)).toBe(null);
  expect(buildingIcon('fornalha', 0)).toBe('/assets/village/buildings/fornalha-1.png');
  expect(buildingIcon('bau', 2)).toBe('/assets/village/buildings/bau-2.png');
  expect(BUILDING_MAX_LEVEL).toBe(3);
});

test('desbloqueio: torre/mesa/campinho só com fornalha e baú >= 1; cofre precisa do armazém; agenda livre', () => {
  const none = { fornalha: 0, bau: 0, cerca: 0, torre: 0, mesa: 0, campinho: 0, cofre: 0, agenda: 0, mercado: 0 };
  expect(isBuildingUnlocked('torre', none)).toBeFalsy();
  expect(isBuildingUnlocked('cerca', none)).toBeFalsy();
  expect(isBuildingUnlocked('cerca', { ...none, fornalha: 1 })).toBeTruthy();
  expect(isBuildingUnlocked('mesa', { ...none, fornalha: 1 })).toBeFalsy();
  expect(isBuildingUnlocked('campinho', { ...none, fornalha: 1, bau: 1 })).toBeTruthy();
  expect(isBuildingUnlocked('cofre', none)).toBeFalsy();
  expect(isBuildingUnlocked('cofre', { ...none, bau: 1 })).toBeTruthy();
  expect(isBuildingUnlocked('agenda', none)).toBeTruthy();
  expect(isBuildingUnlocked('mercado', { ...none, fornalha: 1, bau: 1 })).toBeTruthy();
  expect(baseLevel({ ...none, fornalha: 2, bau: 1 })).toBe(3);
});

test('Campinho não se constrói antes da Etapa 4; Agenda e Mercado param no nível 1; prova na Biblioteca', () => {
  expect(buildingOpensLater('campinho', 1)).toBe('Etapa 4');
  expect(buildingOpensLater('fornalha', 1)).toBe(null);
  expect(buildingOpensLater('agenda', 2)).toBe('Em breve');
  expect(buildingOpensLater('mercado', 2)).toBe('Em breve');
  expect(buildingOpensLater('agenda', 1)).toBe(null);
  expect(buildingEffectNow('fornalha', 0)).toBe('Ainda não construída.');
  expect(buildingEffectNow('torre', 1)).toMatch(/conquistas/i);
  expect(buildingEffectNow('mesa', 1)).toMatch(/prova do dia/i);
  expect(BUILDING_BY_ID.mesa.label).toBe('Biblioteca');
  for (const b of BUILDINGS) {
    expect(b.effects).toHaveLength(3);
    expect(b.labelEn.length >= 3).toBeTruthy();
  }
});

test('estado inicial: Fornalha pela metade (faltam 1 pedra + 1 madeira)', () => {
  const doc = initialBaseDoc('uid', '2026-09-14T00:00:00.000Z');
  expect(doc.materials).toEqual(INITIAL_MATERIALS);
  const cost = buildingCost('fornalha', 1);
  expect(cost).toBeTruthy();
  if (cost) {
    expect(canAfford(doc.materials, cost)).toBeFalsy();
    expect(missingMaterials(doc.materials, cost)).toEqual({ madeira: 1, pedra: 1, ferro: 0, redstone: 0 });
  }
  expect(doc.scaffoldStage).toBe(0);
  expect(doc.level).toBe(1);
});

test('12 lugares com relações permitidas e 17 itens sem id de lugar; imagens existem', () => {
  expect(MERCHANT_SPOTS).toHaveLength(12);
  expect(MERCHANT_ITEMS).toHaveLength(17);
  const spotIds = new Set(MERCHANT_SPOTS.map((s) => s.id));
  expect(spotIds.size).toBe(12);
  for (const s of MERCHANT_SPOTS) {
    expect(s.relations.length >= 2).toBeTruthy();
    expect(existsSync(join(pub, s.image))).toBeTruthy();
  }
  const relationsOf = (id: string): string[] => MERCHANT_SPOTS.find((s) => s.id === id)?.relations ?? [];
  expect(relationsOf('door')).toEqual(['next_to', 'under']);
  expect(relationsOf('chest')).toEqual(['in', 'on', 'next_to']);
  expect(relationsOf('table')).toEqual(['on', 'under', 'next_to']);
  const itemIds = new Set<string>();
  for (const it of MERCHANT_ITEMS) {
    expect(spotIds.has(it.id)).toBeFalsy();
    expect(itemIds.has(it.id)).toBeFalsy();
    itemIds.add(it.id);
    expect(existsSync(join(pub, it.image))).toBeTruthy();
    expect(it.plural.length > 0).toBeTruthy();
  }
  expect(MERCHANT_ITEMS.find((i) => i.id === 'apple')?.image).toBe('/assets/english/ui/apple.webp');
  Object.values(MATERIAL_ICONS).forEach((p) => expect(existsSync(join(pub, p))).toBeTruthy());
  Object.values(CONTRACT_ICONS).forEach((p) => expect(existsSync(join(pub, p))).toBeTruthy());
});

void run();
