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
      className="flash-card-hero p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Trophy className="w-6 h-6 text-hero-accent drop-shadow-md" />
          Conquistas
        </h3>
        <div className="bg-gradient-to-r from-hero-accent to-yellow-300 text-hero-primary px-3 py-1 rounded-full font-bold text-sm shadow-md border-2 border-white/30">
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
            className={`achievement-badge transition-all duration-300 ${
              achievement.isUnlocked
                ? ''
                : 'locked'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                achievement.isUnlocked
                  ? 'bg-white text-hero-primary'
                  : 'bg-white/20 text-white/50'
              }`}>
                {achievement.isUnlocked ? (
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
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

              <div className="flex-1">
                <h4 className={`font-bold text-sm ${achievement.isUnlocked ? 'text-white' : 'text-white/70'}`}>
                  {achievement.title}
                </h4>
                <p className={`text-xs ${achievement.isUnlocked ? 'text-white/90' : 'text-white/60'}`}>
                  {achievement.description}
                </p>
              </div>

              {achievement.isUnlocked && achievement.unlockedAt && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="text-xs bg-gradient-to-r from-success-500 to-success-600 text-white px-2 py-1 rounded-full font-bold shadow-sm"
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
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-white text-sm font-medium">
            Complete missões para desbloquear conquistas!
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default AchievementsBadges;