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
const TORCH = '/assets/english/ui/torch.webp';
const GOLD = '/assets/english/ui/gold.webp';
const DIAMOND = '/assets/english/ui/diamond.webp';
const SUN = '/assets/english/ui/sun.webp';
const SUNSET = '/assets/english/ui/sunset.webp';
const MOON = '/assets/english/ui/moon.webp';
const LETTER = '/assets/english/ui/base/c_letter.webp';
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
  compact?: boolean;
  crackLine?: string;
  placaCount?: number;
  placaOpen?: boolean;
  onOpenPlaca?: () => void;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({
  progress, onOpenGold, onOpenPack, onOpenTower, nextEventLabel, avatarSrc, avatar, subtitle,
  extraButton, fullDays, hour, compact = false, crackLine, placaCount, placaOpen, onOpenPlaca,
}) => {
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

  const clockChip = (
    <div className="mc-slot mc-chip py-1" title="Relógio da Vila, horário de Brasília">
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
  );
  const torchChip = (
    <div className="mc-slot mc-chip py-1" title={`Tochas seguidas: ${fullDays ?? 0}`}>
      <img src={TORCH} alt="" className="mc-pixel" draggable={false} />
      <div>
        <span className="mc-num text-white">{fullDays ?? 0}</span>
        <span className="mc-chip-l">{(fullDays ?? 0) === 1 ? 'tocha' : 'tochas'}</span>
      </div>
    </div>
  );
  const goldChip = (
    <button type="button" className="mc-slot mc-chip py-1" onClick={() => { playClick(); onOpenGold?.(); }} title="Extrato">
      <img src={GOLD} alt="" className="mc-pixel" draggable={false} />
      <div>
        <span className="mc-num mc-warn">{progress.availableGold || 0}</span>
        <span className="mc-chip-l">GOLD</span>
      </div>
    </button>
  );
  const levelChip = (
    <button type="button" className="mc-slot mc-chip py-1" onClick={() => { playClick(); onOpenTower?.(); }} title="Torre">
      <img src={DIAMOND} alt="" className="mc-pixel" draggable={false} />
      <div>
        <span className="mc-num mc-diamond">Nível {levelSystem.currentLevel}</span>
        <span className="mc-chip-l">{levelSystem.levelTitle}</span>
      </div>
    </button>
  );
  const mail = (placaCount ?? 0) > 0;
  const placaChip = onOpenPlaca ? (
    <button
      type="button"
      className={`mc-btn mc-btn-dark w-[44px] h-[44px] p-0 mn-placa-chip${placaOpen ? ' is-on' : ''}${mail && !placaOpen ? ' has-mail' : ''}`}
      data-testid="placa-chip"
      onClick={() => { playClick(); onOpenPlaca(); }}
      title={mail ? `Placa da Vila, ${placaCount} ${placaCount === 1 ? 'aviso' : 'avisos'}` : 'Placa da Vila'}
      aria-label={mail ? `Placa da Vila, ${placaCount} avisos` : 'Placa da Vila'}
      aria-expanded={Boolean(placaOpen)}
    >
      <img src={LETTER} alt="" className="mc-pixel" draggable={false} />
      {mail && (
        <span className="mn-placa-badge" aria-hidden>{placaCount! > 9 ? '9+' : placaCount}</span>
      )}
    </button>
  ) : null;
  const actions = (
    <div className="flex gap-1 shrink-0">
      {placaChip}
      <button
        type="button"
        onClick={() => { playClick(); toggleSound(); }}
        className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
        title={isSoundEnabled ? 'Desativar música e sons' : 'Ativar música'}
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
  );

  if (compact) {
    return (
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mn-hud is-compact"
        data-testid="hud-compact"
      >
        <button type="button" className="mc-slot w-10 h-10 p-0.5 shrink-0 overflow-hidden flex items-center justify-center" onClick={() => { playClick(); onOpenPack?.(); }} title="Mochila">
          {avatar || (
            <img src={avatarSrc || MINER} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
          )}
        </button>
        <p className="font-bold leading-tight text-white text-sm truncate max-w-[9rem] shrink-0">{subtitle || 'Heitor'}</p>
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1">
          {levelChip}
          {goldChip}
          {torchChip}
          {clockChip}
          {crackLine && (
            <span className="mn-crack-line shrink-0" title={crackLine}>{crackLine}</span>
          )}
        </div>
        {actions}
      </motion.header>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mn-hud px-3 py-2 flex flex-col gap-2"
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
            <p className="mc-title text-[12px]">Miner Missions</p>
            <h1 className="font-bold leading-tight text-white text-[26px]">
              {`${getGreeting()}, Heitor!`}
            </h1>
            <p className="text-sm mc-muted truncate">
              {subtitle || line}
            </p>
          </div>
        </div>
        {actions}
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {clockChip}
        {torchChip}
        {goldChip}
        {levelChip}
        {nextEventLabel && (
          <div className="mc-slot mc-chip py-1" title="Próximo da Agenda">
            <span className="text-sm text-white">{nextEventLabel}</span>
          </div>
        )}
        {crackLine && (
          <div className="mc-slot mc-chip py-1" title={crackLine}>
            <span className="mn-crack-line">{crackLine}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mn-hud-xp">
        <span className="mc-lbl shrink-0">XP</span>
        <div className="mc-bar flex-1">
          <div className="mc-bar-fill" style={{ width: `${levelSystem.progressPercentage}%` }} />
        </div>
        <span className="mc-num text-white shrink-0" style={{ fontSize: 12 }}>
          {levelSystem.isMaxLevel
            ? 'máx'
            : `${Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel)}/${Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel)}`}
        </span>
      </div>
    </motion.header>
  );
};

export default HeroHeader;
