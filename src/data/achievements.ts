import type { GameAchievement, GameAchievementReward, AchievementTier } from '../types/village';

const REWARD: Record<AchievementTier, GameAchievementReward> = {
  bronze: { xp: 10, material: 1 },
  prata: { xp: 25, material: 2 },
  ouro: { xp: 50, rare: 'esmeralda' },
  exclusiva: { xp: 100, rare: 'diamante' },
};

function a(
  id: string,
  category: string,
  tier: AchievementTier,
  title: string,
  description: string,
  icon: string,
  stat: string,
  target: number,
  extra?: Partial<GameAchievement>
): GameAchievement {
  return {
    id,
    category,
    tier,
    title,
    description,
    icon,
    stat,
    target,
    reward: extra?.reward ?? REWARD[tier],
    hidden: extra?.hidden,
    resetOnSeason: extra?.resetOnSeason,
  };
}

function trio(
  prefix: string,
  category: string,
  title: string,
  description: string,
  icon: string,
  stat: string,
  targets: [number, number, number],
  extra?: Partial<GameAchievement>
): GameAchievement[] {
  const tiers: AchievementTier[] = ['bronze', 'prata', 'ouro'];
  return targets.map((target, i) =>
    a(`${prefix}_${target}`, category, tiers[i], `${title} ${target}`, `${description} (${target})`, icon, stat, target, extra)
  );
}

