import { LevelSystem } from '../types';

// ========================================
// 🔥 SISTEMA DE NÍVEIS FLASH MISSIONS
// ========================================

/**
 * Calcula o XP necessário para um nível específico
 * Nível 1: 0-100 XP
 * Nível 2: 100-250 XP  
 * Nível 3: 250-450 XP
 * Nível 4: 450-700 XP
 * Nível 5: 700-1000 XP
 * A partir do nível 5: cada nível requer +350 XP do anterior
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 450;
  if (level === 5) return 700;
  if (level === 6) return 1000;
  
  // A partir do nível 6: 1000 + (level - 6) * 350
  return 1000 + (level - 6) * 350;
}

/**
 * Calcula o nível baseado no XP total
 */
export function getLevelFromXP(totalXP: number): number {
  if (totalXP < 100) return 1;
  if (totalXP < 250) return 2;
  if (totalXP < 450) return 3;
  if (totalXP < 700) return 4;
  if (totalXP < 1000) return 5;
  
  // A partir de 1000 XP, cada 350 XP = 1 nível
  return Math.min(100, 6 + Math.floor((totalXP - 1000) / 350));
}

/**
 * Retorna o título do nível baseado no número
 */
export function getLevelTitle(level: number): string {
  if (level >= 91) return "Flash Master";
  if (level >= 76) return "Flash Disciplinado";
  if (level >= 51) return "Flash Responsável";
  if (level >= 26) return "Flash Júnior";
  if (level >= 11) return "Flash Aprendiz";
  return "Flash Iniciante";
}

/**
 * Retorna a cor do nível baseado no título
 */
export function getLevelColor(level: number): string {
  if (level >= 91) return "from-purple-500 to-purple-600"; // Master
  if (level >= 76) return "from-indigo-500 to-indigo-600"; // Disciplinado
  if (level >= 51) return "from-blue-500 to-blue-600";     // Responsável
  if (level >= 26) return "from-green-500 to-green-600";   // Júnior
  if (level >= 11) return "from-yellow-500 to-yellow-600"; // Aprendiz
  return "from-red-500 to-red-600";                        // Iniciante
}

/**
 * Retorna o ícone do nível
 */
export function getLevelIcon(level: number): string {
  if (level >= 91) return "👑"; // Master
  if (level >= 76) return "🏆"; // Disciplinado
  if (level >= 51) return "🥇"; // Responsável
  if (level >= 26) return "🥈"; // Júnior
  if (level >= 11) return "🥉"; // Aprendiz
  return "⭐";                  // Iniciante
}

/**
 * Calcula todas as informações do sistema de níveis
 */
export function calculateLevelSystem(totalXP: number): LevelSystem {
  const currentLevel = getLevelFromXP(totalXP);
  const nextLevel = Math.min(100, currentLevel + 1);
  
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(nextLevel);
  
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const xpNeededForCurrentLevel = xpForNextLevel - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - totalXP;
  
  const progressPercentage = currentLevel >= 100 
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
    isMaxLevel: currentLevel >= 100
  };
}

/**
 * Verifica se houve level up comparando XP anterior e atual
 */
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
    levelsGained
  };
}

/**
 * Força verificação de conquistas baseadas em progresso atual
 */
export function shouldTriggerAchievementCheck(
  previousProgress: UserProgress, 
  currentProgress: UserProgress
): boolean {
  // Check if any achievement-relevant metric changed
  return (
    previousProgress.totalXP !== currentProgress.totalXP ||
    previousProgress.totalTasksCompleted !== currentProgress.totalTasksCompleted ||
    previousProgress.streak !== currentProgress.streak ||
    previousProgress.longestStreak !== currentProgress.longestStreak ||
    previousProgress.rewardsRedeemed !== currentProgress.rewardsRedeemed ||
    getLevelFromXP(previousProgress.totalXP || 0) !== getLevelFromXP(currentProgress.totalXP || 0)
  );
}

/**
 * Gera lista de marcos de XP para referência
 */
