import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Star, Lock, CheckCircle, Clock, X, Filter, Unlock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Reward, RewardRedemption } from '../../types';
import { calculateLevelSystem } from '../../utils/levelSystem';
import { isRewardUnlocked } from '../../utils/rewardLevels';

interface RewardsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RewardsPanel: React.FC<RewardsPanelProps> = ({ isOpen, onClose }) => {
  const { rewards, redemptions, progress, redeemReward } = useData();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'locked'>('all');
  
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  const currentLevel = levelSystem.currentLevel;

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

  const getRedemptionStatus = (rewardId: string) => {
    const redemption = redemptions
      .filter(r => r.rewardId === rewardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    
    return redemption;
  };

  const canRedeem = (reward: Reward) => {
    const redemption = getRedemptionStatus(reward.id);
    const goldCost = reward.costGold || 0;
    const hasEnoughGold = (progress.availableGold || 0) >= goldCost;
    const notPending = !redemption || (redemption.status !== 'pending' && redemption.status !== 'approved');
    
    console.log('🔥 Verificando se pode resgatar:', {
      reward: reward.title,
      goldCost,
      availableGold: progress.availableGold,
      hasEnoughGold,
      notPending,
      canRedeem: hasEnoughGold && notPending
    });
    
    return hasEnoughGold && notPending;
  };

  const handleRedeem = async (reward: Reward) => {
    if (!canRedeem(reward)) return;
    
    try {
      await redeemReward(reward.id);
    } catch (error) {
      console.error('Erro ao resgatar recompensa:', error);
    }
  };

  const getStatusBadge = (reward: Reward) => {
    const redemption = getRedemptionStatus(reward.id);
    
    if (!redemption) return null;
    
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-500', text: 'Aguardando' },
      approved: { icon: CheckCircle, color: 'bg-green-500', text: 'Aprovado' },
      delivered: { icon: Star, color: 'bg-blue-500', text: 'Entregue' },
      rejected: { icon: X, color: 'bg-red-500', text: 'Rejeitado' }
    };
    
    const config = statusConfig[redemption.status];
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
        <div className="p-6 border-b border-white/20">
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
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span>{category.icon}</span>
                {category.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="p-6 overflow-y-auto max-h-96">
          {filteredRewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRewards.map((reward, index) => {
                const redemption = getRedemptionStatus(reward.id);
                const canRedeemReward = canRedeem(reward);
                
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30"
                  >
                    {getStatusBadge(reward)}
                    
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">{reward.icon}</div>
                      <h3 className="font-bold text-white text-lg mb-1">
                        {reward.title}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {reward.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-hero-accent font-bold">
                        <Star className="w-4 h-4" />
                        {reward.costGold || 0} Gold
                      </div>
                      
                      {(progress.availableGold || 0) >= (reward.costGold || 0) ? (
                        <span className="text-green-300 text-sm font-medium">
                          ✓ Disponível
                        </span>
                      ) : (
                        <span className="text-red-300 text-sm font-medium">
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
                      className={`w-full py-3 rounded-xl font-bold transition-all duration-200 ${
                        canRedeemReward
                          ? 'bg-hero-accent text-hero-primary hover:bg-yellow-300 shadow-lg'
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {redemption?.status === 'pending' ? (
                        <>
                          <Clock className="w-4 h-4 inline mr-2" />
                          Aguardando Aprovação
                        </>
                      ) : redemption?.status === 'approved' ? (
                        <>
                          <CheckCircle className="w-4 h-4 inline mr-2" />
                          Aprovado!
                        </>
                      ) : redemption?.status === 'delivered' ? (
                        <>
                          <Star className="w-4 h-4 inline mr-2" />
                          Já Resgatado
                        </>
                      ) : canRedeemReward ? (
                        'Resgatar Agora!'
                      ) : (
                        'Gold Insuficiente'
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-white/80 text-lg">
                Nenhuma recompensa disponível nesta categoria
              </p>
              <p className="text-hero-accent text-sm mt-2">
                Complete mais missões para desbloquear recompensas!
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RewardsPanel;