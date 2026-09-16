import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BUILDING_BY_ID,
  BUILDING_MAX_LEVEL,
  MATERIALS,
  MATERIAL_ICONS,
  MATERIAL_LABELS,
  buildingCost,
  buildingEffectNext,
  buildingEffectNow,
  buildingSprite,
  initialBaseDoc,
} from '../../../config/englishBase';
import { COSMETIC_BY_ID, COSMETIC_ICON, GEAR, GEAR_SPRITE } from '../../../config/village';
import type { CosmeticItem } from '../../../types/village';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { buildUpgrade, canBuild, setThemeRequest } from '../../../services/englishBaseService';
import { burnWood } from '../../../services/villageService';
import { getTodayBrazil } from '../../../utils/clock';
import type { BuildingId } from '../../../types/english';
import RewardsPanel from '../RewardsPanel';

const THEME_MAX = 30;

interface Props {
  id: BuildingId;
  onClose: () => void;
  onOpenMine: () => void;
  onOpenChest: () => void;
  onOpenTower: () => void;
  onOpenWorkshop: () => void;
  onOpenQuiz: () => void;
  onOpenBank?: () => void;
  onOpenAgenda?: () => void;
  onOpenMarket?: () => void;
  onCreateGoal?: (title: string, gold: number, rewardId?: string) => void;
  onBuilt?: (id: BuildingId, newLevel: number) => void;
  shopLocked?: boolean;
}

const BuildingCard: React.FC<Props> = ({
  id, onClose, onOpenMine, onOpenChest, onOpenTower, onOpenWorkshop, onOpenQuiz,
  onOpenBank, onOpenAgenda, onOpenMarket, onCreateGoal, onBuilt, shopLocked = false,
}) => {
  const { childUid } = useAuth();
  const { village, materials, buildings, economy } = useVillage();
  const { playClick } = useSound();
  const [busy, setBusy] = useState(false);
  const [inv, setInv] = useState(false);
  const [theme, setTheme] = useState('');
  const [savingTheme, setSavingTheme] = useState(false);

  const def = BUILDING_BY_ID[id];
  const level = buildings[id] || 0;
  const fakeBase = { ...initialBaseDoc(childUid || 'x', new Date().toISOString()), materials, buildings };
  const info = canBuild(fakeBase, id, economy.buildCostMultiplier);
  const cost = buildingCost(id, info.nextLevel, economy.buildCostMultiplier);
  const nextText = buildingEffectNext(id, level);
  const missingText = MATERIALS.filter((m) => (info.missing[m] || 0) > 0)
    .map((m) => `${info.missing[m]} ${MATERIAL_LABELS[m]}`)
    .join(', ');
  const maxLive = def.liveMaxLevel ?? BUILDING_MAX_LEVEL;
  const atCap = level >= maxLive;

  const actionLabel = level === 0 ? 'Construir' : `Melhorar · nível ${info.nextLevel}`;
  const lockLabel = info.later
    ? (info.later === 'Em breve' && atCap ? null : (/^(Precisa|Em breve)/.test(info.later) ? info.later : `Abre na ${info.later}`))
    : !info.unlocked
      ? id === 'cerca'
        ? 'Precisa da Fornalha nível 1'
        : id === 'cofre'
          ? 'Precisa do Armazém nível 1'
          : 'Precisa de Fornalha e Armazém nível 1'
      : null;
  const btnLabel = atCap
    ? 'Nível máximo'
    : lockLabel || actionLabel;

  const build = async () => {
    if (!childUid || !info.ok) return;
    playClick();
    setBusy(true);
    try {
      const { newLevel } = await buildUpgrade(childUid, id);
      onBuilt?.(id, newLevel);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para construir');
    } finally {
      setBusy(false);
    }
  };

  const saveTheme = async () => {
    if (!childUid || level < 1) return;
    playClick();
    setSavingTheme(true);
    try {
      await setThemeRequest(childUid, theme.trim() || null);
      toast.success(theme.trim() ? 'Tema de amanhã guardado.' : 'Tema de amanhã apagado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para guardar o tema');
    } finally {
      setSavingTheme(false);
    }
  };

  const ownedGear = GEAR.filter((g) => {
    if (g.slot === 'pickaxe') return village.gear.pickaxe >= g.level;
    return village.gear[g.slot] >= 1;
  });
  const ownedCosmetics = village.owned
    .map((cid) => COSMETIC_BY_ID[cid])
    .filter((c): c is CosmeticItem => Boolean(c));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="mc-modal rounded-lg w-full max-w-[560px] max-h-[96vh] overflow-y-auto text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b-4 border-[#17130f] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mc-slot w-24 h-24 p-1 shrink-0 flex items-center justify-center">
              <img src={buildingSprite(id, Math.max(0, level))} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white leading-tight">{def.label}</h2>
              <p className="text-sm mc-muted">{def.labelEn}</p>
              <p className="mn-obra-lv mt-1">
                {level <= 0 ? 'Ainda não construída' : atCap && maxLive <= 1 ? 'Pronta' : atCap ? `Nível ${level} · máxima` : `Nível ${level}`}
              </p>
              {maxLive >= 2 && (
                  <div className="mn-obra-stages" aria-label={`Nível ${level} de ${maxLive}`}>
                    {Array.from({ length: maxLive }, (_, i) => i + 1).map((n) => {
                      const now = level === n;
                      const next = (level <= 0 && n === 1) || (level > 0 && n === level + 1);
                      const owned = level >= n;
                      const cap = n === maxLive && n > (level <= 0 ? 1 : level + 1);
                      return (
                        <figure
                          key={n}
                          className={`mn-obra-stage ${now ? 'is-now' : next ? 'is-next' : owned ? 'is-on' : 'is-later'}`}
                        >
                          <div className={`mc-slot w-12 h-12 p-0.5 ${now ? 'mc-slot-selected' : owned ? 'mc-slot-good' : ''}`}>
                            <img src={buildingSprite(id, n)} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
                          </div>
                          <figcaption>
                            {now ? 'agora' : next ? 'próximo' : cap ? 'depois' : '\u00a0'}
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
              )}
            </div>
          </div>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0 shrink-0" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <section>
            <p className="mc-lbl mb-1">O que dá agora</p>
            <p className="text-sm">{buildingEffectNow(id, level)}</p>
          </section>

          <section>
            <p className="mc-lbl mb-1">{level <= 0 ? 'Quando construir' : 'Próximo nível'}</p>
            {atCap ? (
              <p className="text-sm">Nível máximo.</p>
            ) : (
              <div className="flex gap-3 items-start">
                <div className="mc-slot w-16 h-16 p-1 shrink-0">
                  <img src={buildingSprite(id, Math.max(1, info.nextLevel))} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {nextText}
                    {info.later ? <span className="mc-muted"> · em breve</span> : null}
                  </p>
                  {cost && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {MATERIALS.filter((m) => (cost[m] || 0) > 0).map((m) => (
                        <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                          <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
                          <span className="mc-num text-white">{cost[m]}</span>
                          <span className="mc-chip-l">{MATERIAL_LABELS[m]}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!info.ok || busy}
                    className="mc-btn mc-btn-green w-full min-h-[48px] px-4 font-bold mt-3"
                    onClick={() => void build()}
                  >
                    {busy ? 'Obra...' : btnLabel}
                  </button>
                  {!info.ok && missingText && !lockLabel && (
                    <p className="text-sm mc-muted mt-1">Falta {missingText}</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {id === 'fornalha' && (
            <>
              {level >= 2 && (
                <button type="button" className="mc-btn mc-btn-green w-full min-h-[48px] font-bold" onClick={() => { playClick(); onOpenWorkshop(); }}>
                  Fundir
                </button>
              )}
              {level >= 3 && (
                <button
                  type="button"
                  className="mc-btn mc-btn-gold w-full min-h-[44px] font-bold"
                  onClick={async () => {
                    if (!childUid) return;
                    playClick();
                    try {
                      await burnWood(childUid);
                      toast.success('5 madeira viraram 1 redstone');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Não deu para queimar');
                    }
                  }}
                >
                  Queimar 5 madeira
                </button>
              )}
              <button type="button" className="mc-btn mc-btn-green w-full min-h-[48px] font-bold" onClick={() => { playClick(); onOpenMine(); }}>
                Ir para a Mina
              </button>
            </>
          )}

          {id === 'bau' && (
            <>
              <button
                type="button"
                disabled={level < 1}
                className="mc-btn mc-btn-green w-full min-h-[48px] font-bold"
                onClick={() => { playClick(); setInv((v) => !v); }}
              >
                {level < 1 ? 'Inventário: construa o Baú' : inv ? 'Fechar inventário' : 'Ver meu inventário'}
              </button>
              <button type="button" className="mc-btn mc-btn-gold w-full min-h-[44px] font-bold" onClick={() => { playClick(); onOpenChest(); }}>
                Abrir o Baú do Dia
              </button>
              {inv && level >= 1 && (
                <div className="mc-card rounded p-3 space-y-3">
                  <div>
                    <p className="mc-lbl mb-1">Materiais</p>
                    <div className="flex flex-wrap gap-2">
                      {MATERIALS.map((m) => (
                        <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                          <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
                          <span className="mc-num text-white">{materials[m] || 0}</span>
                          <span className="mc-chip-l">{MATERIAL_LABELS[m]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mc-lbl mb-1">Raros</p>
                    <p className="text-sm">{village.rare.diamante} diamante · {village.rare.esmeralda} esmeralda</p>
                  </div>
                  <div>
                    <p className="mc-lbl mb-1">Equipamentos</p>
                    {ownedGear.length === 0 ? (
                      <p className="text-sm mc-muted">Nenhum craftado ainda.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {ownedGear.map((g) => (
                          <span key={g.id} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                            {GEAR_SPRITE[g.id] && <img src={GEAR_SPRITE[g.id]} alt="" className="w-5 h-5 mc-pixel" />}
                            <span className="text-xs">{g.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="mc-lbl mb-1">Cosméticos</p>
                    {ownedCosmetics.length === 0 ? (
                      <p className="text-sm mc-muted">Nenhum comprado ainda.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {ownedCosmetics.map((c) => (
                          <span key={c.id} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                            {COSMETIC_ICON[c.id] && <img src={COSMETIC_ICON[c.id]} alt="" className="w-5 h-5 mc-pixel" />}
                            <span className="text-xs">{c.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {id === 'torre' && (
            <button
              type="button"
              disabled={level < 1}
              className="mc-btn mc-btn-green w-full min-h-[48px] font-bold"
              onClick={() => { playClick(); onOpenTower(); }}
            >
              {level < 1 ? 'Construa a Torre para abrir' : 'Abrir a Torre'}
            </button>
          )}

          {id === 'mesa' && (
            <>
              {level >= 1 ? (
                <div className="mc-card rounded p-3">
                  <label className="mc-lbl block mb-1" htmlFor="building-theme">Tema de amanhã</label>
                  <div className="flex gap-2">
                    <input
                      id="building-theme"
                      value={theme}
                      maxLength={THEME_MAX}
                      onChange={(e) => setTheme(e.target.value.slice(0, THEME_MAX))}
                      placeholder="ex.: dragões, futebol, mina"
                      className="mc-slot flex-1 min-w-0 text-white text-sm px-3 py-2 outline-none placeholder:text-white/40"
                    />
                    <button
                      type="button"
                      className="mc-btn mc-btn-green min-h-[44px] px-3 font-bold"
                      disabled={savingTheme}
                      onClick={() => void saveTheme()}
                    >
                      {savingTheme ? '...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mc-muted">A Mesa ainda não foi construída. A prova do dia já pode ser feita.</p>
              )}
              <button type="button" className="mc-btn mc-btn-green w-full min-h-[48px] font-bold" onClick={() => { playClick(); onOpenQuiz(); }}>
                Prova do dia
              </button>
              <button type="button" className="mc-btn mc-btn-dark w-full min-h-[44px] font-bold" onClick={() => { playClick(); onOpenMine(); }}>
                Ir para a Mina
              </button>
            </>
          )}

          {id === 'cerca' && (
            <p className="text-sm">
              Proteção deste mês: {village.claimed[`fence:${getTodayBrazil().slice(0, 7)}`] ? 'usada' : 'disponível'}.
              O capacete absorve 1 missão por semana; a Cerca protege as tochas.
            </p>
          )}

          {id === 'campinho' && (
            <p className="text-sm mc-muted">Campinho abre na Etapa 4. Não gaste material nisso ainda.</p>
          )}

          {id === 'cofre' && (
            <button
              type="button"
              disabled={level < 1}
              className="mc-btn mc-btn-green w-full min-h-[48px] font-bold"
              onClick={() => { playClick(); onOpenBank?.(); }}
            >
              {level < 1 ? 'Construa o Cofre para abrir' : 'Abrir o Cofrinho'}
            </button>
          )}

          {id === 'agenda' && (
            <button
              type="button"
              disabled={level < 1}
              className="mc-btn mc-btn-green w-full min-h-[48px] font-bold"
              onClick={() => { playClick(); onOpenAgenda?.(); }}
            >
              {level < 1 ? 'Construa a Agenda para abrir' : 'Abrir a Agenda'}
            </button>
          )}

          {id === 'mercado' && (
            <>
              <button
                type="button"
                disabled={level < 1 || shopLocked}
                className="mc-btn mc-btn-green w-full min-h-[48px] font-bold"
                onClick={() => {
                  if (shopLocked) { toast.error('Em punição: Mercado fechado'); return; }
                  playClick();
                  onOpenMarket?.();
                }}
              >
                {shopLocked ? 'Mercado fechado na punição' : level < 1 ? 'Construa o Mercado para abrir' : 'Abrir o Mercado'}
              </button>
              <RewardsPanel isOpen onClose={() => undefined} embedded browseOnly={level < 1} onCreateGoal={onCreateGoal} />
            </>
          )}

          <button type="button" className="w-full text-center text-sm underline mc-muted min-h-[44px]" onClick={() => { playClick(); onOpenWorkshop(); }}>
            Ver todas as obras
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildingCard;
