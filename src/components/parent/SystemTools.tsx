import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Database, Wrench, Activity, ChevronDown, ChevronRight } from 'lucide-react';
import FirebaseDoctor from '../common/FirebaseDoctor';
import DataDoctorPage from '../admin/dataDoctor/DataDoctorPage';
import { XPRecoveryPage } from '../debug/XPRecoveryPage';

type ToolType = 'firebase' | 'data' | 'xp';

const SystemTools: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);

  const tools = [
    {
      id: 'firebase' as ToolType,
      title: 'Firebase Doctor',
      description: 'Diagnóstico completo de conexão Firebase',
      icon: Activity,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      features: [
        'Testa Identity Toolkit API',
        'Verifica regras de segurança',
        'Valida leitura/escrita Firestore',
        'Diagnóstico sem necessidade de login'
      ]
    },
    {
      id: 'data' as ToolType,
      title: 'Data Doctor',
      description: 'Validação e correção de integridade dos dados',
      icon: Database,
      color: 'from-purple-600 to-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      features: [
        'Escaneia todas as coleções',
        'Identifica documentos órfãos',
        'Corrige relacionamentos quebrados',
        'Exporta relatórios CSV'
      ]
    },
    {
      id: 'xp' as ToolType,
      title: 'XP Recovery',
      description: 'Investigação e restauração de progresso perdido',
      icon: Shield,
      color: 'from-red-600 to-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      features: [
        'Analisa histórico de tarefas',
        'Detecta perda de XP/Gold',
        'Calcula valores corretos',
        'Restaura progresso com segurança'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-lg p-8 text-white"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Ferramentas de Sistema</h1>
            <p className="text-gray-300 text-lg">
              Diagnóstico, correção e recuperação de dados
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.id;

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => setSelectedTool(isSelected ? null : tool.id)}
                className={`w-full text-left ${tool.bgColor} border-2 ${tool.borderColor} rounded-2xl p-6 transition-all hover:shadow-lg ${
                  isSelected ? 'ring-4 ring-gray-300' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {isSelected ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <h3 className={`text-xl font-bold ${tool.textColor} mb-2`}>
                  {tool.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {tool.description}
                </p>

                <ul className="space-y-1">
                  {tool.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Tool Content */}
      <AnimatePresence mode="wait">
        {selectedTool && (
          <motion.div
            key={selectedTool}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {selectedTool === 'firebase' && <FirebaseDoctor />}
              {selectedTool === 'data' && <DataDoctorPage />}
              {selectedTool === 'xp' && <XPRecoveryPage />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-blue-900 mb-4">💡 Quando usar cada ferramenta?</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🔬 Firebase Doctor</h4>
            <p className="text-sm text-blue-700">
              Use quando houver problemas de conexão, erros 400/403, ou quando o app não carregar.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 mb-2">🗄️ Data Doctor</h4>
            <p className="text-sm text-purple-700">
              Use quando tarefas/recompensas não aparecerem corretamente ou houver dados órfãos.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">🔧 XP Recovery</h4>
            <p className="text-sm text-red-700">
              Use quando o XP/Gold do usuário estiver incorreto ou houver suspeita de perda de progresso.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SystemTools;
