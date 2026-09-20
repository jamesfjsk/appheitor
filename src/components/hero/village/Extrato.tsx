import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useClock } from '../../../contexts/ClockContext';
import { addDays, isoWeekOf, mondayOfIsoWeek, weekRangeLabel } from '../../../utils/clock';
import { listGoldTransactions } from '../../../services/goldTx';
import { weeklyStatement } from '../../../services/village/bank';
import { sourceLabel } from '../../../services/village/balance';
import { sinceLaunch } from '../../../services/village/income';
import { VILLAGE_LINES } from '../../../data/villageLines';
import type { GoldTransaction } from '../../../types';

const GOLD = '/assets/english/ui/gold.webp';
const TX_ICON: Record<string, string> = {
  task_completion: '/assets/english/ui/map.webp',
  quiz: '/assets/english/ui/book.webp',
  english_game: '/assets/english/ui/pickaxe.webp',
  chest: '/assets/english/ui/chest.webp',
  streak_chest: '/assets/english/ui/torch.webp',
  challenge: '/assets/english/ui/star.webp',
  merchant_sale: '/assets/english/ui/gold.webp',
  goal_deposit: '/assets/english/ui/chest.webp',
  goal_withdraw: '/assets/english/ui/gold.webp',
  goal_interest: '/assets/english/ui/star.webp',
  goal_achieved: '/assets/english/ui/trophy.webp',
  repair: '/assets/english/ui/crafting.webp',
  reward_redemption: '/assets/english/ui/chest.webp',
  village_shop: '/assets/english/ui/miner.webp',
  shop: '/assets/english/ui/miner.webp',
  achievement: '/assets/english/ui/star.webp',
  trophy: '/assets/english/ui/trophy.webp',
  daily_penalty: '/assets/english/ui/torch.webp',
  admin_adjustment: '/assets/english/ui/gold.webp',
  task_reversal: '/assets/english/ui/map.webp',
  level_gift: '/assets/english/ui/star.webp',
};

function groupWeek(lines: GoldTransaction[]): GoldTransaction[] {
  const order: string[] = [];
  const bag: Record<string, GoldTransaction> = {};
  for (const t of lines) {
    const key = t.source;
    if (!bag[key]) {
      order.push(key);
      bag[key] = { ...t };
      continue;
    }
    const cur = bag[key];
    if (t.source === 'goal_interest') {
      const a = (cur.metadata || {}) as { savedBefore?: number; savedAfter?: number };
      const b = (t.metadata || {}) as { savedBefore?: number; savedAfter?: number };
      const before = typeof a.savedBefore === 'number' ? a.savedBefore : 0;
      const after = (typeof a.savedAfter === 'number' ? a.savedAfter : before)
        + Math.max(0, (typeof b.savedAfter === 'number' && typeof b.savedBefore === 'number' ? b.savedAfter - b.savedBefore : 0));
      cur.metadata = { savedBefore: before, savedAfter: after };
    } else {
      cur.amount += t.amount;
    }
  }
  return order.map((k) => bag[k]);
}

function txIcon(source: string): string {
  return TX_ICON[source] || GOLD;
}

function txValue(t: GoldTransaction): { text: string; kind: 'in' | 'out' | 'saved' | 'bonus' } {
  if (t.source === 'goal_interest') {
    const meta = t.metadata as { savedBefore?: number; savedAfter?: number } | undefined;
    const n = typeof meta?.savedAfter === 'number' && typeof meta?.savedBefore === 'number'
      ? meta.savedAfter - meta.savedBefore
      : 0;
    return { text: `+${Math.max(0, n)}`, kind: 'bonus' };
  }
  if (t.source === 'goal_deposit' || (t.type === 'saved' && t.amount < 0)) {
    return { text: `${Math.abs(t.amount)}`, kind: 'saved' };
  }
  if (t.amount > 0) return { text: `+${t.amount}`, kind: 'in' };
  return { text: `−${Math.abs(t.amount)}`, kind: 'out' };
}

function sabioLine(savedPct: number, earned: number, saved: number): string {
  if (earned <= 0 && saved <= 0) return 'Ainda não passou gold por aqui nesta semana.';
  if (saved > 0 && savedPct >= 20) {
    return VILLAGE_LINES.comerciante.find((l) => l.id === 'c1')?.text
      || 'Gold bem gasto vira coisa boa. Gold jogado some.';
  }
  if (saved === 0 && earned > 0) return 'Ganhou, e o cofre não viu. Guardar um pouco já muda a semana.';
  return VILLAGE_LINES.comerciante.find((l) => l.id === 'c3')?.text
    || 'Se faltar gold, espera. A pressa cobra juros.';
}

