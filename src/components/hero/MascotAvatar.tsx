import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Star, Crown, Shield } from 'lucide-react';
import { calculateLevelSystem, getLevelTitle, getLevelColor, getLevelIcon, getAvatarBorderStyle } from '../../utils/levelSystem';

interface MascotAvatarProps {
  level: number;
  totalXP: number;
  isAnimating: boolean;
}

const MascotAvatar: React.FC<MascotAvatarProps> = ({ level, totalXP, isAnimating }) => {
  const [currentExpression, setCurrentExpression] = useState<'happy' | 'excited' | 'super'>('happy');
  const levelSystem = calculateLevelSystem(totalXP);
  const borderStyle = getAvatarBorderStyle(level);

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
      className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 text-center"
    >
      {/* Avatar Principal */}
      <div className="relative mb-4">
        <motion.div
          animate={{ 
            boxShadow: isAnimating 
              ? ["0 0 0 0 rgba(255, 215, 0, 0.7)", "0 0 0 20px rgba(255, 215, 0, 0)", "0 0 0 0 rgba(255, 215, 0, 0)"]
              : "0 0 30px rgba(255, 215, 0, 0.4)"
          }}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${getLevelColor(level)} flex items-center justify-center relative overflow-hidden ${borderStyle.borderClass} ${borderStyle.glowClass} ${borderStyle.ringClass}`}
        >
          {/* Foto de perfil do Heitor */}
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThmdGPdw5KIVi5gQ-UWFdptTPziXMRjk6phx4Noy3Toh9Nu_nbnP-YZGe9sdfP0jrVakc&usqp=CAU"
            alt="Avatar do Heitor"
            className="w-full h-full object-cover rounded-full"
          />
          
          {/* Efeitos especiais para níveis altos */}
          {borderStyle.tier >= 10 && (
            <motion.div
              animate={{
                rotate: [0, 360],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -inset-6 border border-yellow-400/20 rounded-full"
            />
          )}
          
          {borderStyle.tier >= 15 && (
            <motion.div
              animate={{
                rotate: [360, 0],
                opacity: [0.1, 0.4, 0.1],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -inset-8 border border-purple-400/15 rounded-full"
            />
          )}
          
          {/* Campo de energia ao redor do avatar */}
          {!isAnimating && (
            <motion.div
              animate={{
                rotate: [0, 360],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -inset-4 border border-yellow-400/20 rounded-full"
            />
          )}
          
          {/* Raio do Flash */}
          {/* Overlay do raio do Flash sobre a foto */}
          <motion.div
            animate={isAnimating ? { 
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            } : {}}
            transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full"
          >
            <Zap className="w-16 h-16 text-hero-accent drop-shadow-2xl relative z-10" />
          </motion.div>

          {/* Efeitos de velocidade */}
          {isAnimating && (
            <>
              {/* Raios de energia intensos */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: [0, 0.6, 0],
                    scale: [0.5, 1.5, 0.5],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                  className="absolute w-1 h-8 bg-gradient-to-b from-yellow-400 to-transparent transform-gpu"
                  style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: '50% 40px',
                    transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                    filter: 'blur(0.5px)'
                  }}
                />
              ))}
              
              <motion.div
                animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: 0.1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-12 rounded-full"
              />
              <motion.div
                animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: 0.3 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-hero-accent/70 to-transparent skew-x-12 rounded-full"
              />
            </>
          )}
        </motion.div>

        {/* Ícone de nível */}
        <motion.div
          animate={isAnimating ? { rotate: [0, 360] } : {}}
          transition={{ duration: 1, repeat: isAnimating ? Infinity : 0 }}
          className={`absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg ${borderStyle.tier >= 5 ? 'border-3 border-yellow-400' : 'border-2 border-hero-accent'}`}
        >
          {getLevelIconComponent()}
        </motion.div>
        
        {/* Partículas flutuantes */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Partículas principais */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: [0, (Math.random() - 0.5) * 200],
                  y: [0, (Math.random() - 0.5) * 200],
                  rotate: [0, 360]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                className={`absolute top-1/2 left-1/2 w-3 h-3 rounded-full ${
                  i % 3 === 0 ? 'bg-yellow-400' : 
                  i % 3 === 1 ? 'bg-red-400' : 'bg-white'
                }`}
                style={{
                  filter: 'blur(0.5px)',
                  boxShadow: '0 0 8px currentColor'
                }}
              />
            ))}
            
            {/* Mini raios */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`mini-lightning-${i}`}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1.2, 0.5],
                  rotate: [0, 180]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
                className="absolute top-1/2 left-1/2 text-yellow-400 text-sm transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(-50%, -50%) translate(${(Math.random() - 0.5) * 100}px, ${(Math.random() - 0.5) * 100}px)`,
                  filter: 'drop-shadow(0 0 4px currentColor)'
                }}
              >
                ⚡
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </motion.div>
  );
};

export default MascotAvatar;