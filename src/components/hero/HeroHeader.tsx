import React from 'react';
import { motion } from 'framer-motion';
import { CloudLightning as Lightning, LogOut, Gift, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserProgress } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import { calculateLevelSystem, getLevelIcon, getAvatarBorderStyle } from '../../utils/levelSystem';
import SpeedForce from './SpeedForce';

interface HeroHeaderProps {
  progress: UserProgress;
  onOpenRewards: () => void;
  onOpenCalendar: () => void;
  onOpenTimer: () => void;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({ progress, onOpenRewards, onOpenCalendar, onOpenTimer }) => {
  const { logout } = useAuth();
  const { user: currentUser } = useAuth();
  const { playClick } = useSound();
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  const borderStyle = getAvatarBorderStyle(levelSystem.currentLevel);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getMotivationalMessage = () => {
    const messages = [
      '⚡ Pronto para mais aventuras?',
      '🏃‍♂️ A velocidade está no seu sangue!',
      '💪 Cada missão te deixa mais forte!',
      '🌟 Você é incrível como o Flash!',
      '🔥 Vamos acelerar hoje!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col lg:flex-row items-center justify-between glass-card particles-bg rounded-2xl shadow-lg p-6 gap-4 relative overflow-hidden"
    >
      <SpeedForce intensity="low" />
      {/* Avatar e Saudação */}
      <div className="flex items-center gap-4">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div className={`w-16 h-16 bg-gradient-to-br from-hero-primary to-hero-secondary rounded-full flex items-center justify-center text-2xl font-bold text-yellow-400 overflow-hidden energy-glow ${borderStyle.borderClass} ${borderStyle.glowClass} ${borderStyle.ringClass}`}>
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThmdGPdw5KIVi5gQ-UWFdptTPziXMRjk6phx4Noy3Toh9Nu_nbnP-YZGe9sdfP0jrVakc&usqp=CAU"
              alt="Avatar do Heitor"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          
          {/* Efeitos especiais para níveis altos */}
          {borderStyle.tier >= 15 && (
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -inset-2 border-2 border-purple-400/30 rounded-full"
            />
          )}
          
          {borderStyle.tier >= 18 && (
            <motion.div
              animate={{
                rotate: [360, 0],
                scale: [1.1, 1.3, 1.1],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -inset-4 border border-pink-400/20 rounded-full"
            />
          )}
          
          {/* Partículas orbitais para níveis supremos */}
          {borderStyle.tier >= 20 && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: [0, 360],
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.4, 0.8, 0.4]
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.5
                  }}
                  className="absolute w-2 h-2 bg-purple-400 rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: '50% 50px',
                    transform: `translate(-50%, -50%) rotate(${i * 60}deg)`
                  }}
                />
              ))}
            </>
          )}
          
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center"
          >
            ⭐
          </motion.div>
        </motion.div>

        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hero-title text-2xl md:text-3xl lg:text-4xl text-gray-900"
          >
            {getGreeting()}, Heitor! ⚡
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="hero-subtitle text-gray-600 text-base md:text-lg lg:text-xl"
          >
            {getMotivationalMessage()}
          </motion.p>
        </div>
      </div>

      {/* Controles e Informações */}
      <div className="flex items-center gap-3 flex-wrap justify-center lg:justify-end">
        {/* Streak */}
        {progress.streak > 0 && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-1"
            title={`Maior sequência: ${progress.longestStreak || 0} dias`}
          >
            🔥 {progress.streak} {progress.streak === 1 ? 'dia' : 'dias'}
          </motion.div>
        )}

        {/* Pontos Disponíveis */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-yellow-500 text-white px-3 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-1"
        >
          🪙 {progress.availableGold || 0} Gold
        </motion.div>

        {/* Nível */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-yellow-400 text-red-600 px-3 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-1"
        >
          <span className="text-base">{getLevelIcon(levelSystem.currentLevel)}</span>
          <Lightning className="w-4 h-4" fill="currentColor" />
          Nível {levelSystem.currentLevel}
        </motion.div>

        {/* Botão Recompensas */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playClick();
            onOpenRewards();
          }}
          className="p-2 bg-purple-500 hover:bg-purple-600 rounded-full text-white transition-all duration-200 shadow-lg btn-glow"
          title="Loja de Recompensas"
        >
          <Gift className="w-5 h-5" />
        </motion.button>

        {/* Botão Calendário */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playClick();
            onOpenCalendar();
          }}
          className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-all duration-200 shadow-lg btn-glow"
          title="Calendário de Missões"
        >
          <Calendar className="w-5 h-5" />
        </motion.button>

        {/* Botão Timer */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playClick();
            onOpenTimer();
          }}
          className="p-2 bg-gradient-to-r from-hero-primary to-hero-secondary hover:from-hero-secondary hover:to-hero-primary rounded-full text-white transition-all duration-200 shadow-lg btn-glow lightning-bolt"
          title="Flash Timer"
        >
          <Clock className="w-5 h-5" />
        </motion.button>

        {/* Botão Logout */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playClick();
            logout();
          }}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all duration-200"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.header>
  );
};

export default HeroHeader;