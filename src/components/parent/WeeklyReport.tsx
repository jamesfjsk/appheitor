import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { computeWeeklyLearning, getLearning } from '../../services/learningService';
import type { LearningDoc } from '../../types/village';
import { isoWeekOf, getTodayBrazil, weekRangeLabel } from '../../utils/clock';

const WeeklyReport: React.FC = () => {
  const { childUid } = useAuth();
  const week = isoWeekOf(getTodayBrazil());
  const [doc, setDoc] = useState<LearningDoc | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!childUid) return;
    void getLearning(childUid).then(setDoc).catch(() => setDoc(null));
  }, [childUid]);

  const load = async () => {
    if (!childUid) return;
    setBusy(true);
    try {
      const next = await computeWeeklyLearning(childUid, week);
      setDoc(next);
      toast.success('Relatório atualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para calcular');
      const prev = await getLearning(childUid).catch(() => null);
      setDoc(prev);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-900">Relatório semanal</h2>
        <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded" disabled={busy || !childUid} onClick={() => void load()}>
          Recalcular
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-3">{weekRangeLabel(week)}</p>
      {!doc && <p className="text-sm text-gray-500">Aperte Recalcular no domingo, ou quando quiser conferir.</p>}
      {doc && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border rounded p-3">
            <p className="font-semibold">Prova</p>
            {Object.entries(doc.quizAccuracyByCategory).map(([k, v]) => <p key={k} className="text-sm">{k}: {v}%</p>)}
            {Object.keys(doc.quizAccuracyByCategory).length === 0 && <p className="text-sm text-gray-500">Sem prova nesta semana.</p>}
          </div>
          <div className="border rounded p-3">
            <p className="font-semibold">Inglês</p>
            <p className="text-sm">Palavras dominadas: {doc.wordsMastered}</p>
          </div>
          <div className="border rounded p-3">
            <p className="font-semibold">Hábitos e reflexões</p>
            <p className="text-sm">Reflexões: {doc.reflections}</p>
            <p className="text-sm">Dias completos (acumulado): {doc.fullDays}</p>
          </div>
          <div className="border rounded p-3">
            <p className="font-semibold">Dinheiro</p>
            <p className="text-sm">Ganhou {doc.goldEarned} · Gastou {doc.goldSpent} · Guardou {doc.goldSaved} ({doc.savingsRatePct}%)</p>
            <p className="text-sm">Desafios feitos: {doc.challengesDone}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default WeeklyReport;
