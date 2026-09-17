import { CHILD_BIRTHDAY_MMDD } from '../../config/rules';
import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import ComicBackdrop from '../common/ComicBackdrop';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePunishment } from '../../contexts/PunishmentContext';
import { VillageProvider, useVillage } from '../../contexts/VillageContext';
import PunishmentModeScreen from './PunishmentModeScreen';
import DailyQuiz from './DailyQuiz';
import SurpriseMissionQuiz from './SurpriseMissionQuiz';
import LoadingSpinner from '../common/LoadingSpinner';
import { ReadyBoot } from '../common/useDismissBoot';
import VillageHome from './village/VillageHome';
import Onboarding from './village/Onboarding';
import LevelUpModal from './village/LevelUpModal';
import { getTodayBrazil } from '../../utils/clock';
import { quizLockedFor } from '../../services/village/quizGate';
import { useClock } from '../../contexts/ClockContext';

const VillageGate: React.FC<{
  selectedPeriod: 'morning' | 'afternoon' | 'evening';
  onPeriodChange: (p: 'morning' | 'afternoon' | 'evening') => void;
  guidedMode: boolean;
  onToggleGuidedMode: () => void;
  onOpenQuiz: () => void;
  quizLocked: boolean;
  punished?: boolean;
}> = (props) => {
  const { village } = useVillage();
  const forceOnboard = import.meta.env.DEV && new URLSearchParams(window.location.search).get('onboard') === '1';
  if (!village.onboardedAt || forceOnboard) return <><ReadyBoot /><Onboarding /></>;
  return <><ReadyBoot /><VillageHome {...props} /></>;
};

const VillageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading } = useVillage();
  if (loading) return <LoadingSpinner />;
  return <>{children}</>;
};

const AfterOnboard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { village, loading } = useVillage();
  const { requestPermission, permission } = useNotifications();
  const forceOnboard = import.meta.env.DEV && new URLSearchParams(window.location.search).get('onboard') === '1';
  const ready = !loading && Boolean(village.onboardedAt) && !forceOnboard;
  useEffect(() => {
    if (!ready || permission !== 'default') return;
    const timer = setTimeout(() => { void requestPermission(); }, 3000);
    return () => clearTimeout(timer);
  }, [ready, permission, requestPermission]);
  if (!ready) return null;
  return <>{children}</>;
};

const HeroPanel: React.FC = () => {
  const { progress, loading } = useData();
  const { isPunished } = usePunishment();
  const { period: clockPeriod, today: clockToday } = useClock();
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'afternoon' | 'evening'>(clockPeriod);
  const [guidedMode, setGuidedMode] = useState(false);
  const [showSurpriseMission, setShowSurpriseMission] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizRequestId, setQuizRequestId] = useState(0);
  const [punishOpen, setPunishOpen] = useState(false);

  useEffect(() => {
    setSelectedPeriod(clockPeriod);
  }, [clockPeriod]);

  useEffect(() => {
    if (!progress.userId) return;
    const quizKey = `quiz_completed_${progress.userId}_${getTodayBrazil()}`;
    setQuizCompleted(Boolean(localStorage.getItem(quizKey)));
  }, [progress.userId, clockToday]);

  const markQuizDone = useCallback(() => {
    if (!progress.userId) return;
    localStorage.setItem(`quiz_completed_${progress.userId}_${getTodayBrazil()}`, '1');
    setQuizCompleted(true);
  }, [progress.userId]);

  if (loading) return <LoadingSpinner size="lg" />;

  const quizLocked = quizLockedFor({
    quizEnabled: progress.quizEnabled,
    quizRequired: progress.quizRequired,
    completed: quizCompleted,
  }) || (import.meta.env.DEV && new URLSearchParams(window.location.search).get('quiz') === 'lock');
  const todayString = clockToday.slice(5);

  return (
    <>
      <VillageProvider>
        <VillageShell>
          <div className="mn-page relative overflow-hidden min-h-screen">
            <ComicBackdrop className="is-quiet" />
            <div className="relative z-10">
              <VillageGate
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                guidedMode={guidedMode}
                onToggleGuidedMode={() => setGuidedMode((v) => !v)}
                onOpenQuiz={() => setQuizRequestId((n) => n + 1)}
                quizLocked={quizLocked}
                punished={isPunished}
              />
            </div>
            {todayString === CHILD_BIRTHDAY_MMDD && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                <div className="mc-panel px-6 py-3 text-white font-bold">Feliz aniversário, Heitor!</div>
              </div>
            )}
          </div>
          <AfterOnboard>
            <DailyQuiz onComplete={markQuizDone} openRequested={quizRequestId} />
            <LevelUpModal />
          </AfterOnboard>
        </VillageShell>
      </VillageProvider>

      {isPunished && !punishOpen && (
        <button type="button" className="fixed top-24 right-4 z-50 mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => setPunishOpen(true)}>
          Tarefas da punição
        </button>
      )}
      {punishOpen && <PunishmentModeScreen onClose={() => setPunishOpen(false)} />}
      <AnimatePresence>
        {showSurpriseMission && (
          <SurpriseMissionQuiz isOpen={showSurpriseMission} onClose={() => setShowSurpriseMission(false)} onComplete={() => setShowSurpriseMission(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroPanel;
