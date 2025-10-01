import React from 'react';
import { motion } from 'framer-motion';

interface SpeedForceProps {
  intensity?: 'low' | 'medium' | 'high' | 'ultra';
  className?: string;
}

const SpeedForce: React.FC<SpeedForceProps> = ({ intensity = 'medium', className = '' }) => {
  const getIntensityConfig = () => {
    switch (intensity) {
      case 'low':
        return { particles: 6, speed: 3, opacity: 0.15 };
      case 'medium':
        return { particles: 10, speed: 2, opacity: 0.25 };
      case 'high':
        return { particles: 15, speed: 1.5, opacity: 0.35 };
      case 'ultra':
        return { particles: 20, speed: 1, opacity: 0.45 };
      default:
        return { particles: 10, speed: 2, opacity: 0.25 };
    }
  };

  const config = getIntensityConfig();

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Speed Force Lightning Streaks */}
      {[...Array(config.particles)].map((_, i) => {
        const delay = (i * config.speed) / config.particles;
        const yOffset = (i / config.particles) * 100;

        return (
          <motion.div
            key={`streak-${i}`}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{
              x: ['0%', '200%'],
              opacity: [0, config.opacity, config.opacity, 0]
            }}
            transition={{
              duration: config.speed,
              repeat: Infinity,
              delay,
              ease: 'linear'
            }}
            className="absolute w-full h-0.5"
            style={{
              top: `${yOffset}%`,
              background: `linear-gradient(90deg,
                transparent 0%,
                rgba(255, 215, 0, ${config.opacity}) 20%,
                rgba(255, 49, 49, ${config.opacity * 0.8}) 50%,
                rgba(255, 215, 0, ${config.opacity}) 80%,
                transparent 100%
              )`,
              transform: `skewX(-30deg)`,
              filter: 'blur(0.5px)',
              boxShadow: `0 0 10px rgba(255, 215, 0, ${config.opacity})`
            }}
          />
        );
      })}

      {/* Energy Particles */}
      {[...Array(Math.floor(config.particles / 2))].map((_, i) => {
        const delay = (i * config.speed * 0.5) / config.particles;
        const yStart = Math.random() * 100;

        return (
          <motion.div
            key={`particle-${i}`}
            initial={{ x: '0%', y: `${yStart}%`, scale: 0, opacity: 0 }}
            animate={{
              x: ['0%', '100%'],
              y: [`${yStart}%`, `${yStart + (Math.random() - 0.5) * 20}%`],
              scale: [0, 1, 0.8, 0],
              opacity: [0, 1, 1, 0]
            }}
            transition={{
              duration: config.speed * 1.5,
              repeat: Infinity,
              delay,
              ease: 'easeOut'
            }}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `radial-gradient(circle,
                rgba(255, 215, 0, ${config.opacity * 1.5}) 0%,
                rgba(255, 49, 49, ${config.opacity}) 50%,
                transparent 100%
              )`,
              filter: `blur(${intensity === 'ultra' ? 2 : 1}px)`,
              boxShadow: `0 0 ${intensity === 'ultra' ? 20 : 10}px rgba(255, 215, 0, ${config.opacity})`
            }}
          />
        );
      })}

      {/* Lightning Bolts */}
      {intensity !== 'low' && [...Array(3)].map((_, i) => {
        const delay = i * (config.speed / 3);

        return (
          <motion.div
            key={`bolt-${i}`}
            initial={{ x: '100%', opacity: 0, scale: 0 }}
            animate={{
              x: ['-20%', '120%'],
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1, 1, 0.5],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: config.speed * 0.8,
              repeat: Infinity,
              delay,
              ease: 'easeInOut'
            }}
            className="absolute top-1/2 -translate-y-1/2 text-6xl"
            style={{
              filter: `drop-shadow(0 0 ${intensity === 'ultra' ? 30 : 15}px rgba(255, 215, 0, ${config.opacity * 2}))`,
              color: 'rgba(255, 215, 0, 0.9)'
            }}
          >
            ⚡
          </motion.div>
        );
      })}

      {/* Vortex Effect (Ultra only) */}
      {intensity === 'ultra' && (
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center,
              transparent 0%,
              rgba(255, 215, 0, 0.05) 30%,
              rgba(255, 49, 49, 0.05) 60%,
              transparent 100%
            )`
          }}
        />
      )}
    </div>
  );
};

export default SpeedForce;
