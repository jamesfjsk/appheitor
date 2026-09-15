import React from 'react';
import { motion } from 'framer-motion';
import { useVacation } from '../../contexts/VacationContext';

const SUN = '/assets/english/ui/sun.webp';
const STAR = '/assets/english/ui/star.webp';
const GOLD = '/assets/english/ui/gold.webp';

const formatBrazilianDate = (iso: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const VacationBanner: React.FC = () => {
  const { isActive, config, daysRemaining, xpMultiplier, goldMultiplier } = useVacation();

  if (!isActive || !config) return null;

  const showXpMult = xpMultiplier !== 1;
  const showGoldMult = goldMultiplier !== 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mc-panel rounded-lg p-4 flex items-center gap-4"
    >
      <div className="mc-slot w-14 h-14 shrink-0 p-1">
        <img src={SUN} alt="" className="w-10 h-10 mc-pixel" draggable={false} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="text-white text-lg font-bold truncate">
            {config.title}
          </h3>
          {daysRemaining !== null && (
            <span className="mc-slot px-2 py-1 text-xs font-bold mc-warn">
              {daysRemaining === 0
                ? 'Último dia'
                : `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`}
            </span>
          )}
        </div>

        <p className="text-base text-white/90 mb-2">
          {config.message}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {showXpMult && (
            <div className="mc-slot inline-flex items-center gap-1.5 px-2 py-1">
              <img src={STAR} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
              <span className="mc-font text-[9px] mc-diamond">{xpMultiplier}x XP</span>
            </div>
          )}
          {showGoldMult && (
            <div className="mc-slot inline-flex items-center gap-1.5 px-2 py-1">
              <img src={GOLD} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
              <span className="mc-font text-[9px] mc-warn">{goldMultiplier}x Gold</span>
            </div>
          )}
          {config.end_date && (
            <span className="text-xs mc-muted">
              até {formatBrazilianDate(config.end_date)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VacationBanner;
