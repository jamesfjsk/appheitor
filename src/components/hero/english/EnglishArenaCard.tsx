import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { ENGLISH_WORDS } from '../../../data/englishVocabulary';
import { EnglishProgressDoc, isMastered, subscribeEnglishProgress } from '../../../services/englishGameService';
import EnglishArena, { UI } from './EnglishArena';

/** Cartão de entrada da Arena de Inglês na tela da criança (com o modal embutido) */
const EnglishArenaCard: React.FC = () => {
  const { childUid } = useAuth();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<EnglishProgressDoc | null>(null);

  useEffect(() => {
    if (!childUid) return;
    return subscribeEnglishProgress(childUid, setProgress);
  }, [childUid]);

  const mastered = ENGLISH_WORDS.filter((w) => isMastered(progress?.words[w.id])).length;
  const pct = ENGLISH_WORDS.length ? Math.round((mastered / ENGLISH_WORDS.length) * 100) : 0;
  const bestDepth = progress?.bestDepth ?? 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="english-arena-card"
        className="mc-panel comic-chip rounded-lg overflow-hidden text-white mb-4"
        style={{ fontFamily: 'var(--font-hero)' }}
      >
        {/* Entrada da mina com o título por cima */}
        <div className="relative h-28 overflow-hidden border-b-4 border-[#17130f]">
          <img src={UI.banner} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-2 flex items-end gap-2">
            <img src={UI.pickaxe} alt="" className="w-12 h-12 mc-pixel drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]" draggable={false} />
            <h3 className="mc-title text-xs sm:text-sm pb-1">Arena de Inglês</h3>
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-baseline mb-1">
            <span className="mc-font text-[9px] mc-muted uppercase">Palavras dominadas</span>
            <span className="mc-font text-[10px]">{mastered}/{ENGLISH_WORDS.length}</span>
          </div>
          <div className="mc-bar"><div className="mc-bar-fill" style={{ width: `${pct}%` }} /></div>

          {bestDepth > 0 && (
            <p className="mc-font text-[9px] mc-diamond mt-3">Recorde na mina: {bestDepth} blocos</p>
          )}

          <button onClick={() => setOpen(true)} className="mc-btn mc-btn-green mt-4 w-full py-3 text-base font-bold uppercase">
            <img src={UI.minecart} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
            Jogar
          </button>
        </div>
      </motion.div>
      <EnglishArena isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default EnglishArenaCard;
