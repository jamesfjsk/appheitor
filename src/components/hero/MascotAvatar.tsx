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
      className="flash-card-hero p-8 text-center relative overflow-hidden"
    >
      {/* Avatar Principal */}
      <div className="relative mb-4">
        <motion.div
          animate={{ 
            boxShadow: isAnimating 
              ? ["0 0 0 0 rgba(255, 217, 61, 0.7)", "0 0 0 30px rgba(255, 217, 61, 0)", "0 0 0 0 rgba(255, 217, 61, 0)"]
              : "0 0 25px rgba(255, 217, 61, 0.4)"
          }}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className="flash-avatar w-36 h-36 mx-auto flex items-center justify-center relative"
        >
          {/* Raio do Flash */}
          <motion.div
            animate={isAnimating ? { 
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            } : {}}
            transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0 }}
          >
            <Zap className="w-20 h-20 text-white drop-shadow-lg" />
          </motion.div>

          {/* Efeitos de velocidade */}
          {isAnimating && (
            <>
              <motion.div
                animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: 0.1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
              />
              <motion.div
                animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: 0.3 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-hero-accent/40 to-transparent skew-x-12"
              />
            </>
          )}
        </motion.div>

        {/* Ícone de nível */}
        <motion.div
          animate={isAnimating ? { rotate: [0, 360] } : {}}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className="absolute -top-3 -right-3 bg-gradient-to-r from-hero-accent to-yellow-300 rounded-full p-3 shadow-lg border-2 border-white"
        >
          <span className="text-xl">{getLevelIconComponent()}</span>
        </motion.div>

        {/* Partículas flutuantes */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [0, Math.random() * 100 - 50],
                  y: [0, Math.random() * 100 - 50]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="absolute top-1/2 left-1/2 w-3 h-3 bg-gradient-to-r from-hero-accent to-white rounded-full shadow-sm"
              />
            ))}
          </div>
        )}
      </div>

      {/* Informações do nível */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white hero-text-shadow">
          {levelSystem.levelTitle}
        </h3>
        <div className="flex items-center justify-center space-x-2 text-white font-semibold bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
          <span>Nível {levelSystem.currentLevel}</span>
          <span>•</span>
          <span>{levelSystem.currentXP} XP</span>
        </div>

        {/* Barra de progresso para próximo nível */}
        {!levelSystem.isMaxLevel && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-white/90 mb-2 font-medium">
              <span>Próximo nível</span>
              <span>{Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel)}/{Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel)}</span>
            </div>
            <div className="progress-bar h-3">
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
        className="mt-6 text-white text-sm font-semibold bg-white/20 backdrop-blur-sm rounded-lg p-3"
      >
        {currentExpression === 'super' && levelSystem.isMaxLevel && "👑 Flash Master Supremo!"}
        {currentExpression === 'super' && !levelSystem.isMaxLevel && "🔥 Você é incrível!"}
        {currentExpression === 'excited' && "⚡ Continue assim, velocista!"}
        {currentExpression === 'happy' && "🌟 Pronto para a ação!"}
      </motion.div>
    </motion.div>
  );
};

export default MascotAvatar;