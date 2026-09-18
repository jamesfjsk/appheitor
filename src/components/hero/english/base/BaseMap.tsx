// ========================================
// Mapa de obras (grade 3x2). Fora da Mina: construir/melhorar é o cartão do lote
// na Vila. Este arquivo fica só como referência da animação de subida.

// ========================================

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { BaseDoc, BuildingId, DailyPlan, Material } from '../../../../types/english';
import {
  BUILDINGS,
  BUILDING_BY_ID,
  BUILDING_MAX_LEVEL,
  MATERIALS,
  MATERIAL_ICONS,
  MATERIAL_LABELS,
  buildingCost,
  buildingIcon,
  isBuildingUnlocked,
} from '../../../../config/englishBase';
import { buildXp } from '../../../../config/englishRewards';
import { baseLevelOf, canBuild } from '../../../../services/englishBaseService';
import { visibleCracks } from '../../../../config/village';
import { useVillage } from '../../../../contexts/VillageContext';

interface Props {
  base: BaseDoc;
  plan: DailyPlan | null;
  /** Construção em andamento (botão travado) */
  building: BuildingId | null;
  onBuild: (id: BuildingId) => void;
  onOpenBoard: () => void;
  onSaveTheme: (text: string | null) => Promise<void>;
}

const TORCH_ICON = '/assets/english/ui/torch.webp';
const MAX_TORCHES = 14;
const THEME_MAX = 30;

/** Subida em 3 quadros (steps) da construção recém-erguida; index.css não é tocado aqui */
const RISE_CSS =
  '@keyframes mcb-rise{0%{transform:translateY(28px);opacity:.2}33%{transform:translateY(18px);opacity:.6}66%{transform:translateY(8px);opacity:.9}100%{transform:translateY(0);opacity:1}}.mcb-rising{animation:mcb-rise .6s steps(3,end) both}';

