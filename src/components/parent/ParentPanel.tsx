import { FlashIcon } from '../../icons';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import ParentHeader from './ParentHeader';
import TaskManager from './TaskManager';
import ProgressDashboard from './ProgressDashboard';
import TaskHistory from './TaskHistory';
import RewardManager from './RewardManager';
import LoadingSpinner from '../common/LoadingSpinner';
import { ReadyBoot } from '../common/useDismissBoot';
import NotificationSender from './NotificationSender';
import AdminControls from './AdminControls';
import AchievementManager from './AchievementManager';
import SurpriseMissionConfigComponent from './SurpriseMissionConfig';
import BirthdayManager from './BirthdayManager';
import DailyQuizManager from './DailyQuizManager';
import BooksPanel from './BooksPanel';
import DailyRulesManager from './DailyRulesManager';
import VacationModeControl from './VacationModeControl';
import EnglishProgressPanel from './EnglishProgressPanel';
import EnglishBaseManager from './EnglishBaseManager';
import NotesManager from './NotesManager';
import GoldHistory from './GoldHistory';
import VillageManager from './VillageManager';
import PlacaManager from './PlacaManager';
import GoalsPanel from './GoalsPanel';
import ChallengeManager from './ChallengeManager';
import Balanca from './Balanca';
import AgendaManager from './AgendaManager';
import HojeCard from './HojeCard';
import WeeklyReport from './WeeklyReport';
import CharactersPanel from './CharactersPanel';

type TabType =
  | 'dashboard' | 'village' | 'tasks' | 'rewards' | 'achievements' | 'reminders' | 'surprise' | 'quiz'
  | 'english' | 'birthday' | 'notifications' | 'history' | 'rewardsHistory' | 'notes' | 'system'
  | 'goals' | 'challenges' | 'balanca' | 'agenda' | 'characters' | 'books';

const GROUPS: Array<{ id: string; label: string; tabs: Array<{ id: TabType; label: string; icon: string }> }> = [
  {
    id: 'hoje',
    label: 'Hoje',
    tabs: [
      { id: 'dashboard', label: 'Hoje', icon: 'chart' },
    ],
  },
  {
    id: 'jogo',
    label: 'Jogo',
    tabs: [
      { id: 'village', label: 'Vila', icon: 'home' },
      { id: 'goals', label: 'Cofrinho', icon: 'gold' },
      { id: 'challenges', label: 'Desafios', icon: 'trophy' },
      { id: 'rewards', label: 'Prêmios', icon: 'gift' },
      { id: 'tasks', label: 'Missões', icon: 'notes' },
      { id: 'surprise', label: 'Missão surpresa', icon: 'target' },
      { id: 'agenda', label: 'Agenda', icon: 'notes' },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    tabs: [
      { id: 'quiz', label: 'Prova', icon: 'brain' },
      { id: 'books', label: 'Livros', icon: 'notes' },
      { id: 'reminders', label: 'Placa', icon: 'bolt' },
      { id: 'english', label: 'Mina', icon: 'gamepad' },
      { id: 'characters', label: 'Personagens', icon: 'home' },
      { id: 'achievements', label: 'Vida real', icon: 'trophy' },
    ],
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    tabs: [
      { id: 'balanca', label: 'Economia', icon: 'gold' },
      { id: 'system', label: 'Módulos e Saúde', icon: 'settings' },
      { id: 'birthday', label: 'Aniversário', icon: 'cake' },
      { id: 'notifications', label: 'Notificações', icon: 'bell' },
      { id: 'notes', label: 'Anotações', icon: 'notes' },
      { id: 'history', label: 'Histórico tarefas', icon: 'history' },
      { id: 'rewardsHistory', label: 'Histórico gold', icon: 'gold' },
    ],
  },
];

const ParentPanel: React.FC = () => {
  const { tasks, progress, loading } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  if (loading) return <LoadingSpinner message="Carregando painel administrativo..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      <ReadyBoot />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ParentHeader />
        <div className="mt-8 mb-6 space-y-4">
          {GROUPS.map((g) => (
            <div key={g.id}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{g.label}</p>
              <nav className="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-200">
                {g.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2 inline-flex align-middle">
                      <FlashIcon name={tab.icon} className="w-4 h-4" />
                    </span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {activeTab === 'dashboard' && (
            <>
              <HojeCard onOpen={(tab) => setActiveTab(tab as TabType)} />
              <ProgressDashboard tasks={tasks} progress={progress} />
              <WeeklyReport />
            </>
          )}
          {activeTab === 'village' && <VillageManager />}
          {activeTab === 'goals' && <GoalsPanel />}
          {activeTab === 'challenges' && <ChallengeManager />}
          {activeTab === 'balanca' && <Balanca />}
          {activeTab === 'agenda' && <AgendaManager />}
          {activeTab === 'tasks' && <TaskManager tasks={tasks} />}
          {activeTab === 'rewards' && <RewardManager />}
          {activeTab === 'achievements' && <AchievementManager />}
          {activeTab === 'reminders' && <PlacaManager />}
          {activeTab === 'surprise' && <SurpriseMissionConfigComponent />}
          {activeTab === 'english' && (
            <div className="space-y-6">
              <EnglishBaseManager />
              <EnglishProgressPanel />
            </div>
          )}
          {activeTab === 'characters' && <CharactersPanel />}
          {activeTab === 'quiz' && <DailyQuizManager />}
          {activeTab === 'books' && <BooksPanel />}
          {activeTab === 'birthday' && <BirthdayManager />}
          {activeTab === 'notifications' && <NotificationSender />}
          {activeTab === 'history' && <TaskHistory tasks={tasks} />}
          {activeTab === 'rewardsHistory' && <GoldHistory />}
          {activeTab === 'notes' && <NotesManager />}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <AdminControls />
              <VacationModeControl />
              <DailyRulesManager />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ParentPanel;
