import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSound } from '../../contexts/SoundContext';
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
      <div className="min-h-screen bg-white relative overflow-hidden">
        {/* Elementos decorativos de fundo */}
        <div className="absolute inset-0 opacity-5">
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-hero-accent rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-16 w-16 h-16 bg-hero-primary rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 left-20 w-12 h-12 bg-hero-accent rounded-full animate-ping"></div>
          <div className="absolute bottom-40 right-32 w-24 h-24 bg-hero-primary rounded-full animate-pulse"></div>
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
                </div>
                <div className="bg-gradient-to-r from-hero-primary/90 to-hero-secondary/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-hero-accent shadow-2xl">
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
              <MascotAvatar 
                level={progress.level}
                totalXP={progress.totalXP}
                isAnimating={progressPercentage === 100}
              />
              
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
                </div>
                <div className="bg-gradient-to-r from-hero-accent to-yellow-300 text-hero-primary text-2xl md:text-3xl font-bold px-6 py-3 rounded-2xl shadow-xl border-2 border-white">
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