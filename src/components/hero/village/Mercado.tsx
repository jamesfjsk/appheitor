import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { COSMETICS, cosmeticHasSprite } from '../../../config/village';
import { ITEMS, itemState } from '../../../config/items';
import { canBuy, priceOf } from '../../../services/village/shop';
import { daysToAfford } from '../../../services/village/income';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { useModules } from '../../../hooks/useModules';
import { useAuth } from '../../../contexts/AuthContext';
import { sellMaterials } from '../../../services/villageService';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import type { Material } from '../../../types/english';
import { calculateLevelSystem } from '../../../utils/levelSystem';
import ItemSlot from './ItemSlot';
import ItemCard from './ItemCard';
import RewardsPanel from '../RewardsPanel';

const COMERCIANTE = '/assets/village/npc/comerciante.png';
const FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'hat', label: 'Chapéus' },
  { id: 'cape', label: 'Capas' },
  { id: 'pet', label: 'Pets' },
  { id: 'clothes', label: 'Roupas' },
  { id: 'premium', label: 'Premium' },
] as const;

const Mercado: React.FC<{
  onClose: () => void;
  onOpenRewards: () => void;
  onCreateGoal?: (title: string, gold: number, rewardId?: string) => void;
  onOpenPack?: () => void;
}> = ({ onClose, onCreateGoal, onOpenPack }) => {
  const { village, settings, economy, buyCosmetic, materials } = useVillage();
  const { progress } = useData();
  const { childUid } = useAuth();
  const { playClick } = useSound();
  const modules = useModules();
  const shopOpen = modules.shop !== false && settings.shopEnabled;
  const [picked, setPicked] = useState<'real' | 'shop' | 'merchant' | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [cardId, setCardId] = useState<string | null>(null);
  const tab = picked ?? (shopOpen ? 'shop' : 'real');
  const level = calculateLevelSystem(progress.totalXP || 0).currentLevel;
  const gold = progress.availableGold || 0;
  const r7 = economy.incomeDayGold;
  const shopItems = COSMETICS.filter((c) => !c.free && cosmeticHasSprite(c.id)).filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'premium') return c.premium;
    if (filter === 'clothes') return c.slot === 'shirt' || c.slot === 'pants' || c.slot === 'hair';
    return c.slot === filter;
  }).sort((a, b) => {
    const ga = canBuy(village, gold, a, settings, level);
    const gb = canBuy(village, gold, b, settings, level);
    if (ga.ok !== gb.ok) return ga.ok ? -1 : 1;
    return priceOf(a, settings) - priceOf(b, settings);
  });
  const exclusive = ITEMS.filter((i) => i.source === 'marco' || i.source === 'patente' || i.source === 'npc');
  const selected = shopItems.find((c) => c.id === cardId);

  const sell = async (m: Material) => {
    if (!childUid) return;
    playClick();
    try {
      const paid = await sellMaterials(childUid, m, 1);
      toast.success(`+${paid} gold`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-2" onClick={onClose}>
      <div className="mc-modal rounded-lg w-full max-w-3xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-4 border-[#17130f] flex justify-between">
          <div>
            <h2 className="mc-title text-sm">Mercado</h2>
            <p className="text-xs mc-muted">Você ganha cerca de {r7} gold por dia</p>
          </div>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar p-3">
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'real' ? 'mc-slot-selected' : ''}`} onClick={() => { setPicked('real'); playClick(); }}>Prêmios de verdade</button>
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'shop' ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setPicked('shop'); }}>Loja da Vila</button>
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'merchant' ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setPicked('merchant'); }}>Comerciante</button>
        </div>
        {tab === 'real' && (
          <RewardsPanel isOpen onClose={onClose} embedded onCreateGoal={onCreateGoal} />
        )}
        {tab === 'shop' && !shopOpen && (
          <div className="p-4">
            <div className="mc-paper rounded p-4 text-gray-900 flex gap-3 items-start">
              <img src={COMERCIANTE} alt="" className="w-16 h-16 mc-pixel shrink-0" draggable={false} />
              <p className="text-sm leading-relaxed">Em breve: o Comerciante está arrumando a barraca. Por enquanto, seu gold vale nos Prêmios de verdade.</p>
            </div>
          </div>
        )}
        {tab === 'shop' && shopOpen && (
          <div className="p-4 space-y-3">
            <p className="mc-num text-white" style={{ fontSize: 16 }}>{gold} gold</p>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className={`mc-slot px-2 py-1 ${filter === f.id ? 'mc-slot-selected' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {shopItems.map((c) => {
                const item = ITEMS.find((i) => i.id === c.id);
                if (!item) return null;
                const owned = village.owned.includes(c.id);
                const equipped = village.character.hat === c.id || village.character.cape === c.id || village.character.pet === c.id;
                const gate = canBuy(village, gold, c, settings, level);
                return (
                  <ItemSlot
                    key={c.id}
                    item={item}
                    state={itemState({ owned, equipped, isNew: (village.newItems || []).includes(c.id), minLevel: c.minLevel, level, forSale: true })}
                    onClick={() => { playClick(); setCardId(c.id); }}
                    costChip={gate.reason === 'level' ? <span className="text-[9px]">Nível {gate.minLevel}</span> : owned ? undefined : <span className="text-[9px]">{priceOf(c, settings)}g</span>}
                  />
                );
              })}
            </div>
            {exclusive.length > 0 && (
              <div>
                <p className="mc-lbl mb-1">Só se ganha</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {exclusive.slice(0, 8).map((item) => (
                    <ItemSlot key={item.id} item={item} state="em_breve" />
                  ))}
                </div>
              </div>
            )}
            {selected && (
              <ItemCard item={ITEMS.find((i) => i.id === selected.id)!} character={village.character} gear={village.gear}>
                <p className="text-sm mt-1">{priceOf(selected, settings)} gold · cerca de {daysToAfford(priceOf(selected, settings), gold, r7)} dias no seu ritmo</p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    disabled={village.owned.includes(selected.id) || canBuy(village, gold, selected, settings, level).reason === 'level'}
                    className="mc-btn mc-btn-gold min-h-[44px] px-3"
                    onClick={() => {
                      playClick();
                      const gate = canBuy(village, gold, selected, settings, level);
                      if (gate.reason === 'gold') onCreateGoal?.(selected.label, priceOf(selected, settings));
                      else void buyCosmetic(selected.id).then(() => { toast.success('Equipar agora?'); onOpenPack?.(); });
                    }}
                  >
                    {village.owned.includes(selected.id) ? 'Seu' : canBuy(village, gold, selected, settings, level).reason === 'level' ? `Nível ${selected.minLevel}` : 'Comprar'}
                  </button>
                  <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => setCardId(null)}>Só olhar</button>
                </div>
              </ItemCard>
            )}
          </div>
        )}
        {tab === 'merchant' && (
          <div className="p-4 space-y-3">
            <img src={COMERCIANTE} alt="" className="w-16 h-16 mc-pixel" />
            <p className="text-sm">10 materiais viram 3 gold. Até {economy.merchantBuy.dailyCap} vendas por dia.</p>
            {(Object.keys(MATERIAL_LABELS) as Material[]).filter((m) => m !== 'redstone').map((m) => (
              <div key={m} className="mc-row rounded p-3 flex items-center gap-3">
                <img src={MATERIAL_ICONS[m]} alt="" className="w-8 h-8 mc-pixel" />
                <span className="flex-1">{MATERIAL_LABELS[m]} · <span className="mc-num" style={{ fontSize: 12 }}>{materials[m] || 0}</span></span>
                <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => void sell(m)}>Vender 10</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mercado;
