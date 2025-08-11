import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, BarChart3, Sun, Sunset, Moon } from 'lucide-react';
import { Task } from '../../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskHistoryProps {
  tasks: Task[];
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ tasks }) => {
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = semana atual, 1 = semana passada, etc.

  const today = new Date();
  const weekStart = startOfWeek(subWeeks(today, selectedWeek), { locale: ptBR });
  const weekEnd = endOfWeek(subWeeks(today, selectedWeek), { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const periodIcons = {
    morning: Sun,
    afternoon: Sunset,
    evening: Moon
  };

  const periodLabels = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    evening: 'Noite'
  };

  // Simular dados históricos (em produção, viriam do backend)
  const getCompletionData = () => {
    return weekDays.map(day => {
      const completedTasks = Math.floor(Math.random() * 8) + 2; // 2-10 tarefas por dia
      const points = completedTasks * 15; // ~15 pontos por tarefa
      
      return {
        date: day,
        completed: completedTasks,
        points,
        periods: {
          morning: Math.floor(Math.random() * 4) + 1,
          afternoon: Math.floor(Math.random() * 4) + 1,
          evening: Math.floor(Math.random() * 3) + 1
        }
      };
    });
  };

  const weekData = getCompletionData();
  const totalWeekPoints = weekData.reduce((sum, day) => sum + day.points, 0);
  const totalWeekTasks = weekData.reduce((sum, day) => sum + day.completed, 0);
  const avgDailyCompletion = totalWeekTasks / 7;

  const weeks = [
    { value: 0, label: 'Esta Semana' },
    { value: 1, label: 'Semana Passada' },
    { value: 2, label: 'Há 2 Semanas' },
    { value: 3, label: 'Há 3 Semanas' }
  ];

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Semana */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Histórico de Tarefas</h2>
          <p className="text-gray-600">
            {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy')}
          </p>
        </div>

        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {weeks.map((week) => (
            <option key={week.value} value={week.value}>
              {week.label}
            </option>
          ))}
        </select>
      </div>

      {/* Resumo da Semana */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Pontos</p>
              <p className="text-2xl font-bold text-gray-900">{totalWeekPoints}</p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tarefas Completadas</p>
              <p className="text-2xl font-bold text-gray-900">{totalWeekTasks}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Média Diária</p>
              <p className="text-2xl font-bold text-gray-900">{avgDailyCompletion.toFixed(1)}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráfico de Barras Diário */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Progresso Diário
        </h3>

        <div className="space-y-4">
          {weekData.map((day, index) => {
            const maxTasks = Math.max(...weekData.map(d => d.completed));
            const barWidth = (day.completed / maxTasks) * 100;
            
            return (
              <motion.div
                key={day.date.toISOString()}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {format(day.date, 'EEEE, dd/MM', { locale: ptBR })}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{day.completed} tarefas</span>
                    <span>•</span>
                    <span>{day.points} pts</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Distribuição por Período */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Distribuição por Período
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(periodLabels).map(([period, label], index) => {
            const Icon = periodIcons[period as keyof typeof periodIcons];
            const totalPeriodTasks = weekData.reduce(
              (sum, day) => sum + day.periods[period as keyof typeof day.periods], 0
            );
            
            return (
              <motion.div
                key={period}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="text-center p-4 bg-gray-50 rounded-lg"
              >
                <Icon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <div className="text-2xl font-bold text-gray-900">
                  {totalPeriodTasks}
                </div>
                <div className="text-sm text-gray-600">{label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {(totalPeriodTasks / 7).toFixed(1)} por dia
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Lista de Tarefas Ativas (Referência) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tarefas Configuradas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(periodLabels).map(([period, label]) => {
            const periodTasks = tasks.filter(task => 
              task.period === period && task.active === true
            );
            const Icon = periodIcons[period as keyof typeof periodIcons];
            
            return (
              <div key={period} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Icon className="w-4 h-4" />
                  {label} ({periodTasks.length})
                </div>
                
                <div className="space-y-1">
                  {periodTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {task.title} ({task.xpReward || 10} XP)
                    </div>
                  ))}
                  {periodTasks.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{periodTasks.length - 3} mais...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default TaskHistory;