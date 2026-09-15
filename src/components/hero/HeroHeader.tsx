import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ISO_MINER } from '../../config/village';
import { FlashIcon } from '../../icons';
import { useAuth } from '../../contexts/AuthContext';
import { UserProgress } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import { calculateLevelSystem } from '../../utils/levelSystem';

const MINER = ISO_MINER;
const CHEST = '/assets/village/buildings/bau-1.png';
const TORCH = '/assets/village/items/lantern.png';
const GOLD = '/assets/village/rewards/dinheiro.png';
const DIAMOND = '/assets/english/ui/diamond.webp';

interface HeroHeaderProps {
  progress: UserProgress;
  onOpenRewards: () => void;
  onOpenCalendar: () => void;
  onOpenTimer: () => void;
  avatarSrc?: string;
  avatar?: React.ReactNode;
  subtitle?: string;
  extraButton?: React.ReactNode;
  fullDays?: number;
  hour?: number;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({ progress, onOpenRewards, onOpenCalendar, onOpenTimer, avatarSrc, avatar, subtitle, extraButton, fullDays, hour }) => {
  const { logout } = useAuth();
  const { playClick, isSoundEnabled, toggleSound } = useSound();
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);

  const getGreeting = () => {
    const h = typeof hour === 'number' ? hour : new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const [line] = useState(() => {
    const messages = [
      'Pronto para mais uma escavação?',
      'Cada missão rende um bloco a mais na base.',
      'Picareta na mão: as missões de hoje esperam.',
      'Quem minera todo dia acha diamante.',
      'Vamos cavar fundo hoje.',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mc-panel rounded-lg px-3 py-2 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="mc-slot w-14 h-14 p-1 shrink-0 overflow-hidden flex items-center justify-center">
            {avatar || (
              <img
                src={avatarSrc || MINER}
                alt=""
                className="w-full h-full object-contain mc-pixel"
                draggable={false}
              />
            )}
          </div>

          <div className="min-w-0">
            <p className="mc-title text-[9px]">Miner Missions</p>
            <h1 className="text-[22px] sm:text-[26px] font-bold leading-tight text-white">
              {getGreeting()}, Heitor!
            </h1>
            <p className="text-sm mc-muted truncate">
              {subtitle || line}
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
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
          {extraButton}
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

      <div className="flex flex-wrap gap-1.5">
        <div
          className="mc-slot mc-chip py-1"
          title={`Dias completos na Vila: ${fullDays ?? 0}`}
        >
          <img src={TORCH} alt="" className="mc-pixel" draggable={false} />
          <div>
            <span className="mc-num text-white">{fullDays ?? 0}</span>
            <span className="mc-chip-l">{(fullDays ?? 0) === 1 ? 'dia completo' : 'dias completos'}</span>
          </div>
        </div>
        <div className="mc-slot mc-chip py-1">
          <img src={GOLD} alt="" className="mc-pixel" draggable={false} />
          <div>
            <span className="mc-num mc-warn">{progress.availableGold || 0}</span>
            <span className="mc-chip-l">gold</span>
          </div>
        </div>
        <div className="mc-slot mc-chip py-1">
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
