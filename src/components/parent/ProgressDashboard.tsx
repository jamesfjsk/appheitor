import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Award, Calendar, Gift, Clock, CheckCircle } from 'lucide-react';
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
  
  const today = new Date();
  const weekStart = startOfWeek(today, { locale: ptBR });
  const weekEnd = endOfWeek(today, { locale: ptBR });
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);

  // Load weekly completion data
  useEffect(() => {
    const loadWeeklyData = async () => {
      if (!childUid) return;
      
      setLoadingWeekly(true);
      try {
        const completions = await FirestoreService.getTaskCompletionHistory(childUid, weekStart, weekEnd);
        setWeeklyCompletions(completions);
        
        console.log('📊 ProgressDashboard: Weekly completions loaded:', {
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          completions: completions.length,
          totalXP: completions.reduce((sum, c) => sum + c.xpEarned, 0),
          totalGold: completions.reduce((sum, c) => sum + c.goldEarned, 0)
        });
      } catch (error) {
        console.error('❌ Error loading weekly data:', error);
      } finally {
        setLoadingWeekly(false);
      }
    };
    
    loadWeeklyData();
  }, [childUid, weekStart, weekEnd]);

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
  
  console.log('🔥 ProgressDashboard - Resgates:', { 
    total: redemptions.length, 
    pending: pendingRedemptions,
    redemptions: redemptions.map(r => ({ id: r.id, status: r.status, rewardId: r.rewardId }))
  });

  const stats = [
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
      value: `${Math.round(completionRate)}%`,
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
      value: pendingRedemptions,
      icon: Clock,
      color: 'bg-red-500',
      change: 'aguardando'
    },
    {
      title: 'Total de Resgates',
      value: totalRedemptions,
      icon: Gift,
      color: 'bg-purple-500',
      change: 'realizados'
    }
  ];

  const tasksByPeriod = {
    morning: tasks.filter(t => t.period === 'morning' && t.isActive),
    afternoon: tasks.filter(t => t.period === 'afternoon' && t.isActive),
    evening: tasks.filter(t => t.period === 'evening' && t.isActive)
  };

  return (
    <div className="space-y-6">
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
              
              const completed = periodTasks.filter(t => t.completed).length;
              const total = periodTasks.length;
              const percentage = total > 0 ? (completed / total) * 100 : 0;
              
              return (
                <div key={period} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {periodLabels[period as keyof typeof periodLabels]}
                    </span>
                    <span className="text-sm text-gray-500">
                      {completed}/{total}
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

        {/* Conquistas Recentes */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Conquistas Recentes
          </h3>
          
          <div className="space-y-3">
            {(progress.unlockedAchievements || [])
              .filter(a => a.isUnlocked)
              .slice(0, 5)
              .map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{achievement.title}</p>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                  </div>
                </motion.div>
              ))}
            
            {(progress.unlockedAchievements || []).filter(a => a.isUnlocked).length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-gray-500">Nenhuma conquista desbloqueada ainda</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Resumo Semanal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {weeklyTasksCompleted}
              </div>
              <div className="text-sm text-blue-600">Tarefas Completadas</div>
              <div className="text-xs text-gray-500 mt-1">Esta semana</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {weeklyXP}
              </div>
              <div className="text-sm text-green-600">XP Semanal</div>
              <div className="text-xs text-gray-500 mt-1">Ganho esta semana</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {weeklyGold}
              </div>
              <div className="text-sm text-yellow-600">Gold Semanal</div>
              <div className="text-xs text-gray-500 mt-1">Ganho esta semana</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {progress.streak || 0}
              </div>
              <div className="text-sm text-orange-600">Dias Consecutivos</div>
              <div className="text-xs text-gray-500 mt-1">Sequência atual</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-2">
                <span>{getLevelIcon(levelSystem.currentLevel)}</span>
                <span>{levelSystem.currentLevel}</span>
              </div>
              <div className="text-sm text-purple-600">{levelSystem.levelTitle}</div>
              <div className="text-xs text-gray-500 mt-1">Nível atual</div>
            </div>
          </div>
        )}
        
        {/* Weekly Activity Chart */}
        {!loadingWeekly && weeklyCompletions.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">📈 Atividade Semanal Detalhada</h4>
            
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
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProgressDashboard;