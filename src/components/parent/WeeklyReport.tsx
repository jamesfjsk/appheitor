import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { computeWeeklyLearning } from '../../services/learningService';
import { listGoldTransactions } from '../../services/goldTx';
import { gamesOutearnedMissions, weekIncome } from '../../services/assignments/buckets';
import { gamesBeatMissions } from '../../services/assignments/voice';
import type { LearningDoc } from '../../types/village';
import type { GoldTransaction } from '../../types';
import { isoWeekOf, getTodayBrazil, nowBrazil, weekRangeLabel } from '../../utils/clock';

const WeeklyReport: React.FC = () => {
  const { childUid } = useAuth();
  const week = isoWeekOf(getTodayBrazil());
  const [doc, setDoc] = useState<LearningDoc | null>(null);
  const [gainsTx, setGainsTx] = useState<GoldTransaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [boot, setBoot] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    if (!childUid) return;
    let cancelled = false;
    setBoot('loading');
    void computeWeeklyLearning(childUid, week)
      .then((next) => {
        if (cancelled) return;
        if (!next) {
          setDoc(null);
          setBoot('fail');
          return;
        }
        setDoc(next);
        setBoot('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setDoc(null);
        setBoot('fail');
      });
    return () => { cancelled = true; };
  }, [childUid, week]);

  useEffect(() => {
    if (!childUid) return;
    void listGoldTransactions(childUid, 400).then(setGainsTx).catch(() => setGainsTx([]));
  }, [childUid]);

  const weekRows = gainsTx.filter((t) => {
    const raw = t.createdAt;
    const ms = raw instanceof Date ? raw.getTime() : Date.parse(String(raw));
    if (!Number.isFinite(ms)) return false;
    return isoWeekOf(nowBrazil(ms).date) === week;
  });
  const gains = weekIncome(weekRows.map((t) => ({ source: t.source, amount: t.amount })));

  const load = async () => {
    if (!childUid) return;
    setBusy(true);
    try {
      const next = await computeWeeklyLearning(childUid, week);
      if (!next) {
        setDoc(null);
        setBoot('fail');
        toast.error('Não deu para calcular');
        return;
      }
      setDoc(next);
      setBoot('ok');
      toast.success('Relatório atualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para calcular');
      setDoc(null);
      setBoot('fail');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-900">Relatório semanal</h2>
        <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded" disabled={busy || boot === 'loading' || !childUid} onClick={() => void load()}>
          Recalcular
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-3">{weekRangeLabel(week)}</p>
      <div className="border border-gray-200 rounded p-3 mb-3" data-testid="ganhos-semana">
        <p className="font-semibold text-gray-900">Ganhos da semana</p>
        <p className="text-sm text-gray-800">
          Missões da vida real: {gains.life} · Encomendas: {gains.assignment} · Jogos e aprendizado: {gains.play}
        </p>
        {(gains.penalty !== 0 || gains.interest !== 0) && (
          <p className="text-sm text-gray-600">Penalidade: {gains.penalty} · Juros: {gains.interest}</p>
        )}
        {gamesOutearnedMissions(gains) && <p className="text-sm text-amber-700">{gamesBeatMissions()}</p>}
      </div>
      {boot === 'loading' && !doc && <p className="text-sm text-gray-500">Calculando o relatório desta semana…</p>}
      {boot === 'fail' && !doc && <p className="text-sm text-gray-500">Não deu para calcular</p>}
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
            <p className="text-sm">Dias completos nesta semana: {doc.fullDays}</p>
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
