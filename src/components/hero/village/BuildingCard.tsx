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
  canAfford,
  initialBaseDoc,
  missingMaterials,
} from '../../../config/englishBase';
import { COSMETIC_BY_ID, COSMETIC_ICON, GEAR, GEAR_SPRITE, dismissDevCrack, visibleCracks } from '../../../config/village';
import { RuinThumb } from './drawDamage';
import type { CosmeticItem } from '../../../types/village';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { useData } from '../../../contexts/DataContext';
import { useClock } from '../../../contexts/ClockContext';
import { dueTasksOn } from '../../../services/village/schedule';
import { buildUpgrade, canBuild, setThemeRequest } from '../../../services/englishBaseService';
import { repairBuilding, repairLot } from '../../../services/villageService';
import { repairMaterialCost } from '../../../services/village/repair';
import { addDays, getTodayBrazil } from '../../../utils/clock';
import type { BuildingId } from '../../../types/english';
import { getLevelFromXP } from '../../../utils/levelSystem';
import type { ForgeTab } from '../../../services/village/furnace';

const THEME_MAX = 30;

interface Props {
  id: BuildingId;
  onClose: () => void;
  onOpenMine: () => void;
  onOpenChest: () => void;
  onOpenTower: () => void;
  onOpenWorkshop: (tab?: ForgeTab) => void;
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
  onOpenBank, onOpenAgenda, onOpenMarket, onBuilt, shopLocked = false,
}) => {
  const { childUid } = useAuth();
  const { village, materials, buildings, economy } = useVillage();
  const { tasks, rewards, progress } = useData();
  const { today } = useClock();
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
  const sealed = maxLive <= 0;
  const atCap = !sealed && level >= maxLive;
  const cracked = visibleCracks(village.cracks).includes(id);

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
    if (!childUid || !info.ok || cracked) return;
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

  const due = dueTasksOn(tasks, today);
  const minerLevel = getLevelFromXP(progress.totalXP || 0);
  const gold = progress.availableGold || 0;
  const rewardsReach = rewards.filter((r) => r.active && r.costGold <= gold && (r.requiredLevel || 1) <= minerLevel).length;
  const quizDone = Boolean(childUid && localStorage.getItem(`quiz_completed_${childUid}_${today}`));
  const doneToday = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;
  const missionsReady = due.length > 0 && doneToday >= due.length;
  const matCost = repairMaterialCost(id, Math.max(1, level));
  const savedRuin = (village.cracks || []).includes(id);
  const canPay = !savedRuin || canAfford(materials, matCost);
  const missPay = missingMaterials(materials, matCost);
  const missPayText = MATERIALS.filter((m) => (missPay[m] || 0) > 0)
    .map((m) => `${missPay[m]} ${MATERIAL_LABELS[m].toLowerCase()}`)
    .join(', ');

  const arrumarComMaterial = async () => {
    if (!childUid || busy || (savedRuin && !canPay)) return;
    playClick();
    setBusy(true);
    try {
      if ((village.cracks || []).includes(id)) {
        await repairBuilding(childUid, id);
      }
      dismissDevCrack(id);
      window.dispatchEvent(new CustomEvent('miner-repaired', { detail: { lots: [id] } }));
      toast.success('Arrumou');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para arrumar');
    } finally {
      setBusy(false);
    }
  };

  const arrumarComMissoes = async () => {
    if (!childUid || !missionsReady || busy) return;
    playClick();
    setBusy(true);
    try {
      const lots = visibleCracks(village.cracks);
      const saved = village.cracks || [];
      let gold = 0;
      if (saved.length) {
        try {
          gold = await repairLot(childUid, addDays(today, -1));
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (!msg.includes('já foi feito')) throw e;
        }
      }
      lots.forEach(dismissDevCrack);
      window.dispatchEvent(new CustomEvent('miner-repaired', { detail: { gold, lots } }));
      toast.success(gold > 0 ? `Lote consertado: +${gold} gold` : 'Lote consertado');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para arrumar');
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

  if (cracked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mn-obra-veil" onClick={onClose}>
        <div className="mc-modal mc-pop mn-child-sheet rounded-lg w-full max-w-[560px] text-white" onClick={(e) => e.stopPropagation()}>
          <div className="mn-obra-hero flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mc-slot mn-obra-portrait p-1 shrink-0 flex items-center justify-center">
                <RuinThumb src={buildingSprite(id, Math.max(1, level))} seed={id} size={88} className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-white leading-tight">{def.label}</h2>
                <p className="mn-obra-lv mt-1">Em ruínas</p>
              </div>
            </div>
            <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0 shrink-0" onClick={onClose} aria-label="Fechar">
              <X />
            </button>
          </div>
          <div className="mn-child-body p-4 space-y-4">
            <p className="text-sm">O benefício desta obra está desligado.</p>

            <section>
              <p className="mc-lbl mb-1">Arrumar agora</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {MATERIALS.filter((m) => (matCost[m] || 0) > 0).map((m) => (
                  <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                    <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
                    <span className="mc-num text-white">{matCost[m]}</span>
                    <span className="mc-chip-l">{MATERIAL_LABELS[m]}</span>
                  </span>
                ))}
              </div>
              <button
                type="button"
                disabled={!canPay || busy}
                className={`mc-btn w-full min-h-[48px] px-4 font-bold ${canPay ? 'mc-btn-green' : 'mc-btn-dark'}`}
                onClick={() => void arrumarComMaterial()}
              >
                {busy ? 'Arrumando...' : 'Arrumar agora'}
              </button>
              {!canPay && missPayText ? (
                <p className="text-sm mc-muted mt-1">Falta {missPayText}</p>
              ) : null}
            </section>

            <section>
              <p className="mc-lbl mb-1">Ou com as missões</p>
              <p className="text-sm mb-2">
                Termina as missões de hoje: reergue todas as ruínas e devolve metade do gold.
              </p>
              <button
                type="button"
                disabled={!missionsReady || busy}
                className={`mc-btn w-full min-h-[48px] px-4 font-bold ${missionsReady ? 'mc-btn-green' : 'mc-btn-dark'}`}
                onClick={() => void arrumarComMissoes()}
              >
                Arrumar com as missões
              </button>
              <p className="text-sm mc-muted mt-1">
                {due.length === 0
                  ? 'Sem missões hoje. Arruma com material.'
                  : missionsReady
                    ? 'Missões do dia feitas.'
                    : `${doneToday}/${due.length} missões hoje`}
              </p>
            </section>
            {id === 'mesa' && (
              <button type="button" className="mc-btn mc-btn-green w-full min-h-[48px] font-bold" onClick={() => { playClick(); onOpenQuiz(); }}>
                Prova do dia
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const empty = level <= 0 && !sealed;
  const portraitLv = Math.max(1, level);
  const portraitClass = [
    'mc-slot mn-obra-portrait p-1 shrink-0 flex items-center justify-center relative',
    empty ? 'is-ghost' : 'mc-build',
    id === 'fornalha' && level >= 1 ? 'is-fire' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mn-obra-veil" onClick={onClose}>
      <div
        className="mc-modal mc-pop mn-child-sheet rounded-lg w-full max-w-[560px] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mn-obra-hero flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className={portraitClass}>
              <img
                src={buildingSprite(id, portraitLv)}
                alt=""
                className="w-full h-full object-contain mc-pixel"
                draggable={false}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white leading-tight">{def.label}</h2>
              <p className="mn-obra-lv mt-1">
                {sealed ? 'Em breve' : level <= 0 ? 'Ainda não construída' : atCap && maxLive <= 1 ? 'Pronta' : atCap ? `Nível ${level} · máxima` : `Nível ${level}`}
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

        <div className="mn-child-body p-4 space-y-4">
          <section>
            <p className="mc-lbl mb-1">O que dá agora</p>
            <p className="text-sm">
              {id === 'arena' && level <= 0
                ? 'O coliseu já está na vila. Os jogos ainda não abriram.'
                : buildingEffectNow(id, level)}
            </p>
          </section>

          <section>
            <p className="mc-lbl mb-1">{sealed ? 'Quando abre' : level <= 0 ? 'Quando construir' : 'Próximo nível'}</p>
            {sealed ? (
              <p className="text-sm">{lockLabel || (def.opensIn ? `Abre na ${def.opensIn}.` : 'Em breve.')}</p>
            ) : atCap ? (
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
                    className={`mc-btn w-full min-h-[48px] px-4 font-bold mt-3 ${info.ok ? 'mc-btn-green' : 'mc-btn-dark'}`}
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
              {level >= 1 && (
                <button type="button" className="mc-btn mc-btn-green w-full min-h-[48px] font-bold" onClick={() => { playClick(); onOpenWorkshop('fire'); }}>
                  Abrir o fogo
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
                className={`mc-btn w-full min-h-[48px] font-bold ${level < 1 ? 'mc-btn-dark' : 'mc-btn-green'}`}
                onClick={() => { playClick(); setInv((v) => !v); }}
              >
                {level < 1 ? 'Inventário: construa o Armazém' : inv ? 'Fechar inventário' : 'Ver meu inventário'}
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
                <p className="text-sm mc-muted">
                  {quizDone
                    ? 'A prova de hoje já foi feita.'
                    : progress.quizEnabled === false
                      ? 'A prova está trancada.'
                      : 'A prova do dia está pendente.'}
                </p>
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

          {id === 'arena' && (
            <p className="text-sm">A Arena ainda não abriu. Um dia você joga xadrez e Lig 4 com o pai aqui. O Olheiro já está de olho.</p>
          )}

          {id === 'cofre' && (
            <button
              type="button"
              disabled={level < 1}
              className={`mc-btn w-full min-h-[48px] font-bold ${level < 1 ? 'mc-btn-dark' : 'mc-btn-green'}`}
              onClick={() => { playClick(); onOpenBank?.(); }}
            >
              {level < 1 ? 'Construa o Cofre para abrir' : 'Abrir o Cofrinho'}
            </button>
          )}

          {id === 'agenda' && (
            <button
              type="button"
              disabled={level < 1}
              className={`mc-btn w-full min-h-[48px] font-bold ${level < 1 ? 'mc-btn-dark' : 'mc-btn-green'}`}
              onClick={() => { playClick(); onOpenAgenda?.(); }}
            >
              {level < 1 ? 'Construa a Agenda para abrir' : 'Abrir a Agenda'}
            </button>
          )}

          {id === 'mercado' && (
            <>
              <p className="text-sm">{rewardsReach} prêmios ao seu alcance</p>
              <button
                type="button"
                disabled={level < 1 || shopLocked}
                className={`mc-btn w-full min-h-[48px] font-bold ${level < 1 || shopLocked ? 'mc-btn-dark' : 'mc-btn-green'}`}
                onClick={() => {
                  if (shopLocked) { toast.error('Em punição: Mercado fechado'); return; }
                  playClick();
                  onOpenMarket?.();
                }}
              >
                {shopLocked ? 'Mercado fechado na punição' : level < 1 ? 'Construa o Mercado para abrir' : 'Abrir o Mercado'}
              </button>
            </>
          )}

          <button type="button" className="mc-btn mc-btn-stone w-full min-h-[44px] font-bold" onClick={() => { playClick(); onOpenWorkshop(); }}>
            Ferraria
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildingCard;
