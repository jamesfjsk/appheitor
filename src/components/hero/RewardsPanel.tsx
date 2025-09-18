import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Star, Lock, CheckCircle, Clock, X, Filter, Unlock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestoreService';
import { Reward, RewardRedemption } from '../../types';
import { calculateLevelSystem } from '../../utils/levelSystem';
import { isRewardUnlocked } from '../../utils/rewardLevels';

interface RewardsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RewardsPanel: React.FC<RewardsPanelProps> = ({ isOpen, onClose }) => {
  const { rewards, redemptions, progress, redeemReward, tasks } = useData();
  const { childUid } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'locked'>('all');
  const [dailyTasksCompleted, setDailyTasksCompleted] = useState<number>(0);
  const [loadingDailyTasks, setLoadingDailyTasks] = useState(true);
  
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  const currentLevel = levelSystem.currentLevel;

  // Load daily tasks completed count
  React.useEffect(() => {
    const loadDailyTasksCount = async () => {
      if (!childUid) return;
      
      setLoadingDailyTasks(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const completions = await FirestoreService.getTaskCompletionHistory(
          childUid, 
          new Date(today), 
          new Date(today + 'T23:59:59')
        );
        setDailyTasksCompleted(completions.length);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('index') || errorMessage.includes('Index')) {
          console.log('📋 Firestore index is building for taskCompletions. Using default value.');
        } else {
          console.error('❌ Error loading daily tasks count:', error);
        }
        setDailyTasksCompleted(0);
      } finally {
        setLoadingDailyTasks(false);
      }
    };

    if (isOpen) {
      loadDailyTasksCount();
    }
  }, [childUid, isOpen]);

  const getRewardById = (rewardId: string) => {
    return rewards.find(reward => reward.id === rewardId);
  };

  const getRedemptionStatus = (rewardId: string) => {
    // Only check for pending redemptions - approved/rejected redemptions don't block new ones
    const redemption = redemptions
      .filter(r => r.rewardId === rewardId && r.status === 'pending')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    
    return redemption;
  };

  const canRedeem = (reward: Reward) => {
    const redemption = getRedemptionStatus(reward.id);
    const goldCost = reward.costGold || 0;
    const hasEnoughGold = (progress.availableGold || 0) >= goldCost;
    const isUnlocked = isRewardUnlocked(reward.requiredLevel || 1, currentLevel);
    const notPending = !redemption; // Only check if there's no pending redemption
    const hasCompletedEnoughTasks = dailyTasksCompleted >= 4;
    
    console.log('🔥 Verificando se pode resgatar:', {
      reward: reward.title,
      goldCost,
      availableGold: progress.availableGold,
      hasEnoughGold,
      isUnlocked,
      requiredLevel: reward.requiredLevel,
      currentLevel,
      notPending,
      dailyTasksCompleted,
      hasCompletedEnoughTasks,
      canRedeem: hasEnoughGold && notPending && isUnlocked && hasCompletedEnoughTasks
    });
    
    return hasEnoughGold && notPending && isUnlocked && hasCompletedEnoughTasks;
  };

  const categories = [
    { id: 'all', label: 'Todas', icon: '🎁' },
    { id: 'treat', label: 'Guloseimas', icon: '🍭' },
    { id: 'toy', label: 'Brinquedos', icon: '🧸' },
    { id: 'activity', label: 'Atividades', icon: '🎮' },
    { id: 'privilege', label: 'Privilégios', icon: '👑' },
  ];

  const filters = [
    { id: 'all', label: 'Todas', icon: '🎁' },
    { id: 'available', label: 'Disponíveis', icon: '✅' },
    { id: 'locked', label: 'Bloqueadas', icon: '🔒' },
  ];

  const filteredRewards = rewards.filter(reward => {
    // Filter by active status
    if (reward.active === false) return false;
    
    // Filter by category
    if (selectedCategory !== 'all' && reward.category !== selectedCategory) return false;
    
    // Filter by availability
    const isUnlocked = isRewardUnlocked(reward.requiredLevel || 1, currentLevel);
    if (selectedFilter === 'available' && !isUnlocked) return false;
    if (selectedFilter === 'locked' && isUnlocked) return false;
    
    return true;
  });

  const handleRedeem = async (reward: Reward) => {
    if (!canRedeem(reward)) return;
    
    try {
      await redeemReward(reward.id);
    } catch (error) {
      console.error('Erro ao resgatar recompensa:', error);
    }
  };

  const getStatusBadge = (reward: Reward) => {
    // Show badge only for pending redemptions
    const pendingRedemption = redemptions
      .filter(r => r.rewardId === reward.id && r.status === 'pending')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    
    if (!pendingRedemption) return null;
    
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-500', text: 'Aguardando' },
    };
    
    const config = statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <div className={`absolute -top-2 -right-2 ${config.color} text-white rounded-full p-1 text-xs font-bold flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        <span className="hidden sm:inline">{config.text}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-hero-primary to-hero-secondary rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-hero-accent rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-hero-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Loja de Recompensas</h2>
              <p className="text-hero-accent font-semibold">
                Você tem {progress.availableGold || 0} Gold disponível
                {progress.totalGoldSpent > 0 && (
                  <span className="text-xs block text-white/70">
                    Total ganho: {progress.totalGoldEarned || 0} | Gasto: {progress.totalGoldSpent || 0}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Categories */}
        <div className="p-6 border-b border-white/20 space-y-4">
          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-hero-accent text-hero-primary shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.icon}</span>
                {category.label}
              </motion.button>
            ))}
          </div>
          
          {/* Availability Filters */}
          <div className="flex gap-2 overflow-x-auto">
            {filters.map((filter) => (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap text-sm ${
                  selectedFilter === filter.id
                    ? 'bg-white text-hero-primary shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-xs">{filter.icon}</span>
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Rewards Grid */}
        {/* Daily Tasks Requirement Banner */}
        <div className="p-6 border-b border-white/20">
          <div className={`p-4 rounded-xl border-2 ${
            loadingDailyTasks 
              ? 'bg-gray-100 border-gray-300' 
              : dailyTasksCompleted >= 4 
              ? 'bg-green-400/20 border-green-400/30' 
              : 'bg-red-400/20 border-red-400/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  loadingDailyTasks 
                    ? 'bg-gray-300' 
                    : dailyTasksCompleted >= 4 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}>
                  {loadingDailyTasks ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : dailyTasksCompleted >= 4 ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Lock className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${
                    loadingDailyTasks 
                      ? 'text-gray-600' 
                      : dailyTasksCompleted >= 4 
                      ? 'text-green-200' 
                      : 'text-red-200'
                  }`}>
                    {loadingDailyTasks 
                      ? 'Verificando missões de hoje...' 
                      : dailyTasksCompleted >= 4 
                      ? '✅ Resgates Liberados!' 
                      : '🔒 Resgates Bloqueados'
                    }
                  </h3>
                  <p className={`text-sm ${
                    loadingDailyTasks 
                      ? 'text-gray-500' 
                      : dailyTasksCompleted >= 4 
                      ? 'text-green-300' 
                      : 'text-red-300'
                  }`}>
                    {loadingDailyTasks 
                      ? 'Carregando...' 
                      : `${dailyTasksCompleted}/4 missões completadas hoje`
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  loadingDailyTasks 
                    ? 'text-gray-600' 
                    : dailyTasksCompleted >= 4 
                    ? 'text-green-200' 
                    : 'text-red-200'
                }`}>
                  {dailyTasksCompleted}/4
                </div>
                <div className={`text-xs ${
                  loadingDailyTasks 
                    ? 'text-gray-500' 
                    : dailyTasksCompleted >= 4 
                    ? 'text-green-300' 
                    : 'text-red-300'
                }`}>
                  missões hoje
                </div>
              </div>
            </div>
            
            {!loadingDailyTasks && dailyTasksCompleted < 4 && (
              <div className="mt-3 p-3 bg-red-500/20 rounded-lg">
                <p className="text-red-200 text-sm font-medium text-center">
                  🚫 Complete pelo menos 4 missões hoje para desbloquear os resgates!
                  <br />
                  <span className="text-xs">Faltam {4 - dailyTasksCompleted} missões para liberar a loja.</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {filteredRewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRewards.map((reward, index) => {
                const redemption = getRedemptionStatus(reward.id);
                const canRedeemReward = canRedeem(reward);
                const isUnlocked = isRewardUnlocked(reward.requiredLevel || 1, currentLevel);
                const requiredLevel = reward.requiredLevel || 1;
                const pendingRedemption = redemptions
                  .filter(r => r.rewardId === reward.id && r.status === 'pending')
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative backdrop-blur-sm rounded-2xl p-4 border transition-all duration-300 ${
                      isUnlocked 
                        ? 'bg-white border-gray-200 shadow-md' 
                        : 'bg-gray-100 border-gray-300 opacity-75'
                    }`}
                  >
                    {getStatusBadge(reward)}
                    
                    {/* Lock indicator for locked rewards */}
                    {!isUnlocked && (
                      <div className="absolute -top-2 -left-2 bg-gray-600 text-white rounded-full p-2">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                    
                    {/* New unlock indicator */}
                    {isUnlocked && requiredLevel > 1 && currentLevel === requiredLevel && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="absolute -top-2 -left-2 bg-yellow-400 text-red-600 rounded-full p-2"
                      >
                        <Unlock className="w-4 h-4" />
                      </motion.div>
                    )}
                    
                    <div className="text-center mb-4">
                      <motion.div 
                        whileHover={isUnlocked ? { scale: 1.1, rotate: 5 } : {}}
                        className={`text-5xl mb-3 ${!isUnlocked ? 'grayscale opacity-50' : ''}`}
                      >
                        {reward.emoji}
                      </motion.div>
                      <h3 className={`font-bold text-xl mb-2 ${
                        isUnlocked ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {reward.title}
                      </h3>
                      <p className={`text-base leading-relaxed ${
                        isUnlocked ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {reward.description}
                      </p>
                      
                      {/* Level requirement indicator */}
                      {!isUnlocked && (
                        <div className="mt-2 px-2 py-1 bg-gray-600/50 rounded-full text-xs text-gray-200">
                          🔒 Desbloqueado no nível {requiredLevel}
                        </div>
                      )}
                      
                      {/* Just unlocked indicator */}
                      {isUnlocked && requiredLevel > 1 && currentLevel === requiredLevel && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                          animate={{ 
                            opacity: 1, 
                            scale: [1, 1.1, 1], 
                            rotate: [0, 5, -5, 0] 
                          }}
                          transition={{ 
                            delay: 0.3,
                            scale: { duration: 2, repeat: Infinity },
                            rotate: { duration: 1, repeat: Infinity }
                          }}
                          className="mt-3 px-3 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-red-600 rounded-full text-sm font-bold shadow-lg border-2 border-white"
                        >
                          ⚡ NOVO! DESBLOQUEADO! ⚡
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center gap-1 font-bold ${
                        isUnlocked ? 'text-hero-accent' : 'text-gray-400'
                      }`}>
                        <Star className="w-4 h-4" />
                        {reward.costGold || 0} Gold
                      </div>
                      
                      {!isUnlocked ? (
                        <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          Nível {requiredLevel}
                        </span>
                      ) : (progress.availableGold || 0) >= (reward.costGold || 0) ? (
                        <span className="text-green-600 text-sm font-medium">
                          ✓ Disponível
                        </span>
                      ) : (
                        <span className="text-red-600 text-sm font-medium">
                          <Lock className="w-4 h-4 inline mr-1" />
                          Faltam {(reward.costGold || 0) - (progress.availableGold || 0)}
                        </span>
                      )}
                    </div>
                    
                    <motion.button
                      whileHover={canRedeemReward ? { scale: 1.02 } : {}}
                      whileTap={canRedeemReward ? { scale: 0.98 } : {}}
                      onClick={() => handleRedeem(reward)}
                      disabled={!canRedeemReward}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
                        !isUnlocked
                          ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : canRedeemReward
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-red-600 hover:from-yellow-300 hover:to-yellow-400 shadow-xl hover:shadow-2xl transform hover:-translate-y-1'
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {!isUnlocked ? (
                        <>
                          <Lock className="w-5 h-5 inline mr-2" />
                          Nível {requiredLevel} Necessário
                        </>
                      ) : pendingRedemption ? (
                        <>
                          <Clock className="w-5 h-5 inline mr-2" />
                          Aguardando Aprovação
                        </>
                      ) : canRedeemReward ? (
                        <>
                          <Star className="w-5 h-5 inline mr-2" />
                          Resgatar Agora!
                        </>
                      ) : dailyTasksCompleted < 4 ? (
                        <>
                          <Lock className="w-5 h-5 inline mr-2" />
                          Complete 4 Missões Hoje
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 inline mr-2" />
                          Gold Insuficiente
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎁</div>
              {selectedFilter === 'locked' ? (
                <>
                  <p className="text-gray-600 text-lg">
                    Nenhuma recompensa bloqueada nesta categoria
                  </p>
                  <p className="text-hero-primary text-sm mt-2">
                    Você já desbloqueou todas! 🎉
                  </p>
                </>
              ) : selectedFilter === 'available' ? (
                <>
                  <p className="text-gray-600 text-lg">
                    Nenhuma recompensa disponível nesta categoria
                  </p>
                  {dailyTasksCompleted < 4 ? (
                    <p className="text-red-400 text-sm mt-2">
                      Complete {4 - dailyTasksCompleted} missões hoje para liberar os resgates!
                    </p>
                  ) : (
                    <p className="text-hero-primary text-sm mt-2">
                      Complete mais missões para ganhar Gold!
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-lg">
                    Nenhuma recompensa nesta categoria
                  </p>
                  <p className="text-hero-primary text-sm mt-2">
                    Peça para o papai adicionar algumas recompensas!
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Histórico de Resgates do Usuário */}
        {redemptions.length > 0 && (
          <div className="p-6 border-t border-white/20">
            <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Meus Resgates ({redemptions.length})
            </h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {redemptions.slice(0, 10).map((redemption, index) => {
                const reward = getRewardById(redemption.rewardId);
                if (!reward) return null;
                
                const statusConfig = {
                  pending: { color: 'bg-yellow-400/20 border-yellow-400/30', textColor: 'text-yellow-200', label: '⏳ Aguardando', icon: '⏳' },
                  approved: { color: 'bg-green-400/20 border-green-400/30', textColor: 'text-green-200', label: '✅ Aprovado', icon: '✅' },
                  rejected: { color: 'bg-red-400/20 border-red-400/30', textColor: 'text-red-200', label: '❌ Rejeitado', icon: '❌' }
                };
                
                const config = statusConfig[redemption.status] || statusConfig.pending;
                
                return (
                  <motion.div
                    key={redemption.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border rounded-lg p-3 ${config.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{reward.emoji}</div>
                        <div>
                          <h5 className="font-medium text-gray-900">{reward.title}</h5>
                          <p className="text-xs text-gray-600">
                            {redemption.createdAt.toLocaleDateString('pt-BR')} às {redemption.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-sm font-medium ${config.textColor} flex items-center gap-1`}>
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          -{redemption.costGold} Gold
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default RewardsPanel;