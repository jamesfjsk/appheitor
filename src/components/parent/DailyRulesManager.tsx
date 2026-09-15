import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayBrazil } from '../../utils/timezone';
import { DailyRules, DayClosure, addDaysStr, getDayClosure, processPendingDays, saveDailyRules, subscribeDailyRules } from '../../services/dailyRulesService';
import { DAILY_RULES_DEFAULTS } from '../../config/rules';

const DailyRulesManager: React.FC = () => {
  const { childUid } = useAuth();
  const [rules, setRules] = useState<DailyRules>({ ...DAILY_RULES_DEFAULTS, activatedOn: null });
  const [penalty, setPenalty] = useState(DAILY_RULES_DEFAULTS.penaltyPerMissedTask);
  const [bonus, setBonus] = useState(DAILY_RULES_DEFAULTS.allDoneBonus);
  const [days, setDays] = useState<{ date: string; closure: DayClosure | null }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeDailyRules((r) => {
      setRules(r);
      setPenalty(r.penaltyPerMissedTask);
      setBonus(r.allDoneBonus);
    });
  }, []);

  const loadDays = useCallback(async () => {
    if (!childUid) return;
    const today = getTodayBrazil();
    const dates = Array.from({ length: 7 }, (_, i) => addDaysStr(today, -(i + 1)));
    const closures = await Promise.all(dates.map((d) => getDayClosure(childUid, d).catch(() => null)));
    setDays(dates.map((date, i) => ({ date, closure: closures[i] })));
  }, [childUid]);

  useEffect(() => {
    void loadDays();
  }, [loadDays]);

  const toggle = async () => {
    setBusy(true);
    try {
      await saveDailyRules({ enabled: !rules.enabled });
      toast.success(!rules.enabled ? 'Fechamento diário ligado. Vale a partir de amanhã.' : 'Fechamento diário desligado.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setBusy(false);
    }
  };

  const saveValues = async () => {
    setBusy(true);
    try {
      await saveDailyRules({ penaltyPerMissedTask: Math.max(0, penalty), allDoneBonus: Math.max(0, bonus) });
      toast.success('Valores salvos');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    if (!childUid) return;
    setBusy(true);
    try {
      const results = await processPendingDays(childUid);
      toast.success(results.length ? `${results.length} dia(s) fechado(s)` : 'Nada pendente para fechar');
      await loadDays();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao fechar os dias');
    } finally {
      setBusy(false);
    }
  };

  const fmt = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Fechamento do dia</h2>
          <p className="text-sm text-gray-500 max-w-xl">
            Todo dia, na primeira vez que o app abre, o dia anterior é fechado: cada missão do dia que ficou sem fazer desconta gold.
            O Baú do Dia é a recompensa de dia completo (bônus de gold padrão 0). Nunca deixa o saldo negativo e não cobra dias de férias.
            {rules.activatedOn && <span className="block mt-1">Valendo desde {fmt(rules.activatedOn)}.</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          className={`px-5 py-2.5 rounded-xl font-bold text-white transition ${rules.enabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
        >
          {rules.enabled ? 'Ligado' : 'Desligado'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-700">Gold por missão perdida</span>
          <input type="number" min={0} value={penalty} onChange={(e) => setPenalty(Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-700">Bônus por dia completo (padrão 0)</span>
          <input type="number" min={0} value={bonus} onChange={(e) => setBonus(Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => void saveValues()} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">
            Salvar valores
          </button>
          <button type="button" onClick={() => void runNow()} disabled={busy || !rules.enabled} className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60">
            Fechar dias pendentes
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Últimos 7 dias</h3>
        <ul className="divide-y divide-gray-100 text-sm">
          {days.map(({ date, closure }) => (
            <li key={date} className="py-2 flex items-center gap-3">
              <span className="w-14 text-gray-500">{fmt(date)}</span>
              {closure ? (
                <>
                  <span className="flex-1 text-gray-800">
                    {closure.tasksCompleted}/{closure.totalTasksAvailable} missões{closure.vacation ? ' · férias' : ''}
                  </span>
                  <span className={`font-semibold ${closure.allTasksBonusGold > 0 ? 'text-green-700' : closure.goldPenalty > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {closure.allTasksBonusGold > 0 ? `+${closure.allTasksBonusGold}` : closure.goldPenalty > 0 ? `-${closure.goldPenalty}` : '0'} gold
                  </span>
                </>
              ) : (
                <span className="flex-1 text-gray-400">não fechado</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DailyRulesManager;
