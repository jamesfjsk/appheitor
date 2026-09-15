import React, { useState } from 'react';
import { X } from 'lucide-react';
import { COSMETICS, FREE_COSMETIC_IDS } from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { VillageCharacter } from '../../../types/village';

const TABS: Array<keyof VillageCharacter> = ['skin', 'hair', 'shirt', 'pants', 'hat', 'cape', 'pet'];

const CharacterEditor: React.FC<{ onClose: () => void; onBuy: () => void }> = ({ onClose, onBuy }) => {
  const { village, saveCharacter } = useVillage();
  const { playClick } = useSound();
  const [tab, setTab] = useState<keyof VillageCharacter>('skin');
  const [draft, setDraft] = useState<VillageCharacter>(village.character);

  const options = COSMETICS.filter((c) => c.slot === tab);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-panel rounded-lg max-w-lg w-full p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-3">
          <h2 className="mc-title text-sm">Personagem</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {TABS.map((t) => (
            <button key={String(t)} type="button" className={`mc-slot px-2 py-1 ${tab === t ? 'mc-slot-selected' : ''}`} onClick={() => setTab(t)}>{String(t)}</button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {options.map((c) => {
            const owned = c.free || FREE_COSMETIC_IDS.includes(c.id) || village.owned.includes(c.id);
            const selected = draft[tab] === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`mc-slot aspect-square ${selected ? 'mc-slot-selected' : ''}`}
                title={c.label}
                onClick={() => {
                  playClick();
                  if (!owned) { onBuy(); return; }
                  setDraft({ ...draft, [tab]: c.id });
                }}
              >
                <span className="text-[10px]">{owned ? c.label : `${c.basePrice}g`}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="mc-btn mc-btn-green w-full h-12 font-bold" onClick={() => { playClick(); void saveCharacter(draft); onClose(); }}>Salvar</button>
      </div>
    </div>
  );
};

export default CharacterEditor;
