import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { BUILDINGS, buildingCost, buildingEffectNow, MATERIAL_ICONS, MATERIAL_LABELS, MATERIALS } from '../../../config/englishBase';
import { DEFAULT_ECONOMY, GEAR } from '../../../config/village';
import { ITEMS } from '../../../config/items';
import { canCraft, tradePreview } from '../../../services/village/shop';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { useData } from '../../../contexts/DataContext';
import type { Material } from '../../../types/english';
import { buildingSprite } from '../../../config/village';
import { VILLAGE_LINES } from '../../../data/villageLines';
import { calculateLevelSystem } from '../../../utils/levelSystem';
import ItemSlot from './ItemSlot';
import CharacterPreview from './CharacterPreview';

const FORGE = '/assets/english/ui/base/c_forge.webp';
const MULT = DEFAULT_ECONOMY.buildCostMultiplier;

const Oficina: React.FC<{ onClose: () => void; initialTab?: 'gear' | 'trade' | 'works'; onOpenPack?: () => void }> = ({ onClose, initialTab = 'gear', onOpenPack }) => {
  const { village, materials, buildings, craftGear, tradeMaterials } = useVillage();
  const { progress } = useData();
  const { playClick } = useSound();
  const [tab, setTab] = useState<'gear' | 'trade' | 'works'>(initialTab);
  const [from, setFrom] = useState<Material>('madeira');
  const [to, setTo] = useState<Material>('pedra');
  const [picked, setPicked] = useState(GEAR[0]?.id || 'pickaxe_stone');
  const speech = useMemo(() => VILLAGE_LINES.ferreiro[Math.abs(Date.now()) % VILLAGE_LINES.ferreiro.length].text, []);
  const level = calculateLevelSystem(progress.totalXP || 0).currentLevel;
  const furnace = buildings.fornalha || 0;
  const preview = tradePreview(from, to);
  const selected = GEAR.find((g) => g.id === picked) || GEAR[0];
  const selectedItem = ITEMS.find((i) => i.id === selected.id);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-modal rounded-lg w-full max-w-3xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-4 border-[#17130f] flex justify-between">
          <h2 className="mc-h"><img src={FORGE} alt="" className="w-8 h-8 mc-pixel" />Ferraria</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <p className="px-4 pt-2 text-sm mc-muted">{speech} Chapéu é com o Comerciante.</p>
        <div className="mc-hotbar p-3">
          {(['gear', 'trade', 'works'] as const).map((t) => (
            <button key={t} type="button" className={`mc-slot rounded px-3 ${tab === t ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setTab(t); }}>
              {t === 'gear' ? 'Forjar' : t === 'trade' ? 'Fundição' : 'Obras'}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {MATERIALS.map((m) => (
              <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1" title={m === 'madeira' ? 'Missões da manhã' : m === 'pedra' ? 'Missões da tarde' : m === 'ferro' ? 'Missões da noite' : 'Mina e Queima'}>
                <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
                <span className="mc-num text-white" style={{ fontSize: 12 }}>{materials[m] || 0}</span>
                <span className="mc-chip-l">{MATERIAL_LABELS[m]}</span>
              </span>
            ))}
          </div>
          {tab === 'gear' && (
            <>
              <div className="flex gap-3 items-start">
                <CharacterPreview character={village.character} gear={village.gear} size={96} />
                {selectedItem && <p className="text-sm">{selected.effect}</p>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GEAR.map((g) => {
                  const item = ITEMS.find((i) => i.id === g.id);
                  if (!item) return null;
                  const current = g.slot === 'pickaxe' ? village.gear.pickaxe : village.gear[g.slot];
                  const check = canCraft(materials, village.rare, g.id, current, level);
                  const state = check.reason === 'already' ? 'seu' : check.reason === 'level' ? 'bloqueado' : 'a_venda';
                  return (
                    <ItemSlot
                      key={g.id}
                      item={item}
                      state={state}
                      selected={picked === g.id}
                      onClick={() => { playClick(); setPicked(g.id); }}
                      costChip={
                        <span className="text-[9px]">
                          {MATERIALS.filter((m) => (g.cost[m] || 0) > 0).map((m) => (
                            <span key={m} className={(materials[m] || 0) >= (g.cost[m] || 0) ? 'text-green-300' : 'text-red-300'}>
                              {materials[m] || 0}/{g.cost[m]} {MATERIAL_LABELS[m]}{' '}
                            </span>
                          ))}
                        </span>
                      }
                    />
                  );
                })}
              </div>
              {selected && (() => {
                const current = selected.slot === 'pickaxe' ? village.gear.pickaxe : village.gear[selected.slot];
                const check = canCraft(materials, village.rare, selected.id, current, level);
                const label = check.reason === 'already'
                  ? 'Feito'
                  : check.reason === 'order'
                    ? `Precisa da picareta anterior`
                    : check.reason === 'level'
                      ? `Nível ${check.minLevel}`
                      : check.ok
                        ? 'Forjar'
                        : 'Faltam materiais';
                return (
                  <button type="button" disabled={!check.ok} className="mc-btn mc-btn-green min-h-[44px] px-4 font-bold" onClick={() => { playClick(); void craftGear(selected.id); }}>
                    {label}
                  </button>
                );
              })()}
              {onOpenPack && (
                <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-4" onClick={() => { playClick(); onOpenPack(); }}>Abrir a Mochila</button>
              )}
            </>
          )}
          {tab === 'trade' && (
            furnace < 2 ? (
              <p className="text-sm">A Fornalha nível 2 libera a Fundição.</p>
            ) : (
              <div className="mc-card p-4">
                <p className="mb-3 text-sm">Troca 3 de um material por 1 de outro. Sem gold. Redstone não entra.</p>
                <div className="flex gap-2 mb-3">
                  <select className="h-11 text-[#1f1a17] rounded-md" value={from} onChange={(e) => setFrom(e.target.value as Material)}>
                    {MATERIALS.filter((m) => m !== 'redstone').map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
                  </select>
                  <select className="h-11 text-[#1f1a17] rounded-md" value={to} onChange={(e) => setTo(e.target.value as Material)}>
                    {MATERIALS.filter((m) => m !== 'redstone').map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
                  </select>
                </div>
                <p className="text-sm mb-3">{preview.ok ? `3 ${MATERIAL_LABELS[from]} viram 1 ${MATERIAL_LABELS[to]}` : 'Escolha dois diferentes'}</p>
                <button type="button" disabled={!preview.ok} className="mc-btn mc-btn-green h-12 px-4 font-bold" onClick={() => { playClick(); void tradeMaterials(from, to); }}>Fundir</button>
              </div>
            )
          )}
          {tab === 'works' && (
            <>
              <p className="text-sm mc-muted">As obras sobem no lote da cena. Aqui você só vê o que já está de pé.</p>
              {BUILDINGS.map((b) => {
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
                    <span className="text-xs mc-muted">{bLevel >= 3 ? 'Máximo' : bLevel === 0 ? 'No lote' : 'Melhora no lote'}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Oficina;
