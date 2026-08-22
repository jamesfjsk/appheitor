import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Zap, Coins, Sparkles } from 'lucide-react';
import { useVacation } from '../../contexts/VacationContext';

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
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative mb-6 overflow-hidden rounded-2xl shadow-2xl border-2 border-yellow-300"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12"
      />

      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -12, 0],
            opacity: [0.4, 1, 0.4],
            rotate: [0, 20, 0],
          }}
          transition={{
            duration: 2 + (i % 4) * 0.4,
            repeat: Infinity,
            delay: i * 0.25,
            ease: 'easeInOut',
          }}
          className="absolute pointer-events-none"
          style={{
            left: `${8 + i * 9}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
        >
          <Sparkles className="w-3 h-3 text-yellow-100/80" />
        </motion.div>
      ))}

      <div className="relative z-10 p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
        <motion.div
          animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-yellow-300 border-4 border-white shadow-xl flex items-center justify-center"
        >
          <Sun className="w-8 h-8 sm:w-9 sm:h-9 text-orange-600" strokeWidth={2.5} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3
              className="text-white text-lg sm:text-xl font-bold drop-shadow-md truncate"
              style={{ fontFamily: 'Comic Neue, cursive' }}
            >
              {config.title}
            </h3>
            {daysRemaining !== null && (
              <span className="bg-white/25 backdrop-blur-sm text-white text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full border border-white/40 whitespace-nowrap">
                {daysRemaining === 0
                  ? 'Último dia!'
                  : `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`}
              </span>
            )}
          </div>

          <p className="text-white/95 text-sm sm:text-base font-medium drop-shadow mb-2">
            {config.message}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {showXpMult && (
              <div className="flex items-center gap-1.5 bg-blue-600/90 text-white px-3 py-1 rounded-full shadow-md border border-blue-300/50">
                <Zap className="w-3.5 h-3.5" fill="currentColor" />
                <span className="text-sm font-bold">
                  {xpMultiplier}x XP
                </span>
              </div>
            )}
            {showGoldMult && (
              <div className="flex items-center gap-1.5 bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full shadow-md border border-yellow-300">
                <Coins className="w-3.5 h-3.5" fill="currentColor" />
                <span className="text-sm font-bold">
                  {goldMultiplier}x Gold
                </span>
              </div>
            )}
            {config.end_date && (
              <span className="text-white/90 text-xs font-medium">
                até {formatBrazilianDate(config.end_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VacationBanner;
