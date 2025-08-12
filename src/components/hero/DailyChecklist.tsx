import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sun, Sunset, Moon, Target } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Task } from '../../types';
import TaskItem from './TaskItem';
import toast from 'react-hot-toast';

interface DailyChecklistProps {
  tasks: Task[];
  selectedPeriod: 'morning' | 'afternoon' | 'evening';
  onPeriodChange: (period: 'morning' | 'afternoon' | 'evening') => void;
  guidedMode?: boolean;
  onToggleGuidedMode?: () => void;
}

const DailyChecklist: React.FC<DailyChecklistProps> = ({ 
  tasks, 
  selectedPeriod, 
  onPeriodChange, 
  guidedMode = false,
  onToggleGuidedMode 
}) => {
  const { completeTask } = useData();
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

  const periods = [
    { 
      id: 'morning' as const, 
      label: 'Manhã', 
      icon: Sun, 
      emoji: '🌅',
      color: 'from-yellow-400 to-orange-400'
    },
    { 
      id: 'afternoon' as const, 
      label: 'Tarde', 
      icon: Sunset, 
      emoji: '☀️',
      color: 'from-blue-400 to-indigo-400'
    },
    { 
      id: 'evening' as const, 
      label: 'Noite', 
      icon: Moon, 
      emoji: '🌙',
      color: 'from-purple-400 to-pink-400'
    }
  ];

  // Filter tasks by period and frequency
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const filteredTasks = tasks.filter(task => {
    // Filter by active status
    if (task.active !== true) return false;
    
    // Filter by period
    if (task.period !== selectedPeriod) return false;
    
    // Filter by frequency based on day of week
    if (task.frequency === 'weekday' && isWeekend) return false;
    if (task.frequency === 'weekend' && !isWeekend) return false;
    
    return true;
  });

  const handleCompleteTask = async (taskId: string, completed: boolean) => {
    if (!completed) return; // Only handle completion, not unchecking
    
    // Prevent multiple clicks
    if (completingTasks.has(taskId)) return;
    
    setCompletingTasks(prev => new Set(prev).add(taskId));

    try {
      await completeTask(taskId);
    } catch (error: any) {
      console.error('❌ Erro ao completar tarefa:', error);
      
      if (error.message === 'Task already completed today') {
        toast('✅ Tarefa já foi completada hoje!', {
          duration: 3000,
          style: {
            background: '#10B981',
            color: '#FFFFFF',
          },
        });
      } else if (error.code === 'permission-denied') {
        toast.error('❌ Erro de permissão. Tente fazer login novamente.');
      } else {
        toast.error('❌ Erro ao completar tarefa');
      }
    } finally {
      setTimeout(() => {
        setCompletingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 1000);
    }
  };

  const completedTasks = filteredTasks.filter(task => task.status === 'done').length;
  const totalTasks = filteredTasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getCurrentPeriodInfo = () => {
    return periods.find(p => p.id === selectedPeriod) || periods[0];
  };

  const currentPeriod = getCurrentPeriodInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card-hero space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900 font-bold text-xl flex items-center gap-3">
          <Target className="w-5 h-5 text-flash-red" />
          Missões de Hoje
        </h3>
        
        {onToggleGuidedMode && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleGuidedMode}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
              guidedMode
                ? 'bg-flash-red text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {guidedMode ? 'Modo Guiado ON' : 'Modo Guiado'}
          </motion.button>
        )}
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        {periods.map((period) => {
          const Icon = period.icon;
          const isSelected = selectedPeriod === period.id;
          
          return (
            <motion.button
              key={period.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPeriodChange(period.id)}
              className={`period-button ${isSelected ? 'active' : ''}`}
            >
              <span className="text-lg">{period.emoji}</span>
              <Icon className="w-4 h-4" />
              <span>{period.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Progress Summary */}
      {totalTasks > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-normal">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-900 font-semibold">
              {currentPeriod.emoji} Progresso da {currentPeriod.label}
            </span>
            <span className="text-flash-red font-bold">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          
          <div className="progress-bar">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}              transition={{ duration: 0.8, ease: "easeOut" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="progress-fill"
            />
          </div>
          
          {progressPercentage === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 text-center text-flash-red font-bold text-sm bg-flash-red-light rounded-lg py-2"
            >
              Período completo! Parabéns!
            </motion.div>
          )}
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">{currentPeriod.emoji}</div>
            <p className="text-gray-600 text-lg font-medium">
              Nenhuma missão para a {currentPeriod.label.toLowerCase()}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {isWeekend 
                ? 'Aproveite o fim de semana!'
                : 'Que tal descansar um pouco?'
              }
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={handleCompleteTask}
              index={index}
              guidedMode={guidedMode}
            />
          ))
        )}
      </div>

      {/* Day Type Indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 text-gray-600 text-sm font-medium border border-gray-200">
          <span className="text-base">{isWeekend ? '🏖️' : '📚'}</span>
          <span>{isWeekend ? 'Fim de Semana' : 'Dia de Semana'}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyChecklist;