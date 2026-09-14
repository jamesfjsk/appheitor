import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FlashIcon, IconBadge } from '../../icons';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import TaskItem from './TaskItem';
import { getTodayBrazil } from '../../utils/timezone';


// Helper function to check if task should be shown today based on frequency
const isTaskAvailableToday = (task: Task): boolean => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  switch (task.frequency) {
    case 'daily':
      return true; // Always available
    case 'weekday':
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    case 'weekend':
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
    default:
      return true;
  }
};

// Helper function to check if task is completed today
const isTaskCompletedToday = (task: Task): boolean => {
  const today = getTodayBrazil(); // YYYY-MM-DD format
  return task.status === 'done' && task.lastCompletedDate === today;
};

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once on mount
  }, []);

  const periods = [
    { id: 'morning', label: 'Manhã', icon: 'sun', color: 'from-amber-400 to-orange-500' },
    { id: 'afternoon', label: 'Tarde', icon: 'sunset', color: 'from-red-500 to-red-700' },
    { id: 'evening', label: 'Noite', icon: 'moon', color: 'from-slate-700 to-slate-900' }
  ] as const;

  const filteredTasks = tasks.filter(task => 
    task.period === selectedPeriod && 
    task.active === true &&
    isTaskAvailableToday(task)
  );

  const completedTasks = filteredTasks.filter(task => isTaskCompletedToday(task)).length;
  const totalTasks = filteredTasks.length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const currentPeriod = getCurrentPeriod();
  const isCurrentPeriod = selectedPeriod === currentPeriod;
  
  // Guided mode: show only current incomplete task
  const currentTask = guidedMode 
    ? filteredTasks.find(task => !isTaskCompletedToday(task)) 
    : null;
  
  const tasksToShow = guidedMode && currentTask ? [currentTask] : filteredTasks;

  const handleCompleteTask = async (taskId: string, completed: boolean) => {
    // Only allow completion, not un-completion
    if (!completed) {
      return;
    }
    
    // Check if task is already completed today before proceeding
    const task = tasks.find(t => t.id === taskId);
    if (task && isTaskCompletedToday(task)) {
      console.log('⚠️ Task already completed today, skipping');
      return;
    }
    
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error('❌ Erro ao completar tarefa:', error);
      // Error is already handled in DataContext
    }
  };
  
  const getTimeBasedMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Bom dia, Flash! Vamos começar as missões matinais?';
    if (hour >= 12 && hour < 18) return 'Boa tarde, herói! Hora das missões da tarde!';
    return 'Boa noite, velocista! Últimas missões do dia!';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="comic-card p-6"
    >
      {/* Header com Seletor de Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <h2 className="ink-title text-3xl mb-4 sm:mb-0 flex items-center gap-3">
          <span className="inline-flex">
            <IconBadge name="bolt" size={36} />
          </span>
          Missões Diárias
        </h2>

        <div className="flex flex-col gap-3">
          {/* Period Selector */}
          <div className="flex gap-2">
            {periods.map((period) => {
              const isSelected = selectedPeriod === period.id;
              const isCurrent = period.id === currentPeriod;
              
              return (
                <motion.button
                  key={period.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPeriodChange(period.id)}
                  className={`px-5 py-3 rounded-2xl font-bold text-lg transition-all duration-200 flex items-center gap-2 relative comic-chip ${
                    isSelected
                      ? `bg-gradient-to-r ${period.color} text-white`
                      : 'bg-white text-gray-700 hover:bg-yellow-50'
                  }`}
                >
                  <FlashIcon name={period.icon} className="w-5 h-5" />
                  {period.label}
                  {isCurrent && !isSelected && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg"
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
              className={`px-6 py-3 rounded-2xl font-bold text-lg transition-all duration-200 flex items-center gap-3 shadow-lg ${
                guidedMode
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-red-600 shadow-xl border-2 border-white'
                  : 'bg-white/80 text-gray-700 hover:bg-white border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              <FlashIcon name="play" className="w-6 h-6" />
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
          className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl text-center shadow-lg"
        >
          <p className="text-yellow-900 font-bold text-lg">
            {getTimeBasedMessage()}
          </p>
        </motion.div>
      )}

      {/* Progress do Período */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700 text-base font-medium">
            Progresso do período: {completedTasks}/{totalTasks}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 font-bold text-lg">
              {Math.round(completionPercentage)}%
            </span>
            {completionPercentage === 100 && totalTasks > 0 && (
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex text-yellow-400"
              >
                <FlashIcon name="bolt" className="w-5 h-5 text-yellow-500" />
              </motion.span>
            )}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-green-500 rounded-full relative shadow-lg"
          >
            {completionPercentage > 0 && (
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-white/60 rounded-full"
              />
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Guided Mode Navigation */}
      {guidedMode && currentTask && (
        <div className="mb-4 flex items-center justify-between bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <FlashIcon name="play" className="w-4 h-4" />
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
              className="p-1 text-white/60 hover:text-white transition-colors"
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
              className="p-1 text-white/60 hover:text-white transition-colors"
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
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-4 inline-flex justify-center w-full"
              >
                <IconBadge name={isCurrentPeriod ? 'bolt' : 'moon'} size={72} />
              </motion.div>
              <p className="text-gray-700 text-lg font-semibold">
                {isCurrentPeriod 
                  ? 'Todas as missões deste período foram completadas!'
                  : 'Nenhuma missão para este período ainda.'
                }
              </p>
              {!isCurrentPeriod && (
                <p className="text-yellow-400 text-sm mt-2">
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
          className="mt-6 p-6 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-2xl text-center shadow-2xl border-4 border-white relative overflow-hidden"
        >
          {/* Efeito de celebração de fundo */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20"
          />
          <div className="relative z-10 text-red-600 font-bold text-2xl mb-2 flex items-center justify-center gap-2">
            <FlashIcon name="trophy" className="w-7 h-7" />
            Período Completo!
          </div>
          <p className="relative z-10 text-red-600 text-lg font-semibold">
            Você completou todas as missões. Incrível!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DailyChecklist;