const BaseMap: React.FC<Props> = ({ base, plan, building, onBuild, onOpenBoard, onSaveTheme }) => {
  const { village } = useVillage();
  const mesaLive = base.buildings.mesa >= 1 && !visibleCracks(village.cracks).includes('mesa');
  const [selected, setSelected] = useState<BuildingId | null>('fornalha');
  const [rising, setRising] = useState<BuildingId | null>(null);
  const [theme, setTheme] = useState(base.themeRequest ?? '');
  const [savingTheme, setSavingTheme] = useState(false);
  const prevLevels = useRef(base.buildings);

  // Detecta a construção que subiu de nível para animar só aquele lote
  useEffect(() => {
    const prev = prevLevels.current;
    prevLevels.current = base.buildings;
    const up = BUILDINGS.find((b) => (base.buildings[b.id] ?? 0) > (prev[b.id] ?? 0));
    if (!up) return;
    setRising(up.id);
    const t = window.setTimeout(() => setRising(null), 900);
    return () => window.clearTimeout(t);
  }, [base.buildings]);

  const level = baseLevelOf(base);
  const torches = Math.min(base.streakDays, MAX_TORCHES);
  const openCount = plan ? plan.order.filter((id) => plan.contracts[id]?.status === 'open').length : 0;
  const doneCount = plan ? plan.order.filter((id) => plan.contracts[id]?.status === 'done').length : 0;

  const def = selected ? BUILDING_BY_ID[selected] : null;
  const check = selected ? canBuild(base, selected) : null;
  const curLevel = selected ? (base.buildings[selected] ?? 0) : 0;
  const cost = selected && check ? buildingCost(selected, check.nextLevel) : null;
  const maxed = curLevel >= BUILDING_MAX_LEVEL;
  const missingList = check
    ? MATERIALS.filter((m) => (check.missing[m] ?? 0) > 0).map((m) => `${check.missing[m]} ${MATERIAL_LABELS[m].toLowerCase()}`)
    : [];

  const saveTheme = async () => {
    setSavingTheme(true);
    try {
      await onSaveTheme(theme.trim() ? theme.trim() : null);
    } finally {
      setSavingTheme(false);
    }
  };

  return (
    <div data-testid="base-map">
      <style>{RISE_CSS}</style>

      {/* Nível da base e tochas */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <p className="mc-title text-xs sm:text-sm">Base nível {level}</p>
        <div className="flex items-center gap-0.5 ml-auto" title={`${base.streakDays} dias seguidos`} data-testid="torches">
          {Array.from({ length: torches }).map((_, i) => (
            <img key={i} src={TORCH_ICON} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
          ))}
          <span className="mc-font text-[9px] mc-warn ml-1">{base.streakDays} {base.streakDays === 1 ? 'dia' : 'dias'}</span>
        </div>
      </div>

      {/* Inventário */}
      <div className="grid grid-cols-4 gap-2 mb-4" data-testid="inventory">
        {MATERIALS.map((m: Material) => {
          const n = base.materials[m] ?? 0;
          return (
            <div key={m} className="mc-slot flex items-center gap-1.5 px-2 py-1.5">
              <img src={MATERIAL_ICONS[m]} alt="" className="w-7 h-7 mc-pixel shrink-0" draggable={false} />
              <div className="min-w-0">
                <motion.span key={n} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="mc-font text-xs text-white block">{n}</motion.span>
                <span className="text-[10px] mc-muted block truncate">{MATERIAL_LABELS[m]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grade 3x2 */}
      <div className="grid grid-cols-3 gap-2 mb-3" data-testid="lots">
        {BUILDINGS.filter((b) => !b.hideOnBaseMap).map((b) => {
          const lvl = base.buildings[b.id] ?? 0;
          if (!isBuildingUnlocked(b.id, base.buildings)) {
            return (
              <div key={b.id} className="mc-slot p-2 flex flex-col items-center justify-center min-h-[7rem] opacity-70" data-testid={`lot-${b.id}-hidden`}>
                <span className="mc-font text-lg mc-muted">?</span>
                <span className="text-[10px] mc-muted mt-1 text-center leading-tight">Lote oculto</span>
              </div>
            );
          }
          const sel = selected === b.id;
          return (
            <button key={b.id} onClick={() => setSelected(b.id)} className={`mc-card mc-card-hover p-2 flex flex-col items-center min-h-[7rem] ${sel ? 'mc-slot-selected' : ''}`} data-testid={`lot-${b.id}`}>
              <img
                src={buildingIcon(b.id, lvl)}
                alt=""
                className={`w-16 h-16 mc-pixel ${rising === b.id ? 'mcb-rising' : ''}`}
                style={lvl === 0 ? { filter: 'grayscale(1) brightness(0.55)', opacity: 0.9 } : undefined}
                draggable={false}
              />
              <span className="mc-font text-[8px] text-white mt-1 text-center leading-relaxed">{b.label}</span>
              <span className="flex gap-1 mt-1" aria-label={`Nível ${lvl}`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`w-3 h-3 border-2 border-black/70 ${n <= lvl ? 'bg-[#9be36a]' : 'bg-black/40'}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalhe da construção escolhida */}
      {def && check && (
        <div className="mc-card p-3 mb-4" data-testid="building-detail">
          <div className="flex items-start gap-3">
            <img
              src={buildingIcon(def.id, curLevel)}
              alt=""
              className="w-12 h-12 mc-pixel shrink-0"
              style={curLevel === 0 ? { filter: 'grayscale(1) brightness(0.55)', opacity: 0.9 } : undefined}
              draggable={false}
            />
            <div className="min-w-0 flex-1">
              <p className="mc-font text-[10px] text-white leading-relaxed">{def.label} <span className="mc-muted">nível {curLevel}/{BUILDING_MAX_LEVEL}</span></p>
              <p className="text-xs text-white/85 mt-1">{def.description}</p>
              <p className="text-xs mc-diamond mt-0.5">{def.effect}</p>
            </div>
          </div>

          {maxed || !cost ? (
            <p className="mc-font text-[9px] mc-good uppercase mt-3">Nível máximo</p>
          ) : (
            <div className="mt-3">
              <p className="mc-font text-[9px] mc-muted uppercase mb-1">Custo do nível {check.nextLevel} (+{buildXp(check.nextLevel)} XP)</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {MATERIALS.filter((m) => cost[m] > 0).map((m) => {
                  const have = base.materials[m] ?? 0;
                  const ok = have >= cost[m];
                  return (
                    <span key={m} className={`mc-slot flex items-center gap-1 px-2 py-1 mc-font text-[10px] ${ok ? 'mc-good' : 'mc-bad'}`}>
                      <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                      {have}/{cost[m]}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => onBuild(def.id)} disabled={!check.ok || building !== null} className="mc-btn mc-btn-gold px-5 py-2.5 font-bold text-sm uppercase" data-testid="build-button">
                  {building === def.id ? 'Construindo...' : 'Construir'}
                </button>
                {!check.ok && check.later && <span className="text-xs mc-muted">Abre na {check.later}</span>}
                {!check.ok && !check.later && missingList.length > 0 && <span className="text-xs mc-muted">Faltam: {missingList.join(', ')}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mesa nível 1: tema de amanhã */}
      {mesaLive && (
        <div className="mc-card p-3 mb-4" data-testid="theme-request">
          <label className="mc-font text-[9px] mc-muted uppercase block mb-1" htmlFor="theme-request">O que você quer na história de amanhã?</label>
          <div className="flex gap-2">
            <input
              id="theme-request"
              value={theme}
              maxLength={THEME_MAX}
              onChange={(e) => setTheme(e.target.value.slice(0, THEME_MAX))}
              placeholder="ex.: dragões, futebol, mina"
              className="mc-slot flex-1 min-w-0 text-white text-sm px-3 py-2 outline-none placeholder:text-white/40"
            />
            <button onClick={() => void saveTheme()} disabled={savingTheme || theme.trim() === (base.themeRequest ?? '')} className="mc-btn mc-btn-green px-4 py-2 text-sm font-bold">
              {savingTheme ? '...' : 'Salvar'}
            </button>
          </div>
          <p className="text-[11px] mc-muted mt-1">{theme.length}/{THEME_MAX}{base.themeRequest ? ` · Amanhã: ${base.themeRequest}` : ''}</p>
        </div>
      )}

      <button onClick={onOpenBoard} className="mc-btn mc-btn-green w-full py-3 text-base font-bold uppercase" data-testid="open-board">
        Quadro de contratos
        <span className="mc-font text-[9px] normal-case opacity-90">{plan ? `${doneCount} feitos · ${openCount} abertos` : 'preparando...'}</span>
      </button>
    </div>
  );
};

export default BaseMap;
