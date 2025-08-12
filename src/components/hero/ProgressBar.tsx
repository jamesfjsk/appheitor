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
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden"
      >
        {/* Lightning background animation */}
        <motion.div
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 0.3, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent skew-x-12"
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
              <Lightning className="w-5 h-5 text-yellow-400" fill="currentColor" />
              Progresso Flash
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-yellow-400 font-bold">
                {Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel)}/{Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel)} XP
              </div>
              {dailyXP > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold"
                >
                  +{dailyXP} hoje
                </motion.div>
              )}
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="relative mb-4">
            <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelSystem.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className={`h-full bg-gradient-to-r ${getLevelColor(levelSystem.currentLevel)} rounded-full relative overflow-hidden`}
              >
                {/* Efeito de brilho */}
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    key: `total-xp-${levelSystem.currentXP}`,
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full"
                />
                
                {/* Raios de energia na barra de progresso */}
                {levelSystem.progressPercentage > 50 && (
                  <motion.div
                    animate={{
                      opacity: [0.2, 0.5, 0.2],
                      scale: [0.95, 1.05, 0.95]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 rounded-full"
                  />
                )}
                
                {/* Lightning effect when close to level up */}
                {levelSystem.progressPercentage > 80 && !levelSystem.isMaxLevel && (
                  <motion.div
                    animate={{
                      opacity: [0.6, 1, 0.6],
                      scale: [1, 1.08, 1],
                      boxShadow: [
                        '0 0 5px rgba(255, 212, 0, 0.5)',
                        '0 0 15px rgba(255, 212, 0, 0.8)',
                        '0 0 5px rgba(255, 212, 0, 0.5)'
                      ]
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`absolute inset-0 bg-gradient-to-r ${getLevelColor(levelSystem.currentLevel)} rounded-full`}
                  />
                )}
              </motion.div>
            </div>
            
            {/* Indicador de Nível */}
            <div className="flex justify-between mt-2 text-sm">
              <div className="text-white/80">
                <span className="font-bold">{getLevelIcon(levelSystem.currentLevel)} Nível {levelSystem.currentLevel}</span>
                <div className="text-xs text-gray-600">{levelSystem.levelTitle}</div>
              </div>
              {!levelSystem.isMaxLevel && (
                <div className="text-gray-600 text-right">
                  <span className="font-bold">{getLevelIcon(levelSystem.currentLevel + 1)} Nível {levelSystem.currentLevel + 1}</span>
                  <div className="text-xs text-gray-600">{levelSystem.nextLevelTitle}</div>
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-2xl font-bold text-yellow-400"
              >
                {levelSystem.currentXP}
              </motion.div>
              <div className="text-gray-600 text-sm">Total de XP</div>
            </div>
            
            <div className="text-center">
              <motion.div
                animate={{
                  scale: progress.streak > 0 ? [1, 1.1, 1] : 1
                }}
                transition={{
                  duration: 1,
                  repeat: progress.streak > 0 ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1"
              >
                {progress.streak > 0 && <span className="text-orange-400">🔥</span>}
                {progress.streak}
              </motion.div>
              <div className="text-gray-600 text-sm">Dias Seguidos</div>
            </div>
          </div>

          {/* Mensagem Motivacional */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center"
          >
            <p className="text-yellow-800 text-sm font-medium">
              {!levelSystem.isMaxLevel
                ? `⚡ Mais ${levelSystem.xpNeededForNext} XP para ${levelSystem.nextLevelTitle}!`
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
                className="mt-2 text-xs text-yellow-700"
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