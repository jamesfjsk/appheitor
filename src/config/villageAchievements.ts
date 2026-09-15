import type { Achievement } from '../types';

function pack(
  title: string,
  description: string,
  type: Achievement['type'],
  target: number,
  xpReward: number,
  goldReward: number,
  icon: string
): Omit<Achievement, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    title,
    description,
    type,
    target,
    xpReward,
    goldReward,
    icon,
    isActive: true,
  };
}

/** Pacote cadastrado em "Iniciar nova fase". Tipos já existentes em checkAchievements. */
export const MINER_MISSIONS_ACHIEVEMENTS: Omit<Achievement, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  pack('Primeira Escavação', 'Conclua 1 missão', 'tasks', 1, 25, 5, 'pickaxe'),
  pack('Mão na Picareta', 'Conclua 10 missões', 'tasks', 10, 50, 10, 'pickaxe'),
  pack('Minerador de Pedra', 'Conclua 50 missões', 'tasks', 50, 100, 20, 'map'),
  pack('Veio de Ferro', 'Conclua 150 missões', 'tasks', 150, 200, 40, 'sword'),
  pack('Semana na Mina', '7 dias seguidos', 'streak', 7, 50, 10, 'torch'),
  pack('Mês de Tochas', '30 dias seguidos', 'streak', 30, 100, 20, 'torch'),
  pack('Aprendiz da Mina', 'Chegue ao nível 5', 'level', 5, 50, 5, 'diamond'),
  pack('Minerador de Madeira', 'Chegue ao nível 10', 'level', 10, 50, 10, 'diamond'),
  pack('Minerador de Ferro', 'Chegue ao nível 20', 'level', 20, 50, 20, 'diamond'),
  pack('Minerador de Diamante', 'Chegue ao nível 30', 'level', 30, 50, 30, 'diamond'),
  pack('Primeiro Baú', 'Troque 1 prêmio', 'redemptions', 1, 25, 5, 'chest'),
  pack('Comerciante Fiel', 'Troque 10 prêmios', 'redemptions', 10, 50, 10, 'chest'),
  pack('Lenda da Mina', 'Chegue ao nível 40', 'level', 40, 50, 40, 'trophy'),
];
