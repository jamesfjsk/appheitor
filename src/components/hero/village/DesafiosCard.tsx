import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { addDays, getTodayBrazil } from '../../../utils/clock';
import type { ChallengeDoc } from '../../../types/village';
import { challengeState } from '../../../services/village/challenges';
import { subscribeChallenges } from '../../../services/challengesService';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const DesafiosCard: React.FC<{ onClose?: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const { childUid } = useAuth();
  const [items, setItems] = useState<ChallengeDoc[]>([]);
  const today = getTodayBrazil();

  useEffect(() => {
    if (!childUid) return;
    return subscribeChallenges(childUid, setItems);
  }, [childUid]);

  const visible = useMemo(() => items.filter((c) => {
    const st = challengeState(c, today);
    if (c.status === 'rejected') return false;
    if (st === 'done' && c.completedAt && addDays(c.completedAt, 7) < today) return false;
    return st === 'active' || st === 'done' || st === 'upcoming';
  }), [items, today]);

  const body = (
    <div className="space-y-2">
      {visible.length === 0 && <p className="text-sm mc-muted">Nenhum desafio aberto.</p>}
      {visible.map((c) => {
        const st = challengeState(c, today);
        const pct = c.target > 0 ? Math.min(100, Math.round((c.progress / c.target) * 100)) : 0;
        const weekday = WEEKDAYS[new Date(`${c.endsOn}T12:00:00-03:00`).getDay()];
        return (
          <div key={c.id} className="mc-card p-3">
            <p className="font-bold">{c.title}</p>
            <p className="text-sm mc-muted">até {weekday}</p>
            <div className="mc-bar h-2 my-1 rounded overflow-hidden bg-black/40">
              <div className="h-full bg-[#e8b923]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm"><span className="mc-num" style={{ fontSize: 12 }}>{c.progress}</span> / {c.target} · +{c.goldReward} gold · +{c.xpReward} XP</p>
            {st === 'done' && <p className="text-sm mc-good">Concluído</p>}
            {st === 'upcoming' && c.status === 'proposed' && <p className="text-sm mc-warn">Aguardando o pai</p>}
          </div>
        );
      })}
    </div>
  );

  if (embedded) {
    return (
      <section className="mc-panel rounded-lg p-3 mb-3">
        <h2 className="mc-h mb-2">
          <img src="/assets/english/ui/trophy.webp" alt="" className="mc-pixel" draggable={false} />
          Desafios
        </h2>
        {body}
      </section>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="mc-modal rounded-lg w-full max-w-lg p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-3">
          <h2 className="mc-title text-sm">Desafios</h2>
          {onClose && <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>}
        </div>
        {body}
      </div>
    </div>
  );
};

export default DesafiosCard;
