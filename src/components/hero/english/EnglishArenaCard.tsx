// ========================================
// Cartão de entrada da Arena de Inglês na tela da criança: mostra a Base
// (nível, materiais, tochas) e abre EnglishBase. O hub antigo (EnglishArena)
// deixou de ser importado; os jogos antigos continuam no disco.
// ========================================

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import type { BaseDoc } from '../../../types/english';
import { MATERIALS, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import { subscribeBase } from '../../../services/englishBaseService';
import EnglishBase from './base/EnglishBase';

const BANNER = '/assets/english/ui/banner.webp';
const PICKAXE = '/assets/english/ui/pickaxe.webp';
const TORCH = '/assets/english/ui/torch.webp';
const MAX_TORCHES = 7;

const EnglishArenaCard: React.FC = () => {
  const { childUid } = useAuth();
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState<BaseDoc | null>(null);

  useEffect(() => {
    if (!childUid) return;
    return subscribeBase(childUid, setBase, (e) => console.error('EnglishArenaCard: erro ao assinar a base', e));
  }, [childUid]);

  const streak = base?.streakDays ?? 0;

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
          <img src={BANNER} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-2 flex items-end gap-2">
            <img src={PICKAXE} alt="" className="w-12 h-12 mc-pixel drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]" draggable={false} />
            <div className="min-w-0 flex-1">
              <h3 className="mc-title text-xs sm:text-sm pb-0.5">Mina</h3>
              <p className="text-xs text-white/85 pb-1">Jogos de hoje</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-baseline mb-2 flex-wrap gap-1">
            <span className="mc-font text-[10px] text-white">Contratos</span>
            {streak > 0 && (
              <span className="flex items-center gap-0.5" title={`${streak} dias seguidos`}>
                {Array.from({ length: Math.min(streak, MAX_TORCHES) }).map((_, i) => (
                  <img key={i} src={TORCH} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
                ))}
                <span className="mc-font text-[8px] mc-warn ml-1">{streak} {streak === 1 ? 'dia' : 'dias'}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5" data-testid="card-materials">
            {MATERIALS.map((m) => (
              <div key={m} className="mc-slot flex items-center gap-1 px-1.5 py-1" title={MATERIAL_LABELS[m]}>
                <img src={MATERIAL_ICONS[m]} alt="" className="w-6 h-6 mc-pixel shrink-0" draggable={false} />
                <span className="mc-font text-[10px] text-white">{base?.materials[m] ?? 0}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setOpen(true)} className="mc-btn mc-btn-green mt-4 w-full py-3 text-base font-bold uppercase" data-testid="open-base">
            Entrar na Mina
          </button>
        </div>
      </motion.div>
      {open && <EnglishBase onClose={() => setOpen(false)} />}
    </>
  );
};

export default EnglishArenaCard;
