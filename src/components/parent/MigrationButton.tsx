import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GoldHistoryMigration } from '../../utils/goldHistoryMigration';
import toast from 'react-hot-toast';

const MigrationButton: React.FC = () => {
  const { childUid } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'completed' | 'error'>('idle');
  const [migrationInfo, setMigrationInfo] = useState<any>(null);

  const checkStatus = async () => {
    if (!childUid) return;

    setLoading(true);
    setStatus('checking');

    try {
      const info = await GoldHistoryMigration.checkMigrationStatus(childUid);
      setMigrationInfo(info);

      if (info.hasTransactions) {
        toast.success(`${info.transactionCount} transações já migradas!`);
      } else {
        toast('Nenhuma transação encontrada. Execute a migração.', { icon: '📊' });
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Erro ao verificar status da migração');
    } finally {
      setLoading(false);
      setStatus('idle');
    }
  };

  const runMigration = async () => {
    if (!childUid) return;

    if (!window.confirm('Deseja migrar os dados históricos de gold? Esta operação pode levar alguns minutos.')) {
      return;
    }

    setLoading(true);
    setStatus('migrating');

    try {
      const result = await GoldHistoryMigration.migrateExistingData(childUid);

      if (result.success) {
        setStatus('completed');
        toast.success(`✅ Migração concluída! ${result.transactionsCreated} transações criadas.`);

        if (result.errors.length > 0) {
          console.warn('Migration warnings:', result.errors);
          toast('⚠️ Migração concluída com avisos. Verifique o console.', { duration: 5000 });
        }
      } else {
        setStatus('error');
        toast.error('❌ Erro na migração. Verifique o console para detalhes.');
        console.error('Migration errors:', result.errors);
      }
    } catch (error) {
      setStatus('error');
      console.error('Migration error:', error);
      toast.error('Erro ao executar migração');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            Migração de Dados Históricos
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Execute uma vez para importar todo o histórico de gold existente
          </p>
        </div>

        {status === 'completed' && (
          <CheckCircle className="w-6 h-6 text-green-600" />
        )}
        {status === 'error' && (
          <AlertTriangle className="w-6 h-6 text-red-600" />
        )}
      </div>

      {migrationInfo && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-semibold ${
                migrationInfo.hasTransactions ? 'text-green-600' : 'text-orange-600'
              }`}>
                {migrationInfo.hasTransactions ? 'Migrado' : 'Pendente'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Transações:</span>
              <span className="ml-2 font-semibold text-purple-600">
                {migrationInfo.transactionCount}
              </span>
            </div>
            {migrationInfo.oldestTransaction && (
              <>
                <div>
                  <span className="text-gray-600">Mais antiga:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {migrationInfo.oldestTransaction.toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Mais recente:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {migrationInfo.newestTransaction.toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={checkStatus}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          {status === 'checking' ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Verificar Status
            </>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={runMigration}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'migrating' ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Migrando...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Executar Migração
            </>
          )}
        </motion.button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          <strong>Nota:</strong> A migração pode ser executada múltiplas vezes com segurança.
          Transações já migradas serão ignoradas automaticamente.
        </p>
      </div>
    </div>
  );
};

export default MigrationButton;
