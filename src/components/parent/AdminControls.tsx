import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Settings, RotateCcw, Plus, Minus, AlertTriangle, Zap, Coins, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { calculateLevelSystem, getXPMilestones } from '../../utils/levelSystem';
import toast from 'react-hot-toast';

const AdminControls: React.FC = () => {
  const { progress, resetUserData, adjustUserXP, adjustUserGold, createTestData } = useData();
  const { user, childUid, syncData } = useAuth();
  const { playClick, playError } = useSound();
  const [xpInput, setXpInput] = useState('');
  const [goldInput, setGoldInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showXPMilestones, setShowXPMilestones] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Memoize expensive calculations
  const levelSystem = useMemo(() => calculateLevelSystem(progress.totalXP || 0), [progress.totalXP]);
  const xpMilestones = useMemo(() => getXPMilestones(), []);

  const handleAdjustXP = (amount: number) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    playClick();
    adjustUserXP(amount)
      .then(() => {
        setXpInput('');
      })
      .catch((error) => {
        console.error('❌ AdminControls: Error adjusting XP:', error);
        playError();
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleAdjustGold = (amount: number) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    playClick();
    adjustUserGold(amount)
      .then(() => {
        setGoldInput('');
      })
      .catch((error) => {
        console.error('❌ AdminControls: Error adjusting Gold:', error);
        playError();
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleCustomXP = () => {
    if (isProcessing) return;
    
    const amount = parseInt(xpInput);
    if (isNaN(amount) || amount === 0) {
      playError();
      toast.error('Digite um valor válido para XP');
      return;
    }
    handleAdjustXP(amount);
  };

  const handleCustomGold = () => {
    if (isProcessing) return;
    
    const amount = parseInt(goldInput);
    if (isNaN(amount) || amount === 0) {
      playError();
      toast.error('Digite um valor válido para Gold');
      return;
    }
    handleAdjustGold(amount);
  };

  const handleReset = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    playClick();
    resetUserData()
      .then(() => {
        setShowResetConfirm(false);
      })
      .catch((error) => {
        console.error('❌ AdminControls: Error resetting data:', error);
        playError();
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleCreateTestData = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    playClick();
    createTestData()
      .catch((error) => {
        console.error('❌ AdminControls: Error creating test data:', error);
        playError();
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleSyncData = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    playClick();
    syncData()
      .catch((error) => {
        console.error('❌ AdminControls: Error syncing data:', error);
        playError();
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 font-medium">Processando operação...</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Controles de Administrador
          </h3>
          <p className="text-sm text-gray-600">
            Ferramentas para gerenciar XP, Gold e dados do Heitor
          </p>
        </div>
      </div>

      {/* Family Status */}
      {childUid && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Status do Sistema</h4>
              <div className="text-sm text-blue-700">
                <p>Admin: {user?.displayName} ({user?.userId})</p>
                <p>Filho Gerenciado: {childUid}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Atual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div 
            className="text-2xl font-bold text-blue-600"
          >
            {levelSystem.currentXP}
          </div>
          <div className="text-sm text-gray-600">XP Total</div>
        </div>
        <div className="text-center">
          <div 
            className={`text-2xl font-bold ${(progress.availableGold || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {progress.availableGold || 0}
          </div>
          <div className="text-sm text-gray-600">Gold Disponível</div>
        </div>
        <div className="text-center">
          <div 
            className="text-2xl font-bold text-yellow-600"
          >
            {progress.totalGoldEarned || 0}
          </div>
          <div className="text-sm text-gray-600">Gold Total Ganho</div>
        </div>
        <div className="text-center">
          <div 
            className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-1"
          >
            <span className="text-lg">{levelSystem.levelTitle.includes('Master') ? '👑' : levelSystem.levelTitle.includes('Disciplinado') ? '🏆' : levelSystem.levelTitle.includes('Responsável') ? '🥇' : levelSystem.levelTitle.includes('Júnior') ? '🥈' : levelSystem.levelTitle.includes('Aprendiz') ? '🥉' : '⭐'}</span>
            <span>{levelSystem.currentLevel}</span>
          </div>
          <div className="text-sm text-gray-600">{levelSystem.levelTitle}</div>
        </div>
      </div>
      
      {/* Informações do Sistema de Níveis */}
      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">📊 Sistema de Níveis Avançado</h4>
            <p className="text-sm text-purple-700">
              {!levelSystem.isMaxLevel 
                ? `Faltam ${levelSystem.xpNeededForNext} XP para ${levelSystem.nextLevelTitle}`
                : 'Nível máximo alcançado! 🎉'
              }
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowXPMilestones(!showXPMilestones)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            {showXPMilestones ? 'Ocultar' : 'Ver'} Marcos XP
          </motion.button>
        </div>
        
        {/* Barra de progresso detalhada */}
        {!levelSystem.isMaxLevel && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-purple-700 mb-1">
              <span>Nível {levelSystem.currentLevel}</span>
              <span>{Math.round(levelSystem.progressPercentage)}%</span>
              <span>Nível {levelSystem.currentLevel + 1}</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${levelSystem.progressPercentage}%` }}
              />
            </div>
          </div>
        )}
        
        {/* XP Milestones */}
        {showXPMilestones && (
          <div className="mt-4 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {xpMilestones.slice(0, 20).map((milestone) => (
                <div 
                  key={milestone.level}
                  className={`p-2 rounded border ${
                    milestone.level === levelSystem.currentLevel
                      ? 'bg-purple-100 border-purple-300 font-bold'
                      : milestone.level < levelSystem.currentLevel
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="font-medium">Nível {milestone.level}</div>
                  <div>{milestone.xp} XP</div>
                  <div className="text-xs opacity-75">{milestone.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controles de XP */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            Ajustar XP (Experiência)
          </h4>
          
          {/* Botões Rápidos XP */}
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustXP(10)}
              disabled={isProcessing}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              +10 XP
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustXP(50)}
              disabled={isProcessing}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              +50 XP
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustXP(100)}
              disabled={isProcessing}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              +100 XP
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustXP(-50)}
              disabled={isProcessing}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Minus className="w-4 h-4" />
              -50 XP
            </motion.button>
          </div>

          {/* Input Personalizado XP */}
          <div className="flex gap-2">
            <input
              type="number"
              value={xpInput}
              onChange={(e) => setXpInput(e.target.value)}
              placeholder="Ex: +25 ou -15"
              disabled={isProcessing}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCustomXP}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {isProcessing ? 'Aplicando...' : 'Aplicar XP'}
            </motion.button>
          </div>
        </div>

        {/* Controles de Gold */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            Ajustar Gold (Moedas)
          </h4>
          
          {/* Botões Rápidos Gold */}
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustGold(5)}
              disabled={isProcessing}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              +5 Gold
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustGold(25)}
              disabled={isProcessing}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              +25 Gold
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustGold(50)}
              disabled={isProcessing}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              +50 Gold
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAdjustGold(-25)}
              disabled={isProcessing}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <Minus className="w-4 h-4" />
              -25 Gold
            </motion.button>
          </div>

          {/* Input Personalizado Gold */}
          <div className="flex gap-2">
            <input
              type="number"
              value={goldInput}
              onChange={(e) => setGoldInput(e.target.value)}
              placeholder="Ex: +10 ou -5"
              disabled={isProcessing}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCustomGold}
              disabled={isProcessing}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              {isProcessing ? 'Aplicando...' : 'Aplicar Gold'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Botão Salvar & Sincronizar */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Sincronização Manual</h4>
            <p className="text-sm text-blue-700">
              Force o salvamento e sincronização de todos os dados entre os painéis
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSyncData}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
          >
            <Save className="w-5 h-5" />
            {isProcessing ? 'Sincronizando...' : 'Salvar & Sincronizar'}
          </motion.button>
        </div>
      </div>

      {/* Botão Inicializar Dados de Teste */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-green-900 mb-1">Dados de Teste</h4>
            <p className="text-sm text-green-700">
              Crie 5 tarefas e 5 recompensas variadas para testar o sistema
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateTestData}
            disabled={isProcessing}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            {isProcessing ? 'Criando...' : 'Criar Dados de Teste'}
          </motion.button>
        </div>
      </div>

      {/* Controles Especiais */}
      <div className="flex flex-wrap gap-2 pt-6 mt-6 border-t border-gray-200">
        {/* Removed block/unblock rewards - not implemented in current system */}
      </div>

      {/* Reset Completo */}
      <div className="pt-6 mt-6 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Zona de Perigo
        </h4>
        
        {!showResetConfirm ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Completo (APAGAR TUDO)
          </motion.button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Isso irá apagar PERMANENTEMENTE:
            </p>
            <ul className="text-xs text-red-600 ml-4 space-y-1">
              <li>• Todas as tarefas e histórico de completions</li>
              <li>• Todas as recompensas criadas</li>
              <li>• Todos os resgates (pendentes e processados)</li>
              <li>• Todas as notificações</li>
              <li>• Todo o progresso (XP, Gold, nível, streak)</li>
            </ul>
            <p className="text-sm text-red-600 font-bold">
              Esta ação NÃO pode ser desfeita!
            </p>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReset}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {isProcessing ? 'Apagando...' : 'SIM, APAGAR TUDO'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowResetConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Explicação do Sistema */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Sistema XP vs Gold:</h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>XP (Experiência):</strong> Valor configurável por tarefa (determina nível)</li>
          <li>• <strong>Gold (Moedas):</strong> Valor configurável pelo pai em cada tarefa</li>
          <li>• <strong>Nível:</strong> Sistema progressivo de 1-100 (Nível 1: 0-100 XP, Nível 2: 100-250 XP, etc.)</li>
          <li>• <strong>Recompensas:</strong> Custam Gold, não XP</li>
          <li>• <strong>Reset:</strong> Limpa tudo para começar do zero</li>
          <li>• <strong>Títulos:</strong> Flash Iniciante → Aprendiz → Júnior → Responsável → Disciplinado → Master</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default AdminControls;