export function getXPMilestones(): Array<{ level: number; xp: number; title: string }> {
  const milestones = [];
  
  for (let level = 1; level <= 100; level++) {
    milestones.push({
      level,
      xp: getXPForLevel(level),
      title: getLevelTitle(level)
    });
  }
  
  return milestones;
}

/**
 * Calcula XP necessário para alcançar um nível específico
 */
export function getXPNeededForLevel(targetLevel: number, currentXP: number): number {
  const targetXP = getXPForLevel(targetLevel);
  return Math.max(0, targetXP - currentXP);
}

/**
 * Retorna informações sobre o próximo marco importante
 */
export function getNextMilestone(currentLevel: number): {
  level: number;
  title: string;
  description: string;
} {
  if (currentLevel < 11) {
    return {
      level: 11,
      title: "Flash Aprendiz",
      description: "Torne-se um aprendiz do Flash!"
    };
  } else if (currentLevel < 26) {
    return {
      level: 26,
      title: "Flash Júnior",
      description: "Evolua para Flash Júnior!"
    };
  } else if (currentLevel < 51) {
    return {
      level: 51,
      title: "Flash Responsável",
      description: "Alcance o nível de Flash Responsável!"
    };
  } else if (currentLevel < 76) {
    return {
      level: 76,
      title: "Flash Disciplinado",
      description: "Torne-se um Flash Disciplinado!"
    };
  } else if (currentLevel < 91) {
    return {
      level: 91,
      title: "Flash Master",
      description: "Alcance o nível máximo: Flash Master!"
    };
  } else {
    return {
      level: 100,
      title: "Flash Master Supremo",
      description: "Você já é um mestre!"
    };
  }
}

/**
 * Retorna o estilo de borda baseado no nível (evolui a cada 5 níveis)
 */
