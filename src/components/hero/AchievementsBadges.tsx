import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconBadge, FlashIcon, CheckMark } from '../../icons';
import toast from 'react-hot-toast';
import { Achievement } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestoreService';
import { calculateLevelSystem } from '../../utils/levelSystem';

type AchievementWithProgress = Achievement & {
  currentProgress: number;
  progressPercentage: number;
  isCompleted: boolean;
  isReadyToUnlock: boolean;
  unlockedAt?: Date;
  userAchievementId?: string;
  rewardClaimed: boolean;
};

const AchievementsBadges: React.FC = () => {
  const { achievements, userAchievements, progress, claimAchievementReward } = useData();
  const { childUid } = useAuth();
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);

  const levelSystem = calculateLevelSystem(progress.totalXP || 0);

  // Combine achievements with user progress
  const achievementsWithProgress = achievements.map(achievement => {
    const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
    
    // Calculate current progress if no user achievement exists yet
    let currentProgress = userAchievement?.progress || 0;
    if (!userAchievement) {
      switch (achievement.type) {
        case 'xp':
          currentProgress = progress.totalXP || 0;
          break;
        case 'level':
          currentProgress = levelSystem.currentLevel;
          break;
        case 'tasks':
          currentProgress = progress.totalTasksCompleted || 0;
          break;
        case 'streak':
          currentProgress = Math.max(progress.streak || 0, progress.longestStreak || 0);
          break;
        case 'checkin':
          currentProgress = progress.streak || 0;
          break;
        case 'redemptions':
          currentProgress = progress.rewardsRedeemed || 0;
          break;
        default:
          currentProgress = 0;
      }
    } else {
      // Even if userAchievement exists, recalculate current progress for real-time updates
      switch (achievement.type) {
        case 'xp':
          currentProgress = Math.max(userAchievement.progress, progress.totalXP || 0);
          break;
        case 'level':
          currentProgress = Math.max(userAchievement.progress, levelSystem.currentLevel);
          break;
        case 'tasks':
          currentProgress = Math.max(userAchievement.progress, progress.totalTasksCompleted || 0);
          break;
        case 'streak':
          currentProgress = Math.max(userAchievement.progress, Math.max(progress.streak || 0, progress.longestStreak || 0));
          break;
        case 'checkin':
          currentProgress = Math.max(userAchievement.progress, progress.streak || 0);
          break;
        case 'redemptions':
          currentProgress = Math.max(userAchievement.progress, progress.rewardsRedeemed || 0);
          break;
        default:
          currentProgress = userAchievement.progress;
      }
    }
    
    const progressPercentage = Math.min(100, (currentProgress / achievement.target) * 100);
    const isCompleted = userAchievement?.isCompleted || false;
    const isReadyToUnlock = !isCompleted && currentProgress >= achievement.target && achievement.isActive;
    
    return {
      ...achievement,
      currentProgress,
      progressPercentage,
      isCompleted,
      isReadyToUnlock,
      unlockedAt: userAchievement?.unlockedAt,
      userAchievementId: userAchievement?.id,
      rewardClaimed: userAchievement?.rewardClaimed || false
    };
  }).sort((a, b) => {
    // Sort: ready to unlock first, then completed, then by progress percentage desc
    if (a.isReadyToUnlock !== b.isReadyToUnlock) {
      return a.isReadyToUnlock ? -1 : 1;
    }
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? -1 : 1;
    }
    if (a.progressPercentage !== b.progressPercentage) {
      return b.progressPercentage - a.progressPercentage;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const completedCount = achievementsWithProgress.filter(a => a.isCompleted).length;
  const readyToUnlockCount = achievementsWithProgress.filter(a => a.isReadyToUnlock).length;
  const totalCount = achievementsWithProgress.length;

  const getTypeLabel = (type: Achievement['type']) => {
    switch (type) {
      case 'xp': return 'XP';
      case 'level': return 'Nível';
      case 'tasks': return 'Tarefas';
      case 'streak': return 'Sequência';
      case 'checkin': return 'Check-in';
      case 'custom': return 'Especial';
      default: return type;
    }
  };

  const getTypeColor = (type: Achievement['type']) => {
    switch (type) {
      case 'xp': return 'text-blue-600 bg-blue-100';
      case 'level': return 'text-purple-600 bg-purple-100';
      case 'tasks': return 'text-green-600 bg-green-100';
      case 'streak': return 'text-orange-600 bg-orange-100';
      case 'checkin': return 'text-pink-600 bg-pink-100';
      case 'custom': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="comic-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
            <FlashIcon name="trophy" className="w-5 h-5 text-amber-500" />
            Conquistas Flash
          </h3>
          <div className="flex items-center gap-2">
            {readyToUnlockCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="bg-green-500 text-white px-2 py-1 rounded-full font-bold text-xs"
              >
                {readyToUnlockCount} PRONTAS!
              </motion.div>
            )}
            <div className="bg-yellow-400 text-red-600 px-3 py-1 rounded-full font-bold text-sm">
              {completedCount}/{totalCount}
            </div>
          </div>
        </div>

        {achievementsWithProgress.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {achievementsWithProgress.map((achievement, index) => (
              <motion.button
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedAchievement(achievement)}
                className={`relative aspect-square rounded-xl p-3 transition-all duration-300 border-2 ${
                  achievement.isCompleted
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-300 border-yellow-500 shadow-lg'
                    : achievement.isReadyToUnlock
                    ? 'bg-gradient-to-br from-green-400 to-green-300 border-green-500 shadow-lg animate-pulse'
                    : achievement.progressPercentage > 0
                    ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Ready to unlock glow effect */}
                {achievement.isReadyToUnlock && (
                  <motion.div
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-br from-green-400/50 to-green-300/50 rounded-xl"
                  />
                )}

                {/* Progress ring for incomplete achievements */}
                {!achievement.isCompleted && achievement.progressPercentage > 0 && (
                  <div className="absolute inset-0 rounded-xl">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray={`${achievement.progressPercentage}, 100`}
                        className="transition-all duration-500"
                      />
                    </svg>
                  </div>
                )}

                <div className="relative z-10 flex flex-col items-center justify-center h-full px-1">
                  <FlashIcon
                    name={achievement.icon}
                    className={`w-8 h-8 ${
                      !achievement.isCompleted && !achievement.isReadyToUnlock ? 'opacity-55 grayscale' : ''
                    }`}
                  />

                  {!achievement.isCompleted && !achievement.isReadyToUnlock && achievement.progressPercentage === 0 && (
                    <span className="absolute bottom-1 right-1">
                      <FlashIcon name="lock" className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {!achievement.isCompleted && achievement.progressPercentage > 0 && (
                    <div className="mt-0.5 text-[10px] font-bold text-blue-700 leading-none">
                      {Math.round(achievement.progressPercentage)}%
                    </div>
                  )}

                  {achievement.isCompleted && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-0.5 right-0.5 z-20 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
                    >
                      <CheckMark className="w-3 h-3 text-white" />
                    </motion.span>
                  )}

                  {/* Ready to unlock badge */}
                  {achievement.isReadyToUnlock && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="absolute -top-2 -left-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold"
                    >
                      PRONTA!
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mb-2 flex justify-center">
              <IconBadge name="trophy" size={56} />
            </div>
            <p className="text-gray-600 text-sm">
              Nenhuma conquista criada ainda
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Peça para o papai criar algumas conquistas!
            </p>
          </div>
        )}
      </motion.div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className={`p-6 text-center ${
                selectedAchievement.isCompleted
                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-300 text-red-600'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              }`}>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <motion.div
                  animate={selectedAchievement.isCompleted ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: selectedAchievement.isCompleted ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                  className="text-6xl mb-4"
                >
                  {selectedAchievement.icon}
                </motion.div>

                <h3 className="text-2xl font-bold mb-2">
                  {selectedAchievement.title}
                </h3>
                
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAchievement.isCompleted
                    ? 'bg-red-600/20 text-red-800'
                    : selectedAchievement.isReadyToUnlock
                    ? 'bg-white/20 text-white'
                    : selectedAchievement.isReadyToUnlock
                    ? 'bg-gradient-to-br from-green-400 to-green-300 text-white'
                    : 'bg-white/20 text-white'
                }`}>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTypeColor(selectedAchievement.type)}`}>
                    {getTypeLabel(selectedAchievement.type)}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 text-center mb-6 leading-relaxed">
                  {selectedAchievement.description}
                </p>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Progresso</span>
                    <span className="text-sm text-gray-600">
                      {selectedAchievement.currentProgress}/{selectedAchievement.target}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedAchievement.progressPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full relative overflow-hidden ${
                        selectedAchievement.isCompleted
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                    >
                      {selectedAchievement.progressPercentage > 0 && (
                        <motion.div
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-white/30 rounded-full"
                        />
                      )}
                    </motion.div>
                  </div>
                  
                  <div className="text-center mt-2">
                    <span className={`text-lg font-bold ${
                      selectedAchievement.isCompleted ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {Math.round(selectedAchievement.progressPercentage)}%
                    </span>
                  </div>
                </div>

                {/* Rewards */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-center">
                    Recompensas
                  </h4>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 font-bold">
                        <FlashIcon name="bolt" className="w-4 h-4" />
                        +{selectedAchievement.xpReward}
                      </div>
                      <div className="text-xs text-gray-600">XP</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-yellow-600 font-bold">
                        <FlashIcon name="star" className="w-4 h-4" />
                        +{selectedAchievement.goldReward}
                      </div>
                      <div className="text-xs text-gray-600">Gold</div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="text-center">
                  {selectedAchievement.isCompleted ? (
                    selectedAchievement.rewardClaimed ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                        <FlashIcon name="check" className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="font-bold text-green-900">Recompensa Resgatada!</p>
                        {selectedAchievement.unlockedAt && (
                          <p className="text-sm text-green-700 mt-1">
                            {selectedAchievement.unlockedAt.toLocaleDateString('pt-BR')} às {selectedAchievement.unlockedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
                        <FlashIcon name="star" className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                        <p className="font-bold text-yellow-900">Conquista Desbloqueada!</p>
                        {selectedAchievement.unlockedAt && (
                          <p className="text-sm text-yellow-700 mt-1">
                            {selectedAchievement.unlockedAt.toLocaleDateString('pt-BR')} às {selectedAchievement.unlockedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            try {
                              if (selectedAchievement.userAchievementId) {
                                await claimAchievementReward(selectedAchievement.userAchievementId);
                              } else {
                                // Create user achievement first if it doesn't exist
                                const newUserAchievementId = await FirestoreService.createUserAchievement({
                                  userId: childUid!,
                                  achievementId: selectedAchievement.id,
                                  progress: selectedAchievement.currentProgress,
                                  isCompleted: true,
                                  rewardClaimed: false,
                                  unlockedAt: new Date()
                                });
                                await claimAchievementReward(newUserAchievementId);
                              }
                              setSelectedAchievement(null);
                            } catch (error) {
                              console.error('🏆 Error claiming achievement reward:', error);
                            }
                          }}
                          className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-red-600 rounded-lg font-bold transition-all duration-200 shadow-lg"
                        >
                          <FlashIcon name="star" className="w-4 h-4 inline mr-2" />
                          Resgatar Recompensa
                        </motion.button>
                      </div>
                    )
                  ) : selectedAchievement.isReadyToUnlock ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <FlashIcon name="star" className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      </motion.div>
                      <p className="font-bold text-green-900">Pronta para Desbloquear!</p>
                      <p className="text-sm text-green-700">
                        Você atingiu a meta de {selectedAchievement.target}!
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          try {
                            if (selectedAchievement.userAchievementId) {
                              // Update existing user achievement to completed
                              await FirestoreService.updateUserAchievement(selectedAchievement.userAchievementId, {
                                progress: selectedAchievement.currentProgress,
                                isCompleted: true,
                                unlockedAt: new Date(),
                                updatedAt: new Date()
                              });
                            } else {
                              // Create new user achievement
                              await FirestoreService.createUserAchievement({
                                userId: childUid!,
                                achievementId: selectedAchievement.id,
                                progress: selectedAchievement.currentProgress,
                                isCompleted: true,
                                rewardClaimed: false,
                                unlockedAt: new Date()
                              });
                            }
                            setSelectedAchievement(null);
                            toast.success(`🏆 Conquista desbloqueada: ${selectedAchievement.title}!`);
                          } catch (error) {
                            console.error('🏆 Error unlocking achievement:', error);
                            toast.error('Erro ao desbloquear conquista');
                          }
                        }}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-all duration-200 shadow-lg"
                      >
                        <FlashIcon name="star" className="w-4 h-4 inline mr-2" />
                        Desbloquear Agora!
                      </motion.button>
                    </div>
                  ) : selectedAchievement.progressPercentage > 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <FlashIcon name="target" className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-bold text-blue-900">Em Progresso</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Faltam {selectedAchievement.target - selectedAchievement.currentProgress} para completar
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <FlashIcon name="lock" className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-bold text-gray-700">Ainda Bloqueada</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Continue progredindo para desbloquear!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AchievementsBadges;