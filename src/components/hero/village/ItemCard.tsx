import React from 'react';
import type { Item } from '../../../types/items';
import type { VillageCharacter, VillageGear } from '../../../types/village';
import CharacterPreview from './CharacterPreview';

const ItemCard: React.FC<{
  item: Item;
  character: VillageCharacter;
  gear: VillageGear;
  children?: React.ReactNode;
}> = ({ item, character, gear, children }) => {
  const draft: VillageCharacter = { ...character };
  if (item.kind === 'cosmetic' && item.slot && item.slot !== 'pickaxe' && item.slot !== 'helmet' && item.slot !== 'boots' && item.slot !== 'lamp') {
    if (item.slot === 'hat' || item.slot === 'cape' || item.slot === 'pet') draft[item.slot] = item.id;
    else if (item.slot === 'skin' || item.slot === 'hair' || item.slot === 'shirt' || item.slot === 'pants') draft[item.slot] = item.id;
  }
  return (
    <div className="mc-card p-3 flex gap-3 items-start">
      <div className="mc-slot w-24 h-24 p-1 shrink-0 flex items-center justify-center">
        <CharacterPreview character={draft} gear={gear} size={88} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{item.name}</p>
        <p className="text-xs mc-muted">{item.description}</p>
        {children}
      </div>
    </div>
  );
};

export default ItemCard;
