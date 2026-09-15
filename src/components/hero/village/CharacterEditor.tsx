import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  COSMETICS,
  COSMETIC_ICON,
  FREE_COSMETIC_IDS,
  HAIR_HEX,
  PANTS_HEX,
  SHIRT_HEX,
  SKIN_HEX,
  cosmeticHasSprite,
} from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { useModules } from '../../../hooks/useModules';
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
  if (slot === 'skin') {
    return <span className="block w-full h-full" style={{ background: SKIN_HEX[id] || '#D4A06A' }} />;
  }
  if (slot === 'shirt' && SHIRT_HEX[id]) {
    return <span className="block w-full h-full" style={{ background: SHIRT_HEX[id] }} />;
  }
  if (slot === 'pants' && PANTS_HEX[id]) {
    return <span className="block w-full h-full" style={{ background: PANTS_HEX[id] }} />;
  }
  if (slot === 'hair') {
    return <span className="block w-full h-full" style={{ background: HAIR_HEX[id] || '#3d2918' }} />;
  }
  if (COSMETIC_ICON[id]) {
    return <img src={COSMETIC_ICON[id]} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />;
  }
  return null;
}

const CharacterEditor: React.FC<{ onClose: () => void; onBuy: () => void; embedded?: boolean }> = ({ onClose, onBuy, embedded }) => {
  const { village, saveCharacter } = useVillage();
  const { playClick } = useSound();
  const modules = useModules();
  const shopOpen = modules.shop !== false;
  const [tab, setTab] = useState<keyof VillageCharacter>('skin');
  const [draft, setDraft] = useState<VillageCharacter>(village.character);

  const options = COSMETICS.filter((c) => {
    if (c.slot !== tab || !cosmeticHasSprite(c.id)) return false;
    if (!shopOpen) return c.free || FREE_COSMETIC_IDS.includes(c.id) || village.owned.includes(c.id);
    return true;
  });

  const inner = (
    <>
        {!embedded && (
          <div className="flex justify-between mb-3">
            <h2 className="mc-title text-sm">Personagem</h2>
            <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
          </div>
        )}
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
                title={c.label}
                onClick={() => {
                  playClick();
                  if (!owned) return;
                  setDraft({ ...draft, [tab]: c.id });
                }}
              >
                {slotThumb(c.id, tab)}
                <span className="absolute bottom-0 inset-x-0 text-[9px] leading-tight bg-black/60 px-0.5">
                  {owned || !shopOpen ? c.label : `${c.basePrice}g`}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button type="button" className="mc-btn mc-btn-green flex-1 h-12 font-bold" onClick={() => { playClick(); void saveCharacter(draft); if (!embedded) onClose(); }}>Salvar</button>
          {!options.every((c) => c.free || FREE_COSMETIC_IDS.includes(c.id) || village.owned.includes(c.id)) && shopOpen && (
            <button type="button" className="mc-btn mc-btn-gold h-12 px-3 font-bold" onClick={() => { playClick(); onBuy(); }}>Ver na loja</button>
          )}
        </div>
    </>
  );

  if (embedded) return <div>{inner}</div>;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-modal rounded-lg max-w-lg w-full p-4 text-white" onClick={(e) => e.stopPropagation()}>
        {inner}
      </div>
    </div>
  );
};

export default CharacterEditor;
