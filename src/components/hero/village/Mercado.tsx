import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { COSMETICS, ISO_NPC, cosmeticHasSprite } from '../../../config/village';
import { ITEMS, itemState } from '../../../config/items';
import { canBuy, priceOf } from '../../../services/village/shop';
import { daysToAfford, referenceIncome } from '../../../services/village/income';
import { listGoldTransactions } from '../../../services/goldTx';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { useModules } from '../../../hooks/useModules';
import { useAuth } from '../../../contexts/AuthContext';
import { buyMaterials } from '../../../services/villageService';
import { claimKey, hasClaim } from '../../../services/village/claims';
import { getTodayBrazil } from '../../../utils/clock';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import type { Material } from '../../../types/english';
import { calculateLevelSystem } from '../../../utils/levelSystem';
import ItemSlot from './ItemSlot';
import ItemCard from './ItemCard';
import RewardsPanel from '../RewardsPanel';

const COMERCIANTE = ISO_NPC.comerciante;
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
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [askEquip, setAskEquip] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [cardId, setCardId] = useState<string | null>(null);
  const tab = picked ?? (shopOpen ? 'shop' : 'real');
  const level = calculateLevelSystem(progress.totalXP || 0).currentLevel;
  const gold = progress.availableGold || 0;
  const [r7, setR7] = useState(economy.incomeDayGold);
  useEffect(() => {
    if (!childUid) return;
    void listGoldTransactions(childUid, 200).then((txs) => {
      const week = txs.filter((t) => Date.now() - t.createdAt.getTime() < 7 * 86400000);
      setR7(referenceIncome(week, economy.incomeDayGold, { launchedOn: village.launchedOn }));
    });
  }, [childUid, economy.incomeDayGold, village.launchedOn]);
  const shopItems = COSMETICS.filter((c) => !c.free && cosmeticHasSprite(c.id) && (c.basePrice || 0) > 0 && c.slot !== 'skin' && c.slot !== 'hair').filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'premium') return c.premium;
    if (filter === 'clothes') return c.slot === 'shirt' || c.slot === 'pants';
    return c.slot === filter;
  }).sort((a, b) => {
    const ga = canBuy(village, gold, a, settings, level);
    const gb = canBuy(village, gold, b, settings, level);
    if (ga.ok !== gb.ok) return ga.ok ? -1 : 1;
    return priceOf(a, settings) - priceOf(b, settings);
  });
  const exclusive = ITEMS.filter((i) => i.source === 'marco' || i.source === 'patente' || i.source === 'npc');
  const selected = shopItems.find((c) => c.id === cardId);

  // decisão 42: 2 gold viram 10 de um material; até N compras por dia; nada de vender material por gold
  const buyPrice = economy.merchantBuy.gold;
  const buyQty = economy.merchantBuy.materials;
  const buyCap = economy.merchantBuy.dailyCap || 2;
  const todayKey = getTodayBrazil();
  let buysUsed = 0;
  for (let i = 1; i <= buyCap; i += 1) if (hasClaim(village, claimKey('merchant', todayKey, i))) buysUsed += 1;
  const buysLeft = Math.max(0, buyCap - buysUsed);
  const buy = async (m: Material) => {
    if (!childUid) return;
    playClick();
    try {
      const r = await buyMaterials(childUid, m, 1);
      toast.success(`+${r.qty} ${MATERIAL_LABELS[m].toLowerCase()} · -${r.gold} gold`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 mn-veil" onClick={onClose}>
      <div className="mc-modal mc-pop mn-child-sheet rounded-lg w-full max-w-3xl text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center shrink-0">
          <div>
            <h2 className="mc-title text-sm">Mercado</h2>
            <p className="text-sm mc-muted">Você ganha cerca de {r7} gold por dia</p>
          </div>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar p-3 shrink-0">
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'real' ? 'mc-slot-selected' : ''}`} onClick={() => { setPicked('real'); playClick(); }}>Prêmios de verdade</button>
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'shop' ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setPicked('shop'); }}>Loja da Vila</button>
          <button type="button" className={`mc-slot rounded px-3 ${tab === 'merchant' ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setPicked('merchant'); }}>Comerciante</button>
        </div>
        <div className="mn-child-body">
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
                    costChip={gate.reason === 'level' ? <span className="text-sm">Nível {gate.minLevel}</span> : owned ? undefined : <span className="text-sm">{priceOf(c, settings)}g</span>}
                  />
                );
              })}
            </div>
            {exclusive.length > 0 && (
              <div>
                <p className="mc-lbl mb-1">Só se ganha</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {exclusive.slice(0, 8).map((item) => (
                      <ItemSlot
                      key={item.id}
                      item={item}
                      state={
                        (item.id === 'esmeralda' && village.rare.esmeralda > 0)
                        || (item.id === 'diamante' && village.rare.diamante > 0)
                        || village.owned.includes(item.id)
                          ? 'seu'
                          : 'em_breve'
                      }
                    />
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
                      const price = priceOf(selected, settings);
                      if (gate.reason === 'gold') {
                        toast.error(`Faltam ${Math.max(0, price - gold)} gold`);
                        return;
                      }
                      setConfirmBuy(true);
                    }}
                  >
                    {village.owned.includes(selected.id) ? 'Seu' : canBuy(village, gold, selected, settings, level).reason === 'level' ? `Nível ${selected.minLevel}` : 'Comprar'}
                  </button>
                  <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => { setCardId(null); setConfirmBuy(false); }}>Só olhar</button>
                </div>
                {confirmBuy && !village.owned.includes(selected.id) && (
                  <div className="mc-paper text-gray-900 rounded p-3 mt-2 space-y-2">
                    <p className="text-sm">Com {priceOf(selected, settings)} gold você leva {selected.label}. Sobram {gold - priceOf(selected, settings)}.</p>
                    <div className="flex gap-2">
                      <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => {
                        void buyCosmetic(selected.id).then(() => {
                          setConfirmBuy(false);
                          setAskEquip(true);
                        }).catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
                      }}>Sim</button>
                      <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => setConfirmBuy(false)}>Não</button>
                    </div>
                  </div>
                )}
                {askEquip && (
                  <div className="mc-paper text-gray-900 rounded p-3 mt-2 space-y-2">
                    <p className="text-sm">Equipar agora?</p>
                    <div className="flex gap-2">
                      <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => { setAskEquip(false); onOpenPack?.(); }}>Sim</button>
                      <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => setAskEquip(false)}>Não</button>
                    </div>
                  </div>
                )}
              </ItemCard>
            )}
          </div>
        )}
        {tab === 'merchant' && (
          <div className="p-4 space-y-3">
            <img src={COMERCIANTE} alt="" className="w-16 h-16 mc-pixel" />
            <p className="text-sm">{buyPrice} gold viram {buyQty} de um material. Até {buyCap} compras por dia{buysLeft < buyCap ? ` · hoje ainda ${buysLeft}` : ''}. Redstone só na Fornalha.</p>
            {(Object.keys(MATERIAL_LABELS) as Material[]).filter((m) => m !== 'redstone').map((m) => (
              <div key={m} className="mc-row rounded p-3 flex items-center gap-3" data-testid={`merchant-${m}`}>
                <img src={MATERIAL_ICONS[m]} alt="" className="w-8 h-8 mc-pixel" />
                <span className="flex-1">{MATERIAL_LABELS[m]} · <span className="mc-num" style={{ fontSize: 12 }}>{materials[m] || 0}</span></span>
                <button
                  type="button"
                  className={`mc-btn min-h-[44px] px-3 ${gold < buyPrice || buysLeft <= 0 ? 'mc-btn-stone' : 'mc-btn-gold'}`}
                  disabled={gold < buyPrice || buysLeft <= 0}
                  onClick={() => void buy(m)}
                >
                  {buysLeft <= 0 ? 'Amanhã' : gold < buyPrice ? `Faltam ${buyPrice - gold} gold` : `Comprar ${buyQty} · ${buyPrice} gold`}
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Mercado;
