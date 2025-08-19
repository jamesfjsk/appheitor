import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Play, CheckCircle, XCircle, AlertTriangle, Copy } from 'lucide-react';
import { runFirebaseDoctor } from '../../utils/firebaseDoctor';
import toast from 'react-hot-toast';

const FirebaseDoctor: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runDiagnosis = async () => {
    setIsRunning(true);
    setReport(null);
    
    try {
      console.log('🔬 Firebase Doctor: Iniciando diagnóstico...');
      
      const result = await runFirebaseDoctor(
        'heitor2026@teste.com',
        { email: 'heitor2026@teste.com', password: '123456' }
      );
      
      setReport(result);
      console.log('🔬 Firebase Doctor Report:', result);
      console.log('📋 Mensagens detalhadas:', result.messages.join('\n'));
      
      // Análise automática
      if (result.firestoreWriteOK && result.firestoreReadOK) {
        toast.success('✅ Firebase funcionando perfeitamente!');
      } else if (!result.identityToolkitReachable) {
        toast.error('❌ Problema com API Key ou configuração do projeto');
      } else if (!result.firestoreWriteOK) {
        toast.error('❌ Problema nas regras de segurança do Firestore');
      } else {
        toast.error('❌ Problema detectado - verifique os detalhes');
      }
      
    } catch (error: any) {
      console.error('🔬 Firebase Doctor falhou:', error);
      toast.error('Erro ao executar diagnóstico');
    } finally {
      setIsRunning(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    
    const reportText = `
🔬 FIREBASE DOCTOR REPORT
========================

Projeto: ${report.projectId}
Auth Domain: ${report.authDomain}
API Key: ${report.apiKeyPrefix}...

Identity Toolkit: ${report.identityToolkitReachable ? '✅ OK' : '❌ FALHOU'} (${report.identityToolkitStatus})
Firestore Read: ${report.firestoreReadOK ? '✅ OK' : '❌ FALHOU'}
Firestore Write: ${report.firestoreWriteOK ? '✅ OK' : '❌ FALHOU'}

MENSAGENS DETALHADAS:
${report.messages.join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(reportText);
    toast.success('📋 Relatório copiado para a área de transferência');
  };

  const getOverallStatus = () => {
    if (!report) return 'unknown';
    
    if (report.firestoreWriteOK && report.firestoreReadOK && report.identityToolkitReachable) {
      return 'healthy';
    } else if (report.identityToolkitReachable) {
      return 'partial';
    } else {
      return 'critical';
    }
  };

  const getStatusColor = () => {
    switch (getOverallStatus()) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (getOverallStatus()) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'partial': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Firebase Doctor
            </h3>
            <p className="text-sm text-gray-600">
              Diagnóstico completo da conexão Firebase
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={runDiagnosis}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'Diagnosticando...' : 'Executar Diagnóstico'}
        </motion.button>
      </div>

      {/* Loading */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Executando testes de conectividade...</p>
        </motion.div>
      )}

      {/* Report */}
      {report && !isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Status Geral */}
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h4 className="font-semibold">
                  Status Geral: {getOverallStatus() === 'healthy' ? 'Saudável' : 
                                getOverallStatus() === 'partial' ? 'Parcial' : 'Crítico'}
                </h4>
                <p className="text-sm opacity-80">
                  {getOverallStatus() === 'healthy' && 'Todos os serviços funcionando corretamente'}
                  {getOverallStatus() === 'partial' && 'Alguns serviços com problemas'}
                  {getOverallStatus() === 'critical' && 'Problemas críticos detectados'}
                </p>
              </div>
            </div>
          </div>

          {/* Resultados dos Testes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${
              report.identityToolkitReachable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {report.identityToolkitReachable ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium text-sm">Identity Toolkit</span>
              </div>
              <p className="text-xs text-gray-600">
                Status: {report.identityToolkitStatus}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              report.firestoreReadOK ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {report.firestoreReadOK ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium text-sm">Firestore Read</span>
              </div>
              <p className="text-xs text-gray-600">
                Leitura de documentos
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              report.firestoreWriteOK ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {report.firestoreWriteOK ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium text-sm">Firestore Write</span>
              </div>
              <p className="text-xs text-gray-600">
                Escrita de documentos
              </p>
            </div>
          </div>

          {/* Collections Data */}
          {report.collectionsFound && report.collectionsFound.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h5 className="font-medium text-blue-900 mb-2">📊 Dados Encontrados:</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="bg-white p-2 rounded border">
                  <div className="font-bold text-gray-900">{report.usersFound}</div>
                  <div className="text-gray-600">Usuários</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-bold text-gray-900">{report.tasksFound}</div>
                  <div className="text-gray-600">Tarefas</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-bold text-gray-900">{report.rewardsFound}</div>
                  <div className="text-gray-600">Recompensas</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-bold text-gray-900">{report.progressFound}</div>
                  <div className="text-gray-600">Progresso</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-bold text-gray-900">{report.achievementsFound}</div>
                  <div className="text-gray-600">Conquistas</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-blue-700">
                Coleções ativas: {report.collectionsFound.join(', ')}
              </div>
            </div>
          )}

          {/* Sign-in Methods */}
          {report.signInMethods && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-900 mb-2">Métodos de Login Disponíveis:</h5>
              <div className="flex gap-2">
                {report.signInMethods.map((method) => (
                  <span key={method} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              {showDetails ? 'Ocultar' : 'Ver'} Detalhes
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={copyReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar Relatório
            </motion.button>
          </div>

          {/* Detalhes */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <h5 className="font-medium text-gray-900 mb-3">Mensagens Detalhadas:</h5>
              <div className="space-y-1 text-sm font-mono">
                {report.messages.map((message: string, index: number) => (
                  <div key={index} className={`p-2 rounded ${
                    message.includes('OK') ? 'bg-green-100 text-green-800' :
                    message.includes('ERRO') || message.includes('falhou') ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {message}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recomendações */}
          {report && getOverallStatus() !== 'healthy' && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h5 className="font-medium text-yellow-900 mb-2">🔧 Recomendações:</h5>
              <ul className="text-sm text-yellow-800 space-y-1">
                {!report.identityToolkitReachable && (
                  <li>• Verifique se a API Key está correta no arquivo .env</li>
                )}
                {!report.firestoreWriteOK && (
                  <li>• Verifique as regras de segurança do Firestore</li>
                )}
                {!report.firestoreReadOK && (
                  <li>• Confirme se o banco Firestore foi criado no Firebase Console</li>
                )}
                {report.signInMethods && report.signInMethods.length === 0 && (
                  <li>• Email não existe neste projeto Firebase</li>
                )}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default FirebaseDoctor;