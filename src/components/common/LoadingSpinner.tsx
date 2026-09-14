import React from 'react';
import { motion } from 'framer-motion';
import { FlashIcon } from '../../icons';
import ComicBackdrop from './ComicBackdrop';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue' | 'yellow';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Carregando...',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
      <ComicBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 comic-card px-8 py-7 text-center max-w-sm mx-4"
      >
        <motion.div
          className={`mx-auto mb-4 text-[#C8102E] ${sizeClasses[size]}`}
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FlashIcon name="bolt" className="w-full h-full" />
        </motion.div>
        <p className="text-[#1A1214] text-lg font-semibold">{message}</p>
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;
