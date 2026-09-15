import { LevelSystem } from '../types';
import { LEVEL_CAP } from '../config/rules';

/** XP acumulado para alcançar o nível L: 5 * (L - 1) * (L + 10). Nível 1 = 0. */
export function getXPForLevel(level: number): number {
  const L = Math.min(LEVEL_CAP, Math.max(1, Math.floor(level)));
  if (L <= 1) return 0;
  return 5 * (L - 1) * (L + 10);
}

/** Nível a partir do XP total (laço até LEVEL_CAP). */
export function getLevelFromXP(totalXP: number): number {
  const xp = Math.max(0, totalXP);
  let level = 1;
  while (level < LEVEL_CAP && xp >= getXPForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/**
 * Curva antiga (pré-temporada 1), só para o snapshot histórico em "Iniciar nova fase".
 * Não usar para progresso ao vivo.
 */
export function getLegacyLevelFromXP(totalXP: number): number {
  if (totalXP < 100) return 1;
  if (totalXP < 250) return 2;
  if (totalXP < 450) return 3;
  if (totalXP < 700) return 4;
  if (totalXP < 1000) return 5;
  return Math.min(100, 6 + Math.floor((totalXP - 1000) / 350));
}

/** Título a cada 5 níveis, teto 40. */
export function getLevelTitle(level: number): string {
  if (level >= 40) return 'Lenda da Mina';
  if (level >= 35) return 'Minerador de Esmeralda';
  if (level >= 30) return 'Minerador de Diamante';
  if (level >= 25) return 'Minerador de Ouro';
  if (level >= 20) return 'Minerador de Ferro';
  if (level >= 15) return 'Minerador de Pedra';
  if (level >= 10) return 'Minerador de Madeira';
  if (level >= 5) return 'Aprendiz da Mina';
  return 'Novato da Mina';
}

export function getLevelColor(level: number): string {
  if (level >= 40) return 'from-yellow-300 to-red-700';
  if (level >= 35) return 'from-yellow-400 to-red-600';
  if (level >= 30) return 'from-red-500 to-red-800';
  if (level >= 25) return 'from-amber-400 to-red-600';
  if (level >= 20) return 'from-yellow-400 to-amber-500';
  if (level >= 10) return 'from-amber-300 to-yellow-500';
  return 'from-red-500 to-red-700';
}

export function getLevelIcon(level: number): string {
  if (level >= 40) return 'crown';
  if (level >= 30) return 'trophy';
  if (level >= 20) return 'gem';
  if (level >= 10) return 'medal';
  if (level >= 5) return 'star';
  return 'bolt';
}

export function calculateLevelSystem(totalXP: number): LevelSystem {
  const currentLevel = getLevelFromXP(totalXP);
  const nextLevel = Math.min(LEVEL_CAP, currentLevel + 1);
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = currentLevel >= LEVEL_CAP ? totalXP : getXPForLevel(nextLevel);
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const xpNeededForCurrentLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
  const xpNeededForNext = xpForNextLevel - totalXP;
  const progressPercentage = currentLevel >= LEVEL_CAP
    ? 100
    : (currentLevelXP / xpNeededForCurrentLevel) * 100;

  return {
    currentLevel,
    currentXP: totalXP,
    xpForCurrentLevel,
    xpForNextLevel,
    xpNeededForNext: Math.max(0, xpNeededForNext),
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    levelTitle: getLevelTitle(currentLevel),
    nextLevelTitle: getLevelTitle(nextLevel),
    isMaxLevel: currentLevel >= LEVEL_CAP,
  };
}

export function checkLevelUp(previousXP: number, currentXP: number): {
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
} {
  const previousLevel = getLevelFromXP(previousXP);
  const newLevel = getLevelFromXP(currentXP);
  const levelsGained = newLevel - previousLevel;
  return {
    leveledUp: levelsGained > 0,
    previousLevel,
    newLevel,
    levelsGained,
  };
}

/** Níveis recém-alcançados, na ordem (para o modal de presente). */
export function levelsReached(previousLevel: number, newLevel: number): number[] {
  const out: number[] = [];
  for (let l = previousLevel + 1; l <= newLevel; l++) out.push(l);
  return out;
}

export function emitMinerLevelUp(check: { leveledUp: boolean; previousLevel: number; newLevel: number }): void {
  if (!check.leveledUp || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('miner-level-up', {
    detail: { level: check.newLevel, levels: levelsReached(check.previousLevel, check.newLevel) },
  }));
}

export function getXPNeededForLevel(targetLevel: number, currentXP: number): number {
  return Math.max(0, getXPForLevel(targetLevel) - currentXP);
}

export function getNextMilestone(currentLevel: number): {
  level: number;
  title: string;
  description: string;
} {
  const marks = [5, 10, 15, 20, 25, 30, 35, 40];
  const level = marks.find((m) => currentLevel < m) ?? LEVEL_CAP;
  return {
    level,
    title: getLevelTitle(level),
    description: currentLevel >= LEVEL_CAP ? 'Você já é uma lenda da mina!' : `Próximo marco: ${getLevelTitle(level)}.`,
  };
}

export function getAvatarBorderStyle(level: number): {
  borderClass: string;
  glowClass: string;
  ringClass: string;
  description: string;
  tier: number;
} {
  if (level >= 40) {
    return {
      borderClass: 'border-8 border-gradient-to-r from-purple-400 via-pink-400 via-yellow-400 via-blue-400 to-purple-400',
      glowClass: 'shadow-2xl shadow-purple-500/50',
      ringClass: 'ring-8 ring-purple-400/30 ring-offset-4 ring-offset-white',
      description: 'Lenda da Mina',
      tier: 8,
    };
  }
  if (level >= 35) {
    return {
      borderClass: 'border-6 border-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400',
      glowClass: 'shadow-xl shadow-indigo-500/40',
      ringClass: 'ring-6 ring-indigo-400/25 ring-offset-3 ring-offset-white',
      description: 'Minerador de Esmeralda',
      tier: 7,
    };
  }
  if (level >= 30) {
    return {
      borderClass: 'border-6 border-gradient-to-r from-blue-400 to-cyan-400',
      glowClass: 'shadow-xl shadow-blue-500/30',
      ringClass: 'ring-4 ring-blue-400/20 ring-offset-2 ring-offset-white',
      description: 'Minerador de Diamante',
      tier: 6,
    };
  }
  if (level >= 25) {
    return {
      borderClass: 'border-5 border-gradient-to-r from-green-400 to-emerald-400',
      glowClass: 'shadow-lg shadow-green-500/20',
      ringClass: 'ring-3 ring-green-400/15 ring-offset-1 ring-offset-white',
      description: 'Minerador de Ouro',
      tier: 5,
    };
  }
  if (level >= 20) {
    return {
      borderClass: 'border-4 border-gradient-to-r from-yellow-400 to-orange-400',
      glowClass: 'shadow-md shadow-yellow-500/15',
      ringClass: 'ring-2 ring-yellow-400/10',
      description: 'Minerador de Ferro',
      tier: 4,
    };
  }
  if (level >= 15) {
    return {
      borderClass: 'border-4 border-red-400',
      glowClass: 'shadow shadow-red-400/10',
      ringClass: '',
      description: 'Minerador de Pedra',
      tier: 3,
    };
  }
  if (level >= 10) {
    return {
      borderClass: 'border-3 border-yellow-400',
      glowClass: 'shadow-sm shadow-yellow-400/10',
      ringClass: '',
      description: 'Minerador de Madeira',
      tier: 2,
    };
  }
  if (level >= 5) {
    return {
      borderClass: 'border-2 border-yellow-300',
      glowClass: '',
      ringClass: '',
      description: 'Aprendiz da Mina',
      tier: 1,
    };
  }
  return {
    borderClass: 'border-2 border-gray-300',
    glowClass: '',
    ringClass: '',
    description: 'Novato da Mina',
    tier: 0,
  };
}
