import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { BUILDINGS, buildingCost, buildingEffectNow, MATERIAL_LABELS, MATERIALS, initialBaseDoc } from '../../../config/englishBase';
import { GEAR, GEAR_SPRITE } from '../../../config/village';
import { canCraft, tradePreview } from '../../../services/village/shop';
import { canBuild as canBuildCheck, buildUpgrade } from '../../../services/englishBaseService';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { Material } from '../../../types/english';
import { buildingSprite } from '../../../config/village';
import { VILLAGE_LINES } from '../../../data/villageLines';
import toast from 'react-hot-toast';

const FORGE = '/assets/english/ui/base/c_forge.webp';

const Oficina: React.FC<{ onClose: () => void; initialTab?: 'build' | 'gear' | 'trade' }> = ({ onClose, initialTab = 'build' }) => {
  const { childUid } = useAuth();
  const { village, materials, buildings, craftGear, tradeMaterials } = useVillage();
  const { playClick, playLevelUp } = useSound();
  const [tab, setTab] = useState<'build' | 'gear' | 'trade'>(initialTab);
  const [from, setFrom] = useState<Material>('madeira');
  const [to, setTo] = useState<Material>('pedra');
  const speech = useMemo(() => VILLAGE_LINES.ferreiro[Math.abs(Date.now()) % VILLAGE_LINES.ferreiro.length].text, []);

  const preview = tradePreview(from, to);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-modal rounded-lg w-full max-w-3xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-4 border-[#17130f] flex justify-between">
          <h2 className="mc-h"><img src={FORGE} alt="" className="w-8 h-8 mc-pixel" />Oficina / Workshop</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar p-3">
          {(['build', 'gear', 'trade'] as const).map((t) => (
            <button key={t} type="button" className={`mc-slot rounded px-3 ${tab === t ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setTab(t); }}>
              {t === 'build' ? 'Construir' : t === 'gear' ? 'Equipamentos' : 'Ferreiro'}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-2">
          {tab === 'build' && BUILDINGS.map((b) => {
            const level = buildings[b.id] || 0;
            const fakeBase = { ...initialBaseDoc(childUid || 'x', new Date().toISOString()), materials, buildings };
            const info = canBuildCheck(fakeBase, b.id);
            const cost = buildingCost(b.id, info.nextLevel);
            const costText = cost
              ? MATERIALS.filter((m) => (cost[m] || 0) > 0).map((m) => `${cost[m]} ${MATERIAL_LABELS[m]}`).join(' · ')
              : '';
            const missingText = MATERIALS.filter((m) => (info.missing[m] || 0) > 0)
              .map((m) => `${info.missing[m]} ${MATERIAL_LABELS[m]}`)
              .join(', ');
            const btnLabel = info.later
              ? `Abre na ${info.later}`
              : level >= 3
                ? 'Máximo'
                : !info.unlocked
                  ? 'Bloqueada: precisa de Fornalha e Baú nível 1'
                  : info.ok
                    ? (level === 0 ? 'Construir' : 'Melhorar')
                    : missingText
                      ? `Falta ${missingText}`
                      : 'Falta material';
            return (
              <div key={b.id} className="mc-row rounded p-3 flex items-center gap-3">
                <img src={buildingSprite(b.id, Math.max(1, level))} alt="" className="w-12 h-12 mc-pixel" onError={(e) => { e.currentTarget.src = b.icon; }} />
                <div className="flex-1">
                  <p className="font-bold">{b.label} · nível {level}</p>
                  <p className="text-xs mc-muted">{buildingEffectNow(b.id, level)}</p>
                  {costText && level < 3 && <p className="text-xs mc-muted mt-1">{costText}</p>}
                </div>
                <button
                  type="button"
                  disabled={!info.ok}
                  className="mc-btn mc-btn-green min-h-[44px] px-4 font-bold"
                  onClick={async () => {
                    if (!childUid) return;
                    playClick();
                    try {
                      await buildUpgrade(childUid, b.id);
                      playLevelUp();
                      toast.success(`${b.label} subiu para o nível ${(buildings[b.id] || 0) + 1}`);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Não deu para construir');
                    }
                  }}
                >
                  {btnLabel}
                </button>
              </div>
            );
          })}
          {tab === 'gear' && GEAR.map((g) => {
            const current = g.slot === 'pickaxe' ? village.gear.pickaxe : village.gear[g.slot];
            const check = canCraft(materials, village.rare, g.id, current);
            const sprite = GEAR_SPRITE[g.id];
            const btnLabel = check.reason === 'already'
              ? 'Feito'
              : check.reason === 'order'
                ? 'Na ordem'
                : check.reason === 'materials' || check.reason === 'rare'
                  ? 'Faltam materiais'
                  : 'Craftar';
            return (
              <div key={g.id} className="mc-row rounded p-3 flex items-center gap-3">
                {sprite && <img src={sprite} alt="" className="w-10 h-10 mc-pixel" />}
                <div className="flex-1">
                  <p className="font-bold">{g.label} {check.reason === 'already' ? '· feito' : ''}</p>
                  <p className="text-xs mc-muted">{g.effect}</p>
                  <p className="text-xs mc-muted mt-1">{Object.entries(g.cost).map(([m, q]) => `${q} ${MATERIAL_LABELS[m as Material] || m}`).join(' · ')}{g.rare.esmeralda ? ` · ${g.rare.esmeralda} esmeralda` : ''}{g.rare.diamante ? ` · ${g.rare.diamante} diamante` : ''}</p>
                </div>
                <button type="button" disabled={!check.ok} className="mc-btn mc-btn-green min-h-[44px] px-4 font-bold" onClick={() => { playClick(); void craftGear(g.id); }}>
                  {btnLabel}
                </button>
              </div>
            );
          })}
          {tab === 'trade' && (
            <div className="mc-card p-4">
              <p className="mb-3">{speech}</p>
              <p className="mb-3 mc-muted text-sm">Troca 3 de um material por 1 de outro. Sem gold.</p>
              <div className="flex gap-2 mb-3">
                <select className="h-11 text-[#1f1a17] rounded-md" value={from} onChange={(e) => setFrom(e.target.value as Material)}>
                  {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
                </select>
                <select className="h-11 text-[#1f1a17] rounded-md" value={to} onChange={(e) => setTo(e.target.value as Material)}>
                  {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}
                </select>
              </div>
              <p className="text-sm mb-3">{preview.ok ? `3 ${MATERIAL_LABELS[from]} viram 1 ${MATERIAL_LABELS[to]}` : 'Escolha dois diferentes'}</p>
              <button type="button" disabled={!preview.ok} className="mc-btn mc-btn-green h-12 px-4 font-bold" onClick={() => { playClick(); void tradeMaterials(from, to); }}>Trocar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Oficina;
