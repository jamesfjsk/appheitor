import type { NpcId } from '../types/village';

export interface NpcQuestChapter {
  chapter: number;
  title: string;
  ask: string;
  stat: string;
  target: number;
}

export const NPC_QUESTS: Record<NpcId, NpcQuestChapter[]> = {
  comerciante: [
    { chapter: 1, title: 'Barraca', ask: 'Compre 10 materiais do Comerciante', stat: 'merchantBuys', target: 10 },
    { chapter: 2, title: 'Contratos', ask: 'Faça 3 contratos numa semana', stat: 'contractsWeek', target: 3 },
    { chapter: 3, title: 'Compra', ask: 'Compre algo e não se arrependa', stat: 'shopBuys', target: 1 },
    { chapter: 4, title: 'Cofre', ask: 'Guarde 50 gold no Cofrinho', stat: 'savedGold', target: 50 },
    { chapter: 5, title: 'Semana limpa', ask: 'Uma semana sem missão perdida', stat: 'perfectWeeks', target: 7 },
  ],
  sabio: [
    { chapter: 1, title: 'Prova', ask: 'Tire 6 ou mais na prova', stat: 'quizScore', target: 6 },
    { chapter: 2, title: 'Reflexões', ask: 'Escreva 3 reflexões', stat: 'reflections', target: 3 },
    { chapter: 3, title: 'Oito', ask: 'Tire 8 de 8', stat: 'quizPerfect', target: 1 },
    { chapter: 4, title: 'Tema', ask: 'Escolha o tema de amanhã 5 vezes', stat: 'themesSet', target: 5 },
    { chapter: 5, title: 'Sequência', ask: 'Sete provas seguidas', stat: 'quizStreak', target: 7 },
  ],
  ferreiro: [
    { chapter: 1, title: 'Fornalha', ask: 'Construa a Fornalha', stat: 'building:fornalha', target: 1 },
    { chapter: 2, title: 'Pedra', ask: 'Crafte a picareta de pedra', stat: 'pickaxe', target: 1 },
    { chapter: 3, title: 'Nível 2', ask: 'Leve a Fornalha ao nível 2', stat: 'building:fornalha', target: 2 },
    { chapter: 4, title: 'Capacete', ask: 'Crafte o capacete', stat: 'helmet', target: 1 },
    { chapter: 5, title: 'Base', ask: 'Base completa', stat: 'buildingsMin', target: 3 },
  ],
  olheiro: [
    { chapter: 1, title: 'Três dias', ask: '3 dias completos seguidos', stat: 'fullDaysBest', target: 3 },
    { chapter: 2, title: 'Desafio', ask: 'Complete um desafio', stat: 'challengesDone', target: 1 },
    { chapter: 3, title: 'Sete', ask: '7 tochas', stat: 'fullDaysBest', target: 7 },
    { chapter: 4, title: 'Mês', ask: 'Um mês sem punição', stat: 'noPunishDays', target: 30 },
    { chapter: 5, title: 'Trinta', ask: 'Nível 30', stat: 'level', target: 30 },
  ],
};
