import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { useData } from '../../../contexts/DataContext';
import { ITEM_BY_ID } from '../../../config/items';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import type { Material } from '../../../types/english';
import { calculateLevelSystem } from '../../../utils/levelSystem';
import CharacterEditor, { type DollSlot } from './CharacterEditor';

export type PackTab = 'ficha' | 'sacola';

const BAG_SIZE = 24;

const Mochila: React.FC<{
  onClose: () => void;
  onOpenWorkshop: () => void;
  onOpenMarket: () => void;
  startTab?: PackTab;
  startSlot?: DollSlot;
}> = ({ onClose, onOpenWorkshop, onOpenMarket, startTab = 'ficha', startSlot = 'shirt' }) => {
  const { village, materials, seeItems } = useVillage();
  const { progress } = useData();
  const { playClick } = useSound();
  const level = calculateLevelSystem(progress.totalXP || 0).currentLevel;
  const [tab, setTab] = useState<PackTab>(startTab);
  const close = () => {
    void seeItems();
    onClose();
  };

  const bag = useMemo(() => {
    const filled: Array<{ key: string; icon: string; name: string; qty: number }> = (
      Object.keys(MATERIAL_LABELS) as Material[]
    ).map((m) => ({
      key: m,
      icon: MATERIAL_ICONS[m],
      name: MATERIAL_LABELS[m],
      qty: materials[m] || 0,
    }));
    filled.push(
      { key: 'esmeralda', icon: ITEM_BY_ID.esmeralda.icon, name: 'Esmeralda', qty: village.rare.esmeralda },
      { key: 'diamante', icon: ITEM_BY_ID.diamante.icon, name: 'Diamante', qty: village.rare.diamante },
    );
    return Array.from({ length: BAG_SIZE }, (_, i) => filled[i] ?? null);
  }, [materials, village.rare]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 mn-veil" onClick={close}>
      <div className="mc-modal mc-pop mn-pack-modal rounded-lg w-full max-w-4xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center">
          <div>
            <h2 className="mc-title text-sm">Mochila</h2>
            <p className="mn-pack-sub">{village.characterName || 'Heitor'} · Nv. {level}</p>
          </div>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={close} aria-label="Fechar"><X /></button>
        </div>
        <div className="p-4">
          <div className="mn-look-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'ficha'} className={`mc-slot px-2.5 py-1.5 ${tab === 'ficha' ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setTab('ficha'); }}>Ficha</button>
            <button type="button" role="tab" aria-selected={tab === 'sacola'} className={`mc-slot px-2.5 py-1.5 ${tab === 'sacola' ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setTab('sacola'); }}>Sacola</button>
          </div>

          {tab === 'ficha' && (
            <CharacterEditor
              embedded
              startSlot={startSlot}
              onClose={close}
              onBuy={onOpenMarket}
              onForge={onOpenWorkshop}
            />
          )}

          {tab === 'sacola' && (
            <div className="mn-bag-wrap">
              <div className="mn-ficha-head">
                <p className="mn-panel-k">Sacola</p>
                <p className="mn-ficha-item">Materiais</p>
              </div>
              <p className="mn-look-hint">O que você juntou. Toque na ficha para vestir o minerador.</p>
              <div className="mn-bag">
                {bag.map((item, i) => (
                  item ? (
                    <div key={item.key} className={`mn-bag-slot mc-slot ${item.qty <= 0 ? 'is-empty' : ''}`} title={`${item.name}: ${item.qty}`}>
                      <img src={item.icon} alt="" className="mn-eq-img mc-pixel" draggable={false} />
                      <span className="mn-bag-qty mc-num">{item.qty}</span>
                    </div>
                  ) : (
                    <div key={`empty-${i}`} className="mn-bag-slot mc-slot is-empty" />
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mochila;