const Extrato: React.FC<{ onClose?: () => void; embedded?: boolean; monthly?: boolean }> = ({ onClose, embedded, monthly }) => {
  const { childUid } = useAuth();
  const { village } = useVillage();
  const { today } = useClock();
  const [txs, setTxs] = useState<GoldTransaction[]>([]);
  const visible = useMemo(() => sinceLaunch(txs, village.launchedOn, village.launchedAt), [txs, village.launchedOn, village.launchedAt]);

  useEffect(() => {
    if (!childUid) return;
    void listGoldTransactions(childUid, 800).then(setTxs);
  }, [childUid]);

  const currentWeek = isoWeekOf(today);
  const weeks = useMemo(() => {
    const list = [currentWeek];
    let cursor = today;
    while (list.length < 5) {
      cursor = addDays(cursor, -7);
      const w = isoWeekOf(cursor);
      if (!list.includes(w)) list.push(w);
    }
    return list;
  }, [today, currentWeek]);

  const rows = weeks.map((w) => weeklyStatement(visible, w)).filter((r) => {
    if (!village.launchedOn) return true;
    const sun = addDays(mondayOfIsoWeek(r.weekIso), 6);
    return sun >= village.launchedOn;
  });
  const alive = rows.filter((r) => r.weekIso === currentWeek || r.earned > 0 || r.spent > 0 || r.saved > 0 || r.interest > 0);
  const here = alive.find((r) => r.weekIso === currentWeek) || rows[0];
  const dayNum = Number(today.slice(8, 10));
  const monthHonest = Boolean(monthly) && dayNum <= 7;
  const weekLines = groupWeek(visible.filter((t) => {
    const d = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return isoWeekOf(ymd) === currentWeek;
  }));
  const emptyLaunch = Boolean(village.launchedOn) && visible.length === 0;

  const body = (
    <div className="space-y-3">
      {emptyLaunch && <p className="text-sm">O extrato ainda está em branco. O gold que entrar aparece aqui.</p>}
      {!emptyLaunch && here && (
        <>
          <p className="text-sm">{sabioLine(here.savingsRatePct, here.earned, here.saved)}</p>
          <p className="mc-lbl">{weekRangeLabel(here.weekIso)}</p>
          <div className="flex flex-wrap gap-2">
            <div className="mc-chip">
              <img src={GOLD} alt="" className="mc-pixel" draggable={false} />
              <span>
                <span className="mc-num" style={{ fontSize: 14 }}>{here.earned}</span>
                <span className="mc-chip-l">ganhou</span>
              </span>
            </div>
            <div className="mc-chip">
              <img src={GOLD} alt="" className="mc-pixel" draggable={false} />
              <span>
                <span className="mc-num" style={{ fontSize: 14 }}>{here.spent}</span>
                <span className="mc-chip-l">gastou</span>
              </span>
            </div>
            <div className="mc-chip">
              <img src="/assets/english/ui/chest.webp" alt="" className="mc-pixel" draggable={false} />
              <span>
                <span className="mc-num" style={{ fontSize: 14 }}>{here.saved}</span>
                <span className="mc-chip-l">aplicou</span>
              </span>
            </div>
            <div className="mc-chip">
              <img src="/assets/english/ui/star.webp" alt="" className="mc-pixel" draggable={false} />
              <span>
                <span className="mc-num" style={{ fontSize: 14 }}>{here.interest}</span>
                <span className="mc-chip-l">rendeu</span>
              </span>
            </div>
          </div>
          <div className="mc-inv space-y-1">
            {weekLines.length === 0 && <p className="text-sm p-2">Nenhum movimento nesta semana.</p>}
            {weekLines.map((t) => {
              const v = txValue(t);
              return (
                <div key={t.id} className="mc-row rounded px-2 py-1 flex items-center gap-2">
                  <img src={txIcon(t.source)} alt="" className="w-6 h-6 mc-pixel shrink-0" draggable={false} />
                  <span className="text-sm truncate min-w-0 flex-1">{sourceLabel(t.source)}</span>
                  <span
                    className={`mc-num shrink-0 ${v.kind === 'in' || v.kind === 'bonus' ? 'mc-good' : v.kind === 'out' ? '' : ''}`}
                    style={{ fontSize: 12 }}
                  >
                    {v.text}
                  </span>
                </div>
              );
            })}
          </div>
          {alive.filter((r) => r.weekIso !== currentWeek).map((r) => (
            <div key={r.weekIso} className="mc-card p-3 text-sm flex flex-wrap gap-x-3 gap-y-1">
              <p className="font-bold w-full">{weekRangeLabel(r.weekIso)}</p>
              <span>Ganhou <span className="mc-num" style={{ fontSize: 12 }}>{r.earned}</span></span>
              <span>Gastou <span className="mc-num" style={{ fontSize: 12 }}>{r.spent}</span></span>
              <span>Aplicou <span className="mc-num" style={{ fontSize: 12 }}>{r.saved}</span></span>
              {r.interest > 0 && <span>Rendeu <span className="mc-num" style={{ fontSize: 12 }}>+{r.interest}</span></span>}
            </div>
          ))}
        </>
      )}
      {monthHonest && (
        <p className="text-sm mc-muted">Na vida real, 100 reais rendem menos de 1 por mês. Aqui o bônus é maior para treinar.</p>
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
