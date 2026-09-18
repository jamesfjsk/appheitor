import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BUILDINGS, buildingCost, buildingEffectNow, MATERIAL_ICONS, MATERIAL_LABELS, MATERIALS } from '../../../config/englishBase';
import { GEAR, ISO_NPC, buildingSprite, pickaxeInfo, visibleCracks } from '../../../config/village';
import { ITEMS } from '../../../config/items';
import { canCraft } from '../../../services/village/shop';
import type { ForgeTab } from '../../../services/village/furnace';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { useData } from '../../../contexts/DataContext';
import type { PickaxeLevel } from '../../../types/village';
import { VILLAGE_LINES } from '../../../data/villageLines';
import { calculateLevelSystem } from '../../../utils/levelSystem';
import ItemSlot from './ItemSlot';
import CharacterPreview from './CharacterPreview';
import ChildSheet from './ChildSheet';
import Fornalha from './Fornalha';

const FORGE = ISO_NPC.ferreiro;
const TABS: Array<{ id: ForgeTab; label: string }> = [
  { id: 'fire', label: 'Fogo' },
  { id: 'gear', label: 'Forjar' },
  { id: 'works', label: 'Obras' },
];

const Oficina: React.FC<{
  onClose: () => void;
  initialTab?: ForgeTab;
  onOpenPack?: () => void;
  onOpenLot?: (id: string) => void;
}> = ({ onClose, initialTab = 'gear', onOpenPack, onOpenLot }) => {
  const { village, materials, buildings, economy, craftGear } = useVillage();
  const { progress } = useData();
  const { playClick } = useSound();
  const [tab, setTab] = useState<ForgeTab>(initialTab);
  const [picked, setPicked] = useState(GEAR[0]?.id || 'pickaxe_stone');
  const speech = useMemo(() => VILLAGE_LINES.ferreiro[Math.abs(Date.now()) % VILLAGE_LINES.ferreiro.length].text, []);
  const level = calculateLevelSystem(progress.totalXP || 0).currentLevel;
  const furnaceDown = visibleCracks(village.cracks).includes('fornalha');
  const MULT = economy.buildCostMultiplier ?? 1;
  const selected = GEAR.find((g) => g.id === picked) || GEAR[0];
  const selectedItem = ITEMS.find((i) => i.id === selected.id);
  const hand = pickaxeInfo(village.gear.pickaxe);
  const previewPick = selected.slot === 'pickaxe' ? pickaxeInfo(selected.level) : hand;

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  return (
    <ChildSheet
      onClose={onClose}
      title={(
        <span className="flex items-center gap-2 min-w-0">
          <img src={buildingSprite('fornalha', Math.max(1, buildings.fornalha || 1))} alt="" className="w-8 h-8 mc-pixel" />
          <img src={FORGE} alt="" className="w-8 h-8 mc-pixel" />
          Ferraria
        </span>
      )}
      tabs={(
        <div className="mc-hotbar p-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`mc-slot rounded px-3 ${tab === t.id ? 'mc-slot-selected' : ''}`}
              onClick={() => { playClick(); setTab(t.id); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    >
      <div className="p-4 space-y-3">
        <p className="text-sm mc-muted shrink-0">{speech} O fogo fica aqui. Chapéu é com o Comerciante.</p>
        <div className="flex flex-wrap gap-2">
          {MATERIALS.map((m) => (
            <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1" title={m === 'madeira' ? 'Missões da manhã' : m === 'pedra' ? 'Missões da tarde' : m === 'ferro' ? 'Missões da noite' : 'Mina e Queima'}>
              <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
              <span className="mc-num text-white" style={{ fontSize: 12 }}>{materials[m] || 0}</span>
              <span className="mc-chip-l">{MATERIAL_LABELS[m]}</span>
            </span>
          ))}
        </div>
        {furnaceDown && (tab === 'gear' || tab === 'fire') && (
          <div className="space-y-2">
            <p className="text-sm">A Fornalha está em ruínas. Arruma com material ou com as missões de hoje.</p>
            <button
              type="button"
              className="mc-btn mc-btn-green w-full min-h-[44px] font-bold"
              onClick={() => { playClick(); onOpenLot?.('fornalha'); }}
            >
              Arrumar a Fornalha
            </button>
          </div>
        )}
        {tab === 'fire' && !furnaceDown && (
          <Fornalha onUpgrade={() => onOpenLot?.('fornalha')} />
        )}
        {tab === 'gear' && !furnaceDown && (
          <>
            <div className="flex gap-3 items-start">
              <CharacterPreview
                character={village.character}
                gear={selected.slot === 'pickaxe'
                  ? { ...village.gear, pickaxe: selected.level as PickaxeLevel }
                  : village.gear}
                size={128}
              />
              {selectedItem && (
                <p className="text-sm pt-1">
                  <span className="block font-bold text-amber-200">{selected.label}</span>
                  {selected.effect}
                  {selected.slot === 'pickaxe' && (
                    <span className="block mt-1 text-xs mc-muted">
                      Na mão: {hand.label}
                      {previewPick.level > hand.level ? ' · esta ainda não é sua' : previewPick.level === hand.level ? ' · é esta' : ''}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GEAR.map((g) => {
                const item = ITEMS.find((i) => i.id === g.id);
                if (!item) return null;
                const current = g.slot === 'pickaxe' ? village.gear.pickaxe : village.gear[g.slot];
                const check = canCraft(materials, village.rare, g.id, current, level);
                const state = check.reason === 'already' ? 'seu' : check.reason === 'soon' ? 'em_breve' : check.reason === 'level' ? 'bloqueado' : 'a_venda';
                return (
                  <ItemSlot
                    key={g.id}
                    item={item}
                    state={state}
                    selected={picked === g.id}
                    onClick={() => { playClick(); setPicked(g.id); }}
                    costChip={(
                      <span className="text-[9px]">
                        {MATERIALS.filter((m) => (g.cost[m] || 0) > 0).map((m) => (
                          <span key={m} className={(materials[m] || 0) >= (g.cost[m] || 0) ? 'text-green-300' : 'text-red-300'}>
                            {materials[m] || 0}/{g.cost[m]} {MATERIAL_LABELS[m]}{' '}
                          </span>
                        ))}
                        {(g.rare.esmeralda || 0) > 0 && (
                          <span className={(village.rare.esmeralda || 0) >= (g.rare.esmeralda || 0) ? 'text-green-300' : 'text-red-300'}>
                            {village.rare.esmeralda || 0}/{g.rare.esmeralda} esmeralda{' '}
                          </span>
                        )}
                        {(g.rare.diamante || 0) > 0 && (
                          <span className={(village.rare.diamante || 0) >= (g.rare.diamante || 0) ? 'text-green-300' : 'text-red-300'}>
                            {village.rare.diamante || 0}/{g.rare.diamante} diamante
                          </span>
                        )}
                      </span>
                    )}
                  />
                );
              })}
            </div>
            {selected && (() => {
              const current = selected.slot === 'pickaxe' ? village.gear.pickaxe : village.gear[selected.slot];
              const check = canCraft(materials, village.rare, selected.id, current, level);
              const label = check.reason === 'soon'
                ? 'Abre quando a Lanterna funcionar'
                : check.reason === 'already'
                  ? 'Feito'
                  : check.reason === 'order'
                    ? `Precisa da picareta anterior`
                    : check.reason === 'level'
                      ? `Nível ${check.minLevel}`
                      : check.reason === 'rare'
                        ? 'Faltam gemas'
                        : check.ok
                          ? 'Forjar'
                          : 'Faltam materiais';
              return (
                <button type="button" disabled={!check.ok} className="mc-btn mc-btn-green min-h-[44px] px-4 font-bold" onClick={() => {
                  playClick();
                  void craftGear(selected.id).catch((e) => {
                    const msg = e instanceof Error ? e.message : 'Não deu para forjar';
                    toast.error(msg);
                  });
                }}>
                  {label}
                </button>
              );
            })()}
            {onOpenPack && (
              <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-4" onClick={() => { playClick(); onOpenPack(); }}>Abrir a Mochila</button>
            )}
          </>
        )}
        {tab === 'works' && (
          <>
            <p className="text-sm mc-muted">As obras sobem no lote da cena. Aqui você só vê o que já está de pé.</p>
            {BUILDINGS.filter((b) => b.id !== 'campinho' && b.id !== 'arena').map((b) => {
              const bLevel = buildings[b.id] || 0;
              const cost = bLevel < 3 ? buildingCost(b.id, bLevel + 1, MULT) : null;
              return (
                <div key={b.id} className="mc-row rounded p-3 flex items-center gap-3">
                  <img src={buildingSprite(b.id, Math.max(1, bLevel))} alt="" className="w-12 h-12 mc-pixel" />
                  <div className="flex-1">
                    <p className="font-bold">{b.label} · nível {bLevel}</p>
                    <p className="text-xs mc-muted">{buildingEffectNow(b.id, bLevel)}</p>
                    {cost && (
                      <p className="text-xs mc-muted mt-1">Próximo: {MATERIALS.filter((m) => (cost[m] || 0) > 0).map((m) => `${cost[m]} ${MATERIAL_LABELS[m]}`).join(' · ')}</p>
                    )}
                  </div>
                  <button type="button" className="mc-btn mc-btn-stone min-h-[36px] px-2" onClick={() => { playClick(); onOpenLot?.(b.id); }}>
                    {bLevel === 0 ? 'Construir' : (b.liveMaxLevel ?? 3) <= bLevel ? 'Ver' : 'Melhorar'}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </ChildSheet>
  );
};

export default Oficina;
