import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { addDays, getTodayBrazil, isoWeekOf } from '../../../utils/clock';
import { listGoldTransactions } from '../../../services/goldTx';
import { weeklyStatement } from '../../../services/village/bank';
import type { GoldTransaction } from '../../../types';

const Extrato: React.FC<{ onClose?: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const { childUid } = useAuth();
  const { economy } = useVillage();
  const [txs, setTxs] = useState<GoldTransaction[]>([]);

  useEffect(() => {
    if (!childUid) return;
    void listGoldTransactions(childUid, 800).then(setTxs);
  }, [childUid]);

  const weeks = useMemo(() => {
    const today = getTodayBrazil();
    const current = isoWeekOf(today);
    const list = [current];
    let cursor = today;
    while (list.length < 5) {
      cursor = addDays(cursor, -7);
      const w = isoWeekOf(cursor);
      if (!list.includes(w)) list.push(w);
    }
    return list;
  }, []);

  const rows = weeks.map((w) => weeklyStatement(txs, w));
  const monthHonest = new Date().getDate() <= 7;

  const body = (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.weekIso} className="mc-card p-3 text-sm space-y-1">
          <p className="font-bold">{r.weekIso}</p>
          <p>Ganhou <span className="mc-num" style={{ fontSize: 12 }}>{r.earned}</span> · Gastou <span className="mc-num" style={{ fontSize: 12 }}>{r.spent}</span></p>
          <p>Guardou <span className="mc-num" style={{ fontSize: 12 }}>{r.saved}</span> · Juros <span className="mc-num" style={{ fontSize: 12 }}>{r.interest}</span>{r.interest > 0 ? ' · paciência rendeu +' + r.interest : ''}</p>
          <p>Guardou {r.savingsRatePct}% do que ganhou (alvo {economy.savingsTargetPct}%).</p>
        </div>
      ))}
      {monthHonest && (
        <p className="text-sm mc-muted">Na poupança de verdade, 100 reais rendem menos de 1 real por mês; aqui o bônus é maior de propósito, para você treinar.</p>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="mc-modal rounded-lg w-full max-w-lg max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-4 border-[#17130f] flex justify-between">
          <h2 className="mc-title text-sm">Extrato</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="p-4">{body}</div>
      </div>
    </div>
  );
};

export default Extrato;
