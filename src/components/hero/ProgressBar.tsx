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

  // Função para gerar mensagem motivacional diária
  const getDailyMotivationalMessage = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
const mensagensHeitorFlash = [
  "⚡ Heitor, hoje você corre lado a lado com o Barry! Vamos completar essas missões no melhor estilo Team Flash!",
  "🌪️ Cisco mandou avisar: seus resultados estão criando uma nova linha do tempo de produtividade!",
  "🔥 Wells diria: 'Heitor, a única constante é sua evolução. Continue correndo!'",
  "🎯 Você tem a precisão do Capitão Frio e a força do Gorila Grodd (do bem!). Nada te para hoje!",
  "🌟 Iris West confiaria em você para salvar o dia — e terminar as tarefas!",
  "💡 Cisco já criou um codinome pra você: *Heitor Turbo*. Modo missão ativado!",
  "⚡ Você está mais rápido que um raio — o Savitar nem te alcança hoje!",
  "💬 Joe West te observa com orgulho: 'É assim que se constrói um herói de verdade.'",
  "🚀 Wally West mandou um salve: 'Heitor, você tá ultrapassando até mim!'",
  "🌀 Você abriu uma brecha no multiverso da disciplina — e é o herói número 1!",
  "⭐ Caitlin aprovou sua cura para a preguiça: foco, energia e boas escolhas!",
  "🔥 Você está em Flashpoint máximo de conquistas! Continue mudando o seu futuro.",
  "⚡ Barry deixou uma mensagem: 'Heitor, você é a nova esperança da Central City!'",
  "🎮 Cisco hackeou o sistema só pra ver você desbloquear essa missão com estilo!",
  "🏃‍♂️ Sua velocidade hoje está na força da Força de Aceleração Pura™.",
  "🛡️ Ninguém segura o Guardião das Tarefas — sim, esse é você, Heitor!",
  "💫 Savitar não entendeu como você se superou. Spoiler: você não para nunca.",
  "🔔 O alarme da STAR Labs tocou: 'Alerta! Heitor ultrapassou todas as metas!'",
  "🌈 Missão após missão, você está criando um arco-íris de vitórias!",
  "🧠 Você tem a estratégia de Harrison Wells e a energia do Kid Flash!",
  "💪 'Meu nome é Heitor, e eu sou o menino mais disciplinado que existe.'",
  "🎊 O multiverso inteiro celebra: hoje você bateu todos os recordes!",
  "🚨 ALERTA DE HEROÍSMO: Heitor está alcançando nível meta-humano!",
  "🔋 Sua energia foi reconhecida na STAR Labs. Missões concluídas com estilo!",
  "📡 Os satélites captaram: produtividade em nível Flash Supremo!",
  "🧪 Mistura perfeita: foco de Barry + criatividade de Cisco + força do Heitor!",
  "🕒 Você distorceu o tempo com tanta velocidade! Sobrou até tempo livre!",
  "🌀 Parado no tempo? Nunca. Você é pura aceleração mental!",
  "⚡ Heitor, a Central City está segura — e sua agenda, concluída com sucesso!"
];

    
    // Usar o dia do ano para selecionar uma mensagem consistente por dia
    const messageIndex = dayOfYear % mensagensHeitorFlash.length;
    return mensagensHeitorFlash[messageIndex];
  };

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
                <span className="font-bold text-yellow-400">{getLevelIcon(levelSystem.currentLevel)} Nível {levelSystem.currentLevel}</span>
                <div className="text-xs text-gray-600">{levelSystem.levelTitle}</div>
              </div>
              {!levelSystem.isMaxLevel && (
                <div className="text-gray-600 text-right">
                  <span className="font-bold text-yellow-400">{getLevelIcon(levelSystem.currentLevel + 1)} Nível {levelSystem.currentLevel + 1}</span>
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