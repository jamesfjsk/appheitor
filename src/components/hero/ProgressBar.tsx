import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProgress } from '../../types';
import { CloudLightning as Lightning } from 'lucide-react';

interface ProgressBarProps {
  progress: UserProgress;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const totalXP = progress.totalXP || 0;
  const currentLevelPoints = totalXP % 100;
  const progressPercentage = (currentLevelPoints / 100) * 100;
  const nextLevel = progress.level + 1;
  const [showLevelUp, setShowLevelUp] = useState(false);
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
    const previousLevel = Math.floor((totalXP - 10) / 100) + 1;
    if (progress.level > previousLevel && totalXP > 0) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  }, [progress.level, totalXP]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 relative overflow-hidden"
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
          className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent skew-x-12"
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Lightning className="w-5 h-5 text-yellow-400" fill="currentColor" />
              Progresso Flash
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-yellow-400 font-bold">
                {currentLevelPoints}/100 XP
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
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full relative overflow-hidden"
              >
                {/* Efeito de brilho */}
                <motion.div
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    key: `total-xp-${totalXP}`,
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
                
                {/* Lightning effect when close to level up */}
                {progressPercentage > 80 && (
                  <motion.div
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-200"
                  />
                )}
              </motion.div>
            </div>
            
            {/* Indicador de Nível */}
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-white/80">Nível {progress.level}</span>
              <span className="text-white/80">Nível {nextLevel}</span>
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
                {totalXP}
              </motion.div>
              <div className="text-white/80 text-sm">Total de XP</div>
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
              <div className="text-white/80 text-sm">Dias Seguidos</div>
            </div>
          </div>

          {/* Mensagem Motivacional */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 p-3 bg-yellow-400/20 rounded-lg text-center"
          >
            <p className="text-yellow-100 text-sm font-medium">
              {progress.level < 5 
                ? `⚡ Mais ${100 - currentLevelPoints} XP para o nível ${nextLevel}!`
                : progress.streak > 0
                ? `🔥 Sequência incrível de ${progress.streak} dias!`
                : '🔥 Você é um verdadeiro velocista!'
              }
            </p>
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
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-red-600 text-4xl md:text-6xl font-bold px-8 py-4 rounded-3xl shadow-2xl border-4 border-white relative overflow-hidden">
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
                NÍVEL {progress.level}!
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProgressBar;