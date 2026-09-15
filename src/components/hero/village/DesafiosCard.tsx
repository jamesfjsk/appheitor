import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { addDays, getTodayBrazil } from '../../../utils/clock';
import type { ChallengeDoc } from '../../../types/village';
import { challengeState } from '../../../services/village/challenges';
import { createChallenge, subscribeChallenges } from '../../../services/challengesService';

const DesafiosCard: React.FC<{ onClose?: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const { childUid } = useAuth();
  const { playClick } = useSound();
  const { economy } = useVillage();
  const [items, setItems] = useState<ChallengeDoc[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(5);
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

  const propose = async () => {
    if (!childUid) return;
    playClick();
    try {
      await createChallenge({
        userId: childUid,
        title,
        kind: 'tasks_count',
        target,
        startsOn: today,
        endsOn: addDays(today, 7),
        xpReward: 20,
        goldReward: Math.min(20, economy.challengeGoldWeeklyCap),
        createdBy: 'child',
      });
      toast.success('Proposta enviada ao seu pai');
      setOpenForm(false);
      setTitle('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    }
  };

  const body = (
    <div className="space-y-2">
      {visible.length === 0 && <p className="text-sm mc-muted">Nenhum desafio aberto.</p>}
      {visible.map((c) => {
        const st = challengeState(c, today);
        return (
          <div key={c.id} className="mc-card p-3">
            <p className="font-bold">{c.title}</p>
            <p className="text-sm mc-muted">até {c.endsOn.split('-').reverse().slice(0, 2).join('/')}</p>
            <p className="text-sm"><span className="mc-num" style={{ fontSize: 12 }}>{c.progress}</span> / {c.target} · {c.goldReward} gold</p>
            {st === 'done' && <p className="text-sm mc-good">Concluído</p>}
            {st === 'upcoming' && c.status === 'proposed' && <p className="text-sm mc-warn">Aguardando o pai</p>}
          </div>
        );
      })}
      <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-4" onClick={() => { playClick(); setOpenForm(true); }}>Propor desafio</button>
      {openForm && (
        <div className="mc-card p-3 space-y-2">
          <input className="mc-input w-full text-black px-2 py-2" maxLength={40} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="mc-input w-full text-black px-2 py-2" type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value) || 1)} />
          <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-4" onClick={() => void propose()}>Enviar</button>
        </div>
      )}
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