export const GAME_ACHIEVEMENTS: GameAchievement[] = [
  a('primeira_picaretada', 'rotina', 'bronze', 'Primeira picaretada', 'Conclua 1 missão.', 'map', 'missionsDone', 1),
  ...trio('mao_na_massa', 'rotina', 'Mão na massa', 'Missões feitas', 'map', 'missionsDone', [10, 50, 100]),
  ...trio('veterano', 'rotina', 'Veterano', 'Missões feitas', 'map', 'missionsDone', [250, 500, 1000]),
  ...trio('dia_completo', 'rotina', 'Dia completo', 'Dias com todas as missões', 'torch', 'fullDaysCount', [1, 10, 50]),
  ...trio('tochas', 'rotina', 'Tochas', 'Dias completos seguidos', 'torch', 'fullDaysBest', [3, 7, 21]),
  ...trio('madrugador', 'rotina', 'Madrugador', 'Missões da manhã antes das 9h', 'sun', 'morningEarly', [10, 30, 100]),
  ...trio('sem_esquecer', 'rotina', 'Sem esquecer', 'Dias seguidos sem missão perdida', 'torch', 'perfectWeeks', [7, 30, 90]),
  a('recuperacao', 'rotina', 'bronze', 'Recuperação', '5 missões recuperadas até meio-dia.', 'clock', 'recoveries', 5),

  a('primeira_obra', 'obras', 'bronze', 'Primeira obra', 'Fornalha no nível 1.', 'forge', 'building:fornalha', 1),
  a('vila_verdade', 'obras', 'prata', 'Vila de verdade', 'Todas as sete no nível 1.', 'home', 'buildingsMin', 1),
  a('mestre_obras', 'obras', 'ouro', 'Mestre de obras', 'Todas no nível 2.', 'home', 'buildingsMin', 2),
  a('base_completa', 'obras', 'exclusiva', 'Base completa', 'Todas no nível 3.', 'home', 'buildingsMin', 3, { reward: { xp: 100, cosmetic: 'hat_mestre_obras' } }),
  ...trio('fundidor', 'obras', 'Fundidor', 'Fundições', 'forge', 'smelts', [10, 50, 200]),
  ...trio('queimador', 'obras', 'Queimador', 'Queimas de redstone', 'forge', 'burns', [10, 30, 100]),

  a('ferramenta_nova', 'ferraria', 'bronze', 'Ferramenta nova', 'Primeira picareta.', 'pickaxe', 'pickaxe', 1),
  a('picareta_ferro', 'ferraria', 'prata', 'Picareta de ferro', 'Craftou a picareta de ferro.', 'pickaxe', 'pickaxe', 2),
  a('picareta_ouro', 'ferraria', 'prata', 'Picareta de ouro', 'Craftou a picareta de ouro.', 'pickaxe', 'pickaxe', 3),
  a('picareta_diamante', 'ferraria', 'ouro', 'Picareta de diamante', 'Craftou a picareta de diamante.', 'pickaxe', 'pickaxe', 4),
  a('bem_equipado', 'ferraria', 'exclusiva', 'Bem equipado', 'Todos os equipamentos forjados.', 'helmet', 'gearAll', 1),

  a('primeiro_contrato', 'mina', 'bronze', 'Primeiro contrato', '1 contrato na Mina.', 'book', 'contractsDone', 1),
  ...trio('cliente_fiel', 'mina', 'Cliente fiel', 'Contratos', 'book', 'contractsDone', [25, 100, 365]),
  ...trio('sem_erro', 'mina', 'Sem erro', 'Contratos perfeitos', 'book', 'contractsPerfect', [5, 25, 100]),
  ...trio('palavras', 'mina', 'Palavras', 'Palavras dominadas', 'book', 'wordsMastered', [50, 200, 500]),
  a('carta_20', 'mina', 'bronze', 'Carta', '20 contratos de carta.', 'book', 'contractsLetter', 20),
  a('recado_20', 'mina', 'bronze', 'Recado', '20 contratos de recado.', 'book', 'contractsNote', 20),
  a('ferraria_20', 'mina', 'bronze', 'Ferraria', '20 contratos de ferraria.', 'book', 'contractsForge', 20),
  a('comerciante_20', 'mina', 'bronze', 'Comerciante', '20 contratos de comerciante.', 'book', 'contractsMerchant', 20),

  a('primeira_prova', 'biblioteca', 'bronze', 'Primeira prova', 'Fez a prova do dia.', 'book', 'quizzesDone', 1),
  ...trio('nota_maxima', 'biblioteca', 'Nota máxima', 'Provas 8 de 8', 'star', 'quizPerfect', [1, 10, 50]),
  ...trio('constancia', 'biblioteca', 'Constância', 'Provas seguidas', 'book', 'quizStreak', [7, 30, 100]),
  ...trio('pensador', 'biblioteca', 'Pensador', 'Reflexões escritas', 'book', 'reflections', [10, 50, 200]),
  a('estante_10', 'biblioteca', 'bronze', 'Estante limpa', '10 erros corrigidos na Estante.', 'book', 'shelfFixed', 10),
  a('estante_50', 'biblioteca', 'prata', 'Estante limpa', '50 erros corrigidos na Estante.', 'book', 'shelfFixed', 50),

  a('primeiro_deposito', 'banco', 'bronze', 'Primeiro depósito', 'Guardou gold no Cofrinho.', 'gold', 'deposits', 1),
  ...trio('meta_batida', 'banco', 'Meta batida', 'Metas alcançadas', 'gold', 'goalsAchieved', [1, 5, 20]),
  ...trio('paciente', 'banco', 'Paciente', 'Semanas com bônus de paciência', 'gold', 'interestWeeks', [4, 12, 26]),
  a('poupador_4', 'banco', 'bronze', 'Poupador', 'Guardou 20% ou mais em 4 semanas.', 'gold', 'saverWeeks', 4),
  a('poupador_12', 'banco', 'prata', 'Poupador', 'Guardou 20% ou mais em 12 semanas.', 'gold', 'saverWeeks', 12),
  a('grande_meta', 'banco', 'ouro', 'Grande meta', 'Uma meta de 20 dias de renda alcançada.', 'gold', 'bigGoals', 1),

  ...trio('organizado', 'agenda', 'Organizado', 'Itens da agenda feitos', 'clock', 'agendaDone', [5, 25, 100]),
  a('planejador_10', 'agenda', 'bronze', 'Planejador', '10 itens com 2 dias de antecedência.', 'clock', 'agendaPlanned', 10),
  a('planejador_50', 'agenda', 'prata', 'Planejador', '50 itens com 2 dias de antecedência.', 'clock', 'agendaPlanned', 50),
  ...trio('semana_organizada', 'agenda', 'Semana organizada', 'Semanas com tudo feito', 'clock', 'organizedWeeks', [1, 4, 12]),
  ...trio('foco', 'agenda', 'Foco', 'Blocos de Foco terminados', 'clock', 'focusBlocks', [10, 50, 200]),

  a('amigo_comerciante', 'amizade', 'prata', 'Amigo do Comerciante', 'Amizade nível 3.', 'heart', 'npcTier:comerciante', 3),
  a('amigo_sabio', 'amizade', 'prata', 'Amigo do Sábio', 'Amizade nível 3.', 'heart', 'npcTier:sabio', 3),
  a('amigo_ferreiro', 'amizade', 'prata', 'Amigo do Ferreiro', 'Amizade nível 3.', 'heart', 'npcTier:ferreiro', 3),
  a('amigo_olheiro', 'amizade', 'prata', 'Amigo do Olheiro', 'Amizade nível 3.', 'heart', 'npcTier:olheiro', 3),
  a('lenda_comerciante', 'amizade', 'ouro', 'Lenda para o Comerciante', 'Amizade nível 5.', 'heart', 'npcTier:comerciante', 5),
  a('lenda_sabio', 'amizade', 'ouro', 'Lenda para o Sábio', 'Amizade nível 5.', 'heart', 'npcTier:sabio', 5),
  a('lenda_ferreiro', 'amizade', 'ouro', 'Lenda para o Ferreiro', 'Amizade nível 5.', 'heart', 'npcTier:ferreiro', 5),
  a('lenda_olheiro', 'amizade', 'ouro', 'Lenda para o Olheiro', 'Amizade nível 5.', 'heart', 'npcTier:olheiro', 5),
  a('todo_mundo', 'amizade', 'exclusiva', 'Todo mundo gosta de você', 'Os quatro no nível 3.', 'heart', 'npcTiersMin', 3, { reward: { xp: 100, cosmetic: 'cape_vila' } }),
  a('bom_papo_100', 'amizade', 'bronze', 'Bom de papo', '100 conversas.', 'heart', 'npcTalks', 100),
  a('bom_papo_365', 'amizade', 'prata', 'Bom de papo', '365 conversas.', 'heart', 'npcTalks', 365),

  a('primeiro_bau', 'bau', 'bronze', 'Primeiro Baú do Dia', 'Abriu o Baú do Dia.', 'chest', 'chestsOpened', 1),
  ...trio('baus', 'bau', 'Baús', 'Baús do Dia abertos', 'chest', 'chestsOpened', [10, 50, 200]),
  ...trio('sete_tochas', 'bau', 'Sete tochas', 'Baús das 7 tochas', 'chest', 'streakChests', [1, 5, 20]),
  a('primeira_esmeralda', 'bau', 'bronze', 'Esmeralda', 'A primeira esmeralda.', 'emerald', 'emeraldsEver', 1),
  a('primeiro_diamante', 'bau', 'prata', 'Diamante', 'O primeiro diamante.', 'diamond', 'diamondsEver', 1),

  a('nivel_5', 'temporada', 'bronze', 'Aprendiz da Mina', 'Chegue ao nível 5.', 'star', 'level', 5, { resetOnSeason: true }),
  a('nivel_10', 'temporada', 'prata', 'Minerador de Madeira', 'Chegue ao nível 10.', 'star', 'level', 10, { resetOnSeason: true }),
  a('nivel_20', 'temporada', 'prata', 'Minerador de Ferro', 'Chegue ao nível 20.', 'star', 'level', 20, { resetOnSeason: true }),
  a('nivel_30', 'temporada', 'ouro', 'Minerador de Diamante', 'Chegue ao nível 30.', 'star', 'level', 30, { resetOnSeason: true }),
  a('nivel_40', 'temporada', 'exclusiva', 'Lenda da Mina', 'Chegue ao nível 40.', 'trophy', 'level', 40, { resetOnSeason: true }),
  ...trio('estrela', 'temporada', 'Estrela', 'Temporadas fechadas', 'star', 'seasonsDone', [1, 3, 6]),

  a('curioso', 'segredos', 'bronze', 'Curioso', 'Falou com os quatro NPCs no mesmo dia.', 'heart', 'talksSameDay', 1, { hidden: true }),
  a('lua_da_vila', 'segredos', 'prata', 'Lua da Vila', 'Abriu a Vila depois das 21h num dia completo.', 'moon', 'nightComplete', 1, { hidden: true }),
  a('colecionador', 'segredos', 'ouro', 'Colecionador', 'Os quatro cosméticos de marco.', 'crown', 'milestonesOwned', 4, { hidden: true }),
  a('creeper_amigo', 'segredos', 'bronze', 'Creeper amigo', 'Clicou 5 vezes no creeper do resumo.', 'emerald', 'creeperClicks', 5, { hidden: true }),
];

export const GAME_ACHIEVEMENT_BY_ID: Record<string, GameAchievement> = Object.fromEntries(
  GAME_ACHIEVEMENTS.map((x) => [x.id, x])
);
