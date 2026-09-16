import React from 'react';
import type { Item, ItemState } from '../../../types/items';
import { itemFrame } from '../../../config/items';
import { cosmeticSwatchHex } from '../../../config/village';
import GarmentIcon from './GarmentIcon';

const STATE_LABEL: Record<ItemState, string> = {
  bloqueado: 'Bloqueado',
  a_venda: 'À venda',
  seu: 'Seu',
  equipado: 'Equipado',
  novo: 'Novo',
  em_breve: 'Em breve',
};

function thumb(item: Item): React.ReactNode {
  if (item.slot === 'shirt' || item.slot === 'pants') {
    return <GarmentIcon kind={item.slot} hex={cosmeticSwatchHex(item.id) || undefined} />;
  }
  const hex = item.kind === 'cosmetic' ? cosmeticSwatchHex(item.id) : null;
  if (hex && item.slot !== 'cape') {
    return <span className="mn-item-swatch" style={{ background: hex }} />;
  }
  return <img src={item.icon} alt="" className="w-8 h-8 mc-pixel" draggable={false} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />;
}

const ItemSlot: React.FC<{
  item: Item;
  state?: ItemState;
  qty?: number;
  selected?: boolean;
  onClick?: () => void;
  costChip?: React.ReactNode;
}> = ({ item, state = 'a_venda', qty, selected, onClick, costChip }) => {
  const frame = itemFrame(item.rarity);
  return (
    <button
      type="button"
      className={`mc-slot p-1 w-full min-h-[88px] flex flex-col items-center justify-center gap-0.5 text-center ${selected ? 'mc-slot-selected' : ''}`}
      style={{ boxShadow: `inset 0 0 0 2px ${frame.color}` }}
      onClick={onClick}
      title={item.description}
    >
      {thumb(item)}
      <span className="text-[10px] leading-tight truncate w-full">{item.name}</span>
      {typeof qty === 'number' && (
        <span className="mc-num text-white" style={{ fontSize: 12 }}>{qty}</span>
      )}
      {state === 'novo' && <span className="text-[9px] mc-warn">Novo</span>}
      {state !== 'novo' && state !== 'a_venda' && (
        <span className="text-[9px] mc-muted">{STATE_LABEL[state]}</span>
      )}
      {costChip}
    </button>
  );
};

export default ItemSlot;
