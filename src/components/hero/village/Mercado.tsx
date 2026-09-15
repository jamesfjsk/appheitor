import React, { useState } from 'react';
import { X } from 'lucide-react';
import { COSMETICS } from '../../../config/village';
import { priceOf } from '../../../services/village/shop';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';

const Mercado: React.FC<{ onClose: () => void; onOpenRewards: () => void }> = ({ onClose, onOpenRewards }) => {
  const { village, settings, buyCosmetic } = useVillage();
  const { rewards } = useData();
  const { playClick } = useSound();
  const [tab, setTab] = useState<'real' | 'shop'>('shop');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const cheapest = rewards.filter((r) => r.active).sort((a, b) => a.costGold - b.costGold)[0];

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-2" onClick={onClose}>
      <div className="mc-panel rounded-lg w-full max-w-3xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-4 border-[#17130f] flex justify-between">
          <h2 className="mc-title text-sm">Mercado / Market</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar p-3">
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'real' ? 'mc-slot-selected' : ''}`} onClick={() => { setTab('real'); playClick(); onOpenRewards(); }}>Prêmios de verdade</button>
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'shop' ? 'mc-slot-selected' : ''}`} onClick={() => setTab('shop')}>Loja da Vila</button>
        </div>
        {tab === 'shop' && (
          <div className="p-4 space-y-2">
            {COSMETICS.filter((c) => !c.free).map((c) => {
              const price = priceOf(c, settings);
              const owned = village.owned.includes(c.id);
              const days = Math.max(1, Math.ceil(price / 10));
              return (
                <div key={c.id} className="mc-row rounded p-3">
                  <p className="font-bold">{c.label}{c.premium ? ' · premium' : ''}</p>
                  <p className="text-xs mc-muted">{owned ? 'Seu' : `${price} gold · cerca de ${days} dias no seu ritmo`}</p>
                  {confirmId === c.id ? (
                    <div className="mc-card p-3 mt-2">
                      <p className="text-sm mb-2">Com {price} gold: {cheapest ? cheapest.title : 'guardar para depois'} ou guardar para depois.</p>
                      <div className="flex gap-2">
                        <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-4" onClick={() => { playClick(); void buyCosmetic(c.id); setConfirmId(null); }}>Confirmar</button>
                        <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-4" onClick={() => setConfirmId(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" disabled={owned || !settings.shopEnabled} className="mc-btn mc-btn-gold min-h-[44px] px-4 mt-2" onClick={() => { playClick(); setConfirmId(c.id); }}>
                      {owned ? 'Comprado' : 'Comprar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mercado;
