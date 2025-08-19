import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Play, CheckCircle, XCircle, AlertTriangle, Copy, Home } from 'lucide-react';
import { runFirebaseDoctor } from '../../utils/firebaseDoctor';
import { Link } from 'react-router-dom';

const DoctorPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  // Auto-executar diagnóstico ao carregar a página
  useEffect(() => {
    if (autoRun) return;
    setAutoRun(true);
    runDiagnosis();
  }, []);

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
      
    } catch (error: any) {
      console.error('🔬 Firebase Doctor falhou:', error);
      setReport({
        identityToolkitReachable: false,
        identityToolkitStatus: 'doctor failed',
        messages: [`Doctor exception: ${error?.message ?? error}`],
      });
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
    alert('📋 Relatório copiado para a área de transferência');
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
      case 'healthy': return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'partial': return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'critical': return <XCircle className="w-8 h-8 text-red-600" />;
      default: return <Activity className="w-8 h-8 text-gray-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (getOverallStatus()) {
      case 'healthy': return 'Todos os serviços Firebase funcionando perfeitamente!';
      case 'partial': return 'Problemas detectados nas regras de segurança do Firestore';
      case 'critical': return 'Problemas críticos na configuração do Firebase';
      default: return 'Executando diagnóstico...';
    }
  };

  const getSolutions = () => {
    if (!report) return [];
    
    const solutions = [];
    
    if (!report.identityToolkitReachable) {
      solutions.push({
        title: '🔑 Problema na API Key',
        steps: [
          'Vá em Firebase Console > Configurações do Projeto',
          'Copie a API Key correta',
          'Atualize o arquivo .env com VITE_FIREBASE_API_KEY',
          'Recarregue a aplicação'
        ]
      });
    }
    
    if (!report.firestoreWriteOK && report.identityToolkitReachable) {
      solutions.push({
        title: '🔐 Problema nas Regras de Segurança',
        steps: [
          'Vá em Firebase Console > Firestore Database > Regras',
          'Substitua TUDO pelo código das regras corretas',
          'Clique em "Publicar"',
          'Aguarde 1-2 minutos para propagação'
        ]
      });
    }
    
    if (!report.firestoreReadOK && !report.firestoreWriteOK) {
      solutions.push({
        title: '🗄️ Banco Firestore não existe',
        steps: [
          'Vá em Firebase Console > Firestore Database',
          'Clique em "Criar banco de dados"',
          'Escolha "Modo de teste"',
          'Selecione região: southamerica-east1'
        ]
      });
    }
    
    return solutions;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              🔬 Firebase Doctor
            </h1>
            <p className="text-blue-200 text-lg">
              Diagnóstico completo da conexão Firebase - Sem necessidade de login
            </p>
            <div className="mt-4">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Voltar ao App
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Controles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Diagnóstico Firebase</h2>
              <p className="text-gray-600">
                Testa conexão, autenticação e Firestore sem depender do console
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runDiagnosis}
              disabled={isRunning}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
            >
              <Play className="w-5 h-5" />
              {isRunning ? 'Diagnosticando...' : 'Executar Diagnóstico'}
            </motion.button>
          </div>

          {/* Doctor Route - Accessible without login */}
          <div className="mt-4">
            <Link 
              to="/__doctor"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              🔬 Abrir Firebase Doctor
            </Link>
          </div>

          {/* Loading */}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Executando testes de conectividade...</p>
              <div className="mt-4 space-y-2 text-sm text-gray-500">
                <p>• Testando Identity Toolkit API</p>
                <p>• Verificando métodos de autenticação</p>
                <p>• Testando leitura do Firestore</p>
                <p>• Testando escrita do Firestore</p>
                <p>• Validando login de usuário</p>
              </div>
            </motion.div>
          )}

          {/* Report */}
          {report && !isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Status Geral */}
              <div className={`p-6 rounded-xl border-2 ${getStatusColor()}`}>
                <div className="flex items-center gap-4">
                  {getStatusIcon()}
                  <div>
                    <h3 className="text-2xl font-bold">
                      Status: {getOverallStatus() === 'healthy' ? 'Saudável' : 
                              getOverallStatus() === 'partial' ? 'Parcial' : 'Crítico'}
                    </h3>
                    <p className="text-lg opacity-90">
                      {getStatusMessage()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações do Projeto */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Informações do Projeto</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Projeto ID:</span>
                    <span className="ml-2 text-gray-900">{report.projectId}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Auth Domain:</span>
                    <span className="ml-2 text-gray-900">{report.authDomain}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">API Key:</span>
                    <span className="ml-2 text-gray-900">{report.apiKeyPrefix}...</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Métodos de Login:</span>
                    <span className="ml-2 text-gray-900">
                      {report.signInMethods ? report.signInMethods.join(', ') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Coleções Ativas:</span>
                    <span className="ml-2 text-gray-900">
                      {report.collectionsFound ? report.collectionsFound.length : 0}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Usuários:</span>
                    <span className="ml-2 text-gray-900">{report.usersFound || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Tarefas:</span>
                    <span className="ml-2 text-gray-900">{report.tasksFound || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Recompensas:</span>
                    <span className="ml-2 text-gray-900">{report.rewardsFound || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Progresso:</span>
                    <span className="ml-2 text-gray-900">{report.progressFound || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Conquistas:</span>
                    <span className="ml-2 text-gray-900">{report.achievementsFound || 0}</span>
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
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">Identity Toolkit</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Status: {report.identityToolkitStatus}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Testa se a API Key está funcionando
                  </p>
                </div>

                <div className={`p-4 rounded-lg border ${
                  report.firestoreReadOK ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {report.firestoreReadOK ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">Firestore Read</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {report.firestoreReadOK ? 'Leitura OK' : 'Falha na leitura'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Testa leitura de documentos
                  </p>
                </div>

                <div className={`p-4 rounded-lg border ${
                  report.firestoreWriteOK ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {report.firestoreWriteOK ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">Firestore Write</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {report.firestoreWriteOK ? 'Escrita OK' : 'Falha na escrita'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Testa escrita de documentos
                  </p>
                </div>
              </div>

              {/* Soluções */}
              {getOverallStatus() !== 'healthy' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-yellow-900 mb-4">🔧 Soluções Recomendadas:</h4>
                  <div className="space-y-4">
                    {getSolutions().map((solution, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-yellow-200">
                        <h5 className="font-bold text-yellow-900 mb-2">{solution.title}</h5>
                        <ol className="text-sm text-yellow-800 space-y-1">
                          {solution.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex items-start gap-2">
                              <span className="font-bold text-yellow-600">{stepIndex + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regras do Firestore */}
              {!report.firestoreWriteOK && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-red-900 mb-4">🚨 REGRAS FIRESTORE CORRETAS:</h4>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users
    match /users/{uid} {
      allow read: if signedIn() && (isAdmin() || uid == request.auth.uid);
      allow write: if signedIn() && (isAdmin() || uid == request.auth.uid);
    }

    // Progress
    match /progress/{uid} {
      allow read: if signedIn() && (isAdmin() || uid == request.auth.uid);
      allow write: if signedIn() && (isAdmin() || uid == request.auth.uid);
    }

    // Tasks
    match /tasks/{taskId} {
      allow read: if signedIn() && (isAdmin() || resource.data.ownerId == request.auth.uid);
      allow create, update, delete: if isAdmin();
    }

    // Rewards
    match /rewards/{rewardId} {
      allow read: if signedIn() && (isAdmin() || resource.data.ownerId == request.auth.uid);
      allow create, update, delete: if isAdmin();
    }

    // Achievements
    match /achievements/{achievementId} {
      allow read: if signedIn() && (isAdmin() || resource.data.ownerId == request.auth.uid);
      allow create, update, delete: if isAdmin();
    }

    // User Achievements
    match /userAchievements/{userAchievementId} {
      allow read: if signedIn() && (isAdmin() || resource.data.userId == request.auth.uid);
      allow create, update: if signedIn() && (isAdmin() || request.resource.data.userId == request.auth.uid);
      allow delete: if isAdmin();
    }

    // Redemptions
    match /redemptions/{docId} {
      allow read: if signedIn() && (isAdmin() || resource.data.userId == request.auth.uid);
      allow create: if signedIn() && (isAdmin() || request.resource.data.userId == request.auth.uid);
      allow update, delete: if isAdmin();
    }

    // Notifications
    match /notifications/{id} {
      allow read: if signedIn() && (isAdmin() || resource.data.toUserId == request.auth.uid);
      allow create, update, delete: if isAdmin();
    }

    // Flash Reminders
    match /flashReminders/{id} {
      allow read: if signedIn() && (isAdmin() || resource.data.ownerId == request.auth.uid);
      allow create, update, delete: if isAdmin();
    }
  }
}`}</pre>
                  </div>
                  <p className="text-red-700 text-sm mt-3">
                    ⚠️ Copie EXATAMENTE este código para Firebase Console &gt; Firestore Database &gt; Regras (versão de produção com segurança)
                  </p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  {showDetails ? 'Ocultar' : 'Ver'} Detalhes Técnicos
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={copyReport}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Relatório
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={runDiagnosis}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Executar Novamente
                </motion.button>
              </div>

              {/* Detalhes Técnicos */}
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-900 text-green-400 rounded-xl p-6"
                >
                  <h5 className="font-bold text-white mb-4">📋 Log Detalhado:</h5>
                  <div className="space-y-2 text-sm font-mono max-h-64 overflow-y-auto">
                    {report.messages.map((message: string, index: number) => (
                      <div key={index} className={`p-2 rounded ${
                        message.includes('OK') ? 'bg-green-900/50 text-green-300' :
                        message.includes('ERRO') || message.includes('falhou') ? 'bg-red-900/50 text-red-300' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        {message}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Instruções de Uso */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4">📖 Como Interpretar os Resultados:</h3>
          
          {/* Quick Test Button */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-blue-900">🚀 Teste Rápido</h4>
                <p className="text-sm text-blue-700">
                  Execute um diagnóstico completo agora para verificar se os índices foram criados corretamente
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={runDiagnosis}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Testar Agora
              </motion.button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-900">Status Saudável</span>
              </div>
              <p className="text-sm text-green-800">
                Todos os serviços funcionando. Seu Firebase está configurado corretamente!
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-yellow-900">Status Parcial</span>
              </div>
              <p className="text-sm text-yellow-800">
                API Key OK, mas problemas nas regras de segurança do Firestore.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-900">Status Crítico</span>
              </div>
              <p className="text-sm text-red-800">
                Problemas na API Key ou configuração básica do projeto.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-bold text-blue-900 mb-2">💡 Dica:</h4>
            <p className="text-sm text-blue-800">
              Este diagnóstico executa testes reais no seu Firebase, não depende do console do navegador.
              Use-o sempre que houver problemas de conectividade ou erros 400/403.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-white/80"
        >
          <p className="text-sm">
            🔬 Firebase Doctor v1.0 - Diagnóstico independente para Flash Missions
          </p>
        </motion.div>
      </div>
    </div>
  );

};

export default DoctorPage;