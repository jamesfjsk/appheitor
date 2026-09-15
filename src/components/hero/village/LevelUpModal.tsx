import React, { useEffect, useState } from 'react';
import { getLevelTitle } from '../../../utils/levelSystem';
import { useSound } from '../../../contexts/SoundContext';

const DIAMOND = '/assets/english/ui/diamond.webp';

const LevelUpModal: React.FC = () => {
  const { playLevelUp } = useSound();
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const onUp = (ev: Event) => {
      const n = (ev as CustomEvent<{ level: number }>).detail?.level;
      if (typeof n === 'number') {
        setLevel(n);
        playLevelUp();
      }
    };
    window.addEventListener('miner-level-up', onUp);
    return () => window.removeEventListener('miner-level-up', onUp);
  }, [playLevelUp]);

  if (level == null) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setLevel(null)}>
      <div className="mc-panel mc-pop rounded-lg px-8 py-6 text-center text-white">
        <img src={DIAMOND} alt="" className="w-12 h-12 mx-auto mc-pixel" />
        <p className="mc-title text-lg mt-2">Nível {level}</p>
        <p className="text-lg mt-1">{getLevelTitle(level)}</p>
        <p className="text-sm mc-muted mt-2">+1 madeira de presente</p>
        <button type="button" className="mc-btn mc-btn-gold mt-4 h-11 px-4" onClick={() => setLevel(null)}>Continuar</button>
      </div>
    </div>
  );
};

export default LevelUpModal;
