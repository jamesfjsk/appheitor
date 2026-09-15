import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ISO_MINER } from '../../config/village';
import { FlashIcon } from '../../icons';
import { useAuth } from '../../contexts/AuthContext';
import { UserProgress } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import { useClock } from '../../contexts/ClockContext';
import { calculateLevelSystem } from '../../utils/levelSystem';

const MINER = ISO_MINER;
const TORCH = '/assets/village/items/lantern.png';
const GOLD = '/assets/english/ui/gold.webp';
const DIAMOND = '/assets/english/ui/diamond.webp';
const SUN = '/assets/english/ui/sun.webp';
const SUNSET = '/assets/english/ui/sunset.webp';
const MOON = '/assets/english/ui/moon.webp';
const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

interface HeroHeaderProps {
  progress: UserProgress;
  onOpenGold?: () => void;
  onOpenPack?: () => void;
  onOpenTower?: () => void;
  nextEventLabel?: string;
  avatarSrc?: string;
  avatar?: React.ReactNode;
  subtitle?: string;
  extraButton?: React.ReactNode;
  fullDays?: number;
  hour?: number;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({ progress, onOpenGold, onOpenPack, onOpenTower, nextEventLabel, avatarSrc, avatar, subtitle, extraButton, fullDays, hour }) => {
  const { hour: clockHour, minute, today, weekday, period } = useClock();
  const { logout } = useAuth();
  const { playClick, isSoundEnabled, toggleSound } = useSound();
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);

  const getGreeting = () => {
    const h = typeof hour === 'number' ? hour : clockHour;
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 grow">
          <button type="button" className="mc-slot w-14 h-14 p-1 shrink-0 overflow-hidden flex items-center justify-center" onClick={() => { playClick(); onOpenPack?.(); }} title="Mochila">
            {avatar || (
              <img
                src={avatarSrc || MINER}
                alt=""
                className="w-full h-full object-contain mc-pixel"
                draggable={false}
              />
            )}
          </button>

          <div className="min-w-0">
            <p className="mc-title text-[9px]">Miner Missions</p>
            <h1 className="text-[26px] font-bold leading-tight text-white">
              {getGreeting()}, Heitor!
            </h1>
            <p className="text-sm mc-muted truncate">
              {subtitle || line}
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0 overflow-x-auto">
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

      <div className="flex gap-1.5 overflow-x-auto">
        <div
          className="mc-slot mc-chip py-1"
          title="Relógio da Vila, horário de Brasília"
        >
          <img
            src={period === 'morning' ? SUN : period === 'afternoon' ? SUNSET : MOON}
            alt=""
            className="mc-pixel"
            draggable={false}
          />
          <div>
            <span className="mc-num text-white" style={{ fontSize: 12 }}>
              {String(typeof hour === 'number' ? hour : clockHour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </span>
            <span className="mc-chip-l">
              {WEEKDAY_SHORT[weekday] || ''} {today.slice(8, 10)}/{today.slice(5, 7)}
            </span>
          </div>
        </div>
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
        <button type="button" className="mc-slot mc-chip py-1" onClick={() => { playClick(); onOpenGold?.(); }} title="Extrato">
          <img src={GOLD} alt="" className="mc-pixel" draggable={false} />
          <div>
            <span className="mc-num mc-warn">{progress.availableGold || 0}</span>
            <span className="mc-chip-l">GOLD</span>
          </div>
        </button>
        <button type="button" className="mc-slot mc-chip py-1" onClick={() => { playClick(); onOpenTower?.(); }} title="Torre">
          <img src={DIAMOND} alt="" className="mc-pixel" draggable={false} />
          <div>
            <span className="mc-num mc-diamond">Nível {levelSystem.currentLevel}</span>
            <span className="mc-chip-l">{levelSystem.levelTitle}</span>
          </div>
        </button>
        {nextEventLabel && (
          <div className="mc-slot mc-chip py-1" title="Próximo da Agenda">
            <span className="text-xs text-white">{nextEventLabel}</span>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default HeroHeader;
