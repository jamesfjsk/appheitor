import React from 'react';
import { motion } from 'framer-motion';
import { CloudLightning as Lightning, LogOut, Gift, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserProgress } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import { calculateLevelSystem, getLevelIcon } from '../../utils/levelSystem';

interface HeroHeaderProps {
  progress: UserProgress;
  onOpenRewards: () => void;
  onOpenCalendar: () => void;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({ progress, onOpenRewards, onOpenCalendar }) => {
  const { logout } = useAuth();
  const { user: currentUser } = useAuth();
  const { playClick } = useSound();
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);

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
      className="flex flex-col lg:flex-row items-center justify-between flash-card-hero p-6 gap-4"
    >
      {/* Avatar e Saudação */}
      <div className="flex items-center gap-4">
        <motion.div
          className="flash-avatar w-20 h-20 flex items-center justify-center relative"
        >
          <span className="text-3xl text-white drop-shadow-lg">⚡</span>
          <motion.div
            className="absolute -top-2 -right-2 w-8 h-8 bg-hero-accent rounded-full flex items-center justify-center border-2 border-white shadow-md wiggle"
          >
            <span className="text-lg">⭐</span>
          </motion.div>
        </motion.div>

        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl lg:text-3xl font-bold text-white hero-text-shadow"
          >
            {getGreeting()}, Heitor! ⚡
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/90 text-sm md:text-base lg:text-lg font-medium"
          >
            {getMotivationalMessage()}
          </motion.p>
        </div>
      </div>

      {/* Controles e Informações */}
      <div className="flex items-center gap-3 flex-wrap justify-center lg:justify-end">
        {/* Pontos Disponíveis */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-gradient-to-r from-hero-accent to-yellow-300 text-hero-primary px-4 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-2 border-2 border-white/30"
        >
          🪙 {progress.availableGold || 0} Gold
        </motion.div>
        
        {/* Nível */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-2 border-2 border-white/30"
        >
          <span className="text-base">{getLevelIcon(levelSystem.currentLevel)}</span>
          <Lightning className="w-4 h-4 text-hero-accent" fill="currentColor" />
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
          className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-full text-white transition-all duration-300 shadow-lg backdrop-blur-sm border-2 border-white/30"
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
          className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full text-white transition-all duration-300 shadow-lg backdrop-blur-sm border-2 border-white/30"
          title="Calendário de Missões"
        >
          <Calendar className="w-5 h-5" />
        </motion.button>

        {/* Botão Logout */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playClick();
            logout();
          }}
          className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all duration-300 backdrop-blur-sm border-2 border-white/20"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.header>
  );
};

export default HeroHeader;