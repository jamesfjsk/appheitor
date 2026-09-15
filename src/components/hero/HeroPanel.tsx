import { CHILD_BIRTHDAY_MMDD } from '../../config/rules';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ComicBackdrop from '../common/ComicBackdrop';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
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

const MINER = '/assets/english/ui/miner.webp';
const EMERALD = '/assets/english/ui/emerald.webp';
const STAR = '/assets/english/ui/star.webp';
const GOLD = '/assets/english/ui/gold.webp';
const TROPHY = '/assets/english/ui/trophy.webp';
const CAKE = '/assets/english/ui/base/i_cake.webp';

const HeroPanel: React.FC = () => {
  const { tasks, progress, loading, surpriseMissionConfig, isSurpriseMissionCompletedToday } = useData();
  const { requestPermission, permission } = useNotifications();
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
      return 'Todas as missões de hoje concluídas.';
    } else if (progressPercentage >= 75) {
      return 'Quase lá. Faltam poucas missões.';
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

  const themeLabel =
    surpriseMissionConfig?.theme === 'english' ? 'Inglês' :
    surpriseMissionConfig?.theme === 'math' ? 'Matemática' :
    surpriseMissionConfig?.theme === 'general' ? 'Conhecimentos Gerais' :
    'Tudo Misturado';
  const difficultyLabel =
    surpriseMissionConfig?.difficulty === 'easy' ? 'Fácil' :
    surpriseMissionConfig?.difficulty === 'medium' ? 'Médio' :
    'Difícil';

  return (
    <>
      <div className="mn-page relative overflow-hidden">
        <ComicBackdrop />

        <div className="relative z-10 mx-auto w-full max-w-[1040px] px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4 items-start">
            <div className="flex flex-col gap-4 min-w-0">
              <HeroHeader
                progress={progress}
                onOpenRewards={() => setShowRewards(true)}
                onOpenCalendar={() => setShowCalendar(true)}
                onOpenTimer={() => setShowTimer(true)}
              />

              <VacationBanner />
              <YesterdaySummary />

              <AnimatePresence>
                {showWelcome && (
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="mc-card mc-pop rounded-lg p-4 flex items-center gap-3"
                  >
                    <div className="mc-slot w-14 h-14 p-1 shrink-0">
                      <img src={MINER} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-white leading-tight">Bem-vindo de volta, Heitor!</p>
                      <p className="text-sm mc-muted">{getMotivationalMessage()}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <ProgressBar progress={progress} />

              <DailyChecklist
                tasks={tasks}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                guidedMode={guidedMode}
                onToggleGuidedMode={() => setGuidedMode(!guidedMode)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <EnglishArenaCard />

              {shouldShowSurpriseMission && surpriseMissionConfig && (
                <div className="mc-panel rounded-lg p-4">
                  <h3 className="mc-h">
                    <img src={EMERALD} alt="" className="mc-pixel" draggable={false} />
                    Missão Surpresa
                  </h3>
                  <p className="text-sm text-white/85 mt-2 mb-3">Uma prova especial criada para você.</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="mc-slot px-2 py-1 mc-font text-[8px] text-white">{themeLabel}</span>
                    <span className="mc-slot px-2 py-1 mc-font text-[8px] text-white">{difficultyLabel}</span>
                  </div>
                  <div className="mc-card p-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <img src={STAR} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                        <span className="mc-font text-[9px] mc-good">+{surpriseMissionConfig.xpReward} XP</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <img src={GOLD} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                        <span className="mc-font text-[9px] mc-warn">+{surpriseMissionConfig.goldReward} Gold</span>
                      </span>
                    </div>
                    <p className="text-xs mc-muted mt-1">30 questões + bônus por desempenho</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSurpriseMission(true)}
                    className="mc-btn mc-btn-green w-full py-3 font-bold"
                  >
                    Iniciar Missão Surpresa
                  </button>
                </div>
              )}

              <FlashReminders />
              <AchievementsBadges />
            </div>
          </div>

          <AnimatePresence>
            {showMissionComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="mc-panel mc-pop px-6 py-3 flex items-center gap-3">
                  <img src={TROPHY} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
                  <span className="mc-title text-sm">Período completo</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(() => {
            const today = new Date();
            const todayString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const isBirthday = todayString === CHILD_BIRTHDAY_MMDD;
            
            return isBirthday && (
              <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
                <div className="mc-panel px-6 py-3 flex items-center gap-3">
                  <img src={CAKE} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
                  <span className="font-bold text-white">Feliz aniversário, Heitor!</span>
                </div>
              </div>
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
