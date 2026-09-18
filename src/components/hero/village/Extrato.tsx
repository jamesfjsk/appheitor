import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useClock } from '../../../contexts/ClockContext';
import { addDays, isoWeekOf, mondayOfIsoWeek, weekRangeLabel } from '../../../utils/clock';
import { listGoldTransactions } from '../../../services/goldTx';
import { weeklyStatement } from '../../../services/village/bank';
import { sinceLaunch } from '../../../services/village/income';
import type { GoldTransaction } from '../../../types';

const SOURCE_LABEL: Record<string, string> = {
  task_completion: 'Missão',
  quiz: 'Prova',
  chest: 'Baú do Dia',
  streak_chest: 'Baú das tochas',
  challenge: 'Desafio',
  merchant_sale: 'Comerciante',
  goal_deposit: 'Guardou no Cofrinho',
  goal_withdraw: 'Devolveu do Cofrinho',
  goal_interest: 'Bônus de paciência',
  repair: 'Conserto',
  late_task: 'Missão recuperada',
  reward_redemption: 'Prêmio',
  shop: 'Loja',
};

const Extrato: React.FC<{ onClose?: () => void; embedded?: boolean; monthly?: boolean }> = ({ onClose, embedded, monthly }) => {
  const { childUid } = useAuth();
  const { economy, village } = useVillage();
  const { today } = useClock();
  const [txs, setTxs] = useState<GoldTransaction[]>([]);
  const visible = useMemo(() => sinceLaunch(txs, village.launchedOn, village.launchedAt), [txs, village.launchedOn, village.launchedAt]);

  useEffect(() => {
    if (!childUid) return;
    void listGoldTransactions(childUid, 800).then(setTxs);
  }, [childUid]);

  const weeks = useMemo(() => {
    const current = isoWeekOf(today);
    const list = [current];
    let cursor = today;
    while (list.length < 5) {
      cursor = addDays(cursor, -7);
      const w = isoWeekOf(cursor);
      if (!list.includes(w)) list.push(w);
    }
    return list;
  }, [today]);

  const rows = weeks.map((w) => weeklyStatement(visible, w)).filter((r) => {
    if (!village.launchedOn) return true;
    const sun = addDays(mondayOfIsoWeek(r.weekIso), 6);
    return sun >= village.launchedOn;
  });
  const dayNum = Number(today.slice(8, 10));
  const monthHonest = dayNum <= 7;
  const currentWeek = isoWeekOf(today);
  const weekLines = visible.filter((t) => {
    const d = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return isoWeekOf(ymd) === currentWeek;
  }).slice(0, 20);
  const emptyLaunch = Boolean(village.launchedOn) && visible.length === 0;

  const body = (
    <div className="space-y-3">
      {emptyLaunch && <p className="text-sm mc-muted">Extrato zerado.</p>}
      {!emptyLaunch && rows.map((r) => (
        <div key={r.weekIso} className="mc-card p-3 text-sm space-y-1">
          <p className="font-bold">{weekRangeLabel(r.weekIso)}</p>
          <p>Ganhou <span className="mc-num" style={{ fontSize: 12 }}>{r.earned}</span> · Gastou <span className="mc-num" style={{ fontSize: 12 }}>{r.spent}</span></p>
          <p>Guardou <span className="mc-num" style={{ fontSize: 12 }}>{r.saved}</span> · Juros <span className="mc-num" style={{ fontSize: 12 }}>{r.interest}</span>{r.interest > 0 ? ' · paciência rendeu +' + r.interest : ''}</p>
          <p>Guardou {r.savingsRatePct}% do que ganhou (alvo {economy.savingsTargetPct}%).</p>
        </div>
      ))}
      {!emptyLaunch && (
      <div className="mc-card p-3 space-y-1">
        <p className="font-bold text-sm">Movimentos desta semana</p>
        {weekLines.length === 0 && <p className="text-sm mc-muted">Ainda não teve movimento nesta semana.</p>}
        {weekLines.map((t) => (
          <p key={t.id} className="text-sm flex justify-between gap-2">
            <span>{SOURCE_LABEL[t.source] || t.description || t.source}</span>
            <span className="mc-num" style={{ fontSize: 12 }}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
          </p>
        ))}
      </div>
      )}
      {monthly && (
        <div className="mc-card p-3 space-y-1">
          <p className="font-bold text-sm">Extrato mensal</p>
          <p className="text-sm">Ganhou {visible.filter((t) => t.amount > 0 && t.type !== 'saved').reduce((s, t) => s + t.amount, 0)} · Guardou {visible.filter((t) => t.source === 'goal_deposit').reduce((s, t) => s + Math.abs(t.amount), 0)}</p>
        </div>
      )}
      {monthHonest && (
        <p className="text-sm mc-muted">Na poupança de verdade, 100 reais rendem menos de 1 real por mês; aqui o bônus é maior de propósito, para você treinar.</p>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 mn-veil" onClick={onClose}>
      <div className="mc-modal mc-pop mn-child-sheet rounded-lg w-full max-w-lg text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center shrink-0">
          <h2 className="mc-title text-sm">Extrato</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mn-child-body p-4">{body}</div>
      </div>
    </div>
  );
};

export default Extrato;