export function getAvatarBorderStyle(level: number): {
  borderClass: string;
  glowClass: string;
  ringClass: string;
  description: string;
  tier: number;
} {
  const tier = Math.floor((level - 1) / 5) + 1; // Tier 1-20
  
  if (level >= 95) {
    return {
      borderClass: 'border-8 border-gradient-to-r from-purple-400 via-pink-400 via-yellow-400 via-blue-400 to-purple-400',
      glowClass: 'shadow-2xl shadow-purple-500/50',
      ringClass: 'ring-8 ring-purple-400/30 ring-offset-4 ring-offset-white',
      description: 'Velocista Dimensional',
      tier: 20
    };
  } else if (level >= 90) {
    return {
      borderClass: 'border-8 border-gradient-to-r from-purple-400 via-pink-400 to-purple-400',
      glowClass: 'shadow-2xl shadow-purple-500/40',
      ringClass: 'ring-6 ring-purple-400/25 ring-offset-4 ring-offset-white',
      description: 'Velocista Cósmico',
      tier: 19
    };
  } else if (level >= 85) {
    return {
      borderClass: 'border-6 border-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400',
      glowClass: 'shadow-xl shadow-indigo-500/40',
      ringClass: 'ring-6 ring-indigo-400/25 ring-offset-3 ring-offset-white',
      description: 'Velocista Supremo',
      tier: 18
    };
  } else if (level >= 80) {
    return {
      borderClass: 'border-6 border-gradient-to-r from-indigo-400 to-blue-400',
      glowClass: 'shadow-xl shadow-indigo-500/30',
      ringClass: 'ring-4 ring-indigo-400/20 ring-offset-3 ring-offset-white',
      description: 'Velocista Lendário',
      tier: 17
    };
  } else if (level >= 75) {
    return {
      borderClass: 'border-6 border-gradient-to-r from-blue-400 to-cyan-400',
      glowClass: 'shadow-xl shadow-blue-500/30',
      ringClass: 'ring-4 ring-blue-400/20 ring-offset-2 ring-offset-white',
      description: 'Velocista Épico',
      tier: 16
    };
  } else if (level >= 70) {
    return {
      borderClass: 'border-5 border-gradient-to-r from-blue-400 to-teal-400',
      glowClass: 'shadow-lg shadow-blue-500/25',
      ringClass: 'ring-4 ring-blue-400/15 ring-offset-2 ring-offset-white',
      description: 'Velocista Heroico',
      tier: 15
    };
  } else if (level >= 65) {
    return {
      borderClass: 'border-5 border-gradient-to-r from-teal-400 to-green-400',
      glowClass: 'shadow-lg shadow-teal-500/25',
      ringClass: 'ring-3 ring-teal-400/15 ring-offset-2 ring-offset-white',
      description: 'Velocista Mestre',
      tier: 14
    };
  } else if (level >= 60) {
    return {
      borderClass: 'border-5 border-gradient-to-r from-green-400 to-emerald-400',
      glowClass: 'shadow-lg shadow-green-500/20',
      ringClass: 'ring-3 ring-green-400/15 ring-offset-1 ring-offset-white',
      description: 'Velocista Experiente',
      tier: 13
    };
  } else if (level >= 55) {
    return {
      borderClass: 'border-4 border-gradient-to-r from-emerald-400 to-lime-400',
      glowClass: 'shadow-lg shadow-emerald-500/20',
      ringClass: 'ring-3 ring-emerald-400/10 ring-offset-1 ring-offset-white',
      description: 'Velocista Avançado',
      tier: 12
    };
  } else if (level >= 50) {
    return {
      borderClass: 'border-4 border-gradient-to-r from-lime-400 to-yellow-400',
      glowClass: 'shadow-md shadow-lime-500/20',
      ringClass: 'ring-2 ring-lime-400/10 ring-offset-1 ring-offset-white',
      description: 'Velocista Competente',
      tier: 11
    };
  } else if (level >= 45) {
    return {
      borderClass: 'border-4 border-gradient-to-r from-yellow-400 to-orange-400',
      glowClass: 'shadow-md shadow-yellow-500/15',
      ringClass: 'ring-2 ring-yellow-400/10',
      description: 'Velocista Habilidoso',
      tier: 10
    };
  } else if (level >= 40) {
    return {
      borderClass: 'border-4 border-gradient-to-r from-orange-400 to-red-400',
      glowClass: 'shadow-md shadow-orange-500/15',
      ringClass: 'ring-2 ring-orange-400/10',
      description: 'Velocista Dedicado',
      tier: 9
    };
  } else if (level >= 35) {
    return {
      borderClass: 'border-4 border-gradient-to-r from-red-400 to-pink-400',
      glowClass: 'shadow-md shadow-red-500/10',
      ringClass: 'ring-1 ring-red-400/10',
      description: 'Velocista Determinado',
      tier: 8
    };
  } else if (level >= 30) {
    return {
      borderClass: 'border-3 border-gradient-to-r from-pink-400 to-rose-400',
      glowClass: 'shadow shadow-pink-500/10',
      ringClass: 'ring-1 ring-pink-400/10',
      description: 'Velocista Persistente',
      tier: 7
    };
  } else if (level >= 25) {
    return {
      borderClass: 'border-3 border-gradient-to-r from-rose-400 to-red-400',
      glowClass: 'shadow shadow-rose-500/10',
      ringClass: '',
      description: 'Velocista Focado',
      tier: 6
    };
  } else if (level >= 20) {
    return {
      borderClass: 'border-3 border-red-400',
      glowClass: 'shadow shadow-red-400/10',
      ringClass: '',
      description: 'Velocista Disciplinado',
      tier: 5
    };
  } else if (level >= 15) {
    return {
      borderClass: 'border-3 border-orange-400',
      glowClass: 'shadow-sm shadow-orange-400/10',
      ringClass: '',
      description: 'Velocista Empenhado',
      tier: 4
    };
  } else if (level >= 10) {
    return {
      borderClass: 'border-3 border-yellow-400',
      glowClass: 'shadow-sm shadow-yellow-400/10',
      ringClass: '',
      description: 'Velocista Aprendiz',
      tier: 3
    };
  } else if (level >= 5) {
    return {
      borderClass: 'border-2 border-yellow-300',
      glowClass: '',
      ringClass: '',
      description: 'Velocista Amador',
      tier: 2
    };
  } else {
    return {
      borderClass: 'border-2 border-gray-300',
      glowClass: '',
      ringClass: '',
      description: 'Velocista Iniciante',
      tier: 1
    };
  }
}