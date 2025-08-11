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