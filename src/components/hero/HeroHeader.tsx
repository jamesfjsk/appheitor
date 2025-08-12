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
      className="flex flex-col lg:flex-row items-center justify-between bg-white rounded-2xl shadow-lg border border-gray-100 p-6 gap-4"
    >
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
          <div className="w-16 h-16 bg-gradient-to-br from-hero-primary to-hero-secondary rounded-full flex items-center justify-center text-2xl font-bold text-yellow-400 shadow-lg overflow-hidden border-3 border-hero-accent">
            {currentUser?.photoURL ? (
              <img 
                src="https://occ-0-8407-90.1.nflxso.net/dnm/api/v6/Z-WHgqd_TeJxSuha8aZ5WpyLcX8/AAAABQPkKiAa5lCM4j7C2w8eHPDrjhqCOVLRbwP00hlgmDmJUxH-Ww_HKIBi3M5_g7K2g2CzwtmJPVkQSTtsfqH8wgxK6L7b6GRKBrrU.jpg?r=92b"
                alt="Avatar do Heitor"
                className="w-full h-full object-cover"
              />
            ) : (
              '⚡'
            )}
          </div>
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

        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900"
          >
            {getGreeting()}, Heitor! ⚡
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 text-sm md:text-base lg:text-lg"
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
          className="p-2 bg-purple-500 hover:bg-purple-600 rounded-full text-white transition-all duration-200 shadow-lg"
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
          className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-all duration-200 shadow-lg"
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