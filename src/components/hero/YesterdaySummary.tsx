import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayBrazil } from '../../utils/timezone';
import { addDaysStr, getDayClosure, DayClosure } from '../../services/dailyRulesService';

const TROPHY = '/assets/english/ui/trophy.webp';
const CREEPER = '/assets/english/ui/creeper.webp';

/** Resumo de ontem para a criança: dia completo com bônus ou missões perdidas com penalidade */
const YesterdaySummary: React.FC = () => {
  const { childUid } = useAuth();
  const [closure, setClosure] = useState<DayClosure | null>(null);

  useEffect(() => {
    if (!childUid) return;
    const yesterday = addDaysStr(getTodayBrazil(), -1);
    getDayClosure(childUid, yesterday).then(setClosure).catch(() => setClosure(null));
  }, [childUid]);

  if (!closure || closure.totalTasksAvailable === 0) return null;
  if (closure.goldPenalty === 0 && closure.allTasksBonusGold === 0) return null;

  const full = closure.tasksCompleted >= closure.totalTasksAvailable;
  const missed = closure.totalTasksAvailable - closure.tasksCompleted;

  return (
    <div className={`mc-card rounded-lg px-4 py-3 flex items-center gap-3 ${full ? 'mc-slot-good' : 'mc-slot-bad'}`}>
      <div className="mc-slot w-12 h-12 p-1 shrink-0">
        <img
          src={full ? TROPHY : CREEPER}
          alt=""
          className="w-full h-full object-contain mc-pixel"
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
