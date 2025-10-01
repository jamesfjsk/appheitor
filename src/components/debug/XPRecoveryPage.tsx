import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Database, Shield } from 'lucide-react';
import { investigateXPLoss, restoreXP, RecoveryReport } from '../../utils/xpRecovery';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const XPRecoveryPage: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<RecoveryReport | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');

  const handleInvestigate = async () => {
    const userId = targetUserId || user?.userId;

    if (!userId) {
      toast.error('User ID não encontrado');
      return;
    }

    setIsInvestigating(true);

    try {
      console.log(`🔍 Investigating XP loss for user: ${userId}`);
      const result = await investigateXPLoss(userId);
      setReport(result);

      if (result.recommendations.some(r => r.includes('PERDA'))) {
        toast.error('Perda de XP detectada!', { duration: 5000 });
      } else {
        toast.success('Investigação completa - Dados corretos!');
      }
    } catch (error: any) {
      console.error('Error investigating:', error);
      toast.error(`Erro na investigação: ${error.message}`);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleRestore = async () => {
    if (!report || !report.currentProgress) {
      toast.error('Execute a investigação primeiro');
      return;
    }

    const userId = targetUserId || user?.userId;
    if (!userId) {
      toast.error('User ID não encontrado');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Isso irá restaurar:\n\n` +
      `XP: ${report.currentProgress.totalXP} → ${report.estimatedCorrectXP}\n` +
      `Level: ${report.currentProgress.level} → ${report.estimatedLevel}\n` +
      `Gold: ${report.currentProgress.availableGold} → ${report.estimatedGold}\n\n` +
      `Deseja continuar?`
    );

    if (!confirmed) return;

    setIsRestoring(true);

    try {
      await restoreXP(
        userId,
        report.estimatedCorrectXP,
        report.estimatedGold,
        'XP Recovery - Manual restoration based on historical data analysis'
      );

      toast.success('✅ XP restaurado com sucesso!', { duration: 5000 });

      // Re-investigate to show new values
      setTimeout(() => handleInvestigate(), 1000);
    } catch (error: any) {
      console.error('Error restoring:', error);
      toast.error(`Erro ao restaurar: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🔧 XP Recovery Tool
              </h1>
              <p className="text-gray-600">Ferramenta de Recuperação de Progresso</p>
            </div>
          </div>

          {/* User Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID (deixe vazio para usar o usuário atual)
            </label>
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder={user?.userId || 'Digite o User ID'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Investigate Button */}
          <button
            onClick={handleInvestigate}
            disabled={isInvestigating}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
          >
            {isInvestigating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Investigando...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Investigar Perda de XP
              </>
            )}
          </button>

          {/* Report */}
          {report && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Current Progress */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Progresso Atual no Banco
                </h2>

                {report.currentProgress ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total XP</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {report.currentProgress.totalXP}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Level</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {report.currentProgress.level}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gold Disponível</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {report.currentProgress.availableGold}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Gold Ganho</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {report.currentProgress.totalGoldEarned}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">❌ Nenhum progresso encontrado no banco</p>
                )}
              </div>

              {/* Estimated Values */}
              <div className="bg-green-50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Valores Estimados (Baseado no Histórico)
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total XP Estimado</p>
                    <p className="text-2xl font-bold text-green-700">
                      {report.estimatedCorrectXP}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Level Estimado</p>
                    <p className="text-2xl font-bold text-green-700">
                      {report.estimatedLevel}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gold Estimado</p>
                    <p className="text-2xl font-bold text-green-700">
                      {report.estimatedGold}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              {report.currentProgress && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    Diferenças Detectadas
                  </h2>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Diferença de XP:</span>
                      <span className={`font-bold ${
                        report.estimatedCorrectXP > report.currentProgress.totalXP
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {report.estimatedCorrectXP - report.currentProgress.totalXP > 0 ? '+' : ''}
                        {report.estimatedCorrectXP - report.currentProgress.totalXP} XP
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Diferença de Level:</span>
                      <span className={`font-bold ${
                        report.estimatedLevel > report.currentProgress.level
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {report.estimatedLevel - report.currentProgress.level > 0 ? '+' : ''}
                        {report.estimatedLevel - report.currentProgress.level} níveis
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Diferença de Gold:</span>
                      <span className={`font-bold ${
                        report.estimatedGold > report.currentProgress.availableGold
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {report.estimatedGold - report.currentProgress.availableGold > 0 ? '+' : ''}
                        {report.estimatedGold - report.currentProgress.availableGold} gold
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  📋 Recomendações
                </h2>

                <ul className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className={`flex items-start gap-2 ${
                        rec.includes('⚠️') || rec.includes('PERDA')
                          ? 'text-red-700 font-semibold'
                          : rec.includes('✅')
                          ? 'text-green-700 font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Historical Data */}
              {report.historicalData.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    📊 Dados Históricos Analisados
                  </h2>

                  <div className="space-y-3">
                    {report.historicalData.map((snapshot, index) => (
                      <div key={index} className="bg-white rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-purple-700">
                            {snapshot.source === 'task_history' ? '📋 Histórico de Tarefas' :
                             snapshot.source === 'achievement_history' ? '🏆 Histórico de Conquistas' :
                             snapshot.source}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">XP:</span>
                            <span className="font-bold ml-2">{snapshot.totalXP}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Level:</span>
                            <span className="font-bold ml-2">{snapshot.level}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Gold:</span>
                            <span className="font-bold ml-2">{snapshot.totalGoldEarned}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Restore Button */}
              {report.currentProgress &&
               report.estimatedCorrectXP > report.currentProgress.totalXP && (
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 px-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Restaurar XP e Gold
                    </>
                  )}
                </button>
              )}
            </motion.div>
          )}

          {/* Warning */}
          <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">⚠️ AVISO IMPORTANTE:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Esta ferramenta analisa o histórico de tarefas e conquistas</li>
                  <li>Os valores estimados são calculados com base nos dados disponíveis</li>
                  <li>A restauração é irreversível - verifique os valores antes de confirmar</li>
                  <li>Use apenas quando tiver certeza da perda de dados</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
