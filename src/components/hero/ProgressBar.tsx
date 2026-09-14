import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProgress } from '../../types';
import { FlashIcon, IconBadge } from '../../icons';
import { calculateLevelSystem, checkLevelUp, getLevelColor, getLevelIcon } from '../../utils/levelSystem';
import { FirestoreService } from '../../services/firestoreService';
import { getTodayBrazil } from '../../utils/timezone';


interface ProgressBarProps {
  progress: UserProgress;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousXP, setPreviousXP] = useState(progress.totalXP || 0);
  const [dailyXP, setDailyXP] = useState(0);
  
  // Load daily XP from Firebase instead of localStorage
  useEffect(() => {
    const loadDailyXP = async () => {
      if (!progress.userId) return;
      
      try {
        const today = getTodayBrazil();
        const dailyProgress = await FirestoreService.getDailyProgress(progress.userId, today);
        setDailyXP(dailyProgress?.xpEarned || 0);
      } catch (error) {
        console.error('❌ Error loading daily XP:', error);
        setDailyXP(0);
      }
    };
    
    loadDailyXP();
  }, [progress.userId]);

  // Update daily XP when total XP changes
  useEffect(() => {
    const updateDailyXP = async () => {
      if (!progress.userId || previousXP === 0) return;
      
      const xpGained = (progress.totalXP || 0) - previousXP;
      if (xpGained > 0) {
        try {
          const today = getTodayBrazil();
          await FirestoreService.updateDailyProgress(progress.userId, today, xpGained, 0);
          setDailyXP(prev => prev + xpGained);
        } catch (error) {
          console.error('❌ Error updating daily XP:', error);
        }
      }
    };
    
    if (previousXP > 0) {
      updateDailyXP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previousXP is a deliberate snapshot of the last seen XP, not a trigger
  }, [progress.totalXP, progress.userId]);
  
  // Check for level up
  useEffect(() => {
    if (previousXP === 0) {
      setPreviousXP(progress.totalXP || 0);
      return;
    }
    
    const levelUpCheck = checkLevelUp(previousXP, progress.totalXP || 0);
    
    if (levelUpCheck.leveledUp && progress.totalXP > 0) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 4000);
    }
    
    setPreviousXP(progress.totalXP || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previousXP is a deliberate snapshot of the last seen XP, not a trigger
  }, [progress.totalXP]);

  // Função para gerar mensagem motivacional diária
  const getDailyMotivationalMessage = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

    const mensagensHeitorFlash = [
      "Quem consegue se controlar é mais forte do que qualquer herói.",
      "Coragem é seguir em frente mesmo quando dá vontade de parar.",
      "A maior vitória é vencer a si mesmo todos os dias.",
      "Cada dia é uma nova chance de crescer e melhorar.",
      "A força verdadeira aparece quando você faz o certo mesmo sozinho.",
      "Grandes poderes nascem da paciência e do treino constante.",
      "O que você planta hoje, você colhe amanhã. Escolha bem.",
      "Ser confiável nas pequenas coisas mostra que você está pronto para as grandes.",
      "Caminhos bons são feitos de passos firmes, mesmo que pequenos.",
      "Ser herói é fazer boas escolhas, mesmo quando ninguém vê.",
      "Treinar sua mente te leva mais longe do que qualquer corrida.",
      "Uma mente tranquila corre mais rápido do que qualquer raio.",
      "O tempo é seu aliado. Use com calma e sabedoria.",
      "Primeiro a gente cresce por dentro, depois por fora.",
      "As conquistas de hoje nascem do esforço de agora.",
      "Correr não é só chegar no fim — é aprender no caminho.",
      "O mais importante não é vencer, é se tornar alguém melhor.",
      "Dias difíceis treinam sua força. Não fuja deles.",
      "Tudo começa pequeno. Até o mar começou com gotas.",
      "A bondade vale mais que qualquer superpoder.",
      "Você não escolhe tudo, mas escolhe como vai agir.",
      "O caminho certo quase nunca é o mais fácil.",
      "Quem tem raízes firmes não cai com o vento.",
      "Cada esforço é uma semente que um dia vira vitória.",
      "Ser calmo no meio da pressa é um superpoder de verdade.",
      "Subir devagar também é subir. O importante é não parar.",
      "A beleza do herói está em como ele trata os outros.",
      "O que te move não é a pressa — é o propósito."
    ];

    const messageIndex = dayOfYear % mensagensHeitorFlash.length;
    return mensagensHeitorFlash[messageIndex];
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="comic-card p-6 relative overflow-hidden"
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
              <FlashIcon name="bolt" className="w-5 h-5 text-amber-500" />
              Progresso Flash
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-amber-600 font-bold">
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
            <div className="w-full bg-[#1A1214]/12 border-2 border-[#1A1214] rounded-full h-4 overflow-hidden">
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
              <div className="text-[#1A1214]/80">
                <span className="font-bold inline-flex items-center gap-1">
                  <FlashIcon name={getLevelIcon(levelSystem.currentLevel)} className="w-4 h-4" />
                  Nível {levelSystem.currentLevel}
                </span>
                <div className="text-xs text-gray-600">{levelSystem.levelTitle}</div>
              </div>
              {!levelSystem.isMaxLevel && (
                <div className="text-gray-600 text-right">
                  <span className="font-bold inline-flex items-center gap-1">
                    <FlashIcon name={getLevelIcon(levelSystem.currentLevel + 1)} className="w-4 h-4" />
                    Nível {levelSystem.currentLevel + 1}
                  </span>
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
                className="text-2xl font-bold text-amber-600"
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
                className="text-2xl font-bold text-amber-600 flex items-center justify-center gap-1"
              >
                {progress.streak > 0 && <FlashIcon name="fire" className="w-6 h-6 text-orange-500" />}
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
              {getDailyMotivationalMessage()}
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
                <div className="mb-2 flex justify-center">
                  <IconBadge name={getLevelIcon(levelSystem.currentLevel)} size={48} />
                </div>
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