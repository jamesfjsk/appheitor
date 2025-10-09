import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Star, TrendingDown, TrendingUp, Calendar, Info, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { FirestoreService } from '../../services/firestoreService';
import { Task } from '../../types';

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
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return task.status === 'done' && task.lastCompletedDate === today;
};

interface DailySummaryCardProps {}

const DailySummaryCard: React.FC<DailySummaryCardProps> = () => {
  const { childUid } = useAuth();
  const { tasks } = useData();
  const [yesterdayData, setYesterdayData] = useState<any>(null);
  const [todayTasksCount, setTodayTasksCount] = useState({ completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [processingDays, setProcessingDays] = useState(false);

  useEffect(() => {
    const loadDailySummaryData = async () => {
      if (!childUid) return;
      
      setLoading(true);
      try {
        // Force process unprocessed days when component loads
        setProcessingDays(true);
        console.log('🔄 DailySummaryCard: Forcing daily processing...');
        await FirestoreService.processUnprocessedDays(childUid);
        setProcessingDays(false);
        
        // Get yesterday's data
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];
        
        const yesterdayProgress = await FirestoreService.getDailyProgress(childUid, yesterdayString);
        setYesterdayData(yesterdayProgress);
        
        console.log('📊 DailySummaryCard: Yesterday data loaded:', yesterdayProgress);
        
      } catch (error) {
        console.error('❌ Error loading daily summary data:', error);
        setProcessingDays(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadDailySummaryData();
  }, [childUid]);

  // Calculate today's task counts from actual tasks data
  useEffect(() => {
    // Filter tasks that should be available today
    const todayTasks = tasks.filter(task => 
      task.active === true && isTaskAvailableToday(task)
    );

    // Count completed tasks today
    const completedToday = todayTasks.filter(task => isTaskCompletedToday(task)).length;

    const newTasksCount = {
      completed: completedToday,
      total: todayTasks.length
    };

    console.log('📊 DailySummaryCard: Task count updated:', {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.active === true).length,
      todayTasks: todayTasks.length,
      completedToday,
      taskBreakdown: {
        morning: todayTasks.filter(t => t.period === 'morning').length,
        afternoon: todayTasks.filter(t => t.period === 'afternoon').length,
        evening: todayTasks.filter(t => t.period === 'evening').length
      }
    });

    setTodayTasksCount(newTasksCount);
  }, [tasks]); // This will update whenever tasks change

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
      >
        <div className="text-center py-4">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">
            {processingDays ? 'Processando penalidades diárias...' : 'Carregando resumo diário...'}
          </p>
        </div>
      </motion.div>
    );
  }

  const hasYesterdayData = yesterdayData && yesterdayData.summaryProcessed;
  const hadPenalty = hasYesterdayData && yesterdayData.goldPenalty > 0;
  const hadBonus = hasYesterdayData && yesterdayData.allTasksBonusGold > 0;
  const todayProgress = todayTasksCount.total > 0 ? (todayTasksCount.completed / todayTasksCount.total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden"
    >
      {/* Background effect */}
      <motion.div
        animate={{
          x: ['-100%', '100%'],
          opacity: [0, 0.1, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent skew-x-12"
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Sistema de Recompensas Diárias
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title={showDetails ? "Ocultar detalhes" : "Ver detalhes"}
          >
            {showDetails ? <X className="w-4 h-4 text-gray-500" /> : <Info className="w-4 h-4 text-blue-500" />}
          </button>
        </div>

        {/* Rules Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            ⚖️ Como Funciona:
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span><strong>Penalidade:</strong> Você perde <span className="text-red-600 font-bold">-1 Gold</span> para cada tarefa não concluida no dia </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span><strong>Bônus:</strong> <span className="text-green-600 font-bold">+10 Gold</span> se completar TODAS as tarefas do dia</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span><strong>Quando:</strong> A Gideon verifica automáticamente no final de cada dia</span>
            </div>
          </div>
        </div>

        {/* Yesterday's Result */}
        {hasYesterdayData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 mb-4 border-2 ${
              hadBonus 
                ? 'bg-green-50 border-green-300' 
                : hadPenalty 
                ? 'bg-red-50 border-red-300' 
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            <h4 className={`font-bold mb-2 flex items-center gap-2 ${
              hadBonus ? 'text-green-800' : hadPenalty ? 'text-red-800' : 'text-gray-800'
            }`}>
              {hadBonus ? (
                <>
                  <Star className="w-5 h-5 text-green-600" />
                  🎉 Resultado de Ontem: PERFEITO!
                </>
              ) : hadPenalty ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  📉 Resultado de Ontem: Penalidade
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 text-gray-600" />
                  📊 Resultado de Ontem
                </>
              )}
            </h4>
            
            <div className="text-sm space-y-1">
              {hadBonus && (
                <p className="text-green-700 font-medium">
                  ✅ Você completou TODAS as tarefas e ganhou <strong>+{yesterdayData.allTasksBonusGold} Gold bônus</strong>!
                </p>
              )}
              
              {hadPenalty && (
                <div className="space-y-1">
                  <p className="text-red-700 font-medium">
                    ❌ Você perdeu <strong>{yesterdayData.goldPenalty} Gold</strong> de penalidade
                  </p>
                  <p className="text-sm text-red-600">
                    📊 Completou {yesterdayData.tasksCompleted || 0} de {yesterdayData.totalTasksAvailable || 0} tarefas ({yesterdayData.goldPenalty} incompletas)
                  </p>
                </div>
              )}
              
              {!hadBonus && !hadPenalty && (
                <p className="text-gray-700">
                  📊 Tarefas: {yesterdayData.totalTasksCompleted || 0}/{yesterdayData.totalTasksAvailable || 0} - Sem penalidade ou bônus
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Today's Progress Preview */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
            ⚡ Progresso de Hoje:
          </h4>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-yellow-800">
              {todayTasksCount.completed}/{todayTasksCount.total} tarefas completadas
            </span>
            <span className={`text-sm font-bold ${
              todayProgress === 100 ? 'text-green-600' : 
              todayProgress >= 75 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(todayProgress)}%
            </span>
          </div>
          
          <div className="w-full bg-yellow-200 rounded-full h-2 mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${todayProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-2 rounded-full ${
                todayProgress === 100 ? 'bg-green-500' : 
                todayProgress >= 75 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
          </div>
          
          <div className="text-xs text-yellow-800 text-center">
            {todayProgress === 100 ? (
              <span className="font-bold text-green-700">🎉 Todas completas! Você vai ganhar +10 Gold bônus!</span>
            ) : (
              <span>
                {todayTasksCount.total - todayTasksCount.completed > 0 && (
                  <>Faltam {todayTasksCount.total - todayTasksCount.completed} tarefa(s). Risco: -{todayTasksCount.total - todayTasksCount.completed} Gold</>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Detailed Rules (expandable) */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200"
            >
              <h5 className="font-bold text-gray-900 mb-3">📋 Regras Detalhadas:</h5>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    -1
                  </div>
                  <div>
                    <p className="font-medium">Penalidade por Tarefa Não Feita</p>
                    <p className="text-gray-600">Para cada tarefa que você não completar, perde 1 Gold no final do dia. Seu Gold nunca fica negativo (mínimo 0).</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    +10
                  </div>
                  <div>
                    <p className="font-medium">Bônus por Dia Perfeito</p>
                    <p className="text-gray-600">Se completar TODAS as tarefas do dia, ganha 10 Gold bônus extra! É um incentivo especial para ser um herói completo.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ⏰
                  </div>
                  <div>
                    <p className="font-medium">Quando Acontece</p>
                    <p className="text-gray-600">A verificação é feita automaticamente no final de cada dia. Você verá o resultado aqui no dia seguinte.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    📊
                  </div>
                  <div>
                    <p className="font-medium">Tarefas Consideradas</p>
                    <p className="text-gray-600">Apenas tarefas ativas e relevantes para o dia (considerando frequência: diária, dias de semana, fim de semana).</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                <p className="text-yellow-800 text-sm font-medium text-center">
                  💡 Dica: Complete todas as tarefas para garantir o bônus e evitar penalidades!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default DailySummaryCard;