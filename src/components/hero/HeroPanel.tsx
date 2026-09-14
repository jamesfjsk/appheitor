import { CHILD_BIRTHDAY_MMDD, CHILD_PHOTO_URL } from '../../config/rules';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlashIcon, IconBadge } from '../../icons';
import ComicBackdrop from '../common/ComicBackdrop';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSound } from '../../contexts/SoundContext';
import { usePunishment } from '../../contexts/PunishmentContext';
import HeroHeader from './HeroHeader';
import PunishmentModeScreen from './PunishmentModeScreen';
import ProgressBar from './ProgressBar';
import DailyChecklist from './DailyChecklist';
import AchievementsBadges from './AchievementsBadges';
import RewardsPanel from './RewardsPanel';
import CalendarModal from './CalendarModal';
import FlashReminders from './FlashReminders';
import EnglishArenaCard from './english/EnglishArenaCard';
import DailyQuiz from './DailyQuiz';
import SurpriseMissionQuiz from './SurpriseMissionQuiz';
import FlashTimer from './FlashTimer';
import BirthdayCelebration from './BirthdayCelebration';
import VacationBanner from './VacationBanner';
import YesterdaySummary from './YesterdaySummary';
import LoadingSpinner from '../common/LoadingSpinner';
import { getTodayBrazil } from '../../utils/timezone';


