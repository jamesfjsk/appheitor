import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue' | 'yellow';
  message?: string;
}

const PICKAXE = '/assets/english/ui/pickaxe.webp';

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Carregando...',
}) => {
  return (
    <div className="mn-page flex items-center justify-center">
      <div className="mc-panel rounded-lg px-6 py-5 text-center">
        <img src={PICKAXE} alt="" className="w-12 h-12 mx-auto mb-3 mc-pixel mc-build" draggable={false} />
        <p className="mc-lbl">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
