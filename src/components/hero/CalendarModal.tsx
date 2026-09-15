import React, { useState } from 'react';
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';
import { CalendarDay, Task } from '../../types';
import type { AgendaItem } from '../../types/village';
import { occurrencesBetween } from '../../services/village/agenda';
import { getTodayBrazil } from '../../utils/clock';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CLOCK = '/assets/english/ui/clock.webp';
const TORCH = '/assets/english/ui/torch.webp';
const MAP = '/assets/english/ui/map.webp';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  agendaItems?: AgendaItem[];
  onMarkAgenda?: (id: string) => void;
}

const KIND_DOT: Record<string, string> = {
  prova: '●',
  trabalho: '●',
  treino: '▲',
  evento: '◆',
  aniversario: '★',
  compromisso: '●',
  outro: '●',
};

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, embedded = false, agendaItems = [], onMarkAgenda }) => {
  const { progress, tasks } = useData();
  const { childUid } = useAuth();
  const { playClick } = useSound();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);

  // Load calendar data when month changes
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!childUid) return;
      
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Get completion history for the month
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const completionHistory = await FirestoreService.getTaskCompletionHistory(childUid, monthStart, monthEnd);
        
        // Generate calendar days with real data
        const daysInMonth = monthEnd.getDate();
        const days: CalendarDay[] = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateString = date.toISOString().split('T')[0];
          
          // Get completions for this day
          const dayCompletions = completionHistory.filter(completion => completion.date === dateString);
          
          const tasksCompleted = dayCompletions.length;
          const pointsEarned = dayCompletions.reduce((sum, completion) => sum + completion.xpEarned, 0);

          // Missões previstas para esse dia da semana, pela frequência das missões ativas
          const dow = date.getDay();
          const totalTasks = tasks.filter((t) => {
            if (!t.active) return false;
            if (t.frequency === 'weekday') return dow >= 1 && dow <= 5;
            if (t.frequency === 'weekend') return dow === 0 || dow === 6;
            return true;
          }).length;

          let status: CalendarDay['status'] = 'future';
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          date.setHours(0, 0, 0, 0);

          const isFullDay = totalTasks > 0 && tasksCompleted >= totalTasks;
          if (date < today) {
            status = isFullDay ? 'completed' : tasksCompleted > 0 ? 'partial' : 'missed';
          } else if (date.getTime() === today.getTime()) {
            status = isFullDay ? 'completed' : tasksCompleted > 0 ? 'partial' : 'future';
          }
          
          days.push({
            date,
            tasksCompleted,
            totalTasks,
            pointsEarned,
            status,
            tasks: dayCompletions.map(completion => ({
              id: completion.taskId,
              title: completion.taskTitle,
              xp: completion.xpEarned
            })) as Task[]
          });
        }
        
        setCalendarDays(days);
      } catch (error) {
        console.error('❌ Error loading calendar data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tasks is read as a snapshot; refetching history on every task update is not intended
  }, [currentDate, childUid]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Preencher dias do calendário incluindo espaços vazios
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - getDay(monthStart));
  
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - getDay(monthEnd)));
  
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayData = (date: Date): CalendarDay | null => {
    return calendarDays.find(day => 
      day.date.toDateString() === date.toDateString()
    ) || null;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (!isOpen) return null;

  const monthTitle = format(currentDate, 'MMMM yyyy', { locale: ptBR });
  const monthTitleCap = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);
  const todayBr = getTodayBrazil();
  const monthFrom = format(monthStart, 'yyyy-MM-dd');
  const monthTo = format(monthEnd, 'yyyy-MM-dd');
  const agendaByDay = new Map<string, AgendaItem[]>();
  for (const item of occurrencesBetween(agendaItems, monthFrom, monthTo)) {
    const list = agendaByDay.get(item.date) || [];
    list.push(item);
    agendaByDay.set(item.date, list);
  }

  const inner = (
        <>
        {!embedded && (
        <div className="border-b-4 border-[#17130f] p-4 flex items-start gap-3">
          <img src={CLOCK} alt="" className="w-10 h-10 mc-pixel shrink-0" draggable={false} />
          <div className="flex-1 min-w-0">
            <h2 className="mc-title text-sm">Calendário</h2>
            <div className="flex items-center gap-2 mt-1">
              <img src={TORCH} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
              <span className="mc-num">{progress.streak}</span>
              <span className="mc-muted text-sm">dias seguidos</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        )}

        <div className="p-4">
          {loading && <p className="mc-lbl mb-3">Carregando...</p>}

          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => { playClick(); navigateMonth('prev'); }}
              className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="mc-num" style={{ fontSize: 14 }}>{monthTitleCap}</h3>
            <button
              type="button"
              onClick={() => { playClick(); navigateMonth('next'); }}
              className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-xs font-semibold mc-muted text-center py-1">
                {day}
              </div>
            ))}
            
            {allDays.map((date, index) => {
              const dayData = getDayData(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = format(date, 'yyyy-MM-dd') === todayBr;
              const selected = selectedDay && dayData && selectedDay.date.toDateString() === dayData.date.toDateString();
              const dayKey = format(date, 'yyyy-MM-dd');
              const dayAgenda = agendaByDay.get(dayKey) || [];

              let slotClass = 'mc-slot';
              const extraStyle: React.CSSProperties = {};
              if (!isCurrentMonth) {
                slotClass += ' opacity-30 cursor-default';
              } else if (dayData) {
                if (dayData.status === 'completed') slotClass += ' mc-slot-good';
                else if (dayData.status === 'partial') extraStyle.borderColor = '#e8b923';
                else if (dayData.status === 'missed') slotClass += ' mc-slot-bad';
                else slotClass += ' mc-muted';
              }
              if (selected) slotClass += ' mc-slot-selected';
              if (isToday) {
                extraStyle.outline = '2px solid #f5f5f5';
                extraStyle.outlineOffset = 2;
              }

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (!isCurrentMonth || !dayData) return;
                    playClick();
                    setSelectedDay(dayData);
                  }}
                  className={`aspect-square flex flex-col items-center justify-center ${slotClass}`}
                  style={extraStyle}
                >
                  <span className="mc-num">{date.getDate()}</span>
                  {dayAgenda[0] && <span className="text-[10px] leading-none">{KIND_DOT[dayAgenda[0].kind] || '●'}</span>}
                  {dayData && dayData.pointsEarned > 0 && (
                    <span className="mc-font text-[8px] mc-warn">+{dayData.pointsEarned}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 mc-slot mc-slot-good" /><span className="mc-lbl">Completo</span></span>
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 mc-slot" style={{ borderColor: '#e8b923' }} /><span className="mc-lbl">Parcial</span></span>
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 mc-slot mc-slot-bad" /><span className="mc-lbl">Perdido</span></span>
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 mc-slot" /><span className="mc-lbl">Futuro</span></span>
          </div>

          {selectedDay && (
            <div className="mc-card p-3 mt-4 mc-pop">
              <div className="flex items-center justify-between mb-3">
                <span className="mc-num">{format(selectedDay.date, 'dd/MM/yyyy', { locale: ptBR })}</span>
                <button type="button" onClick={() => setSelectedDay(null)} className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0" aria-label="Fechar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="mc-slot p-2 text-center">
                  <div className="mc-num">{selectedDay.tasksCompleted}</div>
                  <div className="mc-lbl">Feitas</div>
                </div>
                <div className="mc-slot p-2 text-center">
                  <div className="mc-num">{selectedDay.totalTasks}</div>
                  <div className="mc-lbl">Total</div>
                </div>
                <div className="mc-slot p-2 text-center">
                  <div className="mc-num">{selectedDay.pointsEarned}</div>
                  <div className="mc-lbl">XP</div>
                </div>
              </div>
              {selectedDay.tasks.length > 0 && (
                <div>
                  <p className="font-bold text-[15px] mb-2">Missões feitas</p>
                  <div className="space-y-2">
                    {selectedDay.tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2">
                        <img src={MAP} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                        <span className="text-sm text-white/85 flex-1">{task.title}</span>
                        <span className="mc-font text-[9px] mc-good">+{task.xp} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {agendaByDay.get(format(selectedDay.date, 'yyyy-MM-dd'))?.map((item) => (
                <div key={item.id} className="flex justify-between items-center mt-2">
                  <span className="text-sm">{item.time ? `${item.time} · ` : ''}{item.title}</span>
                  {!item.doneAt && onMarkAgenda && (
                    <button type="button" className="mc-btn mc-btn-green min-h-[36px] px-2" onClick={() => onMarkAgenda(item.id)}>Feito</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
  </>
  );

  if (embedded) return <div className="text-white">{inner}</div>;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mc-panel rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto text-white mc-pop">{inner}</div>
    </div>
  );
};

export default CalendarModal;
