import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Gift, Star, Check, X, Clock, Lock, Crown } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Reward, RewardRedemption } from '../../types';
import { RewardForm } from './RewardForm';
import { LEVEL_REWARD_TEMPLATES } from '../../utils/rewardLevels';
import toast from 'react-hot-toast';

const RewardManager: React.FC = () => {
  const { rewards, redemptions, progress, addReward, updateReward, deleteReward, approveRedemption } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [initialRewardData, setInitialRewardData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'redemptions'>('rewards');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEdit = (reward: Reward) => {
    if (isProcessing) return;
    setEditingReward(reward);
    setShowForm(true);
  };

  const handleDelete = async (rewardId: string) => {
    if (isProcessing) return;
    
    if (window.confirm('Tem certeza que deseja excluir esta recompensa?')) {
      setIsProcessing(true);
      try {
        await deleteReward(rewardId);
        toast.success('Recompensa excluída com sucesso!');
      } catch (error) {
        console.error('❌ RewardManager: Error deleting reward:', error);
        toast.error('Erro ao excluir recompensa');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await updateReward(reward.id, { active: !reward.active });
      toast.success(reward.active ? 'Recompensa desativada' : 'Recompensa ativada');
    } catch (error) {
      console.error('❌ RewardManager: Error toggling reward:', error);
      toast.error('Erro ao atualizar recompensa');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveRedemption = async (redemptionId: string, approved: boolean) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await approveRedemption(redemptionId, approved);
      if (approved) {
        toast.success('✅ Resgate aprovado! Recompensa liberada para o Heitor.');
      } else {
        toast.success('❌ Resgate rejeitado. Pontos devolvidos para o Heitor.');
      }
    } catch (error) {
      console.error('❌ RewardManager: Error approving redemption:', error);
      toast.error('Erro ao processar resgate');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseForm = () => {
    if (isProcessing) return;
    setShowForm(false);
    setEditingReward(null);
    setInitialRewardData(null);
  };

  const handleUseTemplate = (template: any) => {
    if (isProcessing) return;
    console.log('🎁 Using template:', template);
    setInitialRewardData({
      title: template.title,
      description: template.description,
      goldCost: template.costGold,
      icon: template.emoji,
      category: template.category,
      requiredLevel: template.requiredLevel,
      isActive: true
    });
    setEditingReward(null);
    setShowTemplates(false); // Close templates section
    setShowForm(true);
  };

  // Memoize filtered data to prevent unnecessary recalculations
  const { activeRewards, inactiveRewards, pendingRedemptions } = useMemo(() => {
    const active = rewards.filter(reward => reward.active !== false);
    const inactive = rewards.filter(reward => reward.active === false);
    const pending = redemptions.filter(r => r.status === 'pending');
    
    return {
      activeRewards: active,
      inactiveRewards: inactive,
      pendingRedemptions: pending
    };
  }, [rewards, redemptions]);

  const categoryLabels = {
    toy: 'Brinquedos',
    activity: 'Atividades',
    treat: 'Guloseimas',
    privilege: 'Privilégios',
    custom: 'Personalizado'
  };

  // Memoize reward lookup to prevent recalculation
  const getRewardById = useMemo(() => {
    const rewardMap = new Map(rewards.map(r => [r.id, r]));
    return (rewardId: string) => rewardMap.get(rewardId);
  }, [rewards]);

  // Show processing indicator
  if (isProcessing) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-700 font-medium">Processando operação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sistema de Recompensas</h2>
          <p className="text-gray-600">Gerencie recompensas e aprove resgates do Heitor</p>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
          >
            <Crown className="w-4 h-4" />
            {showTemplates ? 'Ocultar' : 'Ver'} Templates
          </motion.button>
          
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

      {/* Templates de Recompensas */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-6"
          >
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Templates de Recompensas por Nível
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {LEVEL_REWARD_TEMPLATES.map((template, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg p-4 border border-purple-200 hover:border-purple-300 transition-colors"
                >
                          {template.requiredLevel && template.requiredLevel > 1 && (
                            <div className="flex items-center gap-1 text-xs text-purple-600 mt-1">
                              <Crown className="w-3 h-3" />
                              Nível {template.requiredLevel}+
                            </div>
                          )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.emoji}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{template.title}</h4>
                        <p className="text-xs text-gray-600">{template.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star className="w-3 h-3" />
                      {template.costGold} Gold
                    </div>
                    <div className="flex items-center gap-1 text-purple-600">
                      <Crown className="w-3 h-3" />
                      Nível {template.requiredLevel}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {template.levelRange}
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleUseTemplate(template)}
                    className="w-full mt-3 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    Usar Template
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                            {reward.requiredLevel && reward.requiredLevel > 1 && (
                              <div className="flex items-center gap-1 text-xs text-purple-600 mt-1">
                                <Crown className="w-3 h-3" />
                                Nível {reward.requiredLevel}+
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-yellow-600 font-bold">
                          <Star className="w-4 h-4" />
                          {reward.costGold || 0}
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
                          {reward.costGold || 0}
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
            {/* Histórico Completo de Resgates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Histórico de Resgates ({redemptions.length})
                </h3>
                {pendingRedemptions.length > 0 && (
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    {pendingRedemptions.length} pendentes
                  </span>
                )}
              </div>
              
              {redemptions.length > 0 ? (
                <div className="space-y-4">
                  {redemptions.map((redemption, index) => {
                    const reward = getRewardById(redemption.rewardId);
                    if (!reward) return null;
                    
                    const statusConfig = {
                      pending: { 
                        color: 'border-orange-200 bg-orange-50', 
                        textColor: 'text-orange-600',
                        label: 'Aguardando Aprovação',
                        icon: Clock,
                        showActions: true
                      },
                      approved: { 
                        color: 'border-green-200 bg-green-50', 
                        textColor: 'text-green-600',
                        label: 'Aprovado',
                        icon: Check,
                        showActions: false
                      },
                      rejected: { 
                        color: 'border-red-200 bg-red-50', 
                        textColor: 'text-red-600',
                        label: 'Rejeitado',
                        icon: X,
                        showActions: false
                      }
                    };
                    
                    const config = statusConfig[redemption.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    
                    return (
                      <motion.div
                        key={redemption.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-lg p-4 ${config.color}`}
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
                              <div className="flex items-center gap-2 mt-1">
                                <StatusIcon className={`w-4 h-4 ${config.textColor}`} />
                                <span className={`text-sm font-medium ${config.textColor}`}>
                                  {config.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`flex items-center gap-1 font-bold ${config.textColor}`}>
                                <Star className="w-4 h-4" />
                                -{redemption.costGold || 0}
                              </div>
                              <div className="text-xs text-gray-500">pontos gastos</div>
                            </div>
                            
                            {config.showActions && (
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
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-500">Nenhum resgate realizado ainda</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Formulário */}
      <AnimatePresence>
        {showForm && (
          <RewardForm
            reward={editingReward}
            initialData={initialRewardData}
            onClose={handleCloseForm}
            isOpen={showForm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RewardManager;