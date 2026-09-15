import { CHILD_BIRTHDAY_MMDD } from '../../config/rules';
import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import ComicBackdrop from '../common/ComicBackdrop';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePunishment } from '../../contexts/PunishmentContext';
import { VillageProvider, useVillage } from '../../contexts/VillageContext';
import PunishmentModeScreen from './PunishmentModeScreen';
import RewardsPanel from './RewardsPanel';
import CalendarModal from './CalendarModal';
import DailyQuiz from './DailyQuiz';
import SurpriseMissionQuiz from './SurpriseMissionQuiz';
import FlashTimer from './FlashTimer';
import BirthdayCelebration from './BirthdayCelebration';
import LoadingSpinner from '../common/LoadingSpinner';
import VillageHome from './village/VillageHome';
import Onboarding from './village/Onboarding';
import LevelUpModal from './village/LevelUpModal';
import { getTodayBrazil } from '../../utils/timezone';

const VillageGate: React.FC<{
  selectedPeriod: 'morning' | 'afternoon' | 'evening';
  onPeriodChange: (p: 'morning' | 'afternoon' | 'evening') => void;
  guidedMode: boolean;
  onToggleGuidedMode: () => void;
  onOpenRewards: () => void;
  onOpenCalendar: () => void;
  onOpenTimer: () => void;
  onOpenQuiz: () => void;
  quizLocked: boolean;
}> = (props) => {
  const { village, loading } = useVillage();
  if (loading) return <LoadingSpinner size="lg" />;
  if (!village.onboardedAt) return <Onboarding />;
  return <VillageHome {...props} />;
};

const HeroPanel: React.FC = () => {
  const { progress, loading } = useData();
  const { requestPermission, permission } = useNotifications();
  const { isPunished } = usePunishment();
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [showRewards, setShowRewards] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [showSurpriseMission, setShowSurpriseMission] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizRequestId, setQuizRequestId] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) setSelectedPeriod('morning');
    else if (hour >= 12 && hour < 18) setSelectedPeriod('afternoon');
    else setSelectedPeriod('evening');
  }, []);

  useEffect(() => {
    if (!progress.userId) return;
    const today = getTodayBrazil();
    const quizKey = `quiz_completed_${progress.userId}_${today}`;
    setQuizCompleted(!!localStorage.getItem(quizKey));
  }, [progress.userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (permission === 'default') requestPermission();
    }, 3000);
    return () => clearTimeout(timer);
  }, [permission, requestPermission]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (isPunished) return <PunishmentModeScreen />;

  const quizLocked = Boolean(progress.quizRequired) && !quizCompleted;
  const today = new Date();
  const todayString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <>
      <div className="mn-page relative overflow-hidden min-h-screen">
        <ComicBackdrop />
        <VillageProvider>
          <VillageGate
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            guidedMode={guidedMode}
            onToggleGuidedMode={() => setGuidedMode((v) => !v)}
            onOpenRewards={() => setShowRewards(true)}
            onOpenCalendar={() => setShowCalendar(true)}
            onOpenTimer={() => setShowTimer(true)}
            onOpenQuiz={() => setQuizRequestId((n) => n + 1)}
            quizLocked={quizLocked}
          />
        </VillageProvider>
        {todayString === CHILD_BIRTHDAY_MMDD && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className="mc-panel px-6 py-3 text-white font-bold">Feliz aniversário, Heitor!</div>
          </div>
        )}
      </div>

      <DailyQuiz
        onComplete={() => setQuizCompleted(true)}
        openRequested={quizRequestId}
      />
      <BirthdayCelebration onComplete={() => undefined} />
      <LevelUpModal />
      <AnimatePresence>
        {showRewards && <RewardsPanel isOpen={showRewards} onClose={() => setShowRewards(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCalendar && <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSurpriseMission && (
          <SurpriseMissionQuiz isOpen={showSurpriseMission} onClose={() => setShowSurpriseMission(false)} onComplete={() => setShowSurpriseMission(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTimer && <FlashTimer isOpen={showTimer} onClose={() => setShowTimer(false)} />}
      </AnimatePresence>
    </>
  );
};

export default HeroPanel;
