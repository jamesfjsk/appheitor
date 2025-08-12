import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { Achievement } from '../../types';

interface AchievementsBadgesProps {
  achievements?: Achievement[];
}

const AchievementsBadges: React.FC<AchievementsBadgesProps> = ({ achievements }) => {
  const unlockedAchievements = (achievements || []).filter(achievement => achievement.isUnlocked);

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
          Conquistas
        </h3>
        <div className="bg-yellow-400 text-red-600 px-3 py-1 rounded-full font-bold text-sm">
          {unlockedAchievements.length}/{(achievements || []).length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {(achievements || []).map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className={`p-3 rounded-xl transition-all duration-300 ${
              achievement.isUnlocked
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-300 text-red-600'
                : 'bg-gray-50 text-gray-500 border border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                achievement.isUnlocked
                  ? 'bg-red-600 text-yellow-400'
                  : 'bg-white/20 text-white/40'
              }`}>
                {achievement.isUnlocked ? (
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="text-lg"
                  >
                    {achievement.icon}
                  </motion.span>
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-sm">{achievement.title}</h4>
                <p className="text-xs opacity-80">{achievement.description}</p>
              </div>

              {achievement.isUnlocked && achievement.unlockedAt && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="text-xs bg-red-600 text-yellow-400 px-2 py-1 rounded-full font-bold"
                >
                  NOVO!
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {(achievements || []).length === 0 && (
        <div className="text-center py-6">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-gray-600 text-sm">
            Complete missões para desbloquear conquistas!
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default AchievementsBadges;