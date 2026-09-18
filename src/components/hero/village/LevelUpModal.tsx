import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getLevelTitle } from '../../../utils/levelSystem';
import { useAuth } from '../../../contexts/AuthContext';
import { useSound } from '../../../contexts/SoundContext';
import { grantLevelGift } from '../../../services/villageService';
import { rareGiftForLevel } from '../../../services/village/claims';
import { levelGift } from '../../../services/village/levels';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import { COSMETIC_BY_ID } from '../../../config/village';

const DIAMOND = '/assets/english/ui/diamond.webp';
const PICK: Array<'madeira' | 'pedra' | 'ferro'> = ['madeira', 'pedra', 'ferro'];

const LevelUpModal: React.FC = () => {
  const { user } = useAuth();
  const { playLevelUp } = useSound();
  const [queue, setQueue] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const level = queue[0] ?? null;

  useEffect(() => {
    const onUp = (ev: Event) => {
      const detail = (ev as CustomEvent<{ level?: number; levels?: number[] }>).detail;
      const next = Array.isArray(detail?.levels) && detail.levels.length
        ? detail.levels.filter((n) => typeof n === 'number')
        : typeof detail?.level === 'number' ? [detail.level] : [];
      if (!next.length) return;
      setQueue((prev) => [...prev, ...next]);
      playLevelUp();
    };
    window.addEventListener('miner-level-up', onUp);
    return () => window.removeEventListener('miner-level-up', onUp);
  }, [playLevelUp]);

  if (level == null) return null;

  const rare = rareGiftForLevel(level);
  const uid = user?.userId;
  const gift = levelGift(level, 1);
  const marco = gift.cosmeticId ? COSMETIC_BY_ID[gift.cosmeticId] : null;

  const pick = async (material: 'madeira' | 'pedra' | 'ferro') => {
    if (!uid || busy) return;
    setBusy(true);
    try {
      await grantLevelGift(uid, level, material);
      setQueue((prev) => prev.slice(1));
    } catch (e) {
      console.error(e);
      toast.error('Não deu para guardar o presente. Tenta de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="mc-panel mc-pop rounded-lg px-8 py-6 text-center text-white max-w-md w-full">
        <img src={DIAMOND} alt="" className="w-12 h-12 mx-auto mc-pixel" />
        <p className="mc-title text-lg mt-2">Nível {level}</p>
        <p className="text-lg mt-1">{getLevelTitle(level)}</p>
        <p className="text-sm mc-muted mt-2">Escolhe 1 material de presente</p>
        {rare && (
          <p className="text-sm mc-good mt-1">+1 {rare} neste marco</p>
        )}
        {gift.cosmeticId && (
          <p className="text-sm mt-1">{marco ? marco.label : 'Cosmético de marco chega em breve'}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {PICK.map((m) => (
            <button
              key={m}
              type="button"
              disabled={busy || !uid}
              className="mc-btn mc-btn-gold min-h-[44px] px-3 flex items-center gap-2"
              onClick={() => void pick(m)}
            >
              <img src={MATERIAL_ICONS[m]} alt="" className="w-6 h-6 mc-pixel" />
              {MATERIAL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;