const HeroPanel: React.FC = () => {
  const { tasks, progress, loading, surpriseMissionConfig, isSurpriseMissionCompletedToday } = useData();
  const { requestPermission, permission } = useNotifications();
  const { isSoundEnabled, toggleSound } = useSound();
  const { isPunished } = usePunishment();

  // Estados locais com keys para forçar re-render
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [showRewards, setShowRewards] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [showMissionComplete, setShowMissionComplete] = useState(false);
  const [showSurpriseMission, setShowSurpriseMission] = useState(false);
  const [, setQuizCompleted] = useState(false);
  const [, setBirthdayCelebrationCompleted] = useState(false);
  
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

  // Check quiz completion status
  useEffect(() => {
    const checkQuizCompletion = () => {
      if (!progress.userId) return;
      
      const today = getTodayBrazil();
      const quizKey = `quiz_completed_${progress.userId}_${today}`;
      const completed = localStorage.getItem(quizKey);
      setQuizCompleted(!!completed);
    };
    
    checkQuizCompletion();
  }, [progress.userId]);

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
  
  // Check if surprise mission should be shown
  const shouldShowSurpriseMission = surpriseMissionConfig?.isEnabled && !isSurpriseMissionCompletedToday;
  
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
      return 'Incrível! Você completou todas as missões hoje!';
    } else if (progressPercentage >= 75) {
      return 'Quase lá, velocista! Mais algumas missões!';
    } else if (progressPercentage >= 50) {
      return 'Você está indo muito bem! Continue assim!';
    } else if (progressPercentage >= 25) {
      return 'Bom trabalho! Vamos completar mais missões!';
    }
    return 'Pronto para as missões de hoje, Heitor?';
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (isPunished) {
    return <PunishmentModeScreen />;
  }

  return (
    <>
      <div className="min-h-screen relative overflow-hidden bg-[#6B0A18]">
        <ComicBackdrop />

        <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
          <HeroHeader
            progress={progress}
            onOpenRewards={() => setShowRewards(true)}
            onOpenCalendar={() => setShowCalendar(true)}
            onOpenTimer={() => setShowTimer(true)}
          />

          <VacationBanner />
          <YesterdaySummary />
          
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
              className={`comic-chip p-3 rounded-xl transition-all duration-200 ${
                isSoundEnabled 
                  ? 'bg-yellow-400 text-red-700' 
                  : 'bg-slate-300 text-slate-600'
              }`}
              title={isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
            >
              <FlashIcon name={isSoundEnabled ? 'volume' : 'mute'} className="w-5 h-5" />
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
                <div className="comic-card p-8 relative overflow-hidden">
                  {/* Efeito de brilho de fundo */}
                  <motion.div
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-white/30 to-yellow-400/20 rounded-3xl"
                  />
                  <div className="relative z-10">
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-16 h-16 mx-auto mb-4 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-xl"
                    >
                      <img 
                        src={CHILD_PHOTO_URL}
                        alt="Avatar do Heitor"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </motion.div>
                    <h2 className="ink-title text-3xl md:text-4xl mb-3">
                    Bem-vindo de volta, Heitor!
                    </h2>
                    <p className="text-red-700 text-xl font-bold">
                    {getMotivationalMessage()}
                    </p>
                  </div>
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
              {/* Missão Surpresa */}
              {shouldShowSurpriseMission && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="comic-card p-6 relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="text-center mb-4">
                      <div className="mx-auto mb-3 flex justify-center">
                        <IconBadge name="target" size={64} />
                      </div>
                      
                      <h3 className="ink-title text-xl mb-2">
                        Missão Surpresa disponível
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-3">
                        Uma prova especial criada só para você!
                      </p>
                      
                      <div className="flex items-center justify-center gap-2 text-sm mb-4">
                        <span className="comic-chip bg-yellow-100 text-[#1A1214] px-2 py-1 rounded-full font-medium">
                          {surpriseMissionConfig.theme === 'english' ? 'Inglês' : 
                               surpriseMissionConfig.theme === 'math' ? 'Matemática' : 
                               surpriseMissionConfig.theme === 'general' ? 'Conhecimentos Gerais' : 
                               'Tudo Misturado'}
                        </span>
                        <span className="comic-chip bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                          {surpriseMissionConfig.difficulty === 'easy' ? 'Fácil' : 
                               surpriseMissionConfig.difficulty === 'medium' ? 'Médio' : 
                               'Difícil'}
                        </span>
                      </div>
                      
                      <div className="bg-yellow-50 border-2 border-[#1A1214] rounded-xl p-3 mb-4">
                        <div className="flex items-center justify-center gap-4 text-lg font-bold">
                          <div className="flex items-center gap-1 text-blue-700">
                            <FlashIcon name="xp" className="w-5 h-5" />
                            +{surpriseMissionConfig.xpReward} XP
                          </div>
                          <div className="flex items-center gap-1 text-amber-700">
                            <FlashIcon name="gold" className="w-5 h-5" />
                            +{surpriseMissionConfig.goldReward} Gold
                          </div>
                        </div>
                        <p className="text-center text-yellow-800 text-xs mt-1">
                          30 questões + bônus por performance!
                        </p>
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSurpriseMission(true)}
                      className="w-full py-4 bg-red-600 text-yellow-300 rounded-xl font-bold text-lg comic-chip flex items-center justify-center gap-2"
                    >
                      <FlashIcon name="play" className="w-6 h-6" />
                      Iniciar Missão Surpresa!
                    </motion.button>
                  </div>
                  
                </motion.div>
              )}
              
              <EnglishArenaCard />

              
              <FlashReminders />
              
              <AchievementsBadges />
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
                <div className="bg-gradient-to-r from-hero-accent to-yellow-400 text-hero-primary text-2xl md:text-3xl font-bold px-6 py-3 rounded-2xl shadow-xl border-2 border-[#1A1214] flex items-center gap-3">
                  <FlashIcon name="trophy" className="w-8 h-8" />
                  Período Completo!
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Special Birthday Message */}
          {(() => {
            const today = new Date();
            const todayString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const isBirthday = todayString === CHILD_BIRTHDAY_MMDD;
            
            return isBirthday && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
              >
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-2xl border-4 border-yellow-400 relative overflow-hidden">
                  <motion.div
                    animate={{
                      x: ['-100%', '100%'],
                      opacity: [0, 0.5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent skew-x-12"
                  />
                  <div className="relative z-10 flex items-center gap-3">
                    <motion.span
                      animate={{
                        scale: [1, 1.3, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      🎂
                    </motion.span>
                    <span>FELIZ ANIVERSÁRIO, HEITOR!</span>
                    <motion.span
                      animate={{
                        scale: [1, 1.3, 1],
                        rotate: [0, -10, 10, 0]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    >
                      🎉
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </div>

      {/* Quiz Time */}
      <DailyQuiz onComplete={() => setQuizCompleted(true)} />

      {/* Birthday Celebration */}
      <BirthdayCelebration onComplete={() => setBirthdayCelebrationCompleted(true)} />

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

      <AnimatePresence>
        {showSurpriseMission && (
          <SurpriseMissionQuiz 
            isOpen={showSurpriseMission}
            onClose={() => setShowSurpriseMission(false)}
            onComplete={() => {
              setShowSurpriseMission(false);
              // Refresh surprise mission status will be handled by DataContext
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTimer && (
          <FlashTimer 
            isOpen={showTimer}
            onClose={() => setShowTimer(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroPanel;