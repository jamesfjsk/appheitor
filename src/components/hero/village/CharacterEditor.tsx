import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  COSMETICS,
  FREE_COSMETIC_IDS,
  HAT_SPRITE,
  PANTS_HEX,
  PET_SPRITE,
  SHIRT_HEX,
  SKIN_SPRITE,
  cosmeticHasSprite,
} from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { VillageCharacter } from '../../../types/village';
import CharacterPreview from './CharacterPreview';

const TABS: Array<{ id: keyof VillageCharacter; label: string }> = [
  { id: 'skin', label: 'Pele' },
  { id: 'hair', label: 'Cabelo' },
  { id: 'shirt', label: 'Camisa' },
  { id: 'pants', label: 'Calça' },
  { id: 'hat', label: 'Chapéu' },
  { id: 'cape', label: 'Capa' },
  { id: 'pet', label: 'Pet' },
];

function slotThumb(id: string, slot: keyof VillageCharacter): React.ReactNode {
  if (slot === 'skin' && SKIN_SPRITE[id]) {
    return <img src={SKIN_SPRITE[id]} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />;
  }
  if (slot === 'shirt' && SHIRT_HEX[id]) {
    return <span className="block w-full h-full" style={{ background: SHIRT_HEX[id] }} />;
  }
  if (slot === 'pants' && PANTS_HEX[id]) {
    return <span className="block w-full h-full" style={{ background: PANTS_HEX[id] }} />;
  }
  if (slot === 'hat' && HAT_SPRITE[id]) {
    return <img src={HAT_SPRITE[id]} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />;
  }
  if (slot === 'cape') {
    return <img src="/assets/village/char/miner-cape.png" alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />;
  }
  if (slot === 'pet' && PET_SPRITE[id]) {
    return <img src={PET_SPRITE[id]} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />;
  }
  if (slot === 'hair') {
    return <img src={SKIN_SPRITE.skin_2} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />;
  }
  return null;
}

const CharacterEditor: React.FC<{ onClose: () => void; onBuy: () => void }> = ({ onClose, onBuy }) => {
  const { village, saveCharacter } = useVillage();
  const { playClick } = useSound();
  const [tab, setTab] = useState<keyof VillageCharacter>('skin');
  const [draft, setDraft] = useState<VillageCharacter>(village.character);

  const options = COSMETICS.filter((c) => c.slot === tab && cosmeticHasSprite(c.id));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-panel rounded-lg max-w-lg w-full p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-3">
          <h2 className="mc-title text-sm">Personagem</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="flex gap-4 items-start mb-3">
          <div className="mc-slot w-28 h-28 p-1 shrink-0 flex items-center justify-center">
            <CharacterPreview character={draft} gear={village.gear} size={96} />
          </div>
          <div className="flex flex-wrap gap-1 flex-1">
            {TABS.map((t) => (
              <button
                key={String(t.id)}
                type="button"
                className={`mc-slot px-2 py-1 ${tab === t.id ? 'mc-slot-selected' : ''}`}
                onClick={() => { playClick(); setTab(t.id); }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {options.map((c) => {
            const owned = c.free || FREE_COSMETIC_IDS.includes(c.id) || village.owned.includes(c.id);
            const selected = draft[tab] === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`mc-slot aspect-square p-0.5 overflow-hidden relative ${selected ? 'mc-slot-selected' : ''}`}
                title={owned ? c.label : `${c.label} · ${c.basePrice}g`}
                onClick={() => {
                  playClick();
                  if (!owned) { onBuy(); return; }
                  setDraft({ ...draft, [tab]: c.id });
                }}
              >
                {slotThumb(c.id, tab)}
                <span className="absolute bottom-0 inset-x-0 text-[9px] leading-tight bg-black/60 px-0.5">
                  {owned ? c.label : `${c.basePrice}g`}
                </span>
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
