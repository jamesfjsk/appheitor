import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, X, Star, Target } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { CalendarDay, Task } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose }) => {
  const { getCalendarMonth, progress } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = getCalendarMonth(currentDate.getFullYear(), currentDate.getMonth());
  
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

  const getDayColor = (dayData: CalendarDay | null, date: Date) => {
    if (!dayData || date.getMonth() !== currentDate.getMonth()) {
      return 'bg-gray-100 text-gray-400';
    }
    
    switch (dayData.status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'partial':
        return 'bg-yellow-500 text-white';
      case 'missed':
        return 'bg-red-500 text-white';
      case 'future':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-hero-primary to-hero-secondary text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-hero-accent rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-hero-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Calendário de Missões</h2>
              <p className="text-hero-accent">
                Sequência atual: {progress.streak} dias
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </motion.button>
            
            <h3 className="text-2xl font-bold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </motion.button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {/* Week headers */}
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {allDays.map((date, index) => {
              const dayData = getDayData(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <motion.button
                  key={index}
                  whileHover={isCurrentMonth ? { scale: 1.05 } : {}}
                  whileTap={isCurrentMonth ? { scale: 0.95 } : {}}
                  onClick={() => isCurrentMonth && dayData && setSelectedDay(dayData)}
                  className={`
                    aspect-square rounded-lg font-semibold transition-all duration-200 relative border-2
                    ${getDayColor(dayData, date)}
                    ${isCurrentMonth ? 'cursor-pointer' : 'cursor-default'}
                    ${isToday ? 'border-yellow-400 ring-2 ring-yellow-400 ring-opacity-50' : 'border-transparent'}
                  `}
                >                  <div className="flex items-center justify-between mb-3">
                  <span>{date.getDate()}</span>
                  
                  {/* Points indicator */}
                  {dayData && dayData.pointsEarned > 0 && (
                    <div className="absolute -top-1 -right-1 bg-hero-accent text-hero-primary text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {dayData.pointsEarned}
                    </div>
                  )}
                  
                  {/* Status indicators */}
                  {dayData && dayData.status === 'completed' && (
                    <Star className="absolute bottom-0 right-0 w-3 h-3 text-hero-accent" fill="currentColor" />
                  )}
                  
                  {/* Today indicator */}
                  {isToday && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-0 left-0 w-2 h-2 bg-yellow-400 rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Completo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Parcial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Perdido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-sm text-gray-600">Futuro</span>
            </div>
          </div>

          {/* Selected Day Details */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gray-50 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-gray-900">
                    {format(selectedDay.date, 'dd/MM/yyyy', { locale: ptBR })}
                  </h4>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-hero-primary">
                      {selectedDay.tasksCompleted}
                    </div>
                    <div className="text-sm text-gray-600">Completas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {selectedDay.totalTasks}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-hero-accent">
                      {selectedDay.pointsEarned}
                    </div>
                    <div className="text-sm text-gray-600">Pontos</div>
                  </div>
                </div>
                
                {selectedDay.tasks.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">
                      Missões Completadas:
                    </h5>
                    <div className="space-y-2">
                      {selectedDay.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-green-500" />
                          <span className="text-gray-700">{task.title}</span>
                          <span className="text-hero-accent font-semibold">
                            +{task.points}pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CalendarModal;