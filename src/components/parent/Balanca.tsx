import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { listGoldTransactions } from '../../services/goldTx';
import { txsLastDays, balancaTotals } from '../../services/village/balance';
import { sinceLaunch } from '../../services/village/income';
import { subscribeVillage } from '../../services/villageService';
import { DEFAULT_ECONOMY } from '../../config/village';
import type { GoldTransaction } from '../../types';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Balanca: React.FC = () => {
  const { childUid } = useAuth();
  const { progress } = useData();
  const [txs, setTxs] = useState<GoldTransaction[]>([]);
  const [launchedOn, setLaunchedOn] = useState<string | null>(null);
  const [launchedAt, setLaunchedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!childUid) return;
    void listGoldTransactions(childUid, 800).then(setTxs);
  }, [childUid]);

  useEffect(() => {
    if (!childUid) return;
    return subscribeVillage(childUid, (v) => { setLaunchedOn(v.launchedOn ?? null); setLaunchedAt(v.launchedAt ?? null); });
  }, [childUid]);

  const cut = useMemo(() => txsLastDays(sinceLaunch(txs, launchedOn, launchedAt), 7), [txs, launchedOn, launchedAt]);
  const { earned, spent, saved, bySource, spentBy, r7, rate, gamePct } = useMemo(
    () => balancaTotals(cut, DEFAULT_ECONOMY.incomeDayGold, { launchedOn }),
    [cut, launchedOn]
  );
  const gold = progress.availableGold || 0;
  const days = r7 > 0 ? gold / r7 : 0;
  const lastSpend = cut.filter((t) => t.amount < 0 && t.type !== 'saved').sort((a, b) => {
    const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return tb - ta;
  })[0];
  const daysSinceSpend = lastSpend && lastSpend.createdAt instanceof Date
    ? Math.floor((Date.now() - lastSpend.createdAt.getTime()) / 86400000)
    : 99;

  const rescale = async (factor: number) => {
    if (!childUid) return;
    const snap = await getDocs(query(collection(db, 'rewards'), where('ownerId', '==', childUid)));
    await Promise.all(snap.docs.map(async (d) => {
      const cost = Number(d.data().costGold) || 0;
      if (d.data().active === false) return;
      const next = Math.max(5, Math.round((cost * factor) / 5) * 5);
      await updateDoc(doc(db, 'rewards', d.id), { costGold: next });
    }));
    toast.success('Prêmios reajustados');
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Balança (7 dias)</h3>
      <p className="text-sm text-gray-700">Ganhou {earned} · Gastou {spent} · Guardou {saved} · Saldo {gold} ({days.toFixed(1)} D) · Poupança {rate}%</p>
      <ul className="text-sm text-gray-600 list-disc pl-5">
        {Object.entries(bySource).map(([k, v]) => <li key={k}>{k}: +{v}</li>)}
      </ul>
      {Object.keys(spentBy).length > 0 && (
        <>
          <p className="text-sm font-medium text-gray-800">Gastou por ralo</p>
          <ul className="text-sm text-gray-600 list-disc pl-5">
            {Object.entries(spentBy).map(([k, v]) => <li key={k}>{k}: −{v}</li>)}
          </ul>
        </>
      )}
      {days > 14 && <p className="text-sm text-amber-700">Saldo parado &gt; 14 D</p>}
      {daysSinceSpend > 21 && <p className="text-sm text-amber-700">Nada comprado há 21 dias</p>}
      {gamePct > 30 && <p className="text-sm text-amber-700">Gold de jogo &gt; 30% ({gamePct}%)</p>}
      <div className="flex gap-2">
        <button type="button" className="px-3 py-2 text-sm border rounded" onClick={() => void rescale(1.1)}>Reajustar x1,1</button>
        <button type="button" className="px-3 py-2 text-sm border rounded" onClick={() => void rescale(0.9)}>Reajustar x0,9</button>
      </div>
    </div>
  );
};

export default Balanca;
