import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Loader,
  Award,
  Gift,
  AlertTriangle,
  RefreshCw,
  Star,
  Target,
  Zap,
  Trophy,
  Cake,
  Brain,
  Settings,
  Store,
  Gamepad2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { FirestoreService } from '../../services/firestoreService';
import { GoldTransaction } from '../../types';
import { getTodayStartBrazil } from '../../utils/timezone';
import toast from 'react-hot-toast';

type PeriodFilter = 'today' | '7days' | '30days' | 'all';
type TypeFilter = 'all' | 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund' | 'adjustment' | 'saved';
type SourceFilter = 'all' | GoldTransaction['source'];

function sinceForPeriod(period: PeriodFilter): Date | null {
  if (period === 'all') return null;
  const start = getTodayStartBrazil();
  if (period === 'today') return start;
  const days = period === '7days' ? 7 : 30;
  return new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
}

const GoldHistory: React.FC = () => {
  const { childUid, user } = useAuth();
  const { progress } = useData();
  const [transactions, setTransactions] = useState<GoldTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    if (!childUid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const unsubscribe = FirestoreService.subscribeToGoldTransactions(
      childUid,
      (updatedTransactions) => {
        setTransactions(updatedTransactions);
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading transactions:', error);
        setLoadError(error.message || 'Não foi possível carregar o histórico de gold.');
        setLoading(false);
      },
      { since: sinceForPeriod(periodFilter) }
    );

    return () => unsubscribe();
  }, [childUid, periodFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, sourceFilter]);

  const statistics = useMemo(() => {
    const earned = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const spent = Math.abs(
      filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const netChange = earned - spent;

    const breakdown: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.amount > 0) {
        breakdown[t.source] = (breakdown[t.source] || 0) + t.amount;
      }
    });

    return { earned, spent, netChange, breakdown };
  }, [filteredTransactions]);

  const getTransactionIcon = (transaction: GoldTransaction) => {
    const iconMap: Record<GoldTransaction['source'], React.ReactNode> = {
      task_completion: <Target className="w-5 h-5" />,
      reward_redemption: <Gift className="w-5 h-5" />,
      daily_bonus: <Award className="w-5 h-5" />,
      daily_penalty: <AlertTriangle className="w-5 h-5" />,
      admin_adjustment: <Settings className="w-5 h-5" />,
      birthday: <Cake className="w-5 h-5" />,
      quiz: <Brain className="w-5 h-5" />,
      surprise_mission: <Zap className="w-5 h-5" />,
      achievement: <Trophy className="w-5 h-5" />,
      redemption_refund: <RefreshCw className="w-5 h-5" />,
      english_game: <Gamepad2 className="w-5 h-5" />,
      village_shop: <Store className="w-5 h-5" />,
      chest: <Star className="w-5 h-5" />,
      task_reversal: <RefreshCw className="w-5 h-5" />,
      level_gift: <Trophy className="w-5 h-5" />,
      goal_deposit: <Target className="w-5 h-5" />,
      goal_withdraw: <RefreshCw className="w-5 h-5" />,
      goal_interest: <TrendingUp className="w-5 h-5" />,
      goal_achieved: <Star className="w-5 h-5" />,
      challenge: <Trophy className="w-5 h-5" />,
      repair: <RefreshCw className="w-5 h-5" />,
      merchant_sale: <Store className="w-5 h-5" />,
      streak_chest: <Star className="w-5 h-5" />,
      trophy: <Trophy className="w-5 h-5" />,
      late_task: <Target className="w-5 h-5" />,
      book_report: <Star className="w-5 h-5" />,
    };

    return iconMap[transaction.source] || <DollarSign className="w-5 h-5" />;
  };

  const getTransactionColor = (transaction: GoldTransaction) => {
    if (transaction.amount > 0) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: 'text-green-600'
      };
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: 'text-red-600'
      };
    }
  };

  const getSourceLabel = (source: GoldTransaction['source']) => {
    const labels: Record<GoldTransaction['source'], string> = {
      task_completion: 'Tarefa Concluída',
      reward_redemption: 'Resgate de Recompensa',
      daily_bonus: 'Bônus Diário',
      daily_penalty: 'Penalidade Diária',
      admin_adjustment: 'Ajuste Manual',
      birthday: 'Aniversário',
      quiz: 'Quiz',
      surprise_mission: 'Missão Surpresa',
      achievement: 'Conquista',
      redemption_refund: 'Reembolso',
      english_game: 'Arena de Inglês',
      village_shop: 'Loja da Vila',
      chest: 'Baú do Dia',
      task_reversal: 'Missão revertida',
      level_gift: 'Presente de nível',
      goal_deposit: 'Cofrinho: depósito',
      goal_withdraw: 'Cofrinho: devolução',
      goal_interest: 'Bônus de paciência',
      goal_achieved: 'Meta alcançada',
      challenge: 'Desafio',
      repair: 'Conserto',
      merchant_sale: 'Comerciante',
      streak_chest: 'Baú das tochas',
      trophy: 'Troféu da semana',
      late_task: 'Missão recuperada',
      book_report: 'Livro contado ao Sábio',
    };

    return labels[source] || source;
  };

  const handleManualAdjustment = async () => {
    if (!childUid || !user) return;

    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    if (!adjustmentReason.trim()) {
      toast.error('Por favor, informe o motivo do ajuste');
      return;
    }

    try {
      await FirestoreService.adjustGoldManually(
        childUid,
        amount,
        adjustmentReason,
        user.userId
      );

      toast.success(`Ajuste de ${amount > 0 ? '+' : ''}${amount} Gold realizado com sucesso!`);
      setShowAdjustmentModal(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
    } catch (error) {
      console.error('Error adjusting gold:', error);
      toast.error('Erro ao realizar ajuste');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Carregando histórico...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Migration Button */}

      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              Histórico Completo de Gold
            </h2>
            <p className="text-gray-600 mt-1">
              Todas as transações de gold registradas · saldo atual: {progress.availableGold || 0} Gold
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAdjustmentModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Ajustar Gold
          </motion.button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Period Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="today">Hoje</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="all">Todo o período</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="earned">Ganhos</option>
              <option value="spent">Gastos</option>
              <option value="bonus">Bônus</option>
              <option value="penalty">Penalidades</option>
              <option value="refund">Reembolsos</option>
              <option value="adjustment">Ajustes</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origem
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas</option>
              <option value="task_completion">Tarefas</option>
              <option value="reward_redemption">Recompensas</option>
              <option value="daily_bonus">Bônus Diários</option>
              <option value="daily_penalty">Penalidades</option>
              <option value="achievement">Conquistas</option>
              <option value="quiz">Quiz</option>
              <option value="surprise_mission">Missão Surpresa</option>
              <option value="birthday">Aniversário</option>
              <option value="english_game">Arena de Inglês</option>
              <option value="village_shop">Loja da Vila</option>
              <option value="chest">Baú do Dia</option>
              <option value="task_reversal">Missão revertida</option>
              <option value="level_gift">Presente de nível</option>
              <option value="admin_adjustment">Ajustes Manuais</option>
            </select>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {loadError}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-800">Total Ganho</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">+{statistics.earned}</p>
          <p className="text-xs text-green-700 mt-1">Gold no período</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-800">Total Gasto</h3>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">-{statistics.spent}</p>
          <p className="text-xs text-red-700 mt-1">Gold no período</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`bg-gradient-to-br rounded-lg p-6 border ${
            statistics.netChange >= 0
              ? 'from-blue-50 to-blue-100 border-blue-200'
              : 'from-orange-50 to-orange-100 border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium ${
              statistics.netChange >= 0 ? 'text-blue-800' : 'text-orange-800'
            }`}>
              Saldo Líquido
            </h3>
            <DollarSign className={`w-5 h-5 ${
              statistics.netChange >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`} />
          </div>
          <p className={`text-3xl font-bold ${
            statistics.netChange >= 0 ? 'text-blue-900' : 'text-orange-900'
          }`}>
            {statistics.netChange >= 0 ? '+' : ''}{statistics.netChange}
          </p>
          <p className={`text-xs mt-1 ${
            statistics.netChange >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            Diferença no período
          </p>
        </motion.div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Transações ({filteredTransactions.length})
        </h3>

        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map((transaction, index) => {
              const colors = getTransactionColor(transaction);

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${colors.bg} border ${colors.border} rounded-lg p-4`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${colors.bg} border ${colors.border}`}>
                        <div className={colors.icon}>
                          {getTransactionIcon(transaction)}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-semibold ${colors.text}`}>
                            {transaction.description}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border} ${colors.text}`}>
                            {getSourceLabel(transaction.source)}
                          </span>
                        </div>

                        {transaction.relatedTitle && (
                          <p className="text-sm text-gray-600 mb-1">
                            📌 {transaction.relatedTitle}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {transaction.createdAt.toLocaleDateString('pt-BR')} às{' '}
                            {transaction.createdAt.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span>
                            Saldo: {transaction.balanceBefore} → {transaction.balanceAfter}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${colors.text}`}>
                        {transaction.amount > 0 ? '+' : ''}
                        {transaction.amount}
                      </div>
                      <div className="text-xs text-gray-500">Gold</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-lg">Nenhuma transação encontrada</p>
            <p className="text-gray-500 text-sm mt-1">
              {periodFilter === 'today'
                ? 'Não houve gold hoje. Troque o período para “Todo o período” para ver o histórico completo.'
                : 'Tente ajustar os filtros acima. O saldo atual do Heitor aparece no topo desta tela.'}
            </p>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      <AnimatePresence>
        {showAdjustmentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAdjustmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Ajuste Manual de Gold
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor (use + para adicionar, - para remover)
                  </label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="Ex: +50 ou -30"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo do Ajuste
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Descreva o motivo deste ajuste..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAdjustmentModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleManualAdjustment}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Confirmar Ajuste
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoldHistory;
