import React from 'react';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import TaskItem from './TaskItem';
import { useClock } from '../../contexts/ClockContext';
import { addDays } from '../../utils/clock';
import { dueTasksOn, extraVisibleOn } from '../../services/village/schedule';
import { useVillage } from '../../contexts/VillageContext';
import { lateWindow } from '../../services/village/late';
import { FirestoreService } from '../../services/firestoreService';

const MAP = '/assets/english/ui/map.webp';
const SUN = '/assets/english/ui/sun.webp';
const SUNSET = '/assets/english/ui/sunset.webp';
const MOON = '/assets/english/ui/moon.webp';
const TROPHY = '/assets/english/ui/trophy.webp';

const isTaskAvailableToday = (task: Task, weekday: number): boolean => {
  switch (task.frequency) {
    case 'daily':
      return true;
    case 'weekday':
      return weekday >= 1 && weekday <= 5;
    case 'weekend':
      return weekday === 0 || weekday === 6;
    default:
      return true;
  }
};

const isTaskCompletedToday = (task: Task, today: string): boolean => {
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
  const { completeTask, completeLateTask } = useData();
  const { childUid } = useAuth();
  const { hour, weekday, today, period: clockPeriod } = useClock();
  const { economy } = useVillage();
  const [yesterdayDone, setYesterdayDone] = React.useState<string[]>([]);

  const getCurrentPeriod = (): 'morning' | 'afternoon' | 'evening' => clockPeriod;

  React.useEffect(() => {
    const currentPeriod = getCurrentPeriod();
    if (selectedPeriod !== currentPeriod) {
      onPeriodChange(currentPeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- atualiza quando o Relógio da Vila muda de período
  }, [clockPeriod]);

  const periods = [
    { id: 'morning' as const, label: 'Manhã', icon: SUN },
    { id: 'afternoon' as const, label: 'Tarde', icon: SUNSET },
    { id: 'evening' as const, label: 'Noite', icon: MOON },
  ];

  const filteredTasks = tasks.filter(task => 
    task.period === selectedPeriod && 
    task.active === true &&
    task.status !== 'proposed' &&
    !task.optional &&
    isTaskAvailableToday(task, weekday)
  );
  React.useEffect(() => {
    if (!childUid) return;
    const yesterday = addDays(today, -1);
    void FirestoreService.getCompletedTaskIdsOn(childUid, yesterday).then(setYesterdayDone).catch(() => setYesterdayDone([]));
  }, [childUid, today]);

  const extraTasks = tasks.filter((task) => extraVisibleOn(task, today) && isTaskAvailableToday(task, weekday));

  const completedTasks = filteredTasks.filter(task => isTaskCompletedToday(task, today)).length;
  const totalTasks = filteredTasks.length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const currentPeriod = getCurrentPeriod();
  const isCurrentPeriod = selectedPeriod === currentPeriod;
  
  // Guided mode: show only current incomplete task
  const currentTask = guidedMode 
    ? filteredTasks.find(task => !isTaskCompletedToday(task, today)) 
    : null;
  
  const tasksToShow = guidedMode && currentTask ? [currentTask] : filteredTasks;

  const handleCompleteTask = async (taskId: string, completed: boolean) => {
    // Only allow completion, not un-completion
    if (!completed) {
      return;
    }
    
    // Check if task is already completed today before proceeding
    const task = tasks.find(t => t.id === taskId);
    if (task && isTaskCompletedToday(task, today)) {
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
    if (hour < 12) return 'Missões da manhã. Começa por essas.';
    if (hour < 18) return 'Missões da tarde. Hora de continuar.';
    return 'Missões da noite. Últimas do dia.';
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
            className={`mc-btn min-h-[44px] px-4 font-bold ${guidedMode ? 'mc-btn-green' : 'mc-btn-wood'}`}
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
              className={`mc-slot rounded relative min-h-[44px] ${isSelected ? 'mc-slot-selected' : ''}`}
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
        <div className="mc-row rounded p-3 mb-4">
          <span className="mc-lbl">
            Missão {filteredTasks.findIndex(t => t.id === currentTask.id) + 1} de {totalTasks}
          </span>
        </div>
      )}

      {lateWindow(hour, economy) && dueTasksOn(tasks, addDays(today, -1)).filter((t) => !yesterdayDone.includes(t.id)).map((t) => {
        const full = tasks.find((x) => x.id === t.id);
        if (!full) return null;
        return (
          <div key={`late-${t.id}`} className="mc-row rounded p-3 mb-2 flex justify-between items-center">
            <p className="text-sm">Recuperar: {full.title}</p>
            <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => {
              void completeLateTask(full.id).then(() => {
                setYesterdayDone((ids) => ids.includes(full.id) ? ids : [...ids, full.id]);
              }).catch(() => undefined);
            }}>Recuperar</button>
          </div>
        );
      })}

      {extraTasks.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-bold mb-1">Extra · 2x material</p>
          {extraTasks.map((task, index) => (
            <TaskItem key={task.id} task={task} index={index} onComplete={handleCompleteTask} guidedMode={false} />
          ))}
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
