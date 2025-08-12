import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap as Lightning } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSound } from '../../contexts/SoundContext';
import { calculateLevelSystem } from '../../utils/levelSystem';
import HeroHeader from './HeroHeader';
import ProgressBar from './ProgressBar';
import DailyChecklist from './DailyChecklist';
import AchievementsBadges from './AchievementsBadges';
import MascotAvatar from './MascotAvatar';
import RewardsPanel from './RewardsPanel';
import CalendarModal from './CalendarModal';
import LoadingSpinner from '../common/LoadingSpinner';

const HeroPanel: React.FC = () => {
  const { tasks, progress, loading } = useData();
  const { requestPermission, permission } = useNotifications();
  const { isSoundEnabled, toggleSound } = useSound();
  
  // Calculate level system based on current XP
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  
  // Estados locais com keys para forçar re-render
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [showRewards, setShowRewards] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [showMissionComplete, setShowMissionComplete] = useState(false);
  
  // Auto-detect current period on mount
  useEffect(() => {
    const getCurrentPeriod = (): 'morning' | 'afternoon' | 'evening' => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';
      return 'evening';
    };
    
    setSelectedPeriod(getCurrentPeriod());
  }, []);

  useEffect(() => {
    // Solicitar permissão de notificação após 3 segundos
    const timer = setTimeout(() => {
      if (permission === 'default') {
        requestPermission();
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [permission, requestPermission]);

  useEffect(() => {
    // Esconder mensagem de boas-vindas após 4 segundos
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Controlar animação de missão completa
  useEffect(() => {
    if (progressPercentage === 100 && totalTasks > 0) {
      setShowMissionComplete(true);
      const timer = setTimeout(() => {
        setShowMissionComplete(false);
      }, 3000); // 3 segundos
      return () => clearTimeout(timer);
    }
  }, [progressPercentage, totalTasks]);

  const getMotivationalMessage = () => {
    if (progressPercentage === 100) {
      return "🏆 Incrível! Você completou todas as missões hoje!";
    } else if (progressPercentage >= 75) {
      return "⚡ Quase lá, super-herói! Mais algumas missões!";
    } else if (progressPercentage >= 50) {
      return "🚀 Você está indo muito bem! Continue assim!";
    } else if (progressPercentage >= 25) {
      return "💪 Bom trabalho! Vamos completar mais missões!";
    } else {
      return "🌟 Pronto para suas missões de hoje, Heitor?";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hero-primary to-hero-secondary flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" color="yellow" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-red-700 relative overflow-hidden">
        {/* Elementos decorativos de fundo */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 bg-hero-accent rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-16 w-16 h-16 bg-hero-primary rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 left-20 w-12 h-12 bg-hero-accent rounded-full animate-ping"></div>
          <div className="absolute bottom-40 right-32 w-24 h-24 bg-hero-primary rounded-full animate-pulse"></div>
        </div>

        {/* Sistema de raios de fundo avançado */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Raios principais cruzados */}
          <motion.div
            animate={{
              x: ['-120%', '120%'],
              opacity: [0, 0.4, 0],
              scaleY: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
              delay: 0
            }}
            className="absolute top-1/4 -left-32 w-screen h-2 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent transform rotate-12"
            style={{
              filter: 'blur(2px)',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 212, 0, 0.6) 30%, rgba(255, 193, 7, 0.8) 50%, rgba(255, 212, 0, 0.6) 70%, transparent 100%)'
            }}
          />
          
          <motion.div
            animate={{
              x: ['-120%', '120%'],
              opacity: [0, 0.3, 0],
              scaleY: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear",
              delay: 2.5
            }}
            className="absolute top-3/4 -left-32 w-screen h-1.5 bg-gradient-to-r from-transparent via-red-400/50 to-transparent transform -rotate-12"
            style={{
              filter: 'blur(1.5px)',
              background: 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.5) 30%, rgba(220, 38, 38, 0.7) 50%, rgba(239, 68, 68, 0.5) 70%, transparent 100%)'
            }}
          />
          
          {/* Raios verticais */}
          <motion.div
            animate={{
              y: ['-120%', '120%'],
              opacity: [0, 0.25, 0],
              scaleX: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "linear",
              delay: 4
            }}
            className="absolute left-1/3 -top-32 w-1 h-screen bg-gradient-to-b from-transparent via-yellow-300/40 to-transparent"
            style={{
              filter: 'blur(1px)',
              background: 'linear-gradient(180deg, transparent 0%, rgba(253, 224, 71, 0.4) 30%, rgba(245, 158, 11, 0.6) 50%, rgba(253, 224, 71, 0.4) 70%, transparent 100%)'
            }}
          />
          
          <motion.div
            animate={{
              y: ['-120%', '120%'],
              opacity: [0, 0.2, 0],
              scaleX: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
              delay: 6
            }}
            className="absolute right-1/4 -top-32 w-0.5 h-screen bg-gradient-to-b from-transparent via-red-300/30 to-transparent"
            style={{
              filter: 'blur(1px)'
            }}
          />
          
          {/* Flash passando - efeito super elaborado */}
          <motion.div
            animate={{
              x: ['-300px', 'calc(100vw + 300px)'],
              y: [0, -30, 0, 30, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 10,
              repeatDelay: 15
            }}
            className="absolute top-1/2 flex items-center z-10"
          >
            {/* Rastro do Flash - múltiplas camadas */}
            <div className="relative">
              {/* Rastro principal - mais largo e intenso */}
              <motion.div
                animate={{
                  scaleX: [0, 1, 0],
                  opacity: [0, 0.8, 0],
                  scaleY: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  delay: 0.2
                }}
                className="absolute -left-48 top-1/2 w-48 h-3 transform -translate-y-1/2"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 212, 0, 0.8) 20%, rgba(255, 193, 7, 1) 50%, rgba(239, 68, 68, 0.8) 80%, transparent 100%)',
                  filter: 'blur(1px)',
                  borderRadius: '50px'
                }}
              />
              
              {/* Rastros secundários - efeito de profundidade */}
              <motion.div
                animate={{
                  scaleX: [0, 1, 0],
                  opacity: [0, 0.6, 0]
                }}
                transition={{
                  duration: 1,
                  ease: "easeOut",
                  delay: 0.3
                }}
                className="absolute -left-36 top-1/2 w-36 h-1.5 transform -translate-y-1/2 translate-y-3"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.6) 30%, rgba(255, 212, 0, 0.7) 70%, transparent 100%)',
                  filter: 'blur(1px)',
                  borderRadius: '50px'
                }}
              />
              
              <motion.div
                animate={{
                  scaleX: [0, 1, 0],
                  opacity: [0, 0.6, 0]
                }}
                transition={{
                  duration: 1,
                  ease: "easeOut",
                  delay: 0.3
                }}
                className="absolute -left-36 top-1/2 w-36 h-1.5 transform -translate-y-1/2 -translate-y-3"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.6) 30%, rgba(255, 212, 0, 0.7) 70%, transparent 100%)',
                  filter: 'blur(1px)',
                  borderRadius: '50px'
                }}
              />
              
              {/* Rastros finos adicionais */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scaleX: [0, 1, 0],
                    opacity: [0, 0.4, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    delay: 0.4 + i * 0.1
                  }}
                  className="absolute w-24 h-0.5 transform -translate-y-1/2"
                  style={{
                    left: `-${20 + i * 4}px`,
                    top: '50%',
                    transform: `translateY(${(i - 1) * 8}px)`,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 212, 0, 0.4) 50%, transparent 100%)',
                    filter: 'blur(0.5px)'
                  }}
                />
              ))}
              
              {/* Símbolo do Flash - mais elaborado */}
              <motion.div
                animate={{
                  scale: [0.9, 1.3, 0.9],
                  rotate: [0, 10, -10, 0],
                  boxShadow: [
                    '0 0 10px rgba(255, 212, 0, 0.5)',
                    '0 0 20px rgba(255, 212, 0, 0.8)',
                    '0 0 10px rgba(255, 212, 0, 0.5)'
                  ]
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeInOut",
                  repeat: 2
                }}
                className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-red-600 font-bold text-xl shadow-2xl border-2 border-yellow-300 relative overflow-hidden"
              >
                {/* Brilho interno */}
                <motion.div
                  animate={{
                    opacity: [0.3, 0.8, 0.3],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-full"
                />
                ⚡
              </motion.div>
            </div>
          </motion.div>
          
          {/* Campo de energia ambiente - raios rotativos */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0, 0.15, 0],
                scale: [0.5, 1.5, 0.5],
                rotate: [i * 30, (i * 30) + 360]
              }}
              transition={{
                duration: 8 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.8
              }}
              className="absolute w-0.5 h-24 transform-gpu"
              style={{
                left: `${15 + (i % 4) * 20}%`,
                top: `${15 + Math.floor(i / 4) * 25}%`,
                transformOrigin: '50% 50%',
                background: i % 2 === 0 
                  ? 'linear-gradient(180deg, rgba(255, 212, 0, 0.3) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%)',
                filter: 'blur(1px)'
              }}
            />
          ))}
          
          {/* Ondas de velocidade */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`wave-${i}`}
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 0.2, 0],
                scaleY: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 1.5
              }}
              className="absolute w-full h-px transform"
              style={{
                top: `${30 + i * 15}%`,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 212, 0, 0.3) 50%, transparent 100%)',
                filter: 'blur(0.5px)',
                transform: `skewX(${-15 + i * 5}deg)`
              }}
            />
          ))}
          
          {/* Partículas de energia */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`energy-${i}`}
              animate={{
                x: [
                  Math.random() * 100 - 50,
                  Math.random() * 100 - 50,
                  Math.random() * 100 - 50
                ],
                y: [
                  Math.random() * 100 - 50,
                  Math.random() * 100 - 50,
                  Math.random() * 100 - 50
                ],
                opacity: [0, 0.3, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5
              }}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: Math.random() > 0.5 ? '#FCD34D' : '#F87171',
                filter: 'blur(0.5px)'
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
          <HeroHeader 
            progress={progress}
            onOpenRewards={() => setShowRewards(true)}
            onOpenCalendar={() => setShowCalendar(true)}
          />
          
          {/* Controle de Som */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="fixed top-4 right-4 z-40"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSound}
              className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
                isSoundEnabled 
                  ? 'bg-yellow-400 text-red-600' 
                  : 'bg-gray-400 text-gray-600'
              }`}
              title={isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
            >
              {isSoundEnabled ? '🔊' : '🔇'}
            </motion.button>
          </motion.div>

          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mb-8 text-center"
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-hero-accent shadow-2xl">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Bem-vindo de volta, Heitor! ⚡
                  </h2>
                  <p className="text-hero-accent text-lg font-semibold">
                    {getMotivationalMessage()}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Principal - Checklist */}
            <div className="lg:col-span-2 space-y-6">
              <ProgressBar 
                progress={progress}
              />
              
              <DailyChecklist 
                tasks={tasks}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                guidedMode={guidedMode}
                onToggleGuidedMode={() => setGuidedMode(!guidedMode)}
              />
            </div>

            {/* Coluna Lateral - Avatar e Conquistas */}
            <div className="space-y-6">
              <FlashReminders />
              
              <AchievementsBadges 
                achievements={progress.unlockedAchievements}
              />
            </div>
          </div>

          {/* Mensagem motivacional flutuante */}
          <AnimatePresence>
            {showMissionComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -50 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="bg-gradient-to-r from-hero-accent to-yellow-400 text-hero-primary text-2xl md:text-3xl font-bold px-6 py-3 rounded-2xl shadow-xl border-2 border-white">
                  🎉 Período Completo! 🎉
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showRewards && (
          <RewardsPanel 
            isOpen={showRewards}
            onClose={() => setShowRewards(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCalendar && (
          <CalendarModal 
            isOpen={showCalendar}
            onClose={() => setShowCalendar(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroPanel;