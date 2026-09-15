import React from 'react';
import { motion } from 'framer-motion';
import { FlashIcon } from '../../icons';
import { useAuth } from '../../contexts/AuthContext';
import { UserProgress } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import { calculateLevelSystem } from '../../utils/levelSystem';

const MINER = '/assets/english/ui/miner.webp';
const CHEST = '/assets/english/ui/chest.webp';
const TORCH = '/assets/english/ui/torch.webp';
const GOLD = '/assets/english/ui/gold.webp';
const DIAMOND = '/assets/english/ui/diamond.webp';

interface HeroHeaderProps {
  progress: UserProgress;
  onOpenRewards: () => void;
  onOpenCalendar: () => void;
  onOpenTimer: () => void;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({ progress, onOpenRewards, onOpenCalendar, onOpenTimer }) => {
  const { logout } = useAuth();
  const { playClick, isSoundEnabled, toggleSound } = useSound();
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getMotivationalMessage = () => {
    const messages = [
      'Pronto para mais uma escavação?',
      'Cada missão rende um bloco a mais na base.',
      'Picareta na mão: as missões de hoje esperam.',
      'Quem minera todo dia acha diamante.',
      'Vamos cavar fundo hoje.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const streak = progress.streak || 0;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mc-panel rounded-lg p-4 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div className="mc-slot w-[72px] h-[72px] p-1 shrink-0 overflow-hidden">
            <img
              src={MINER}
              alt=""
              className="w-full h-full object-contain mc-pixel"
              draggable={false}
            />
          </div>

          <div className="min-w-0">
            <p className="mc-title text-[10px]">Miner Missions</p>
            <h1 className="text-[28px] font-bold leading-tight text-white">
              {getGreeting()}, Heitor!
            </h1>
            <p className="text-base mc-muted mt-1">
              {getMotivationalMessage()}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { playClick(); onOpenRewards(); }}
            className="mc-btn mc-btn-gold w-[44px] h-[44px] p-0"
            title="Baú de recompensas"
          >
            <img src={CHEST} alt="" className="w-[26px] h-[26px] mc-pixel" draggable={false} />
          </button>
          <button
            type="button"
            onClick={() => { playClick(); onOpenCalendar(); }}
            className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
            title="Calendário"
          >
            <FlashIcon name="calendar" className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => { playClick(); onOpenTimer(); }}
            className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
            title="Cronômetro"
          >
            <FlashIcon name="clock" className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => { playClick(); toggleSound(); }}
            className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
            title={isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
          >
            <FlashIcon name={isSoundEnabled ? 'volume' : 'mute'} className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => { playClick(); logout(); }}
            className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
            title="Sair"
          >
            <FlashIcon name="logout" className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div
          className="mc-slot mc-chip"
          title={`Maior sequência: ${progress.longestStreak || 0} dias`}
        >
          <img src={TORCH} alt="" className="mc-pixel" draggable={false} />
          <div>
            <span className="mc-num text-white">{streak}</span>
            <span className="mc-chip-l">{streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          </div>
        </div>
        <div className="mc-slot mc-chip">
          <img src={GOLD} alt="" className="mc-pixel" draggable={false} />
          <div>
            <span className="mc-num mc-warn">{progress.availableGold || 0}</span>
            <span className="mc-chip-l">gold</span>
          </div>
        </div>
        <div className="mc-slot mc-chip">
          <img src={DIAMOND} alt="" className="mc-pixel" draggable={false} />
          <div>
            <span className="mc-num mc-diamond">Nível {levelSystem.currentLevel}</span>
            <span className="mc-chip-l">{levelSystem.levelTitle}</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default HeroHeader;
