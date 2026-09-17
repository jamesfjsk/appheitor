import React, { useState } from 'react';
import { X } from 'lucide-react';
import { pickaxeInfo } from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { chestAllowed } from '../../../services/village/chest';
import { dueTasksOn } from '../../../services/village/schedule';
import { useData } from '../../../contexts/DataContext';
import { useClock } from '../../../contexts/ClockContext';
import { useSound } from '../../../contexts/SoundContext';
import { createMineSfx } from '../english/mine/sfx';
import type { ChestContents } from '../../../types/village';
import type { Material } from '../../../types/english';
import { claimKey, hasClaim } from '../../../services/village/claims';
import { openStreakChest } from '../../../services/villageService';
import { useAuth } from '../../../contexts/AuthContext';
import { ITEM_BY_ID } from '../../../config/items';
import ItemSlot from './ItemSlot';
import toast from 'react-hot-toast';

const CHEST = '/assets/village/buildings/bau-1.png';

const DailyChest: React.FC<{ hour: number; onClose: () => void }> = ({ hour, onClose }) => {
  const { village, economy, openChest } = useVillage();
  const { childUid } = useAuth();
  const { tasks } = useData();
  const { playClick, isSoundEnabled } = useSound();
  const [loot, setLoot] = useState<ChestContents | null>(null);
  const { minute, today } = useClock();
  const due = dueTasksOn(tasks, today);
  const done = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;
  const gate = chestAllowed({ hourBrazil: hour, settings: economy, due: due.length, done, village, date: today });
  const already = gate.reason === 'already';
  const pick = pickaxeInfo(village.gear.pickaxe);
  const leftMin = Math.max(0, economy.chestOpenHour * 60 - (hour * 60 + minute));
  const leftLabel = `${Math.floor(leftMin / 60)}h${String(leftMin % 60).padStart(2, '0')}`;

  const open = async () => {
    playClick();
    if (!gate.ok) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = isSoundEnabled && AudioCtx ? new AudioCtx() : null;
    createMineSfx(() => ctx, () => isSoundEnabled).unlock();
    const contents = await openChest();
    setLoot(contents);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mn-veil" onClick={onClose}>
      <div className="mc-modal mc-pop rounded-lg max-w-md w-full text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center">
          <h2 className="mc-h"><img src={CHEST} alt="" className="mc-pixel w-8 h-8" />Baú do Dia</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="p-6">
        <p className="text-sm mc-muted mb-4">
          {loot
            ? 'Você abriu o Baú do Dia'
            : already
              ? 'Aberto hoje'
              : gate.reason === 'hour'
                ? `Abre às ${economy.chestOpenHour}h (faltam ${leftLabel})`
                : gate.reason === 'min_due'
                  ? 'Hoje não tem missões suficientes'
                  : gate.reason === 'incomplete'
                    ? `Faltam ${due.length - done} missões`
                    : `Baú de hoje: ${economy.dailyChestGold[0]} + ${village.fullDays} tochas = ${Math.min(economy.dailyChestGold[1], economy.dailyChestGold[0] + village.fullDays)} gold${pick.level >= 3 ? ` · ${pick.label} deixa o baú mais farto` : ''}`}
        </p>
        {loot && (
          <div className="mc-pop mb-4 grid grid-cols-3 gap-2">
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
        <button type="button" disabled={!gate.ok || Boolean(loot)} onClick={() => void open()} className="mc-btn mc-btn-gold w-full h-12 font-bold mb-2">
          {loot || already ? 'Já aberto' : 'Abrir'}
        </button>
        {village.fullDays >= 7 && childUid && !hasClaim(village, claimKey('streak', village.fullDays >= 21 ? 21 : village.fullDays >= 14 ? 14 : 7, village.fullDaysStart || today)) && (
          <button
            type="button"
            className="mc-btn mc-btn-green w-full h-12 font-bold mb-2"
            onClick={() => {
              playClick();
              void openStreakChest(childUid).then((r) => r && toast.success(`Baú das tochas: +${r.gold} gold`)).catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
            }}
          >
            Baú das tochas
          </button>
        )}
        <button type="button" onClick={onClose} className="mc-btn mc-btn-stone w-full h-11">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default DailyChest;
