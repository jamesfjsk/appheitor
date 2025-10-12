import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [taskCompletions, setTaskCompletions] = useState<Array<{
    taskId: string;
    taskTitle: string;
    date: string;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }>>([]);
  const [dailyProgressData, setDailyProgressData] = useState<Array<{
    date: string;
    tasksCompleted: number;
    totalTasksAvailable: number;
    goldPenalty: number;
    allTasksBonusGold: number;
    xpEarned: number;
    goldEarned: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [lastLoadedWeek, setLastLoadedWeek] = useState<string>('');

  // Memoize week calculation to prevent unnecessary re-renders
  const weekData = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(subWeeks(today, selectedWeek), { locale: ptBR });
    const weekEnd = endOfWeek(subWeeks(today, selectedWeek), { locale: ptBR });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekKey = `${selectedWeek}_${weekStart.toISOString().split('T')[0]}`;
    
    return { weekStart, weekEnd, weekDays, weekKey };
  }, [selectedWeek]);

  // Load completion history only when week changes
  const loadCompletionHistory = useCallback(async () => {
    if (!childUid || weekData.weekKey === lastLoadedWeek) return;

    setLoading(true);
    try {
      console.log('📈 TaskHistory: Loading completion history for week:', weekData.weekKey);

      // Load task completions
      const history = await FirestoreService.getTaskCompletionHistory(childUid, weekData.weekStart, weekData.weekEnd);
      setTaskCompletions(history);

      // Load daily progress data (penalties/bonuses)
      const dailyData: Array<{
        date: string;
        tasksCompleted: number;
        totalTasksAvailable: number;
        goldPenalty: number;
        allTasksBonusGold: number;
        xpEarned: number;
        goldEarned: number;
      }> = [];

      for (let d = new Date(weekData.weekStart); d <= weekData.weekEnd; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        const dailyProgress = await FirestoreService.getDailyProgress(childUid, dateString);

        if (dailyProgress && dailyProgress.summaryProcessed) {
          dailyData.push({
            date: dateString,
            tasksCompleted: dailyProgress.tasksCompleted || 0,
            totalTasksAvailable: dailyProgress.totalTasksAvailable || 0,
            goldPenalty: dailyProgress.goldPenalty || 0,
            allTasksBonusGold: dailyProgress.allTasksBonusGold || 0,
            xpEarned: dailyProgress.xpEarned || 0,
            goldEarned: dailyProgress.goldEarned || 0
          });
        }
      }

      setDailyProgressData(dailyData);
      setLastLoadedWeek(weekData.weekKey);

      console.log('✅ TaskHistory: History loaded successfully:', {
        weekKey: weekData.weekKey,
        weekStart: weekData.weekStart.toISOString(),
        weekEnd: weekData.weekEnd.toISOString(),
        completions: history.length,
        dailyProgressDays: dailyData.length,
        taskCompletions: history,
        dailyProgress: dailyData
      });

      if (history.length === 0) {
        console.warn('⚠️ TaskHistory: No task completions found. This could mean:');
        console.warn('  1. No tasks were completed in this week');
        console.warn('  2. Firestore index is still building');
        console.warn('  3. Tasks were completed but not recorded in taskCompletions collection');
      }

      if (dailyData.length === 0) {
        console.warn('⚠️ TaskHistory: No daily progress found. This could mean:');
        console.warn('  1. Daily processing has not run yet');
        console.warn('  2. Use "Reprocessar Ontem" button in Dashboard to populate data');
      }
    } catch (error) {
      console.error('❌ TaskHistory: Error loading completion history:', error);
      setTaskCompletions([]);
      setDailyProgressData([]);
    } finally {
      setLoading(false);
    }
  }, [childUid, weekData.weekKey, weekData.weekStart, weekData.weekEnd, lastLoadedWeek]);

  useEffect(() => {
    loadCompletionHistory();
  }, [loadCompletionHistory]);

  // Memoize week redemptions to prevent recalculation
  const weekRedemptions = useMemo(() => {
    return redemptions.filter(redemption => {
      const redemptionDate = redemption.createdAt;
      return redemptionDate >= weekData.weekStart && redemptionDate <= weekData.weekEnd;
    });
  }, [redemptions, weekData.weekStart, weekData.weekEnd]);

  // Memoize week completion data
  const weekCompletionData = useMemo(() => {
    return weekData.weekDays.map(day => {
      const dayString = day.toISOString().split('T')[0];
      const dayCompletions = taskCompletions.filter(completion => completion.date === dayString);
      const dayProgress = dailyProgressData.find(dp => dp.date === dayString);

      // If no taskCompletions but we have tasks data, try to infer from tasks
      let completedTasks = dayCompletions.length;
      let xpEarned = dayCompletions.reduce((sum, completion) => sum + completion.xpEarned, 0);
      let goldEarned = dayCompletions.reduce((sum, completion) => sum + completion.goldEarned, 0);

      // Fallback: check tasks with lastCompletedDate matching this day
      if (completedTasks === 0 && tasks.length > 0) {
        const dayTasks = tasks.filter(task => task.lastCompletedDate === dayString && task.status === 'done');
        if (dayTasks.length > 0) {
          completedTasks = dayTasks.length;
          xpEarned = dayTasks.reduce((sum, task) => sum + (task.xp || 0), 0);
          goldEarned = dayTasks.reduce((sum, task) => sum + (task.gold || 0), 0);
        }
      }

      // Add penalties and bonuses
      const goldPenalty = dayProgress?.goldPenalty || 0;
      const allTasksBonusGold = dayProgress?.allTasksBonusGold || 0;
      const totalGoldForDay = goldEarned + allTasksBonusGold - goldPenalty;
      const totalTasksAvailable = dayProgress?.totalTasksAvailable || 0;

      return {
        date: day,
        completed: completedTasks,
        xpEarned,
        goldEarned,
        goldPenalty,
        allTasksBonusGold,
        totalGoldForDay,
        totalTasksAvailable,
        completions: dayCompletions,
        hasProgress: !!dayProgress
      };
    });
  }, [weekData.weekDays, taskCompletions, dailyProgressData, tasks]);

  // Memoize totals
  const weekTotals = useMemo(() => {
    const totalWeekXP = weekCompletionData.reduce((sum, day) => sum + day.xpEarned, 0);
    const totalWeekGold = weekCompletionData.reduce((sum, day) => sum + day.goldEarned, 0);
    const totalWeekGoldNet = weekCompletionData.reduce((sum, day) => sum + day.totalGoldForDay, 0);
    const totalWeekTasks = weekCompletionData.reduce((sum, day) => sum + day.completed, 0);
    const totalPenalties = weekCompletionData.reduce((sum, day) => sum + day.goldPenalty, 0);
    const totalBonuses = weekCompletionData.reduce((sum, day) => sum + day.allTasksBonusGold, 0);
    const avgDailyCompletion = totalWeekTasks / 7;

    return {
      totalWeekXP,
      totalWeekGold,
      totalWeekGoldNet,
      totalWeekTasks,
      totalPenalties,
      totalBonuses,
      avgDailyCompletion
    };
  }, [weekCompletionData]);

  const weeks = [
    { value: 0, label: 'Esta Semana' },
    { value: 1, label: 'Semana Passada' },
    { value: 2, label: 'Há 2 Semanas' },
    { value: 3, label: 'Há 3 Semanas' }
  ];

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

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Semana */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Histórico de Tarefas</h2>
          <p className="text-gray-600">
            {format(weekData.weekStart, 'dd/MM')} - {format(weekData.weekEnd, 'dd/MM/yyyy')}
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

      {/* Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 font-medium">Carregando histórico da semana...</span>
          </div>
        </motion.div>
      )}

      {/* Debug Info */}
      {!loading && taskCompletions.length === 0 && dailyProgressData.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-orange-50 border border-orange-200 rounded-lg p-6"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-semibold text-lg">⚠️ Nenhum histórico disponível</span>
            </div>

            <div className="bg-white rounded p-4 border border-orange-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Status do Sistema:</p>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={tasks.length > 0 ? 'text-green-600' : 'text-red-600'}>
                    {tasks.length > 0 ? '✅' : '❌'}
                  </span>
                  <span>Tarefas cadastradas: <strong>{tasks.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={tasks.filter(t => t.status === 'done').length > 0 ? 'text-green-600' : 'text-red-600'}>
                    {tasks.filter(t => t.status === 'done').length > 0 ? '✅' : '❌'}
                  </span>
                  <span>Tarefas completadas hoje: <strong>{tasks.filter(t => t.status === 'done' && t.lastCompletedDate === new Date().toISOString().split('T')[0]).length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={taskCompletions.length > 0 ? 'text-green-600' : 'text-orange-600'}>
                    {taskCompletions.length > 0 ? '✅' : '⚠️'}
                  </span>
                  <span>Registros de conclusão (taskCompletions): <strong>{taskCompletions.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={dailyProgressData.length > 0 ? 'text-green-600' : 'text-orange-600'}>
                    {dailyProgressData.length > 0 ? '✅' : '⚠️'}
                  </span>
                  <span>Processamento diário (dailyProgress): <strong>{dailyProgressData.length} dias</strong></span>
                </div>
              </div>
            </div>

            <div className="text-sm text-orange-800 space-y-2">
              <p className="font-semibold">🔧 O que fazer:</p>
              <ol className="list-decimal list-inside pl-2 space-y-1">
                <li className="ml-2">Vá ao <strong>Dashboard</strong> e clique em <strong>"Reprocessar Ontem"</strong> para popular dados históricos</li>
                <li className="ml-2">Complete algumas tarefas no <strong>Painel do Heitor</strong></li>
                <li className="ml-2">Aguarde o processamento automático no próximo dia</li>
                <li className="ml-2">Se o problema persistir, verifique o console do navegador (F12) para erros</li>
              </ol>
            </div>

            <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
              <strong>Nota técnica:</strong> Os dados de histórico dependem da coleção <code>taskCompletions</code> (índice do Firestore) e <code>dailyProgress</code> (processamento diário). Se você acabou de configurar o sistema, é normal não ter dados ainda.
            </div>
          </div>
        </motion.div>
      )}

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
              <p className="text-2xl font-bold text-gray-900">{weekTotals.totalWeekXP}</p>
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
              <p className="text-2xl font-bold text-gray-900">{weekTotals.totalWeekTasks}</p>
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
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total de Gold</p>
              <p className={`text-2xl font-bold ${weekTotals.totalWeekGoldNet < weekTotals.totalWeekGold ? 'text-orange-600' : 'text-gray-900'}`}>
                {weekTotals.totalWeekGoldNet}
              </p>
              {weekTotals.totalWeekGoldNet !== weekTotals.totalWeekGold && (
                <p className="text-xs text-gray-500 mt-1">
                  Ganho: {weekTotals.totalWeekGold}
                  {weekTotals.totalPenalties > 0 && ` • Penalidades: -${weekTotals.totalPenalties}`}
                  {weekTotals.totalBonuses > 0 && ` • Bônus: +${weekTotals.totalBonuses}`}
                </p>
              )}
            </div>
            <div className="bg-yellow-600 p-3 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráfico de Barras Diário */}
      {!loading && (
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
            {weekCompletionData.map((day, index) => {
              const maxTasks = Math.max(...weekCompletionData.map(d => d.completed));
              const barWidth = maxTasks > 0 ? (day.completed / maxTasks) * 100 : 0;
              const isToday = day.date.toDateString() === new Date().toDateString();
              
              return (
                <motion.div
                  key={day.date.toISOString()}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                      {format(day.date, 'EEEE, dd/MM', { locale: ptBR })}
                      {isToday && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">HOJE</span>}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{day.completed}{day.totalTasksAvailable > 0 && `/${day.totalTasksAvailable}`} tarefas</span>
                      <span>•</span>
                      <span>{day.xpEarned} XP</span>
                      <span>•</span>
                      <span className={day.totalGoldForDay < day.goldEarned ? 'text-red-600' : day.totalGoldForDay > day.goldEarned ? 'text-green-600' : ''}>
                        {day.totalGoldForDay} Gold
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                      className={`h-3 rounded-full ${
                        day.completed === 0 ? 'bg-gray-300' :
                        day.completed >= 3 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      }`}
                    />
                  </div>
                  
                  {/* Show completed tasks for this day */}
                  {day.completions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {day.completions.map((completion) => (
                        <div key={`${completion.taskId}-${completion.date}`} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="text-gray-700">{completion.taskTitle}</span>
                            <span className="text-gray-500">
                              {completion.completedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">+{completion.xpEarned}</span>
                            <span className="text-yellow-600">+{completion.goldEarned}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show penalties and bonuses */}
                  {day.hasProgress && (day.goldPenalty > 0 || day.allTasksBonusGold > 0) && (
                    <div className="mt-2 space-y-1">
                      {day.goldPenalty > 0 && (
                        <div className="flex items-center justify-between text-xs bg-red-50 p-2 rounded border border-red-200">
                          <div className="flex items-center gap-2">
                            <span className="text-red-600">⚠️</span>
                            <span className="text-red-700">Penalidade por tarefas incompletas</span>
                          </div>
                          <span className="text-red-600 font-semibold">-{day.goldPenalty} Gold</span>
                        </div>
                      )}
                      {day.allTasksBonusGold > 0 && (
                        <div className="flex items-center justify-between text-xs bg-green-50 p-2 rounded border border-green-200">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">🎁</span>
                            <span className="text-green-700">Bônus por completar todas as tarefas</span>
                          </div>
                          <span className="text-green-600 font-semibold">+{day.allTasksBonusGold} Gold</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Histórico Detalhado da Semana */}
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
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
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{weekTotals.avgDailyCompletion.toFixed(1)}</div>
            <div className="text-sm text-blue-600">Média Diária</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{weekTotals.totalWeekTasks}</div>
            <div className="text-sm text-green-600">Total Completadas</div>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{weekTotals.totalWeekXP}</div>
            <div className="text-sm text-yellow-600">XP Ganho</div>
          </div>

          {weekTotals.totalPenalties > 0 && (
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">-{weekTotals.totalPenalties}</div>
              <div className="text-sm text-red-600">Penalidades</div>
            </div>
          )}

          {weekTotals.totalBonuses > 0 && (
            <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-600">+{weekTotals.totalBonuses}</div>
              <div className="text-sm text-emerald-600">Bônus</div>
            </div>
          )}

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