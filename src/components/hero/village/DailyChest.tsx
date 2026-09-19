import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CHEST_DAILY, CHEST_DAILY_OPEN } from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { chestAllowed, chestWaitCopy, CHEST_OPEN_MS, CHEST_OPEN_REDUCED_MS } from '../../../services/village/chest';
import { dueTasksOn } from '../../../services/village/schedule';
import { liveBuildingLevel } from '../../../services/village/repair';
import { useData } from '../../../contexts/DataContext';
import { useClock } from '../../../contexts/ClockContext';
import { useSound } from '../../../contexts/SoundContext';
import type { ChestContents } from '../../../types/village';
import type { Material } from '../../../types/english';
import { claimKey, hasClaim } from '../../../services/village/claims';
import { openStreakChest } from '../../../services/villageService';
import { useAuth } from '../../../contexts/AuthContext';
import { ITEM_BY_ID } from '../../../config/items';
import ItemSlot from './ItemSlot';
import ChildSheet from './ChildSheet';
import { createChestSfx, type ChestSfx } from './chestSfx';

const DailyChest: React.FC<{ hour: number; onClose: () => void }> = ({ hour, onClose }) => {
  const { village, economy, buildings, openChest } = useVillage();
  const { childUid } = useAuth();
  const { tasks } = useData();
  const { playClick, playError, isSoundEnabled } = useSound();
  const [loot, setLoot] = useState<ChestContents | null>(null);
  const [opening, setOpening] = useState(false);
  const [puff, setPuff] = useState(false);
  const [shake, setShake] = useState(false);
  const { today } = useClock();
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = useRef(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const sfxRef = useRef<ChestSfx | null>(null);
  const bau = liveBuildingLevel(buildings, village.cracks, 'bau');
  const due = dueTasksOn(tasks, today);
  const done = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;
  const gate = chestAllowed({
    hourBrazil: hour, settings: economy, due: due.length, done, village, date: today, bauLevel: bau,
  });
  const already = gate.reason === 'already' || Boolean(loot);
  const goldLine = `${economy.dailyChestGold[0]} + ${village.fullDays} tochas = ${Math.min(economy.dailyChestGold[1], economy.dailyChestGold[0] + village.fullDays)} gold`;
  const locked = !gate.ok && !already && !loot;
  const waitCopy = chestWaitCopy({
    due: due.length,
    done,
    hourBrazil: hour,
    chestOpenHour: economy.chestOpenHour,
  });

  const sfx = (): ChestSfx => {
    if (!sfxRef.current) {
      sfxRef.current = createChestSfx(() => {
        if (!isSoundEnabled) return null;
        if (!ctxRef.current) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctxRef.current = new AC();
        }
        return ctxRef.current;
      }, () => isSoundEnabled);
    }
    return sfxRef.current;
  };

  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);

  const open = async () => {
    if (opening || loot) return;
    if (!gate.ok) {
      playError();
      if (gate.reason !== 'already') {
        setShake(true);
        window.setTimeout(() => { if (live.current) setShake(false); }, 420);
      }
      return;
    }
    playClick();
    const fx = sfx();
    fx.creak();
    setOpening(true);
    const waitMs = reduced ? CHEST_OPEN_REDUCED_MS : CHEST_OPEN_MS;
    const t0 = performance.now();
    try {
      const contents = await openChest();
      const left = Math.max(0, waitMs - (performance.now() - t0));
      await new Promise((r) => window.setTimeout(r, left));
      fx.ding();
      if (!live.current) return;
      setLoot(contents);
      setPuff(true);
      setOpening(false);
      window.setTimeout(() => { if (live.current) setPuff(false); }, 800);
    } catch (e) {
      fx.thud();
      playError();
      if (live.current) setOpening(false);
      toast.error(e instanceof Error ? e.message : 'Não deu para abrir');
    }
  };

  const why = loot
    ? 'Você abriu o Baú do Dia.'
    : gate.reason === 'warehouse'
      ? 'Construa o Armazém para guardar o Baú do Dia.'
      : already
        ? 'Aberto hoje. Amanhã tem mais.'
        : gate.reason === 'min_due'
          ? 'Hoje não tem missões suficientes.'
          : waitCopy || `Baú de hoje: ${goldLine}.`;

  const btnLabel = loot || already
    ? 'Já aberto'
    : opening
      ? 'O baú abre...'
      : locked
        ? 'Bloqueado'
        : 'Abrir o Baú do Dia';

  return (
    <ChildSheet
      onClose={onClose}
      wide="md"
      title={(
        <span className="flex items-center gap-2 min-w-0">
          <img src={CHEST_DAILY} alt="" className="w-8 h-8 mc-pixel" />
          Baú do Dia
        </span>
      )}
      footer={(
        <div className="space-y-2">
          <button
            type="button"
            disabled={Boolean(loot) || opening}
            onClick={() => void open()}
            className={`mc-btn w-full min-h-[48px] font-bold ${gate.ok && !loot && !opening ? 'mc-btn-gold' : 'mc-btn-dark'}`}
          >
            {btnLabel}
          </button>
          {village.fullDays >= 7 && childUid && !hasClaim(village, claimKey('streak', village.fullDays >= 21 ? 21 : village.fullDays >= 14 ? 14 : 7, village.fullDaysStart || today)) && (
            <button
              type="button"
              className="mc-btn mc-btn-green w-full min-h-[44px] font-bold"
              onClick={() => {
                playClick();
                void openStreakChest(childUid).then((r) => r && toast.success(`Baú das tochas: +${r.gold} gold`)).catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
              }}
            >
              Baú das tochas
            </button>
          )}
        </div>
      )}
    >
      <div className="p-4 space-y-3" data-testid="chest-place">
        <div className={`mn-chest-mouth ${opening ? 'is-open' : ''} ${already ? 'is-done' : ''} ${gate.ok ? 'is-ready' : ''} ${locked ? 'is-lock' : ''} ${shake ? 'mc-shake' : ''}`}>
          <img src={loot || opening ? CHEST_DAILY_OPEN : CHEST_DAILY} alt="" className="mn-chest-sprite mc-pixel" draggable={false} />
          {(gate.ok || opening) && <span className="mn-chest-glow" aria-hidden />}
          {locked && (
            <span className="mn-chest-lock" aria-hidden>
              <span className="mn-chest-lock-hole" />
            </span>
          )}
          {puff && !reduced && [0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="mn-chest-spark" style={{ left: `${26 + i * 12}%`, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <p className="text-sm">{why}</p>
        {loot && (
          <div className="mc-pop grid grid-cols-3 gap-2">
            {loot.gold > 0 && ITEM_BY_ID.gold && (
              <ItemSlot item={ITEM_BY_ID.gold} state="novo" qty={loot.gold} />
            )}
            {(Object.entries(loot.materials) as Array<[Material, number]>).map(([m, qty]) => (
              qty > 0 && ITEM_BY_ID[m] ? (
                <ItemSlot key={m} item={ITEM_BY_ID[m]} state="novo" qty={qty} />
              ) : null
            ))}
            {loot.esmeralda > 0 && ITEM_BY_ID.esmeralda && (
              <ItemSlot item={ITEM_BY_ID.esmeralda} state="novo" qty={loot.esmeralda} />
            )}
          </div>
        )}
      </div>
    </ChildSheet>
  );
};

export default DailyChest;
