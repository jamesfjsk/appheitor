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
      className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 text-center border-2 border-white/30 shadow-2xl"
    >
      {/* Avatar Principal */}
      <div className="relative mb-4">
        <motion.div
          animate={{ 
            boxShadow: isAnimating 
              ? ["0 0 0 0 rgba(255, 215, 0, 0.7)", "0 0 0 20px rgba(255, 215, 0, 0)", "0 0 0 0 rgba(255, 215, 0, 0)"]
              : "0 0 20px rgba(255, 215, 0, 0.3)"
          }}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${getLevelColor(level)} flex items-center justify-center relative overflow-hidden border-4 border-hero-accent`}
        >
          {/* Raio do Flash */}
          <motion.div
            animate={isAnimating ? { 
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            } : {}}
            transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0 }}
          >
            <Zap className="w-16 h-16 text-hero-accent drop-shadow-lg" />
          </motion.div>

          {/* Efeitos de velocidade */}
          {isAnimating && (
            <>
              <motion.div
                animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: 0.1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
              />
              <motion.div
                animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: 0.3 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-hero-accent/50 to-transparent skew-x-12"
              />
            </>
          )}
        </motion.div>

        {/* Ícone de nível */}
        <motion.div
          animate={isAnimating ? { rotate: [0, 360] } : {}}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg border-2 border-hero-accent"
        >
          {getLevelIconComponent()}
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
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-hero-accent rounded-full"
              />
            ))}
          </div>
        )}
      </div>

      {/* Informações do nível */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">
          {levelSystem.levelTitle}
        </h3>
        <div className="flex items-center justify-center space-x-2 text-hero-accent font-semibold">
          <span>Nível {levelSystem.currentLevel}</span>
          <span>•</span>
          <span>{levelSystem.currentXP} XP</span>
        </div>

        {/* Barra de progresso para próximo nível */}
        {!levelSystem.isMaxLevel && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-white/80 mb-1">
              <span>Próximo nível</span>
              <span>{Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel)}/{Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelSystem.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${getLevelColor(levelSystem.currentLevel)} rounded-full`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mensagem motivacional */}
      <motion.div
        animate={currentExpression === 'super' ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: 2 }}
        className="mt-4 text-white/90 text-sm font-medium"
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