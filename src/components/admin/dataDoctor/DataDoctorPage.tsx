import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download,
  RefreshCw,
  Users,
  FileText,
  Database,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { useDataDoctor, ScanResult, FixResult } from '../../../hooks/useDataDoctor';
import { useAuth } from '../../../contexts/AuthContext';
import CollectionCard from './CollectionCard';
import toast from 'react-hot-toast';

const DataDoctorPage: React.FC = () => {
  const { user } = useAuth();
  const {
    isScanning,
    isFixing,
    scanResults,
    availableChildren,
    loadAvailableChildren,
    scanAllCollections,
    fixDocuments,
    downloadCSV,
    generateFinalReport
  } = useDataDoctor();
  
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [fixResults, setFixResults] = useState<Record<string, FixResult>>({});

  // Load children on mount
  useEffect(() => {
    if (user?.role === 'admin') {
      loadAvailableChildren()
        .then(() => {
          console.log('✅ DataDoctor: Children loaded successfully');
        })
        .catch((error) => {
          console.error('❌ DataDoctor: Error loading children:', error);
          toast.error('Erro ao carregar lista de filhos');
        });
    }
  }, [user]);

  // Auto-select first child
  useEffect(() => {
    if (availableChildren.length > 0 && !selectedChild) {
      setSelectedChild(availableChildren[0].userId);
    }
  }, [availableChildren, selectedChild]);

  const handleScanAll = async () => {
    try {
      console.log('🔍 DataDoctor: Starting comprehensive scan...');
      await scanAllCollections();
      
      // Show detailed results
      const totalIssues = Object.values(scanResults).reduce((sum, result) => sum + result.stats.issues.length, 0);
      const totalDocs = Object.values(scanResults).reduce((sum, result) => sum + result.stats.total, 0);
      
      if (totalIssues === 0) {
        toast.success(`✅ Análise completa! ${totalDocs} documentos verificados, nenhum problema encontrado.`);
      } else {
        toast.error(`⚠️ Análise completa! ${totalIssues} problemas encontrados em ${totalDocs} documentos.`);
      }
    } catch (error: any) {
      console.error('❌ DataDoctor: Scan failed:', error);
      toast.error(`Erro na análise: ${error.message}`);
    }
  };

  const handleFixCollection = async (
    collectionName: 'tasks' | 'rewards' | 'progress' | 'redemptions' | 'notifications',
    strategy: 'use_userId' | 'assign_to_child',
    selectedIssueIds?: string[]
  ) => {
    if (strategy === 'assign_to_child' && !selectedChild) {
      toast.error('Selecione um filho para atribuir os documentos');
      return;
    }

    try {
      const result = await fixDocuments(
        collectionName,
        strategy,
        strategy === 'assign_to_child' ? selectedChild : undefined,
        selectedIssueIds
      );
      
      setFixResults(prev => ({
        ...prev,
        [collectionName]: result
      }));
      
      toast.success(`✅ ${result.totalFixed} documentos corrigidos em ${collectionName}!`);
      
      if (result.errors.length > 0) {
        console.warn('⚠️ DataDoctor: Errors during fix:', result.errors);
        toast.error(`⚠️ ${result.errors.length} erros durante a correção - verifique o console`);
      }
    } catch (error: any) {
      console.error(`❌ DataDoctor: Fix failed for ${collectionName}:`, error);
      toast.error(`Erro ao corrigir ${collectionName}: ${error.message}`);
    }
  };

  const finalReport = Object.keys(scanResults).length > 0 ? generateFinalReport() : null;
  const collections: ('tasks' | 'rewards' | 'progress' | 'redemptions' | 'notifications')[] = 
    ['tasks', 'rewards', 'progress', 'redemptions', 'notifications'];

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores podem acessar o Data Doctor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Doctor</h1>
              <p className="text-gray-600 text-lg">
                Validação e correção de integridade dos dados - Heitor Missions
              </p>
              {user && (
                <p className="text-sm text-purple-600 mt-1">
                  Admin: {user.displayName} | Filho: {user.managedChildId || 'Não definido'}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowInstructions(!showInstructions)}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors"
            >
              {showInstructions ? 'Ocultar' : 'Ver'} Instruções
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleScanAll}
              disabled={isScanning || isFixing}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
            >
              <Play className="w-5 h-5" />
              {isScanning ? 'Analisando...' : 'Analisar Todas as Coleções'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Instructions */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-blue-900 mb-4">📖 Como usar o Data Doctor:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">1. Análise</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Clique "Analisar" para escanear todas as coleções</li>
                  <li>• Verifica documentos sem ownerId/userId/toUserId válido</li>
                  <li>• Identifica usuários órfãos ou tipos incorretos</li>
                  <li>• Mostra estatísticas detalhadas por coleção</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">2. Correção</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Usar userId:</strong> Define ownerId = userId existente</li>
                  <li>• <strong>Atribuir ao filho:</strong> Define ownerId = filho selecionado</li>
                  <li>• Processa em lotes de 400 documentos</li>
                  <li>• Mantém backup dos dados originais</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Execute a análise primeiro para ver os problemas. 
                Use "Usar userId" quando possível, "Atribuir ao filho" para documentos órfãos.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Child Selection */}
      {availableChildren.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center gap-4">
            <Users className="w-6 h-6 text-purple-600" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Filho para Atribuição</h3>
              <p className="text-gray-600 text-sm">
                Selecione o filho que receberá os documentos órfãos
              </p>
            </div>
            
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Selecione um filho...</option>
              {availableChildren.map(child => (
                <option key={child.userId} value={child.userId}>
                  {child.displayName} ({child.email})
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 text-center"
        >
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Analisando Coleções...</h3>
          <p className="text-gray-600">
            Verificando integridade dos dados em tasks, rewards, progress, redemptions e notifications
          </p>
        </motion.div>
      )}

      {/* Collection Cards */}
      {Object.keys(scanResults).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {collections.map((collectionName, index) => (
            <motion.div
              key={collectionName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CollectionCard
                collectionName={collectionName}
                scanResult={scanResults[collectionName]}
                fixResult={fixResults[collectionName]}
                selectedChild={selectedChild}
                onFix={handleFixCollection}
                onDownloadCSV={() => downloadCSV(collectionName)}
                isFixing={isFixing}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Final Report */}
      {finalReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl shadow-lg p-6 ${
            finalReport.allValid 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <div className="flex items-center gap-4 mb-6">
            {finalReport.allValid ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            )}
            
            <div>
              <h3 className={`text-xl font-bold ${
                finalReport.allValid ? 'text-green-900' : 'text-yellow-900'
              }`}>
                Relatório Final de Integridade
              </h3>
              <p className={`${
                finalReport.allValid ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {finalReport.allValid 
                  ? 'Todas as coleções estão íntegras!' 
                  : 'Problemas detectados que precisam de correção'
                }
              </p>
            </div>
          </div>

          {/* Summary Table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold">Coleção</th>
                  <th className="text-center py-2 font-semibold">Total</th>
                  <th className="text-center py-2 font-semibold">Válidos</th>
                  <th className="text-center py-2 font-semibold">Problemas</th>
                  <th className="text-center py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(finalReport.summary).map(([collection, stats]) => (
                  <tr key={collection} className="border-b border-gray-200">
                    <td className="py-2 font-medium capitalize">{collection}</td>
                    <td className="text-center py-2">{stats.total}</td>
                    <td className="text-center py-2 text-green-600">{stats.valid}</td>
                    <td className="text-center py-2 text-red-600">{stats.issues}</td>
                    <td className="text-center py-2">
                      {stats.issues === 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">📋 Recomendações:</h4>
            <ul className="space-y-1">
              {finalReport.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* No Data State */}
      {Object.keys(scanResults).length === 0 && !isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-12 text-center"
        >
          <Database className="w-24 h-24 text-gray-400 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Pronto para Análise
          </h3>
          <p className="text-gray-600 text-lg mb-6">
            Clique em "Analisar Todas as Coleções" para verificar a integridade dos dados
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleScanAll}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-3 mx-auto shadow-lg"
          >
            <Zap className="w-6 h-6" />
            Iniciar Análise Completa
          </motion.button>
        </motion.div>
      )}

      {/* Schema Reference */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Schema Esperado:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-white p-3 rounded-lg">
            <h4 className="font-bold text-blue-600 mb-2">{"tasks/{taskId}"}</h4>
            <div className="text-gray-600 space-y-1">
              <div>• ownerId: string (childUid)</div>
              <div>• createdBy: string (adminUid)</div>
              <div>• title, description, xp, gold</div>
              <div>• period, time, frequency</div>
              <div>• active: boolean, status</div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <h4 className="font-bold text-green-600 mb-2">{"rewards/{rewardId}"}</h4>
            <div className="text-gray-600 space-y-1">
              <div>• ownerId: string (childUid)</div>
              <div>• title, description, category</div>
              <div>• costGold: number, emoji</div>
              <div>• active: boolean</div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <h4 className="font-bold text-purple-600 mb-2">{"progress/{userId}"}</h4>
            <div className="text-gray-600 space-y-1">
              <div>• userId: string (childUid)</div>
              <div>• level, totalXP, availableGold</div>
              <div>• streak, totalTasksCompleted</div>
              <div>• lastActivityDate</div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <h4 className="font-bold text-orange-600 mb-2">{"redemptions/{rid}"}</h4>
            <div className="text-gray-600 space-y-1">
              <div>• userId: string (childUid)</div>
              <div>• rewardId, costGold</div>
              <div>• status, approvedBy</div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <h4 className="font-bold text-red-600 mb-2">{"notifications/{nid}"}</h4>
            <div className="text-gray-600 space-y-1">
              <div>• toUserId: string (childUid)</div>
              <div>• title, message, type</div>
              <div>• read: boolean, readAt</div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <h4 className="font-bold text-indigo-600 mb-2">{"users/{uid}"}</h4>
            <div className="text-gray-600 space-y-1">
              <div>• userId: string (uid)</div>
              <div>• role: 'admin'|'child'</div>
              <div>• managedChildId (admin only)</div>
              <div>• email, displayName</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DataDoctorPage;