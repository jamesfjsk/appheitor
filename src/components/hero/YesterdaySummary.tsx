import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useVillage } from '../../contexts/VillageContext';
import { getTodayBrazil } from '../../utils/timezone';
import { addDaysStr, getDayClosure, DayClosure } from '../../services/dailyRulesService';
import { repairLot } from '../../services/villageService';
import toast from 'react-hot-toast';

const TROPHY = '/assets/english/ui/trophy.webp';
const CREEPER = '/assets/english/ui/creeper.webp';

/** Resumo de ontem para a criança: dia completo com bônus ou missões perdidas com penalidade */
const YesterdaySummary: React.FC = () => {
  const { childUid } = useAuth();
  const { village } = useVillage();
  const [closure, setClosure] = useState<DayClosure | null>(null);
  const villageHasCrack = (village.cracks || []).length > 0;

  useEffect(() => {
    if (!childUid) return;
    const yesterday = addDaysStr(getTodayBrazil(), -1);
    getDayClosure(childUid, yesterday).then(setClosure).catch(() => setClosure(null));
  }, [childUid]);

  if (!closure || closure.totalTasksAvailable === 0) return null;
  if (closure.goldPenalty === 0 && closure.allTasksBonusGold === 0 && !villageHasCrack) return null;

  const full = closure.tasksCompleted >= closure.totalTasksAvailable;
  const missed = closure.totalTasksAvailable - closure.tasksCompleted;

  return (
    <div className={`mc-card rounded-lg px-4 py-3 mt-2 flex items-center gap-3 ${full ? 'mc-slot-good' : 'mc-slot-bad'}`}>
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
        {villageHasCrack && (
          <>
            <p className="text-sm mt-1">Um lote rachou. Faça todas as missões de hoje para consertar.</p>
            {childUid && (
              <button
                type="button"
                className="mc-btn mc-btn-green min-h-[44px] px-3 mt-2"
                onClick={() => {
                  const yesterday = addDaysStr(getTodayBrazil(), -1);
                  void repairLot(childUid, yesterday)
                    .then((n) => toast.success(`Conserto: +${n} gold`))
                    .catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
                }}
              >
                Conserte hoje
              </button>
            )}
          </>
        )}
      </div>
      <div className={`mc-num whitespace-nowrap ${full ? 'mc-good' : 'mc-bad'}`}>
        {full ? `+${closure.allTasksBonusGold} gold` : `-${closure.goldPenalty} gold`}
      </div>
    </div>
  );
};

export default YesterdaySummary;
