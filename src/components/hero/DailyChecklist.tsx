import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Sun, Sunset, Moon, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import TaskItem from './TaskItem';

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
  
  // Auto-detect period based on current time
  const getCurrentPeriod = (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  };
  
  // Auto-select current period on mount
  React.useEffect(() => {
    const currentPeriod = getCurrentPeriod();
    if (selectedPeriod !== currentPeriod) {
      onPeriodChange(currentPeriod);
    }
  }, []);

  const periods = [
    { id: 'morning', label: 'Manhã', icon: Sun, color: 'from-orange-400 to-yellow-400' },
    { id: 'afternoon', label: 'Tarde', icon: Sunset, color: 'from-blue-400 to-blue-500' },
    { id: 'evening', label: 'Noite', icon: Moon, color: 'from-purple-400 to-purple-500' }
  ] as const;

  const filteredTasks = tasks.filter(task => 
    task.period === selectedPeriod && task.active === true
  );

  const completedTasks = filteredTasks.filter(task => task.status === 'done').length;
  const totalTasks = filteredTasks.length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const currentPeriod = getCurrentPeriod();
  const isCurrentPeriod = selectedPeriod === currentPeriod;
  
  // Guided mode: show only current incomplete task
  const currentTask = guidedMode 
    ? filteredTasks.find(task => task.status !== 'done') 
    : null;
  
  const tasksToShow = guidedMode && currentTask ? [currentTask] : filteredTasks;

  const handleCompleteTask = async (taskId: string, completed: boolean) => {
    // Only allow completion, not un-completion
    if (!completed) {
      return;
    }
    
    try {
      await completeTask(taskId);
    } catch (error: any) {
      console.error('❌ Erro ao completar tarefa:', error);
      // Error is already handled in DataContext
    }
  };
  
  const getTimeBasedMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "🌅 Bom dia, Flash! Vamos começar as missões matinais?";
    if (hour >= 12 && hour < 18) return "☀️ Boa tarde, herói! Hora das missões da tarde!";
    return "🌙 Boa noite, velocista! Últimas missões do dia!";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="flash-card-hero p-8"
    >
      {/* Header com Seletor de Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white mb-4 sm:mb-0 flex items-center gap-2">
          <Clock className="w-6 h-6 text-hero-accent drop-shadow-md" />
          Missões Diárias
          {isCurrentPeriod && (
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-sm bg-hero-accent text-hero-primary px-3 py-1 rounded-full font-bold shadow-md"
            >
              AGORA
            </motion.span>
          )}
        </h2>

        <div className="flex flex-col gap-3">
          {/* Period Selector */}
          <div className="flex gap-2">
            {periods.map((period) => {
              const Icon = period.icon;
              const isSelected = selectedPeriod === period.id;
              const isCurrent = period.id === currentPeriod;
              
              return (
                <motion.button
                  key={period.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPeriodChange(period.id)}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 relative backdrop-blur-sm border-2 ${
                    isSelected
                      ? `bg-gradient-to-r ${period.color} text-white shadow-lg border-white/30`
                      : 'bg-white/20 text-white/80 hover:bg-white/30 border-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {period.label}
                  {isCurrent && !isSelected && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-hero-accent rounded-full shadow-sm"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Guided Mode Toggle */}
          {onToggleGuidedMode && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onToggleGuidedMode}
              className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 backdrop-blur-sm border-2 ${
                guidedMode
                  ? 'bg-hero-accent text-hero-primary shadow-lg border-white/30'
                  : 'bg-white/20 text-white hover:bg-white/30 border-white/20'
              }`}
            >
              <Play className="w-4 h-4" />
              {guidedMode ? 'Modo Guiado ON' : 'Iniciar Missões'}
            </motion.button>
          )}
        </div>
      </div>
      
      {/* Time-based motivational message */}
      {isCurrentPeriod && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 glass-effect-strong rounded-xl text-center"
        >
          <p className="text-white font-semibold">
            {getTimeBasedMessage()}
          </p>
        </motion.div>
      )}

      {/* Progress do Período */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/90 text-sm font-medium">
            Progresso do período: {completedTasks}/{totalTasks}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
              {Math.round(completionPercentage)}%
            </span>
            {completionPercentage === 100 && totalTasks > 0 && (
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-hero-accent text-xl"
              >
                ⚡
              </motion.span>
            )}
          </div>
        </div>
        
        <div className="progress-bar h-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="progress-fill"
          >
          </motion.div>
        </div>
      </div>
      
      {/* Guided Mode Navigation */}
      {guidedMode && currentTask && (
        <div className="mb-6 flex items-center justify-between glass-effect-strong rounded-xl p-4">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <Play className="w-4 h-4" />
            Missão {filteredTasks.findIndex(t => t.id === currentTask.id) + 1} de {totalTasks}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const currentIndex = filteredTasks.findIndex(t => t.id === currentTask.id);
                if (currentIndex > 0) {
                  // Logic to show previous task would go here
                }
              }}
              className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/20"
              disabled={filteredTasks.findIndex(t => t.id === currentTask.id) === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const currentIndex = filteredTasks.findIndex(t => t.id === currentTask.id);
                if (currentIndex < filteredTasks.length - 1) {
                  // Logic to show next task would go here
                }
              }}
              className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/20"
              disabled={filteredTasks.findIndex(t => t.id === currentTask.id) === filteredTasks.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de Tarefas */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {tasksToShow.length > 0 ? (
            tasksToShow.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                index={index}
                onComplete={handleCompleteTask}
                guidedMode={guidedMode}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-8xl mb-6"
              >
                {isCurrentPeriod ? '⚡' : '😴'}
              </motion.div>
              <p className="text-white text-xl font-semibold mb-2">
                {isCurrentPeriod 
                  ? 'Todas as missões deste período foram completadas! 🎉'
                  : 'Nenhuma missão para este período ainda.'
                }
              </p>
              {!isCurrentPeriod && (
                <p className="text-white/80 text-sm">
                  Peça para o papai adicionar algumas missões!
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mensagem de Conclusão */}
      {completedTasks === totalTasks && totalTasks > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
          }}
          transition={{ 
            duration: 0.5,
          }}
          className="mt-8 p-6 bg-gradient-to-r from-success-500 to-success-600 rounded-2xl text-center shadow-lg celebration-burst"
        >
          <div className="relative text-white font-bold text-xl mb-2 hero-text-shadow">
            🎉 Período Completo! 🎉
          </div>
          <p className="text-white/90 font-medium">
            Você completou todas as missões! ⚡ Incrível!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DailyChecklist;