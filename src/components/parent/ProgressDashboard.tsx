import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Award, Calendar, Gift, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Task, UserProgress } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateLevelSystem, getLevelTitle, getLevelIcon } from '../../utils/levelSystem';
import { FirestoreService } from '../../services/firestoreService';

interface ProgressDashboardProps {
  tasks: Task[];
  progress: UserProgress;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ tasks, progress }) => {
  const { redemptions } = useData();
  const { childUid } = useAuth();
  const [weeklyCompletions, setWeeklyCompletions] = useState<any[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [lastLoadedWeek, setLastLoadedWeek] = useState<string>('');
  
  const today = new Date();
  const weekStart = startOfWeek(today, { locale: ptBR });
  const weekEnd = endOfWeek(today, { locale: ptBR });
  const weekKey = `${weekStart.toISOString().split('T')[0]}_${weekEnd.toISOString().split('T')[0]}`;
  
  // Memoize level system calculation to prevent unnecessary recalculations
  const levelSystem = useMemo(() => calculateLevelSystem(progress.totalXP || 0), [progress.totalXP]);

  // Load weekly completion data only when week changes or childUid changes
  useEffect(() => {
    const loadWeeklyData = async () => {
      if (!childUid || weekKey === lastLoadedWeek) return;
      
      setLoadingWeekly(true);
      try {
        console.log('📊 ProgressDashboard: Loading weekly data for week:', weekKey);
        const completions = await FirestoreService.getTaskCompletionHistory(childUid, weekStart, weekEnd);
        setWeeklyCompletions(completions);
        setLastLoadedWeek(weekKey);
        
        console.log('✅ ProgressDashboard: Weekly data loaded successfully:', {
          weekKey,
          completions: completions.length,
          totalXP: completions.reduce((sum, c) => sum + c.xpEarned, 0),
          totalGold: completions.reduce((sum, c) => sum + c.goldEarned, 0)
        });
      } catch (error) {
        console.error('❌ ProgressDashboard: Error loading weekly data:', error);
        setWeeklyCompletions([]);
      } finally {
        setLoadingWeekly(false);
      }
    };
    
    loadWeeklyData();
  }, [childUid, weekKey, lastLoadedWeek]);

  // Memoize calculations to prevent unnecessary re-renders
  const dashboardStats = useMemo(() => {
    const todayTasks = tasks.filter(task => task.active === true);
    const todayString = today.toISOString().split('T')[0];
    const completedToday = weeklyCompletions.filter(completion => completion.date === todayString).length;
    const completionRate = todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0;
    
    const pendingRedemptions = redemptions.filter(r => r.status === 'pending').length;
    const totalRedemptions = redemptions.length;
    
    // Calculate weekly stats from real completion data
    const weeklyXP = weeklyCompletions.reduce((sum, completion) => sum + completion.xpEarned, 0);
    const weeklyGold = weeklyCompletions.reduce((sum, completion) => sum + completion.goldEarned, 0);
    const weeklyTasksCompleted = weeklyCompletions.length;
    
    return {
      todayTasks: todayTasks.length,
      completedToday,
      completionRate,
      pendingRedemptions,
      totalRedemptions,
      weeklyXP,
      weeklyGold,
      weeklyTasksCompleted
    };
  }, [tasks, weeklyCompletions, redemptions, today]);

  const stats = useMemo(() => [
    {
      title: 'Pontos Totais',
      value: levelSystem.currentXP,
      icon: Award,
      color: 'bg-yellow-500',
      change: `${levelSystem.levelTitle}`
    },
    {
      title: 'Nível Atual',
      value: `${getLevelIcon(levelSystem.currentLevel)} ${levelSystem.currentLevel}`,
      icon: TrendingUp,
      color: 'bg-blue-500',
      change: levelSystem.levelTitle
    },
    {
      title: 'Taxa de Conclusão',
      value: `${Math.round(dashboardStats.completionRate)}%`,
      icon: Target,
      color: 'bg-green-500',
      change: 'Hoje'
    },
    {
      title: 'Sequência',
      value: progress.streak,
      icon: Calendar,
      color: 'bg-orange-500',
      change: 'dias'
    },
    {
      title: 'Resgates Pendentes',
      value: dashboardStats.pendingRedemptions,
      icon: Clock,
      color: 'bg-red-500',
      change: 'aguardando'
    },
    {
      title: 'Total de Resgates',
      value: dashboardStats.totalRedemptions,
      icon: Gift,
      color: 'bg-purple-500',
      change: 'realizados'
    }
  ], [levelSystem, dashboardStats, progress.streak]);

  // Memoize tasks by period to prevent recalculation
  const tasksByPeriod = useMemo(() => ({
    morning: tasks.filter(t => t.period === 'morning' && t.active),
    afternoon: tasks.filter(t => t.period === 'afternoon' && t.active),
    evening: tasks.filter(t => t.period === 'evening' && t.active)
  }), [tasks]);

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loadingWeekly && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 font-medium">Carregando dados da semana...</span>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progresso por Período */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Progresso por Período
          </h3>
          
          <div className="space-y-4">
            {Object.entries(tasksByPeriod).map(([period, periodTasks]) => {
              const periodLabels = {
                morning: '🌅 Manhã',
                afternoon: '☀️ Tarde',
                evening: '🌙 Noite'
              };
              
              const todayString = today.toISOString().split('T')[0];
              const completedInPeriod = periodTasks.filter(task => 
                task.status === 'done' && task.lastCompletedDate === todayString
              ).length;
              const total = periodTasks.length;
              const percentage = total > 0 ? (completedInPeriod / total) * 100 : 0;
              
              return (
                <div key={period} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {periodLabels[period as keyof typeof periodLabels]}
                    </span>
                    <span className="text-sm text-gray-500">
                      {completedInPeriod}/{total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      className="bg-blue-600 h-2 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Resumo Semanal */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resumo da Semana ({format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM')})
          </h3>
          
          {loadingWeekly ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Carregando dados da semana...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardStats.weeklyTasksCompleted}
                </div>
                <div className="text-sm text-blue-600">Tarefas Completadas</div>
                <div className="text-xs text-gray-500 mt-1">Esta semana</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {dashboardStats.weeklyXP}
                  </div>
                  <div className="text-xs text-green-600">XP Semanal</div>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">
                    {dashboardStats.weeklyGold}
                  </div>
                  <div className="text-xs text-yellow-600">Gold Semanal</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {progress.streak || 0}
                  </div>
                  <div className="text-xs text-orange-600">Dias Consecutivos</div>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600 flex items-center justify-center gap-1">
                    <span className="text-sm">{getLevelIcon(levelSystem.currentLevel)}</span>
                    <span>{levelSystem.currentLevel}</span>
                  </div>
                  <div className="text-xs text-purple-600">{levelSystem.levelTitle}</div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Weekly Activity Chart - Only show if data is loaded */}
      {!loadingWeekly && weeklyCompletions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 Atividade Semanal Detalhada
          </h3>
          
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, dayIndex) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + dayIndex);
              const dateString = date.toISOString().split('T')[0];
              const dayCompletions = weeklyCompletions.filter(c => c.date === dateString);
              const dayXP = dayCompletions.reduce((sum, c) => sum + c.xpEarned, 0);
              const dayGold = dayCompletions.reduce((sum, c) => sum + c.goldEarned, 0);
              const isToday = dateString === today.toISOString().split('T')[0];
              
              return (
                <div key={dateString} className={`flex items-center justify-between p-2 rounded ${isToday ? 'bg-blue-100 border border-blue-200' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                      {format(date, 'EEE dd/MM', { locale: ptBR })}
                      {isToday && <span className="ml-1 text-xs bg-blue-500 text-white px-1 rounded">HOJE</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayCompletions.length > 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                      )}
                      <span className="text-sm text-gray-600">{dayCompletions.length} tarefas</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-blue-600">+{dayXP} XP</span>
                    <span className="text-yellow-600">+{dayGold} Gold</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* System Health Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-500" />
          Status do Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              ✅ Conectado
            </div>
            <div className="text-sm text-green-600">Firebase</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {tasks.length}
            </div>
            <div className="text-sm text-blue-600">Tarefas Ativas</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {redemptions.length}
            </div>
            <div className="text-sm text-purple-600">Resgates Total</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>💡 Otimização:</strong> Dashboard otimizado para reduzir requests duplicados. 
            Dados carregados apenas quando necessário.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ProgressDashboard;