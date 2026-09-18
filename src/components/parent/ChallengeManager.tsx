import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { addDays, getTodayBrazil } from '../../utils/clock';
import type { ChallengeDoc, ChallengeKind } from '../../types/village';
import { approveChallenge, createChallenge, subscribeChallenges } from '../../services/challengesService';

const TEMPLATES: Array<{ title: string; kind: ChallengeKind; target: number; days: number; gold: number; xp: number }> = [
  { title: '5 dias seguidos', kind: 'streak_days', target: 5, days: 7, gold: 15, xp: 30 },
  { title: '20 missões na semana', kind: 'tasks_count', target: 20, days: 7, gold: 25, xp: 40 },
  { title: 'Prova 8/8 duas vezes', kind: 'quiz_correct', target: 16, days: 7, gold: 20, xp: 40 },
  { title: '3 contratos por dia durante 5 dias', kind: 'english_contracts', target: 15, days: 7, gold: 20, xp: 30 },
  { title: '3 tochas', kind: 'full_days', target: 3, days: 7, gold: 15, xp: 20 },
];

const ChallengeManager: React.FC = () => {
  const { childUid } = useAuth();
  const [items, setItems] = useState<ChallengeDoc[]>([]);

  useEffect(() => {
    if (!childUid) return;
    return subscribeChallenges(childUid, setItems);
  }, [childUid]);

  const spawn = async (t: typeof TEMPLATES[number]) => {
    if (!childUid) return;
    const today = getTodayBrazil();
    try {
      await createChallenge({
        userId: childUid,
        title: t.title,
        kind: t.kind,
        target: t.target,
        startsOn: today,
        endsOn: addDays(today, t.days),
        xpReward: t.xp,
        goldReward: t.gold,
        createdBy: 'admin',
      });
      toast.success('Desafio criado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Desafios</h3>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button key={t.title} type="button" className="px-3 py-2 text-sm border rounded hover:bg-gray-50" onClick={() => void spawn(t)}>
            {t.title}
          </button>
        ))}
      </div>
      {items.map((c) => (
        <div key={c.id} className="border border-gray-200 rounded p-3 flex flex-wrap justify-between gap-2">
          <div>
            <p className="font-medium">{c.title}</p>
            <p className="text-sm text-gray-600">{c.progress}/{c.target} · {c.status === 'proposed' ? 'proposta' : c.status === 'active' ? 'ativa' : c.status} · até {c.endsOn.split('-').reverse().slice(0, 2).join('/')}{c.status === 'proposed' ? ` · +${c.goldReward} gold, +${c.xpReward} XP, meta ${c.target}` : ''}</p>
          </div>
          {c.status === 'proposed' && (
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 text-sm bg-blue-600 text-white rounded" onClick={() => void approveChallenge(c.id, true).then(() => toast.success('Aprovado'))}>Aprovar</button>
              <button type="button" className="px-3 py-2 text-sm bg-gray-200 rounded" onClick={() => void approveChallenge(c.id, false)}>Recusar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChallengeManager;
