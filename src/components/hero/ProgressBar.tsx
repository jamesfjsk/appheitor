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
        className="progress-card"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
              <Lightning className="w-5 h-5 text-flash-red" fill="currentColor" />
              Progresso Flash
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-gray-700 font-bold bg-gray-100 px-3 py-1 rounded-lg text-sm">
                {Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel)}/{Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel)} XP
              </div>
              {dailyXP > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-success text-white px-3 py-1 rounded-lg text-xs font-bold shadow-normal"
                >
                  +{dailyXP} hoje
                </motion.div>
              )}
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="relative mb-4">
            <div className="progress-bar progress-bar-thick">
              <div className="bg-flash-red text-white text-4xl md:text-6xl font-bold px-8 py-4 rounded-2xl shadow-floating">
                <div>
                <div className="text-gray-600 text-right">
                  <span className="font-bold text-gray-900">{getLevelIcon(levelSystem.currentLevel + 1)} Nível {levelSystem.currentLevel + 1}</span>
                  <div className="text-xs text-gray-500">{levelSystem.nextLevelTitle}</div>
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <motion.div
                className="xp-display"
              >
                {levelSystem.currentXP}
              </motion.div>
              <div className="text-gray-600 text-sm font-medium">Total de XP</div>
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
                className="text-3xl font-bold text-gray-900 bg-gray-100 rounded-xl p-3 mb-2 flex items-center justify-center gap-2"
              >
                {progress.streak > 0 && <span className="text-2xl">🔥</span>}
                {progress.streak}
              </motion.div>
              <div className="text-gray-600 text-sm font-medium">Dias Seguidos</div>
            </div>
          </div>

          {/* Mensagem Motivacional */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 p-4 bg-gray-100 rounded-xl text-center border border-gray-200"
          >
            <p className="text-gray-700 text-sm font-semibold">
              {!levelSystem.isMaxLevel
                ? `Faltam ${levelSystem.xpNeededForNext} XP para ${levelSystem.nextLevelTitle}`
                : progress.streak > 0
                ? `Sequência de ${progress.streak} dias!`
                : 'Nível máximo alcançado!'
              }
            </p>
            
            {/* Próximo Marco */}
            {!levelSystem.isMaxLevel && levelSystem.currentLevel < nextMilestone.level && (
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-3 text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-200"
              >
                Próximo marco: {nextMilestone.title} (Nível {nextMilestone.level})
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