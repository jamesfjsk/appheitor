import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, BarChart3, Sun, Sunset, Moon, CheckCircle, Star, Gift } from 'lucide-react';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestoreService';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskHistoryProps {
  tasks: Task[];
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ tasks }) => {
  const { redemptions, rewards } = useData();
  const { childUid } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = semana atual, 1 = semana passada, etc.
  const [taskCompletions, setTaskCompletions] = useState<Array<{
    taskId: string;
    taskTitle: string;
    date: string;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // Load real completion history
  useEffect(() => {
    const loadCompletionHistory = async () => {
      if (!childUid) return;
      
      setLoading(true);
      try {
        const weekStart = startOfWeek(subWeeks(new Date(), selectedWeek), { locale: ptBR });
        const weekEnd = endOfWeek(subWeeks(new Date(), selectedWeek), { locale: ptBR });
        
        const history = await FirestoreService.getTaskCompletionHistory(childUid, weekStart, weekEnd);
        setTaskCompletions(history);
      } catch (error) {
        console.error('❌ Error loading completion history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompletionHistory();
  }, [childUid, selectedWeek]);

  const today = new Date();
  const weekStart = startOfWeek(subWeeks(today, selectedWeek), { locale: ptBR });
  const weekEnd = endOfWeek(subWeeks(today, selectedWeek), { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Filter redemptions for selected week
  const weekRedemptions = redemptions.filter(redemption => {
    const redemptionDate = redemption.createdAt;
    return redemptionDate >= weekStart && redemptionDate <= weekEnd;
  });

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

  // Get real completion data for the week
  const getWeekCompletionData = () => {
    return weekDays.map(day => {
      const dayString = day.toISOString().split('T')[0];
      const dayCompletions = taskCompletions.filter(completion => completion.date === dayString);
      
      const completedTasks = dayCompletions.length;
      const xpEarned = dayCompletions.reduce((sum, completion) => sum + completion.xpEarned, 0);
      const goldEarned = dayCompletions.reduce((sum, completion) => sum + completion.goldEarned, 0);
      
      return {
        date: day,
        completed: completedTasks,
        xpEarned,
        goldEarned,
        completions: dayCompletions
      };
    });
  };

  const weekData = getWeekCompletionData();
  const totalWeekXP = weekData.reduce((sum, day) => sum + day.xpEarned, 0);
  const totalWeekGold = weekData.reduce((sum, day) => sum + day.goldEarned, 0);
  const totalWeekTasks = weekData.reduce((sum, day) => sum + day.completed, 0);
  const avgDailyCompletion = totalWeekTasks / 7;

  const weeks = [
    { value: 0, label: 'Esta Semana' },
    { value: 1, label: 'Semana Passada' },
    { value: 2, label: 'Há 2 Semanas' },
    { value: 3, label: 'Há 3 Semanas' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando histórico...</p>
        </div>
      </div>
    );
  }

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
              <p className="text-sm font-medium text-gray-600">Total de XP</p>
              <p className="text-2xl font-bold text-gray-900">{totalWeekXP}</p>
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
              <p className="text-sm font-medium text-gray-600">Total de Gold</p>
              <p className="text-2xl font-bold text-gray-900">{totalWeekGold}</p>
            </div>
            <div className="bg-yellow-600 p-3 rounded-lg">
              <Star className="w-6 h-6 text-white" />
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
            const barWidth = maxTasks > 0 ? (day.completed / maxTasks) * 100 : 0;
            
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
                    <span>{day.xpEarned} XP</span>
                    <span>•</span>
                    <span>{day.goldEarned} Gold</span>
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
          Histórico Detalhado da Semana
        </h3>

        <div className="space-y-6">
          {/* Task Completions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Tarefas Completadas ({taskCompletions.length})
            </h4>
            
            {taskCompletions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {taskCompletions.map((completion, index) => (
                  <motion.div
                    key={`${completion.taskId}-${completion.date}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div>
                        <h5 className="font-medium text-gray-900">{completion.taskTitle}</h5>
                        <p className="text-xs text-gray-600">
                          {format(completion.completedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-blue-600 font-semibold">+{completion.xpEarned} XP</div>
                      <div className="text-yellow-600 font-semibold">+{completion.goldEarned} Gold</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Nenhuma tarefa completada nesta semana</p>
              </div>
            )}
          </div>

          {/* Redemptions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Recompensas Resgatadas ({weekRedemptions.length})
            </h4>
            
            {weekRedemptions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {weekRedemptions.map((redemption, index) => {
                  const reward = rewards.find(r => r.id === redemption.rewardId);
                  if (!reward) return null;
                  
                  const statusConfig = {
                    pending: { color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-600', label: '⏳ Pendente' },
                    approved: { color: 'bg-green-50 border-green-200', textColor: 'text-green-600', label: '✅ Aprovado' },
                    rejected: { color: 'bg-red-50 border-red-200', textColor: 'text-red-600', label: '❌ Rejeitado' }
                  };
                  
                  const config = statusConfig[redemption.status] || statusConfig.pending;
                  
                  return (
                    <motion.div
                      key={redemption.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-3 rounded-lg border ${config.color}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{reward.emoji}</div>
                        <div>
                          <h5 className="font-medium text-gray-900">{reward.title}</h5>
                          <p className="text-xs text-gray-600">
                            {format(redemption.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${config.textColor}`}>
                          {config.label}
                        </div>
                        <div className="text-xs text-gray-600">
                          -{redemption.costGold} Gold
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Gift className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Nenhuma recompensa resgatada nesta semana</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Resumo de Estatísticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Estatísticas da Semana
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{avgDailyCompletion.toFixed(1)}</div>
            <div className="text-sm text-blue-600">Média Diária</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalWeekTasks}</div>
            <div className="text-sm text-green-600">Total Completadas</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{totalWeekXP}</div>
            <div className="text-sm text-yellow-600">XP Ganho</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{weekRedemptions.length}</div>
            <div className="text-sm text-purple-600">Resgates</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TaskHistory;