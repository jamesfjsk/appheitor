import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import TaskItem from './TaskItem';
import { getTodayBrazil } from '../../utils/timezone';

const MAP = '/assets/english/ui/map.webp';
const SUN = '/assets/english/ui/sun.webp';
const SUNSET = '/assets/english/ui/sunset.webp';
const MOON = '/assets/english/ui/moon.webp';
const TROPHY = '/assets/english/ui/trophy.webp';

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
    { id: 'morning' as const, label: 'Manhã', icon: SUN },
    { id: 'afternoon' as const, label: 'Tarde', icon: SUNSET },
    { id: 'evening' as const, label: 'Noite', icon: MOON },
  ];

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
    if (hour >= 6 && hour < 12) return 'Bom dia, Heitor! Vamos começar pelas missões da manhã.';
    if (hour >= 12 && hour < 18) return 'Boa tarde, Heitor! Hora das missões da tarde.';
    return 'Boa noite, Heitor! Últimas missões do dia.';
  };

  const periodLabel =
    selectedPeriod === 'morning' ? 'Manhã' :
    selectedPeriod === 'afternoon' ? 'Tarde' : 'Noite';

  return (
    <section className="mc-inv rounded-lg p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="mc-h">
            <img src={MAP} alt="" className="mc-pixel" draggable={false} />
            Missões do dia
          </h2>
          <span className="mc-lbl">{completedTasks}/{totalTasks} feitas</span>
        </div>

        {onToggleGuidedMode && (
          <button
            type="button"
            onClick={onToggleGuidedMode}
            className={`mc-btn min-h-[44px] px-4 font-bold ${guidedMode ? 'mc-btn-green' : 'text-white'}`}
            style={guidedMode ? undefined : { backgroundColor: 'var(--mc-wood)' }}
          >
            {guidedMode ? 'Modo guiado ligado' : 'Iniciar missões'}
          </button>
        )}
      </div>

      <div className="mc-hotbar mb-4">
        {periods.map((period) => {
          const isSelected = selectedPeriod === period.id;
          const isCurrent = period.id === currentPeriod;
          return (
            <button
              key={period.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onPeriodChange(period.id)}
              className={`mc-slot rounded relative ${isSelected ? 'mc-slot-selected' : ''}`}
            >
              <img src={period.icon} alt="" className="w-[26px] h-[26px] mc-pixel" draggable={false} />
              {period.label}
              {isCurrent && !isSelected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ffd83d] border border-black/60" />
              )}
            </button>
          );
        })}
      </div>
      
      {isCurrentPeriod && (
        <div className="mc-row rounded px-3 py-2 text-[15px] mb-4">
          {getTimeBasedMessage()}
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold mc-muted">{periodLabel}: {completedTasks}/{totalTasks}</span>
          <span className="mc-num">{Math.round(completionPercentage)}%</span>
        </div>
        <div className="mc-bar">
          <div
            className={`mc-bar-fill ${completionPercentage === 100 ? 'is-gold' : ''}`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
      
      {guidedMode && currentTask && (
        <div className="mc-row rounded p-3 mb-4 flex items-center justify-between">
          <span className="mc-lbl">
            Missão {filteredTasks.findIndex(t => t.id === currentTask.id) + 1} de {totalTasks}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const currentIndex = filteredTasks.findIndex(t => t.id === currentTask.id);
                if (currentIndex > 0) {
                  // Logic to show previous task would go here
                }
              }}
              className="mc-btn mc-btn-stone w-11 h-11 p-0"
              disabled={filteredTasks.findIndex(t => t.id === currentTask.id) === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const currentIndex = filteredTasks.findIndex(t => t.id === currentTask.id);
                if (currentIndex < filteredTasks.length - 1) {
                  // Logic to show next task would go here
                }
              }}
              className="mc-btn mc-btn-stone w-11 h-11 p-0"
              disabled={filteredTasks.findIndex(t => t.id === currentTask.id) === filteredTasks.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
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
          <div className="mc-row rounded p-6 text-center mc-pop">
            <img
              src={isCurrentPeriod ? MAP : MOON}
              alt=""
              className="w-14 h-14 mx-auto mb-3 mc-pixel"
              draggable={false}
            />
            <p className="font-bold text-[17px]">
              {isCurrentPeriod
                ? 'Todas as missões deste período estão feitas.'
                : 'Nenhuma missão para este período ainda.'}
            </p>
            {!isCurrentPeriod && (
              <p className="text-[13px] mc-muted mt-2">
                Peça para o papai adicionar algumas missões.
              </p>
            )}
          </div>
        )}
      </div>

      {completedTasks === totalTasks && totalTasks > 0 && (
        <div className="mc-row is-done rounded p-4 text-center mc-pop mt-4">
          <img src={TROPHY} alt="" className="w-10 h-10 mx-auto mb-2 mc-pixel" draggable={false} />
          <p className="font-bold text-[17px]">Período completo</p>
          <p className="text-[13px] mc-muted mt-1">Você fez todas as missões deste período.</p>
        </div>
      )}
    </section>
  );
};

export default DailyChecklist;
