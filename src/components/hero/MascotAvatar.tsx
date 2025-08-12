import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Star, Crown, Shield } from 'lucide-react';
import { calculateLevelSystem, getLevelTitle, getLevelColor, getLevelIcon } from '../../utils/levelSystem';

interface MascotAvatarProps {
  level: number;
  totalXP: number;
  isAnimating: boolean;
}

const MascotAvatar: React.FC<MascotAvatarProps> = ({ level, totalXP, isAnimating }) => {
  const [currentExpression, setCurrentExpression] = useState<'happy' | 'excited' | 'super'>('happy');
  const levelSystem = calculateLevelSystem(totalXP);

  useEffect(() => {
    if (isAnimating) {
      setCurrentExpression('super');
      const timer = setTimeout(() => setCurrentExpression('excited'), 2000);
      return () => clearTimeout(timer);
    } else if (totalXP > 50) {
      setCurrentExpression('excited');
    } else {
      setCurrentExpression('happy');
    }
  }, [isAnimating, totalXP]);

  const getLevelIconComponent = () => {
    const iconEmoji = getLevelIcon(level);
    return <span className="text-2xl">{iconEmoji}</span>;
  };

  return (
    <motion.div
      animate={isAnimating ? { 
        scale: [1, 1.1, 1], 
        rotate: [0, 5, -5, 0],
        y: [0, -10, 0]
      } : {}}
      transition={{ duration: 0.6, repeat: isAnimating ? 3 : 0 }}
      className="card-hero text-center"
    >
      {/* Avatar Principal */}
      <div className="relative mb-4">
        <motion.div
          animate={{ 
            scale: isAnimating ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className="w-24 h-24 mx-auto bg-flash-red rounded-full flex items-center justify-center relative shadow-elevated"
        >
          {/* Raio do Flash */}
          <motion.div
            animate={isAnimating ? { 
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            } : {}}
            transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0 }}
          >
            <Zap className="w-12 h-12 text-white" fill="currentColor" />
          </motion.div>
        </motion.div>

        {/* Ícone de nível */}
        <motion.div
          animate={isAnimating ? { rotate: [0, 360] } : {}}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className="absolute -top-2 -right-2 bg-gold-500 rounded-full p-2 shadow-normal border-2 border-white"
        >
          <span className="text-sm">{getLevelIconComponent()}</span>
        </motion.div>
      </div>

      {/* Informações do nível */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900">
          {levelSystem.levelTitle}
        </h3>
        <div className="flex items-center justify-center space-x-2 text-gray-700 font-semibold bg-gray-100 rounded-lg px-3 py-1 text-sm">
          <span>Nível {levelSystem.currentLevel}</span>
          <span>•</span>
          <span>{levelSystem.currentXP} XP</span>
        </div>

        {/* Barra de progresso para próximo nível */}
        {!levelSystem.isMaxLevel && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2 font-medium">
              <span>Próximo nível</span>
              <span>{Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel)}/{Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel)}</span>
            </div>
            <div className="progress-bar">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelSystem.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="progress-fill"
              />
            </div>
          </div>
        )}
      </div>

      {/* Mensagem motivacional */}
      <motion.div
        animate={currentExpression === 'super' ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: 2 }}
        className="mt-6 text-gray-700 text-sm font-semibold bg-gray-100 rounded-lg p-3 border border-gray-200"
      >
        {currentExpression === 'super' && levelSystem.isMaxLevel && "Flash Master Supremo!"}
        {currentExpression === 'super' && !levelSystem.isMaxLevel && "Você é incrível!"}
        {currentExpression === 'excited' && "Continue assim, velocista!"}
        {currentExpression === 'happy' && "Pronto para a ação!"}
      </motion.div>
    </motion.div>
  );
};

export default MascotAvatar;