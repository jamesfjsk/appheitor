import React, { useState } from 'react';
import { useVillage } from '../../../contexts/VillageContext';
import { chestAllowed } from '../../../services/village/chest';
import { dueTasksOn } from '../../../services/village/schedule';
import { useData } from '../../../contexts/DataContext';
import { getTodayBrazil } from '../../../utils/timezone';
import { useSound } from '../../../contexts/SoundContext';
import { createMineSfx } from '../english/mine/sfx';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import type { ChestContents } from '../../../types/village';
import type { Material } from '../../../types/english';

const CHEST = '/assets/english/ui/chest.webp';
const GOLD = '/assets/english/ui/gold.webp';
const EMERALD = '/assets/english/ui/emerald.webp';

const DailyChest: React.FC<{ hour: number; onClose: () => void }> = ({ hour, onClose }) => {
  const { village, economy, openChest } = useVillage();
  const { tasks } = useData();
  const { playClick, isSoundEnabled } = useSound();
  const [loot, setLoot] = useState<ChestContents | null>(null);
  const today = getTodayBrazil();
  const due = dueTasksOn(tasks, today);
  const done = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;
  const gate = chestAllowed({ hourBrazil: hour, settings: economy, due: due.length, done, village, date: today });
  const already = gate.reason === 'already';

  const label = loot
    ? 'Você abriu o Baú do Dia'
    : already
      ? 'Aberto hoje'
      : gate.reason === 'hour'
        ? `Abre às ${economy.chestOpenHour}h`
        : gate.reason === 'min_due'
          ? 'Hoje não tem missões suficientes'
          : gate.reason === 'incomplete'
            ? `Faltam ${due.length - done} missões`
            : 'Abrir Baú do Dia';

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-panel rounded-lg p-6 max-w-md w-full text-white" onClick={(e) => e.stopPropagation()}>
        <h2 className="mc-h mb-3"><img src={CHEST} alt="" className="mc-pixel w-8 h-8" />Baú do Dia</h2>
        <p className="text-sm mc-muted mb-4">{label}</p>
        {loot && (
          <div className="mc-pop mc-card p-3 mb-4 flex flex-wrap gap-2 items-center">
            {loot.gold > 0 && (
              <span className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                <img src={GOLD} alt="" className="w-5 h-5 mc-pixel" />
                <span className="mc-num mc-warn">+{loot.gold}</span>
                <span className="mc-chip-l">gold</span>
              </span>
            )}
            {(Object.entries(loot.materials) as Array<[Material, number]>).map(([m, qty]) => (
              qty > 0 ? (
                <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                  <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
                  <span className="mc-num text-white">+{qty}</span>
                  <span className="mc-chip-l">{MATERIAL_LABELS[m]}</span>
                </span>
              ) : null
            ))}
            {loot.esmeralda > 0 && (
              <span className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                <img src={EMERALD} alt="" className="w-5 h-5 mc-pixel" />
                <span className="mc-num mc-good">+{loot.esmeralda}</span>
                <span className="mc-chip-l">esmeralda</span>
              </span>
            )}
          </div>
        )}
        <button type="button" disabled={!gate.ok || Boolean(loot)} onClick={() => void open()} className="mc-btn mc-btn-gold w-full h-12 font-bold mb-2">
          {loot || already ? 'Já aberto' : 'Abrir'}
        </button>
        <button type="button" onClick={onClose} className="mc-btn mc-btn-stone w-full h-11">Fechar</button>
      </div>
    </div>
  );
};

export default DailyChest;
