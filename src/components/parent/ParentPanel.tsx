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
import NotificationSender from './NotificationSender';
import AdminControls from './AdminControls';
import FlashReminderManager from './FlashReminderManager';
import AchievementManager from './AchievementManager';
import SurpriseMissionConfigComponent from './SurpriseMissionConfig';
import BirthdayManager from './BirthdayManager';
import DailyQuizManager from './DailyQuizManager';
import DailyRulesManager from './DailyRulesManager';
import VacationModeControl from './VacationModeControl';
import EnglishProgressPanel from './EnglishProgressPanel';
import NotesManager from './NotesManager';
import GoldHistory from './GoldHistory';

type TabType = 'dashboard' | 'tasks' | 'rewards' | 'achievements' | 'reminders' | 'surprise' | 'quiz' | 'english' | 'birthday' | 'notifications' | 'history' | 'rewardsHistory' | 'notes' | 'system';

const ParentPanel: React.FC = () => {
  const { tasks, progress, loading } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner message="Carregando painel administrativo..." />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart' },
    { id: 'tasks', label: 'Gerenciar Tarefas', icon: 'notes' },
    { id: 'rewards', label: 'Recompensas', icon: 'gift' },
    { id: 'achievements', label: 'Conquistas', icon: 'trophy' },
    { id: 'reminders', label: 'Lembretes Flash', icon: 'bolt' },
    { id: 'surprise', label: 'Missão Surpresa', icon: 'target' },
    { id: 'quiz', label: 'Quiz Diário', icon: 'brain' },
    { id: 'english', label: 'Inglês', icon: 'gamepad' },
    { id: 'birthday', label: 'Aniversário', icon: 'cake' },
    { id: 'notifications', label: 'Notificações', icon: 'bell' },
    { id: 'history', label: 'Histórico Tarefas', icon: 'history' },
    { id: 'rewardsHistory', label: 'Histórico Gold', icon: 'gold' },
    { id: 'notes', label: 'Anotações', icon: 'notes' },
    { id: 'system', label: 'Ajustes', icon: 'settings' }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <ParentHeader />

        {/* Navigation Tabs */}
        <div className="mt-8 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-x-6 gap-y-1 -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
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
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'dashboard' && (
            <ProgressDashboard tasks={tasks} progress={progress} />
          )}
          {activeTab === 'tasks' && (
            <TaskManager tasks={tasks} />
          )}
          {activeTab === 'rewards' && (
            <RewardManager />
          )}
          {activeTab === 'achievements' && (
            <AchievementManager />
          )}
          {activeTab === 'reminders' && (
            <FlashReminderManager />
          )}
          {activeTab === 'surprise' && (
            <SurpriseMissionConfigComponent />
          )}
          {activeTab === 'english' && (
            <EnglishProgressPanel />
          )}
          {activeTab === 'quiz' && (
            <DailyQuizManager />
          )}
          {activeTab === 'birthday' && (
            <BirthdayManager />
          )}
          {activeTab === 'notifications' && (
            <NotificationSender />
          )}
          {activeTab === 'history' && (
            <TaskHistory tasks={tasks} />
          )}
          {activeTab === 'rewardsHistory' && (
            <GoldHistory />
          )}
          {activeTab === 'notes' && (
            <NotesManager />
          )}
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