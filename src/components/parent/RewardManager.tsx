import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Gift, Star, Check, X, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Reward, RewardRedemption } from '../../types';
import { RewardForm } from './RewardForm';
import toast from 'react-hot-toast';

const RewardManager: React.FC = () => {
  const { rewards, redemptions, progress, addReward, updateReward, deleteReward, approveRedemption } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'redemptions'>('rewards');

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setShowForm(true);
  };

  const handleDelete = async (rewardId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta recompensa?')) {
      try {
        await deleteReward(rewardId);
        toast.success('Recompensa excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir recompensa');
      }
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    try {
      await updateReward(reward.id, { active: !reward.active });
      toast.success(reward.active ? 'Recompensa desativada' : 'Recompensa ativada');
    } catch (error) {
      toast.error('Erro ao atualizar recompensa');
    }
  };

  const handleApproveRedemption = async (redemptionId: string, approved: boolean) => {
    try {
      await approveRedemption(redemptionId, approved);
      if (approved) {
        toast.success('✅ Resgate aprovado! Recompensa liberada para o Heitor.');
      } else {
        toast.success('❌ Resgate rejeitado. Pontos devolvidos para o Heitor.');
      }
    } catch (error) {
      toast.error('Erro ao processar resgate');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReward(null);
  };

  const activeRewards = rewards.filter(reward => reward.active !== false);
  const inactiveRewards = rewards.filter(reward => reward.active === false);
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const processedRedemptions = redemptions.filter(r => r.status !== 'pending');

  const categoryLabels = {
    toy: 'Brinquedos',
    activity: 'Atividades',
    treat: 'Guloseimas',
    privilege: 'Privilégios',
    custom: 'Personalizado'
  };

  const getRewardById = (rewardId: string) => {
    return rewards.find(r => r.id === rewardId);
  };

  return (
    <div className="space-y-6">
      {/* Header com Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sistema de Recompensas</h2>
          <p className="text-gray-600">Gerencie recompensas e aprove resgates do Heitor</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'rewards'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Gift className="w-4 h-4 inline mr-2" />
            Recompensas ({rewards.length})
          </button>
          
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 relative ${
              activeTab === 'redemptions'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Resgates ({redemptions.length})
            {pendingRedemptions.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingRedemptions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'rewards' ? (
          <motion.div
            key="rewards"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Botão Adicionar */}
            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Recompensa
              </motion.button>
            </div>

            {/* Recompensas Ativas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recompensas Ativas ({activeRewards.length})
              </h3>
              
              {activeRewards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeRewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{reward.icon}</div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{reward.title}</h4>
                            <p className="text-sm text-gray-600">{categoryLabels[reward.category]}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-yellow-600 font-bold">
                          <Star className="w-4 h-4" />
                          {reward.goldCost || 0}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{reward.description}</p>
                      
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(reward)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleActive(reward)}
                          className="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all duration-200"
                        >
                          Pausar
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(reward.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎁</div>
                  <p className="text-gray-500 text-lg">Nenhuma recompensa ativa</p>
                  <p className="text-gray-400 text-sm">Clique em "Nova Recompensa" para começar</p>
                </div>
              )}
            </motion.div>

            {/* Recompensas Inativas */}
            {inactiveRewards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-500 mb-4">
                  Recompensas Pausadas ({inactiveRewards.length})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveRewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-60"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl opacity-50">{reward.icon}</div>
                          <div>
                            <h4 className="font-semibold text-gray-700">{reward.title}</h4>
                            <p className="text-sm text-gray-500">{categoryLabels[reward.category]}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-gray-500 font-bold">
                          <Star className="w-4 h-4" />
                          {reward.goldCost || 0}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleActive(reward)}
                          className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-200"
                        >
                          Ativar
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(reward.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="redemptions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Resgates Pendentes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Resgates Pendentes ({pendingRedemptions.length})
              </h3>
              
              {pendingRedemptions.length > 0 ? (
                <div className="space-y-4">
                  {pendingRedemptions.map((redemption, index) => {
                    const reward = getRewardById(redemption.rewardId);
                    if (!reward) return null;
                    
                    console.log('🔥 Renderizando resgate pendente:', redemption);
                    
                    return (
                      <motion.div
                        key={redemption.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">{reward.icon}</div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{reward.title}</h4>
                              <p className="text-sm text-gray-600">{reward.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Resgatado em {redemption.createdAt.toLocaleDateString('pt-BR')} às {redemption.createdAt.toLocaleTimeString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-orange-600 font-bold">
                                <Star className="w-4 h-4" />
                                -{redemption.goldSpent || 0}
                              </div>
                              <div className="text-xs text-gray-500">pontos gastos</div>
                            </div>
                            
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleApproveRedemption(redemption.id, true)}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200"
                                title="Aprovar"
                              >
                                <Check className="w-4 h-4" />
                              </motion.button>
                              
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleApproveRedemption(redemption.id, false)}
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
                                title="Rejeitar"
                              >
                                <X className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-500">Nenhum resgate pendente</p>
                </div>
              )}
            </motion.div>

            {/* Histórico de Resgates */}
            {processedRedemptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Histórico de Resgates ({processedRedemptions.length})
                </h3>
                
                <div className="space-y-3">
                  {processedRedemptions.slice(0, 10).map((redemption, index) => {
                    const reward = getRewardById(redemption.rewardId);
                    if (!reward) return null;
                    
                    const statusConfig = {
                      approved: { color: 'text-green-600', bg: 'bg-green-50', label: 'Aprovado' },
                      delivered: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Entregue' },
                      rejected: { color: 'text-red-600', bg: 'bg-red-50', label: 'Rejeitado' }
                    };
                    
                    const config = statusConfig[redemption.status as keyof typeof statusConfig];
                    
                    return (
                      <motion.div
                        key={redemption.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border rounded-lg p-3 ${config.bg}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-xl">{reward.icon}</div>
                            <div>
                              <h5 className="font-medium text-gray-900">{reward.title}</h5>
                              <p className="text-xs text-gray-500">
                                {redemption.createdAt.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-sm font-medium ${config.color}`}>
                              {config.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              -{redemption.goldSpent} Gold
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Formulário */}
      <AnimatePresence>
        {showForm && (
          <RewardForm
            reward={editingReward}
            onClose={handleCloseForm}
            isOpen={showForm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RewardManager;