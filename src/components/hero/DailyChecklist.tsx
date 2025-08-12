import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { Task, TaskStatus } from '../../types';
import TaskItem from './TaskItem';
import { Clock, Sun, Sunset, Moon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DailyChecklistProps {
  selectedPeriod: 'morning' | 'afternoon' | 'evening';
  onPeriodChange: (period: 'morning' | 'afternoon' | 'evening') => void;
}

const DailyChecklist: React.FC<DailyChecklistProps> = ({ selectedPeriod, onPeriodChange }) => {
  const { tasks, completeTask } = useData();
  const { user } = useAuth();
  const { playSound } = useSound();
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

  const periods = [
    { id: 'morning' as const, label: 'Manhã', icon: Sun, gradient: 'from-flash-yellow-light to-flash-yellow-primary' },
    { id: 'afternoon' as const, label: 'Tarde', icon: Sun, gradient: 'from-flash-red-light to-flash-red-primary' },
    { id: 'evening' as const, label: 'Noite', icon: Moon, gradient: 'from-purple-200 to-purple-400' }
  ];

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

  const filteredTasks = tasks.filter(task => {
    // Filter by period
    if (task.period !== selectedPeriod) return false;
    
    // Filter by frequency based on day of week
    if (task.frequency === 'weekday' && isWeekend) return false;
    if (task.frequency === 'weekend' && !isWeekend) return false;
    
    return true;
  });

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;

    // Check if task is already completed today
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const todayCompletion = task.completions?.find(c => c.date === today);
    if (todayCompletion?.status === 'done') {
      toast.success('✅ Tarefa já foi completada hoje! Aparecerá novamente amanhã.', {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          fontWeight: '600'
        }
      });
      return;
    }

    setCompletingTasks(prev => new Set(prev).add(taskId));

    try {
      await completeTask(taskId);
      playSound('success');
      
      // Show celebration toast
      toast.success('🎉 Missão completada! Parabéns, herói!', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FFD93D 100%)',
          color: 'white',
          borderRadius: '12px',
          fontWeight: '600'
        }
      });
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (errorMessage.includes('Task already completed today')) {
        toast.success('✅ Tarefa já foi completada hoje! Aparecerá novamente amanhã.', {
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            borderRadius: '12px',
            fontWeight: '600'
          }
        });
      } else if (errorMessage.includes('permission-denied')) {
        toast.error('❌ Erro de permissão. Tente fazer login novamente.', {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: 'white',
            borderRadius: '12px',
            fontWeight: '600'
          }
        });
      } else {
        toast.error(`❌ Erro ao completar tarefa: ${errorMessage}`, {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: 'white',
            borderRadius: '12px',
            fontWeight: '600'
          }
        });
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

  const getTaskStatus = (task: Task): TaskStatus => {
    const todayCompletion = task.completions?.find(c => c.date === today);
    return todayCompletion?.status || 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2 p-1 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
        {periods.map((period) => {
          const Icon = period.icon;
          const isSelected = selectedPeriod === period.id;
          
          return (
            <button
              key={period.id}
              onClick={() => onPeriodChange(period.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                font-semibold text-sm transition-all duration-300 relative overflow-hidden
                ${isSelected 
                  ? `bg-gradient-to-r ${period.gradient} text-white shadow-lg transform scale-105` 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/30'
                }
              `}
            >
              <Icon size={18} />
              <span>{period.label}</span>
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shimmer" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              Nenhuma missão para este período
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Que tal descansar um pouco? 😊
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div
              key={task.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <TaskItem
                task={task}
                status={getTaskStatus(task)}
                onToggle={() => handleCompleteTask(task.id)}
                isCompleting={completingTasks.has(task.id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Progress Summary */}
      {filteredTasks.length > 0 && (
        <div className="mt-6 p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">
              Progresso do período
            </span>
            <span className="text-gray-800 font-bold">
              {filteredTasks.filter(task => getTaskStatus(task) === 'done').length} / {filteredTasks.length}
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-flash-red-primary to-flash-yellow-primary transition-all duration-500 relative"
              style={{ 
                width: `${(filteredTasks.filter(task => getTaskStatus(task) === 'done').length / filteredTasks.length) * 100}%` 
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyChecklist;