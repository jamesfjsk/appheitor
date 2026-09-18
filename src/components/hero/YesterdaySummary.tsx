import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useVillage } from '../../contexts/VillageContext';
import { useData } from '../../contexts/DataContext';
import { useClock } from '../../contexts/ClockContext';
import { addDays } from '../../utils/clock';
import { getDayClosure, DayClosure } from '../../services/dailyRulesService';
import { dueTasksOn } from '../../services/village/schedule';
import { buildingSprite } from '../../config/englishBase';
import { crackedListSentence, LOT_SCENE_LABEL, visibleCracks } from '../../config/village';
import { RuinThumb } from './village/drawDamage';
import type { BuildingId } from '../../types/english';

const TROPHY = '/assets/english/ui/trophy.webp';

/** Resumo de ontem: dia completo ou lote em ruínas para reerguer hoje. */
const YesterdaySummary: React.FC = () => {
  const { childUid } = useAuth();
  const { village, buildings } = useVillage();
  const { tasks } = useData();
  const { today } = useClock();
  const [closure, setClosure] = useState<DayClosure | null>(null);
  const cracks = visibleCracks(village.cracks);

  useEffect(() => {
    if (!childUid) return;
    getDayClosure(childUid, addDays(today, -1)).then(setClosure).catch(() => setClosure(null));
  }, [childUid, today]);

  const due = useMemo(() => dueTasksOn(tasks, today), [tasks, today]);
  const done = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;

  if (!closure || closure.totalTasksAvailable === 0) return null;
  if (closure.goldPenalty === 0 && closure.allTasksBonusGold === 0 && cracks.length === 0) return null;

  const full = closure.tasksCompleted >= closure.totalTasksAvailable;
  const missed = closure.totalTasksAvailable - closure.tasksCompleted;

  if (cracks.length > 0) {
    const names = cracks.map((id) => LOT_SCENE_LABEL[id] || id).join(' · ');
    return (
      <div className="mc-card rounded-lg px-4 py-3 mt-2 flex items-center gap-3">
        <div className="flex shrink-0">
          {cracks.slice(0, 3).map((id, i) => (
            <div key={id} className={`mc-slot w-14 h-14 p-1 ${i > 0 ? '-ml-2' : ''}`} style={{ zIndex: 3 - i }}>
              <RuinThumb
                src={buildingSprite(id as BuildingId, Math.max(1, buildings[id as BuildingId] || 1))}
                seed={id}
                size={48}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-white">{crackedListSentence(cracks)}</p>
          <p className="text-sm mt-1">
            {missed > 0
              ? `Ontem faltou missão. Arruma na obra com material, ou termina as de hoje: ${cracks.length === 1 ? 'reergue' : 'reerguem'} e volta metade do gold.`
              : `Arruma na obra com material, ou termina as missões de hoje: ${cracks.length === 1 ? 'reergue' : 'reerguem'} e volta metade do gold.`}
          </p>
          <p className="text-sm mc-muted mt-1">
            {due.length === 0
              ? names
              : done >= due.length
                ? 'Missões do dia feitas. A obra está sendo reerguida.'
                : `${done}/${due.length} missões hoje`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mc-card rounded-lg px-4 py-3 mt-2 flex items-center gap-3 ${full ? 'mc-slot-good' : 'mc-slot-bad'}`}>
      <div className="mc-slot w-12 h-12 p-1 shrink-0">
        <img
          src={TROPHY}
          alt=""
          className={`w-full h-full object-contain mc-pixel ${full ? '' : 'mn-obra-hurt'}`}
          draggable={false}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[17px] font-bold text-white">
          {full ? 'Ontem foi dia completo!' : `Ontem faltaram ${missed} ${missed === 1 ? 'missão' : 'missões'}`}
        </p>
        <p className="text-sm mc-muted">
          {closure.tasksCompleted} de {closure.totalTasksAvailable} missões feitas
        </p>
      </div>
      <div className={`mc-num whitespace-nowrap ${full ? 'mc-good' : 'mc-bad'}`}>
        {full ? `+${closure.allTasksBonusGold} gold` : `-${closure.goldPenalty} gold`}
      </div>
    </div>
  );
};

export default YesterdaySummary;
