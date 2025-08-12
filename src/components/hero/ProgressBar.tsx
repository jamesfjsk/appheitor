import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProgress, LevelSystem } from '../../types';
import { CloudLightning as Lightning } from 'lucide-react';
import { calculateLevelSystem, checkLevelUp, getNextMilestone, getLevelColor, getLevelIcon } from '../../utils/levelSystem';

interface ProgressBarProps {
  progress: UserProgress;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousXP, setPreviousXP] = useState(progress.totalXP || 0);
  const [dailyXP, setDailyXP] = useState(0);
  
  // Simulate daily XP counter
  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('lastXPDate');
    const savedXP = localStorage.getItem('dailyXP');
    
    if (savedDate === today && savedXP) {
      setDailyXP(parseInt(savedXP));
    } else {
      setDailyXP(0);
      localStorage.setItem('lastXPDate', today);
      localStorage.setItem('dailyXP', '0');
    }
  }, []);
  
  // Check for level up
  useEffect(() => {
    const levelUpCheck = checkLevelUp(previousXP, progress.totalXP || 0);
    
    if (levelUpCheck.leveledUp && progress.totalXP > 0) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 4000);
    }
    
    setPreviousXP(progress.totalXP || 0);
  }, [progress.totalXP]);

  const nextMilestone = getNextMilestone(levelSystem.currentLevel);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="flash-card-hero p-8 relative overflow-hidden"
      >
        {/* Lightning background animation suave */}
        <motion.div
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 0.2, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Lightning className="w-6 h-6 text-hero-accent drop-shadow-md" fill="currentColor" />
              Progresso Flash
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-white font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                {Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel)}/{Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel)} XP
              </div>
              {dailyXP > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-gradient-to-r from-success-500 to-success-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md"
                >
                  +{dailyXP} hoje
                </motion.div>
              )}
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="relative mb-4">
            <div className="progress-bar">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelSystem.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="progress-fill"
              >
                {/* Lightning effect when close to level up */}
                {levelSystem.progressPercentage > 80 && !levelSystem.isMaxLevel && (
                  <motion.div
                    animate={{
                      opacity: [0.3, 0.7, 0.3]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-hero-accent/50 to-white/50"
                  />
                )}
              </motion.div>
            </div>
            
            {/* Indicador de Nível */}
            <div className="flex justify-between mt-2 text-sm">
              <div className="text-white/80">
                <span className="font-bold text-white">{getLevelIcon(levelSystem.currentLevel)} Nível {levelSystem.currentLevel}</span>
                <div className="text-xs text-white/70">{levelSystem.levelTitle}</div>
              </div>
              {!levelSystem.isMaxLevel && (
                <div className="text-white/80 text-right">
                  <span className="font-bold text-white">{getLevelIcon(levelSystem.currentLevel + 1)} Nível {levelSystem.currentLevel + 1}</span>
                  <div className="text-xs text-white/70">{levelSystem.nextLevelTitle}</div>
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <motion.div
                className="text-3xl font-bold text-white bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-2 glow-effect"
              >
                {levelSystem.currentXP}
              </motion.div>
              <div className="text-white/90 text-sm font-medium">Total de XP</div>
            </div>
            
            <div className="text-center">
              <motion.div
                animate={{
                  scale: progress.streak > 0 ? [1, 1.1, 1] : 1
                }}
                transition={{
                  duration: 1.5,
                  repeat: progress.streak > 0 ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className="text-3xl font-bold text-white bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-2 flex items-center justify-center gap-2"
              >
                {progress.streak > 0 && <span className="text-2xl">🔥</span>}
                {progress.streak}
              </motion.div>
              <div className="text-white/90 text-sm font-medium">Dias Seguidos</div>
            </div>
          </div>

          {/* Mensagem Motivacional */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 p-4 glass-effect-strong rounded-xl text-center"
          >
            <p className="text-white text-sm font-semibold">
              {!levelSystem.isMaxLevel
                ? `⚡ Faltam ${levelSystem.xpNeededForNext} XP para ${levelSystem.nextLevelTitle}!`
                : progress.streak > 0
                ? `🔥 Sequência incrível de ${progress.streak} dias!`
                : '👑 Você alcançou o nível máximo! Parabéns, Flash Master!'
              }
            </p>
            
            {/* Próximo Marco */}
            {!levelSystem.isMaxLevel && levelSystem.currentLevel < nextMilestone.level && (
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-3 text-xs text-white/80 bg-white/10 rounded-lg p-2"
              >
                🎯 Próximo marco: {nextMilestone.title} (Nível {nextMilestone.level})
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0, rotate: 180 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className={`bg-gradient-to-r ${getLevelColor(levelSystem.currentLevel)} text-white text-4xl md:text-6xl font-bold px-8 py-4 rounded-3xl shadow-2xl border-4 border-white relative overflow-hidden`}>
              {/* Lightning background */}
              <motion.div
                animate={{
                  x: ['-100%', '100%'],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 0.5,
                  repeat: 3,
                  ease: "linear"
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
              />
              <div className="relative z-10">
                <div className="text-2xl md:text-3xl mb-2">{getLevelIcon(levelSystem.currentLevel)}</div>
                <div>NÍVEL {levelSystem.currentLevel}!</div>
                <div className="text-lg md:text-xl mt-2">{levelSystem.levelTitle}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProgressBar;