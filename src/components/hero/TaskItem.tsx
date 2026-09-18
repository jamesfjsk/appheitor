import { TASK_DEFAULT_XP, TASK_DEFAULT_GOLD } from '../../config/rules';
import React, { useState } from 'react';
import { FlashIcon, CheckMark } from '../../icons';
import { Task } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import { useVillage } from '../../contexts/VillageContext';
import { useClock } from '../../contexts/ClockContext';
import { useData } from '../../contexts/DataContext';
import { periodAllowedAt } from '../../services/village/schedule';
import { computeTaskLoot } from '../../services/village/loot';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../config/englishBase';
import { getTodayBrazil } from '../../utils/clock';
import type { Period } from '../../types/village';
import toast from 'react-hot-toast';

const CLOCK = '/assets/english/ui/clock.webp';
const BED = '/assets/english/ui/bed.webp';
const APPLE = '/assets/english/ui/apple.webp';
const BOOK = '/assets/english/ui/book.webp';
const SWORD = '/assets/english/ui/sword.webp';
const GRASS = '/assets/village/ui/plant.png';
const MAP = '/assets/english/ui/map.webp';

// Helper function to check if task is completed today
const isTaskCompletedToday = (task: Task): boolean => {
  const today = getTodayBrazil();
  return task.status === 'done' && task.lastCompletedDate === today;
};

function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function hasWord(hay: string, word: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${word}(?:[^a-z0-9]|$)`).test(hay);
}

function taskIcon(task: Task): string {
  const hay = fold(`${task.title} ${task.description || ''}`);
  if (hasWord(hay, 'cama') || hasWord(hay, 'dormir') || hasWord(hay, 'deitar')) return BED;
  if (hasWord(hay, 'comer') || hasWord(hay, 'cafe') || hasWord(hay, 'lanche') || hasWord(hay, 'almoco') || hasWord(hay, 'jantar')) return APPLE;
  if (hasWord(hay, 'ler') || hasWord(hay, 'leitura') || hasWord(hay, 'livro') || hasWord(hay, 'estudar') || hasWord(hay, 'licao') || hasWord(hay, 'escola') || hasWord(hay, 'dever')) return BOOK;
  if (hasWord(hay, 'treino') || hasWord(hay, 'treinar') || hasWord(hay, 'futebol') || hasWord(hay, 'exercicio') || hasWord(hay, 'esporte')) return SWORD;
  if (hasWord(hay, 'planta') || hasWord(hay, 'regar') || hasWord(hay, 'jardim')) return GRASS;
  if (hasWord(hay, 'hora') || hasWord(hay, 'horario') || hasWord(hay, 'banho')) return CLOCK;
  return MAP;
}

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string, completed: boolean) => void;
  index: number;
  guidedMode?: boolean;
  isFocus?: boolean;
  onSetFocus?: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onComplete, guidedMode = false, isFocus = false, onSetFocus }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { playTaskComplete, playClick } = useSound();

  const handleToggle = async () => {
    // Prevent any action if task is already completed
    if (isTaskCompletedToday(task)) {
      playClick();
      toast('Missão já feita hoje. Volta amanhã.', {
        duration: 3000,
        style: {
          background: '#2f2a27',
          color: '#f6f2ec',
          border: '3px solid #17130f',
          fontFamily: 'Fredoka, Segoe UI, system-ui, sans-serif',
        },
      });
      return;
    }

    // Prevent multiple clicks while completing
    if (isCompleting) {
      return;
    }

    setIsCompleting(true);

    try {
      // Animação de sucesso
      setShowSuccess(true);
      
      // Som de conclusão de tarefa
      playClick();
      playTaskComplete();
      
      // Vibração tátil se disponível
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      // Complete the task immediately
      await onComplete(task.id, true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 800);
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      setShowSuccess(false);
    } finally {
      // Always reset completing state after a delay
      setTimeout(() => {
        setIsCompleting(false);
      }, 1000);
    }
  };

  const { village, economy, settings, modules } = useVillage();
  const { tasks } = useData();
  const { hour: hourBrazil, minute, today } = useClock();
  const periodOpen = periodAllowedAt(task.period, hourBrazil, economy);
  const abreHora = task.period === 'afternoon'
    ? economy.periodStartHours.afternoon
    : task.period === 'evening'
      ? economy.periodStartHours.evening
      : null;

  const done = isTaskCompletedToday(task);
  const byPeriod: Record<Period, number> = { morning: 0, afternoon: 0, evening: 0 };
  if (!done) {
    for (const t of tasks) {
      if (t.status === 'done' && t.lastCompletedDate === today) byPeriod[t.period] += 1;
    }
  }
  const effectsOn = settings.effectsEnabled && modules.effects !== false;
  const loot = done
    ? null
    : computeTaskLoot({
      period: task.period,
      gear: village.gear,
      completionsTodayByPeriod: byPeriod,
      settings: economy,
      effectsEnabled: effectsOn,
    });
  const periodLabel =
    task.period === 'morning' ? 'Manhã' :
    task.period === 'afternoon' ? 'Tarde' : 'Noite';

  let timeOverdue = false;
  if (task.time && !done) {
    const [hours, minutes] = task.time.split(':').map(Number);
    const dueMinutes = hours * 60 + minutes;
    const nowMinutes = hourBrazil * 60 + minute;
    timeOverdue = nowMinutes > dueMinutes && task.status !== 'done';
  }

  return (
    <div
      className={`mc-row rounded p-3 flex flex-wrap items-center gap-3 ${done ? 'is-done' : ''} ${showSuccess ? 'mc-pop' : ''} ${guidedMode && !done ? 'is-focus' : ''}`}
    >
      <div className="mc-slot w-[52px] h-[52px] p-1 shrink-0 flex items-center justify-center">
        <img src={taskIcon(task)} alt="" className="w-9 h-9 mc-pixel" draggable={false} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={`text-[17px] font-bold leading-tight ${done ? 'line-through' : ''}`}>
          {task.title}
        </h3>
        {isFocus && <p className="text-[13px] mc-good mt-0.5">Foco · 2x material</p>}
        {task.description && (
          <p className="text-[13px] mc-muted mt-0.5">{task.description}</p>
        )}
        <div className="flex items-center flex-wrap gap-2 mt-1">
          <span className="text-xs mc-muted">{periodLabel}</span>
          {task.time && (
            <span className={`inline-flex items-center gap-1 text-xs ${done ? 'mc-good' : timeOverdue ? 'mc-bad' : 'mc-muted'}`}>
              <img src={CLOCK} alt="" className="w-3.5 h-3.5 mc-pixel" draggable={false} />
              {task.time}
              {done && <CheckMark className="w-3 h-3 mc-good" />}
              {!done && timeOverdue && <FlashIcon name="warning" className="w-3 h-3" />}
            </span>
          )}
          <span className="mc-font text-[12px] mc-good">+{task.xp ?? TASK_DEFAULT_XP} XP</span>
          {(task.gold ?? TASK_DEFAULT_GOLD) > 0 && (
            <span className="mc-font text-[12px] mc-warn">+{task.gold ?? TASK_DEFAULT_GOLD} GOLD</span>
          )}
          {loot && loot.qty > 0 && (
            <span className="inline-flex items-center gap-1 mc-font text-[12px] text-amber-200" title={loot.qty > (economy.materialsPerTask || 1) ? 'Bônus da picareta' : undefined}>
              <img src={MATERIAL_ICONS[loot.material]} alt="" className="w-3.5 h-3.5 mc-pixel" draggable={false} />
              +{loot.qty} {MATERIAL_LABELS[loot.material]}
              {loot.qty > (economy.materialsPerTask || 1) ? ' · picareta' : ''}
            </span>
          )}
        </div>
      </div>

      {done ? (
        <button type="button" disabled className="mc-btn mc-btn-dark shrink-0 min-h-[44px] px-4 font-bold text-[15px] w-full sm:w-auto">
          Feita
        </button>
      ) : !periodOpen ? (
        <button
          type="button"
          disabled
          className="mc-btn mc-btn-stone shrink-0 min-h-[44px] px-4 font-bold text-[15px] w-full sm:w-auto"
        >
          Abre às {abreHora}h
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-1 shrink-0 w-full sm:w-auto">
          {onSetFocus && (
            <button
              type="button"
              title="Foco: material em dobro"
              className={`mc-btn min-h-[44px] px-3 font-bold ${isFocus ? 'mc-btn-gold' : 'mc-btn-dark'}`}
              onClick={() => { playClick(); onSetFocus(task.id); }}
            >
              Foco
            </button>
          )}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isCompleting}
            className={`mc-btn mc-btn-wood min-h-[44px] font-bold ${guidedMode ? 'px-6 text-[17px]' : 'px-4 text-[15px]'}`}
          >
            {isCompleting ? '...' : 'Concluir'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
