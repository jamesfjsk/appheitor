import { REDEEM_MIN_TASKS } from '../../config/rules';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { FlashIcon, isIconKey } from '../../icons';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { Reward } from '../../types';
import { calculateLevelSystem } from '../../utils/levelSystem';
import { isRewardUnlocked } from '../../utils/rewardLevels';
import { getTodayBrazil } from '../../utils/timezone';
import { rewardIconSrc } from '../../config/rewardIcons';
const UI = '/assets/english/ui';
/** Ícone pixel por categoria do prêmio (o campo emoji legado não tem equivalente pixel; a Etapa 1 traz ícones próprios) */
const REWARD_CATEGORY_ICON: Record<string, string> = {
  treat: `${UI}/apple.webp`,
  toy: `${UI}/chest.webp`,
  activity: `${UI}/map.webp`,
  privilege: `${UI}/gold.webp`,
  custom: `${UI}/star.webp`,
};
const rewardIcon = (category: string): string => REWARD_CATEGORY_ICON[category] ?? REWARD_CATEGORY_ICON.custom;

const CHEST = '/assets/english/ui/chest.webp';
const GOLD = '/assets/english/ui/gold.webp';
const MAP = '/assets/english/ui/map.webp';
const CLOCK = '/assets/english/ui/clock.webp';

interface RewardsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  onCreateGoal?: (title: string, gold: number, rewardId?: string) => void;
}

