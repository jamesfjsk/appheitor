import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Calendar, Minus, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestoreService';

interface DailyProgressRecord {
  date: string;
  tasksCompleted: number;
  totalTasksAvailable: number;
  goldPenalty: number;
  allTasksBonusGold: number;
  xpEarned: number;
  goldEarned: number;
}

const DailyRewardsHistory: React.FC = () => {
  const { childUid } = useAuth();
  const [history, setHistory] = useState<DailyProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!childUid) return;

      setLoading(true);
      try {
        // Get last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const records: DailyProgressRecord[] = [];

        // Fetch each day's data
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateString = d.toISOString().split('T')[0];
          const dailyProgress = await FirestoreService.getDailyProgress(childUid, dateString);

          if (dailyProgress && dailyProgress.summaryProcessed) {
            records.push({
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

        // Sort by date descending (most recent first)
        records.sort((a, b) => b.date.localeCompare(a.date));
        setHistory(records);

      } catch (error) {
        console.error('❌ Error loading rewards history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [childUid]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const getStatusIcon = (record: DailyProgressRecord) => {
    if (record.allTasksBonusGold > 0) {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    } else if (record.goldPenalty > 0) {
      return <TrendingDown className="w-5 h-5 text-red-600" />;
    } else {
      return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (record: DailyProgressRecord) => {
    if (record.allTasksBonusGold > 0) {
      return 'Bônus';
    } else if (record.goldPenalty > 0) {
      return 'Penalidade';
    } else {
      return 'Neutro';
    }
  };

  const getStatusColor = (record: DailyProgressRecord) => {
    if (record.allTasksBonusGold > 0) {
      return 'bg-green-50 border-green-200';
    } else if (record.goldPenalty > 0) {
      return 'bg-red-50 border-red-200';
    } else {
      return 'bg-gray-50 border-gray-200';
    }
  };

  const getTotalGoldChange = (record: DailyProgressRecord) => {
    const earned = record.goldEarned + record.allTasksBonusGold;
    const lost = record.goldPenalty;
    return earned - lost;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando histórico...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Nenhum histórico disponível ainda</p>
        <p className="text-sm text-gray-500 mt-1">
          O histórico aparecerá conforme os dias forem processados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          📊 Histórico de Penalidades e Bônus
        </h3>
        <span className="text-sm text-gray-500">
          Últimos {history.length} dias
        </span>
      </div>

      <div className="space-y-2">
        {history.map((record, index) => (
          <motion.div
            key={record.date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`border rounded-lg p-4 ${getStatusColor(record)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(record)}

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {formatDate(record.date)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-current">
                      {getStatusText(record)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-700 space-y-0.5">
                    <div>
                      📋 Tarefas: <strong>{record.tasksCompleted}/{record.totalTasksAvailable}</strong>
                      {record.tasksCompleted === record.totalTasksAvailable ? (
                        <span className="text-green-600 ml-2">✓ Completo</span>
                      ) : (
                        <span className="text-red-600 ml-2">
                          ({record.totalTasksAvailable - record.tasksCompleted} faltando)
                        </span>
                      )}
                    </div>

                    <div>
                      ⚡ XP ganho: <strong>+{record.xpEarned}</strong>
                    </div>

                    <div>
                      💰 Gold das tarefas: <strong>+{record.goldEarned}</strong>
                    </div>

                    {record.allTasksBonusGold > 0 && (
                      <div className="text-green-700">
                        🎁 Bônus: <strong>+{record.allTasksBonusGold} Gold</strong>
                      </div>
                    )}

                    {record.goldPenalty > 0 && (
                      <div className="text-red-700">
                        ⚠️ Penalidade: <strong>-{record.goldPenalty} Gold</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right ml-4">
                <div className="text-xs text-gray-500 mb-1">Saldo final</div>
                <div className={`text-lg font-bold ${
                  getTotalGoldChange(record) > 0
                    ? 'text-green-600'
                    : getTotalGoldChange(record) < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                }`}>
                  {getTotalGoldChange(record) > 0 && '+'}
                  {getTotalGoldChange(record)} 💰
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-900">
            {history.filter(r => r.allTasksBonusGold > 0).length}
          </div>
          <div className="text-sm text-blue-700">Dias com Bônus</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-900">
            {history.filter(r => r.goldPenalty > 0).length}
          </div>
          <div className="text-sm text-red-700">Dias com Penalidade</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-900">
            {history.reduce((sum, r) => sum + getTotalGoldChange(r), 0)}
          </div>
          <div className="text-sm text-green-700">Gold Total (30d)</div>
        </div>
      </div>
    </div>
  );
};

export default DailyRewardsHistory;
