import React, { useEffect } from 'react';
import { showBoot } from './bootOverlay';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue' | 'yellow';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Carregando...',
}) => {
  useEffect(() => {
    showBoot(message);
  }, [message]);
  return null;
};

export default LoadingSpinner;