const RewardsPanel: React.FC<RewardsPanelProps> = ({ isOpen, onClose, embedded, onCreateGoal }) => {
  const { rewards, redemptions, progress, redeemReward, tasks } = useData();
  const { childUid } = useAuth();
  const { playClick } = useSound();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'locked'>('all');
  const [dailyTasksCompleted, setDailyTasksCompleted] = useState<number>(0);
  const [loadingDailyTasks, setLoadingDailyTasks] = useState(true);
  const [confirming, setConfirming] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  const currentLevel = levelSystem.currentLevel;

  // Load daily tasks completed count
  React.useEffect(() => {
    const loadDailyTasksCount = async () => {
      if (!childUid) return;
      
      setLoadingDailyTasks(true);
      try {
        // Count completed tasks from current tasks data instead of relying on completion history
        const today = getTodayBrazil();
        
        // Filter tasks that should be available today based on frequency
        const todayTasks = tasks.filter(task => {
          if (!task.active) return false;
          
          const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          
          switch (task.frequency) {
            case 'daily':
              return true;
            case 'weekday':
              return dayOfWeek >= 1 && dayOfWeek <= 5;
            case 'weekend':
              return dayOfWeek === 0 || dayOfWeek === 6;
            default:
              return true;
          }
        });
        
        // Count how many of today's tasks are completed
        const completedTodayTasks = todayTasks.filter(task => 
          task.status === 'done' && task.lastCompletedDate === today
        );
        
        console.log('🔍 RewardsPanel: Daily tasks verification:', {
          today,
          totalActiveTasks: tasks.filter(t => t.active).length,
          todayTasks: todayTasks.length,
          completedToday: completedTodayTasks.length,
          completedTasks: completedTodayTasks.map(t => ({ id: t.id, title: t.title, period: t.period }))
        });
        
        setDailyTasksCompleted(completedTodayTasks.length);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('index') || errorMessage.includes('Index')) {
          console.log('📋 Firestore index is building for taskCompletions. Using default value.');
          
          // Fallback: use current tasks data directly
          const today = getTodayBrazil();
          const todayTasks = tasks.filter(task => {
            if (!task.active) return false;
            
            const dayOfWeek = new Date().getDay();
            switch (task.frequency) {
              case 'daily': return true;
              case 'weekday': return dayOfWeek >= 1 && dayOfWeek <= 5;
              case 'weekend': return dayOfWeek === 0 || dayOfWeek === 6;
              default: return true;
            }
          });
          
          const completedTodayTasks = todayTasks.filter(task => 
            task.status === 'done' && task.lastCompletedDate === today
          );
          
          setDailyTasksCompleted(completedTodayTasks.length);
        } else {
          console.error('❌ Error loading daily tasks count:', error);
          setDailyTasksCompleted(0);
        }
      } finally {
        setLoadingDailyTasks(false);
      }
    };

    if (isOpen) {
      loadDailyTasksCount();
    }
  }, [childUid, isOpen, tasks]); // Added tasks dependency to update when tasks change

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
    const hasCompletedEnoughTasks = dailyTasksCompleted >= REDEEM_MIN_TASKS;
    
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
    { id: 'all', label: 'Todas', icon: 'gift' },
    { id: 'treat', label: 'Guloseimas', icon: 'candy' },
    { id: 'toy', label: 'Brinquedos', icon: 'teddy' },
    { id: 'activity', label: 'Atividades', icon: 'gamepad' },
    { id: 'privilege', label: 'Privilégios', icon: 'crown' },
  ];

  const filters = [
    { id: 'all', label: 'Todas' },
    { id: 'available', label: 'Disponíveis' },
    { id: 'locked', label: 'Bloqueadas' },
  ] as const;

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
    if (!canRedeem(reward)) { setConfirming(null); return; }
    
    try {
      setRedeeming(true);
      await redeemReward(reward.id);
      setConfirming(null);
    } catch (error) {
      console.error('Erro ao resgatar recompensa:', error);
    } finally {
      setRedeeming(false);
    }
  };

  if (!isOpen) return null;

  const missingGold = (reward: Reward) => Math.max(0, (reward.costGold || 0) - (progress.availableGold || 0));
  const gateOpen = dailyTasksCompleted >= REDEEM_MIN_TASKS;

  const inner = (
    <>
        {!embedded && (
        <div className="p-4 border-b-4 border-[#17130f] flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="mc-h">
              <img src={CHEST} alt="" className="mc-pixel" draggable={false} />
              Prêmios de verdade
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <img src={GOLD} alt="" className="w-[22px] h-[22px] mc-pixel" draggable={false} />
              <span className="mc-num text-[#ffd83d]" style={{ fontSize: 16 }}>{progress.availableGold || 0}</span>
              <span className="text-xs font-semibold mc-muted">gold disponível</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        )}

        <div className="p-4 space-y-3">
          <div className="mc-hotbar">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`mc-slot rounded ${selectedCategory === category.id ? 'mc-slot-selected' : ''}`}
              >
                {category.id === 'all'
                  ? <img src={CHEST} alt="" className="w-[22px] h-[22px] mc-pixel" draggable={false} />
                  : <FlashIcon name={category.icon} className="w-[22px] h-[22px]" />}
                {category.label}
              </button>
            ))}
          </div>
          <div className="mc-hotbar">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
                className={`mc-slot rounded text-[13px] min-h-[44px] ${selectedFilter === filter.id ? 'mc-slot-selected' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="mc-card rounded p-3 flex items-center gap-3">
            <img src={MAP} alt="" className="w-10 h-10 mc-pixel shrink-0" draggable={false} />
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[17px] ${loadingDailyTasks ? '' : gateOpen ? 'mc-good' : 'mc-bad'}`}>
                {loadingDailyTasks
                  ? 'Conferindo as missões de hoje...'
                  : gateOpen
                    ? 'Trocas liberadas'
                    : 'Trocas bloqueadas'}
              </p>
              <p className="text-sm text-white/85">
                {dailyTasksCompleted}/{REDEEM_MIN_TASKS} missões feitas hoje
              </p>
              {!loadingDailyTasks && !gateOpen && (
                <p className="text-sm mc-muted mt-1">
                  Faça pelo menos {REDEEM_MIN_TASKS} missões hoje para liberar as trocas. Faltam {REDEEM_MIN_TASKS - dailyTasksCompleted}.
                </p>
              )}
            </div>
            <span className="mc-num" style={{ fontSize: 18 }}>{dailyTasksCompleted}/{REDEEM_MIN_TASKS}</span>
          </div>
        </div>

        <div className="px-4 pb-4">
          {filteredRewards.length > 0 ? (
            <div className="mc-inv rounded p-3 space-y-2 max-h-[50vh] overflow-y-auto">
              {filteredRewards.map((reward) => {
                const canRedeemReward = canRedeem(reward);
                const isUnlocked = isRewardUnlocked(reward.requiredLevel || 1, currentLevel);
                const requiredLevel = reward.requiredLevel || 1;
                const pendingRedemption = getRedemptionStatus(reward.id);
                const locked = !isUnlocked || missingGold(reward) > 0;
                const justUnlocked = isUnlocked && requiredLevel > 1 && currentLevel === requiredLevel;
                const isConfirming = confirming?.id === reward.id;

                return (
                  <div
                    key={reward.id}
                    className={`mc-row rounded p-3 flex flex-wrap items-center gap-3 ${locked ? 'is-locked' : ''}`}
                  >
                    <div className="mc-slot w-[52px] h-[52px] p-1 shrink-0 flex items-center justify-center">
                      {rewardIconSrc(reward.emoji) ? (
                        <img src={rewardIconSrc(reward.emoji)!} alt="" draggable={false} className={`w-9 h-9 mc-pixel ${!isUnlocked ? 'grayscale opacity-60' : ''}`} onError={(e) => { e.currentTarget.src = rewardIcon(reward.category); }} />
                      ) : isIconKey(reward.emoji) ? (
                        <FlashIcon name={reward.emoji} className={`w-8 h-8 ${!isUnlocked ? 'opacity-60' : ''}`} />
                      ) : (
                        <img src={rewardIcon(reward.category)} alt="" draggable={false} className={`w-9 h-9 mc-pixel ${!isUnlocked ? 'grayscale opacity-60' : ''}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[17px] font-bold leading-tight">{reward.title}</h3>
                      <p className="text-[13px] mc-muted">{reward.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <img src={GOLD} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
                        <span className="mc-num">{reward.costGold || 0}</span>
                        <span className="mc-lbl">gold</span>
                        {!isUnlocked && <span className="text-xs font-semibold mc-muted">Nível {requiredLevel}</span>}
                        {justUnlocked && <span className="mc-font text-[8px] mc-good">Novo</span>}
                        {pendingRedemption && <span className="mc-lbl mc-warn">Aguardando o pai</span>}
                        {reward.goalOnly && <span className="mc-lbl">Só pelo Cofrinho</span>}
                      </div>
                      {isConfirming && (
                        <div className="mc-card rounded p-3 mt-2">
                          <p className="text-sm text-white mb-2">
                            Trocar {reward.costGold || 0} gold por {reward.title}?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={redeeming}
                              onClick={() => void handleRedeem(reward)}
                              className="mc-btn mc-btn-gold min-h-[44px] px-4 font-bold"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="mc-btn mc-btn-stone min-h-[44px] px-4 font-bold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {!isConfirming && (
                      reward.goalOnly || missingGold(reward) > 0 ? (
                        <button
                          type="button"
                          className="mc-btn mc-btn-gold min-h-[44px] px-4 font-bold shrink-0 w-full sm:w-auto"
                          onClick={() => { playClick(); onCreateGoal?.(reward.title, reward.costGold || 0, reward.id); }}
                        >
                          Criar meta no Banco
                        </button>
                      ) : !isUnlocked ? (
                        <button type="button" disabled className="mc-btn mc-btn-stone min-h-[44px] px-4 font-bold shrink-0 w-full sm:w-auto">
                          Nível {requiredLevel}
                        </button>
                      ) : pendingRedemption ? (
                        <button type="button" disabled className="mc-btn mc-btn-stone min-h-[44px] px-4 font-bold shrink-0 w-full sm:w-auto">
                          Aguardando o pai
                        </button>
                      ) : canRedeemReward ? (
                        <button
                          type="button"
                          onClick={() => { playClick(); setConfirming(reward); }}
                          className="mc-btn mc-btn-gold min-h-[44px] px-4 font-bold shrink-0 w-full sm:w-auto"
                        >
                          Pedir
                        </button>
                      ) : dailyTasksCompleted < REDEEM_MIN_TASKS ? (
                        <button type="button" disabled className="mc-btn mc-btn-stone min-h-[44px] px-4 font-bold shrink-0 w-full sm:w-auto">
                          Faça {REDEEM_MIN_TASKS} missões
                        </button>
                      ) : (
                        <button type="button" disabled className="mc-btn mc-btn-stone min-h-[44px] px-4 font-bold shrink-0 w-full sm:w-auto">
                          Faltam {missingGold(reward)} gold
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mc-row rounded p-6 text-center">
              <img src={CHEST} alt="" className="w-14 h-14 mx-auto mb-3 mc-pixel" draggable={false} />
              {selectedFilter === 'locked' ? (
                <>
                  <p className="font-bold text-[17px]">Nenhuma recompensa bloqueada nesta categoria</p>
                  <p className="text-[13px] mc-muted mt-2">Você já desbloqueou todas.</p>
                </>
              ) : selectedFilter === 'available' ? (
                <>
                  <p className="font-bold text-[17px]">Nenhuma recompensa disponível nesta categoria</p>
                  {dailyTasksCompleted < REDEEM_MIN_TASKS ? (
                    <p className="text-[13px] mc-muted mt-2">
                      Complete {REDEEM_MIN_TASKS - dailyTasksCompleted} missões hoje para liberar as trocas.
                    </p>
                  ) : (
                    <p className="text-[13px] mc-muted mt-2">Complete mais missões para ganhar gold.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-bold text-[17px]">Nenhuma recompensa nesta categoria</p>
                  <p className="text-[13px] mc-muted mt-2">Peça para o papai adicionar algumas recompensas.</p>
                </>
              )}
            </div>
          )}
        </div>
        
        {redemptions.length > 0 && (
          <div className="p-4 border-t-4 border-[#17130f]">
            <h3 className="mc-h mb-3">
              <img src={CLOCK} alt="" className="mc-pixel" draggable={false} />
              Meus pedidos ({redemptions.length})
            </h3>
            <div className="space-y-2">
              {redemptions.slice(0, 10).map((redemption) => {
                const reward = getRewardById(redemption.rewardId);
                if (!reward) return null;
                const statusLabel =
                  redemption.status === 'pending' ? 'Aguardando' :
                  redemption.status === 'approved' ? 'Aprovado' :
                  redemption.status === 'rejected' ? 'Recusado' :
                  'Entregue';
                const statusClass =
                  redemption.status === 'pending' ? 'mc-warn' :
                  redemption.status === 'rejected' ? 'mc-bad' :
                  'mc-good';

                return (
                  <div key={redemption.id} className="mc-card rounded p-3 flex items-center gap-3">
                    <div className="mc-slot w-10 h-10 p-1 flex items-center justify-center shrink-0">
                      <img src={rewardIcon(reward.category)} alt="" draggable={false} className="w-7 h-7 mc-pixel" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-[15px]">{reward.title}</h5>
                      <p className="text-[12px] mc-muted">
                        {redemption.createdAt.toLocaleDateString('pt-BR')} às {redemption.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`mc-font text-[8px] ${statusClass}`}>{statusLabel}</div>
                      <div className="mc-lbl">-{redemption.costGold} gold</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </>
  );

  if (embedded) return <div className="text-white">{inner}</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="mc-panel rounded-lg w-full max-w-3xl max-h-[96vh] overflow-y-auto text-white"
      >
        {inner}
      </motion.div>
    </motion.div>
  );
};

export default RewardsPanel;
