import React from 'react';
import { useVillage } from '../../../contexts/VillageContext';
import { chestAllowed } from '../../../services/village/chest';
import { dueTasksOn } from '../../../services/village/schedule';
import { useData } from '../../../contexts/DataContext';
import { getTodayBrazil } from '../../../utils/timezone';
import { useSound } from '../../../contexts/SoundContext';
import { createMineSfx } from '../english/mine/sfx';

const CHEST = '/assets/english/ui/chest.webp';

const DailyChest: React.FC<{ hour: number; onClose: () => void }> = ({ hour, onClose }) => {
  const { village, economy, openChest } = useVillage();
  const { tasks } = useData();
  const { playClick, isSoundEnabled } = useSound();
  const today = getTodayBrazil();
  const due = dueTasksOn(tasks, today);
  const done = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;
  const gate = chestAllowed({ hourBrazil: hour, settings: economy, due: due.length, done, village, date: today });
  const already = gate.reason === 'already';

  const label = already
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
    createMineSfx(() => ctx, isSoundEnabled).unlock();
    await openChest();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-panel rounded-lg p-6 max-w-md w-full text-white" onClick={(e) => e.stopPropagation()}>
        <h2 className="mc-h mb-3"><img src={CHEST} alt="" className="mc-pixel w-8 h-8" />Baú do Dia</h2>
        <p className="text-sm mc-muted mb-4">{label}</p>
        <button type="button" disabled={!gate.ok} onClick={() => void open()} className="mc-btn mc-btn-gold w-full h-12 font-bold mb-2">
          {already ? 'Já aberto' : 'Abrir'}
        </button>
        <button type="button" onClick={onClose} className="mc-btn mc-btn-stone w-full h-11">Fechar</button>
      </div>
    </div>
  );
};

export default DailyChest;
