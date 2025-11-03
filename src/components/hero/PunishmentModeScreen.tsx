import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, CheckCircle, Lock, Target } from 'lucide-react';
import { usePunishment } from '../../contexts/PunishmentContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PunishmentModeScreen: React.FC = () => {
  const {
    punishment,
    isPunished,
    loading,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    tasksRemaining,
    completePunishmentTask
  } = usePunishment();

  const [isCompleting, setIsCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-red-800 to-black flex items-center justify-center z-50">
        <LoadingSpinner size="large" color="yellow" />
      </div>
    );
  }

  if (!isPunished || !punishment) {
    return null;
  }

  const tasksCompleted = punishment.tasksCompleted || 0;
  const tasksProgress = (tasksCompleted / 30) * 100;
  const totalTimeInMs = punishment.endDate.getTime() - punishment.startDate.getTime();
  const elapsedTimeInMs = Date.now() - punishment.startDate.getTime();
  const timeProgress = Math.min((elapsedTimeInMs / totalTimeInMs) * 100, 100);

  const handleCompleteTask = async () => {
    setIsCompleting(true);
    try {
      await completePunishmentTask();

      if (tasksCompleted + 1 >= 30) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const getMotivationalMessage = () => {
    if (tasksCompleted >= 25) {
      return "Quase lá! Continue firme!";
    } else if (tasksCompleted >= 20) {
      return "Você está indo muito bem! Não desista!";
    } else if (tasksCompleted >= 15) {
      return "Metade do caminho completa!";
    } else if (tasksCompleted >= 10) {
      return "Bom progresso! Continue assim!";
    } else if (tasksCompleted >= 5) {
      return "Você está no caminho certo!";
    } else {
      return "Comece agora e mostre seu compromisso!";
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-red-800 to-black z-50 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.1, 0.3, 0.1],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 3 + i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5
              }}
              className="absolute w-2 h-2 bg-red-500 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-32 h-32 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center border-8 border-red-400 shadow-2xl"
              >
                <Lock className="w-16 h-16 text-white" />
              </motion.div>

              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                Modo Punição Ativo
              </h1>

              <div className="bg-red-800/50 border-4 border-red-600 rounded-2xl p-6 mb-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                  <p className="text-2xl font-bold text-white">
                    MODO DESOBEDIÊNCIA / DESRESPEITO
                  </p>
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-lg text-red-200">
                  Motivo: {punishment.reason}
                </p>
              </div>

              <p className="text-xl text-red-200 mb-2">
                Para recuperar o acesso ao painel, você precisa:
              </p>
              <p className="text-2xl font-bold text-yellow-400">
                Completar 30 tarefas OU aguardar 7 dias
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-black/40 border-4 border-red-600 rounded-2xl p-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Contador de Tempo
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Dias', value: daysRemaining },
                    { label: 'Horas', value: hoursRemaining },
                    { label: 'Min', value: minutesRemaining },
                    { label: 'Seg', value: secondsRemaining }
                  ].map((item, index) => (
                    <div key={index} className="text-center">
                      <motion.div
                        animate={{
                          scale: item.label === 'Seg' ? [1, 1.05, 1] : 1
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity
                        }}
                        className="bg-red-900/60 rounded-lg p-3 mb-1"
                      >
                        <div className="text-3xl font-bold text-white">
                          {String(item.value).padStart(2, '0')}
                        </div>
                      </motion.div>
                      <div className="text-xs text-red-300 uppercase">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm text-red-200 mb-1">
                    <span>Progresso do Tempo</span>
                    <span>{Math.round(timeProgress)}%</span>
                  </div>
                  <div className="w-full bg-red-950 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${timeProgress}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    />
                  </div>
                </div>

                <p className="text-sm text-red-300 text-center mt-3">
                  Fim: {new Date(punishment.endDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </motion.div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-black/40 border-4 border-red-600 rounded-2xl p-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Contador de Tarefas
                  </h3>
                </div>

                <div className="text-center mb-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                    className="text-6xl font-bold text-white mb-2"
                  >
                    {tasksCompleted} / 30
                  </motion.div>
                  <p className="text-lg text-red-200">
                    {getMotivationalMessage()}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-red-200 mb-1">
                    <span>Progresso das Tarefas</span>
                    <span>{Math.round(tasksProgress)}%</span>
                  </div>
                  <div className="w-full bg-red-950 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tasksProgress}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCompleteTask}
                  disabled={isCompleting}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                    isCompleting
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg'
                  } text-white`}
                >
                  {isCompleting ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      Marcando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      Marcar Tarefa Completada
                    </>
                  )}
                </motion.button>

                {punishment.lastTaskCompletedAt && (
                  <p className="text-xs text-red-300 text-center mt-3">
                    Última tarefa: {new Date(punishment.lastTaskCompletedAt).toLocaleTimeString('pt-BR')}
                    <br />
                    <span className="text-yellow-400">
                      Aguarde 1 hora entre cada tarefa
                    </span>
                  </p>
                )}
              </motion.div>
            </div>

            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-black/40 border-4 border-yellow-600 rounded-2xl p-6 backdrop-blur-sm"
            >
              <h3 className="text-xl font-bold text-yellow-400 mb-3 text-center">
                💡 Dicas para completar suas tarefas:
              </h3>
              <ul className="space-y-2 text-white">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">✓</span>
                  <span>Complete tarefas reais (arrumar o quarto, fazer dever, ajudar em casa)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">✓</span>
                  <span>Mostre responsabilidade e compromisso com suas obrigações</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">✓</span>
                  <span>Respeite seus pais e siga as regras da casa</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">✓</span>
                  <span>Você pode marcar uma tarefa a cada hora</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-6 text-red-300 text-sm"
            >
              <p>Este modo foi ativado em: {new Date(punishment.startDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity
              }}
              className="text-center"
            >
              <div className="text-9xl mb-4">🎉</div>
              <h2 className="text-5xl font-bold text-white mb-4">
                PARABÉNS!
              </h2>
              <p className="text-2xl text-green-400">
                Você completou 30 tarefas!
              </p>
              <p className="text-xl text-white mt-2">
                Você está livre agora!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PunishmentModeScreen;
