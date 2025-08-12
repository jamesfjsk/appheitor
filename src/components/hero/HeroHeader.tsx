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
      className="hero-header"
    >
      {/* Avatar e Saudação */}
      <div className="flex items-center gap-4">
        <motion.div
          className="hero-avatar"          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Lightning className="w-6 h-6" fill="currentColor" />
        </motion.div>

        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl font-bold text-gray-900"
          >
            {getGreeting()}, Heitor!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 text-sm md:text-base"
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
          className="gold-display"
        >
          <span className="text-gold-500">🪙</span> {progress.availableGold || 0} Gold
        </motion.div>
        
        {/* Nível */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="level-badge"
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
          className="p-3 bg-flash-red hover:bg-flash-red-dark rounded-full text-white transition-all duration-300 shadow-md"
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
          className="p-3 bg-flash-red hover:bg-flash-red-dark rounded-full text-white transition-all duration-300 shadow-md"
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
          className="btn-ghost"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.header>
  );
};

export default HeroHeader;