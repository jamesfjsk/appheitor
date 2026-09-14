import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayBrazil } from '../../utils/timezone';
import { addDaysStr, getDayClosure, DayClosure } from '../../services/dailyRulesService';

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
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3 ${full ? 'bg-green-100 text-green-900' : 'bg-orange-100 text-orange-900'}`}
    >
      <div>
        <p className="font-bold">
          {full ? 'Ontem foi dia completo!' : `Ontem faltaram ${missed} ${missed === 1 ? 'missão' : 'missões'}`}
        </p>
        <p className="text-sm opacity-80">
          {closure.tasksCompleted} de {closure.totalTasksAvailable} missões feitas
        </p>
      </div>
      <div className="text-right font-bold text-lg whitespace-nowrap">
        {full ? `+${closure.allTasksBonusGold} gold` : `-${closure.goldPenalty} gold`}
      </div>
    </motion.div>
  );
};

export default YesterdaySummary;
