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
import SystemTools from './SystemTools';
import FlashReminderManager from './FlashReminderManager';
import AchievementManager from './AchievementManager';
import SurpriseMissionConfigComponent from './SurpriseMissionConfig';
import BirthdayManager from './BirthdayManager';
import DailyRewardsHistory from './DailyRewardsHistory';
import NotesManager from './NotesManager';

type TabType = 'dashboard' | 'tasks' | 'rewards' | 'achievements' | 'reminders' | 'surprise' | 'birthday' | 'notifications' | 'history' | 'rewardsHistory' | 'notes' | 'system';

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
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tasks', label: 'Gerenciar Tarefas', icon: '📝' },
    { id: 'rewards', label: 'Recompensas', icon: '🎁' },
    { id: 'achievements', label: 'Conquistas', icon: '🏆' },
    { id: 'reminders', label: 'Lembretes Flash', icon: '⚡' },
    { id: 'surprise', label: 'Missão Surpresa', icon: '🎯' },
    { id: 'birthday', label: 'Aniversário', icon: '🎂' },
    { id: 'notifications', label: 'Notificações', icon: '🔔' },
    { id: 'history', label: 'Histórico Tarefas', icon: '📈' },
    { id: 'rewardsHistory', label: 'Histórico Gold', icon: '💰' },
    { id: 'notes', label: 'Anotações', icon: '📝' },
    { id: 'system', label: 'Ferramentas de Sistema', icon: '🔧' }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <ParentHeader />

        {/* Navigation Tabs */}
        <div className="mt-8 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
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
            <DailyRewardsHistory />
          )}
          {activeTab === 'notes' && (
            <NotesManager />
          )}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <AdminControls />
              <SystemTools />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ParentPanel;