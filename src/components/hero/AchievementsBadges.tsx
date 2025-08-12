import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Star, Target, Zap } from 'lucide-react';
import { Achievement, UserAchievement } from '../../types';
import { useData } from '../../contexts/DataContext';

interface AchievementsBadgesProps {}

const AchievementsBadges: React.FC<AchievementsBadgesProps> = () => {
  const { achievements, userAchievements, progress } = useData();

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
          currentProgress = progress.level || 1;
          break;
        case 'tasks':
          currentProgress = progress.totalTasksCompleted || 0;
          break;
        case 'streak':
          currentProgress = progress.longestStreak || 0;
          break;
        case 'checkin':
          currentProgress = progress.streak || 0;
          break;
        default:
          currentProgress = 0;
      }
    }
    
    const progressPercentage = Math.min(100, (currentProgress / achievement.target) * 100);
    const isCompleted = userAchievement?.isCompleted || false;
    const isNewlyUnlocked = userAchievement?.unlockedAt && 
      (new Date().getTime() - userAchievement.unlockedAt.getTime()) < 10000; // Last 10 seconds
    
    return {
      ...achievement,
      currentProgress,
      progressPercentage,
      isCompleted,
      isNewlyUnlocked,
      unlockedAt: userAchievement?.unlockedAt
    };
  }).sort((a, b) => {
    // Sort: completed first, then by progress percentage, then by creation date
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? -1 : 1;
    }
    if (a.progressPercentage !== b.progressPercentage) {
      return b.progressPercentage - a.progressPercentage;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const completedCount = achievementsWithProgress.filter(a => a.isCompleted).length;
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
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Conquistas Flash
        </h3>
        <div className="bg-yellow-400 text-red-600 px-3 py-1 rounded-full font-bold text-sm">
          {completedCount}/{totalCount}
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {achievementsWithProgress.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl transition-all duration-300 relative overflow-hidden ${
                achievement.isCompleted
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-300 text-red-600 shadow-lg'
                  : 'bg-gray-50 text-gray-700 border border-gray-200'
              }`}
            >
              {/* Newly unlocked glow effect */}
              {achievement.isNewlyUnlocked && (
                <motion.div
                  animate={{
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.02, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-yellow-400/50 to-yellow-300/50 rounded-xl"
                />
              )}

              <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    achievement.isCompleted
                      ? 'bg-red-600 text-yellow-400'
                      : 'bg-white/50 text-gray-400'
                  }`}>
                    {achievement.isCompleted ? (
                      <motion.span
                        animate={achievement.isNewlyUnlocked ? {
                          scale: [1, 1.3, 1],
                          rotate: [0, 15, -15, 0]
                        } : {}}
                        transition={{
                          duration: 1,
                          repeat: achievement.isNewlyUnlocked ? 3 : 0,
                          ease: "easeInOut"
                        }}
                        className="text-xl"
                      >
                        {achievement.icon}
                      </motion.span>
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-sm">{achievement.title}</h4>
                        <p className="text-xs opacity-80 leading-relaxed">{achievement.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(achievement.type)}`}>
                          {getTypeLabel(achievement.type)}
                        </span>
                        {achievement.isNewlyUnlocked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="bg-red-600 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold"
                          >
                            NOVO!
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {!achievement.isCompleted && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{achievement.currentProgress}/{achievement.target}</span>
                          <span>{Math.round(achievement.progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-white/30 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${achievement.progressPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full relative overflow-hidden"
                          >
                            {achievement.progressPercentage > 0 && (
                              <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-white/30 rounded-full"
                              />
                            )}
                          </motion.div>
                        </div>
                      </div>
                    )}
                    
                    {/* Rewards */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-xs">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span>+{achievement.xpReward} XP</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>+{achievement.goldReward} Gold</span>
                      </div>
                      {achievement.isCompleted && achievement.unlockedAt && (
                        <div className="text-xs opacity-70">
                          {achievement.unlockedAt.toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {achievementsWithProgress.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-gray-600 text-sm">
            Nenhuma conquista criada ainda
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Peça para o papai criar algumas conquistas!
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default AchievementsBadges;