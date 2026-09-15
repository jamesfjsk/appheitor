import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { GEAR } from '../../../config/village';
import { ITEMS, ITEM_BY_ID, itemState, SLOT_LABEL } from '../../../config/items';
import { MATERIAL_LABELS } from '../../../config/englishBase';
import type { Material } from '../../../types/english';
import type { ItemSlot as SlotId } from '../../../types/items';
import CharacterEditor from './CharacterEditor';
import ItemSlot from './ItemSlot';
import CharacterPreview from './CharacterPreview';

const EQUIP_SLOTS: SlotId[] = ['hat', 'skin', 'shirt', 'pants', 'cape', 'pickaxe', 'pet', 'boots', 'lamp'];

const Mochila: React.FC<{
  onClose: () => void;
  onOpenWorkshop: () => void;
  onOpenMarket: () => void;
  startTab?: 'equip' | 'clothes' | 'gear' | 'mats';
}> = ({ onClose, onOpenWorkshop, onOpenMarket, startTab = 'equip' }) => {
  const { village, materials, seeItems } = useVillage();
  const { playClick } = useSound();
  const [tab, setTab] = useState(startTab);
  const newSet = useMemo(() => new Set(village.newItems || []), [village.newItems]);

  const equippedId = (slot: SlotId): string | null => {
    if (slot === 'pickaxe') {
      const lv = village.gear.pickaxe;
      return GEAR.find((g) => g.slot === 'pickaxe' && g.level === lv)?.id ?? null;
    }
    if (slot === 'helmet' || slot === 'boots' || slot === 'lamp') {
      return village.gear[slot] >= 1 ? slot : null;
    }
    if (slot === 'cape') return village.character.cape || (village.gear.cape >= 1 ? 'cape' : null);
    return (village.character[slot as keyof typeof village.character] as string | null) || null;
  };

  const clothes = ITEMS.filter((i) => i.kind === 'cosmetic' && (village.owned.includes(i.id) || i.source === 'gratis'));
  const gearItems = ITEMS.filter((i) => i.kind === 'gear');

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="mc-modal rounded-lg w-full max-w-3xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-4 border-[#17130f] flex justify-between">
          <h2 className="mc-title text-sm">Mochila</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar p-3">
          {([
            ['equip', 'Equipado'],
            ['clothes', 'Roupas'],
            ['gear', 'Equipamentos'],
            ['mats', 'Materiais'],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={`mc-slot rounded px-3 ${tab === id ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setTab(id); if (id !== 'equip') void seeItems(); }}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'equip' && (
          <div className="p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {EQUIP_SLOTS.map((slot) => {
                const id = equippedId(slot);
                const item = id ? ITEM_BY_ID[id] : undefined;
                return (
                  <div key={slot} className="w-[4.5rem]">
                    {item ? (
                      <ItemSlot item={item} state="equipado" onClick={() => { playClick(); setTab(slot === 'pickaxe' || slot === 'helmet' || slot === 'boots' || slot === 'lamp' ? 'gear' : 'clothes'); }} />
                    ) : (
                      <div className="mc-slot min-h-[72px] flex items-center justify-center text-[10px] mc-muted">{SLOT_LABEL[slot]}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <CharacterEditor embedded onClose={onClose} onBuy={onOpenMarket} />
          </div>
        )}
        {tab === 'clothes' && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {clothes.map((item) => (
              <ItemSlot
                key={item.id}
                item={item}
                state={itemState({
                  owned: true,
                  equipped: equippedId(item.slot!) === item.id,
                  isNew: newSet.has(item.id),
                  level: 99,
                  forSale: false,
                })}
              />
            ))}
          </div>
        )}
        {tab === 'gear' && (
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {gearItems.map((item) => {
                const current = item.slot === 'pickaxe' ? village.gear.pickaxe : village.gear[item.slot as 'helmet' | 'boots' | 'lamp' | 'cape'];
                const owned = item.slot === 'pickaxe' ? current >= (GEAR.find((g) => g.id === item.id)?.level ?? 99) : current >= 1;
                return <ItemSlot key={item.id} item={item} state={owned ? 'seu' : 'em_breve'} />;
              })}
            </div>
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-4" onClick={() => { playClick(); onOpenWorkshop(); }}>Ir para a Ferraria</button>
          </div>
        )}
        {tab === 'mats' && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(MATERIAL_LABELS) as Material[]).map((m) => {
              const item = ITEM_BY_ID[m];
              if (!item) return null;
              return <ItemSlot key={m} item={item} qty={materials[m] || 0} state="seu" />;
            })}
            <ItemSlot item={ITEM_BY_ID.esmeralda} qty={village.rare.esmeralda} state="seu" />
            <ItemSlot item={ITEM_BY_ID.diamante} qty={village.rare.diamante} state="seu" />
          </div>
        )}
        <div className="p-3 flex justify-center">
          <CharacterPreview character={village.character} gear={village.gear} size={48} />
        </div>
      </div>
    </div>
  );
};

export default Mochila;
