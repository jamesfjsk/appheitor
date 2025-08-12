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
      <div className="min-h-screen bg-gradient-to-br from-hero-primary via-hero-secondary to-hero-accent relative overflow-hidden">
        {/* Elementos decorativos suaves */}
        <div className="absolute inset-0 opacity-20">
          <div className="decorative-blob w-32 h-32 top-16 left-16"></div>
          <div className="decorative-blob w-24 h-24 top-40 right-20" style={{ animationDelay: '2s' }}></div>
          <div className="decorative-blob w-20 h-20 bottom-32 left-24" style={{ animationDelay: '4s' }}></div>
          <div className="decorative-blob w-28 h-28 bottom-48 right-40" style={{ animationDelay: '6s' }}></div>
          
          <div className="decorative-star text-3xl top-20 right-1/4" style={{ animationDelay: '1s' }}>⭐</div>
          <div className="decorative-star text-2xl bottom-40 right-16" style={{ animationDelay: '3s' }}>✨</div>
          <div className="decorative-star text-xl top-1/2 left-16" style={{ animationDelay: '5s' }}>💫</div>
          <div className="decorative-star text-lg bottom-20 left-1/3" style={{ animationDelay: '7s' }}>🌟</div>
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
              className={`p-4 rounded-full shadow-lg transition-all duration-300 backdrop-blur-sm ${
                isSoundEnabled 
                  ? 'bg-hero-accent text-hero-primary border-2 border-white/30' 
                  : 'bg-white/20 text-white/60 border-2 border-white/20'
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
                <div className="flash-card-hero p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 hero-text-shadow relative z-10">
                    Bem-vindo de volta, Heitor! ⚡
                  </h2>
                  <p className="text-white text-lg font-semibold relative z-10">
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