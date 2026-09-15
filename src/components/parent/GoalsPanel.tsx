import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import type { GoalDoc } from '../../types/village';
import { finishGoal, subscribeGoals } from '../../services/goalsService';

const GoalsPanel: React.FC = () => {
  const { childUid, user } = useAuth();
  const [goals, setGoals] = useState<GoalDoc[]>([]);

  useEffect(() => {
    if (!childUid) return;
    return subscribeGoals(childUid, setGoals);
  }, [childUid]);

  const act = async (id: string, outcome: 'achieved' | 'cancelled') => {
    if (!user) return;
    try {
      await finishGoal(id, outcome, user.userId);
      toast.success(outcome === 'achieved' ? 'Meta fechada e prêmio criado' : 'Gold devolvido');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Cofrinho</h3>
      {goals.length === 0 && <p className="text-sm text-gray-500">Nenhuma meta ainda.</p>}
      {goals.map((g) => (
        <div key={g.id} className="border border-gray-200 rounded p-3 flex flex-wrap justify-between gap-2">
          <div>
            <p className="font-medium">{g.title}</p>
            <p className="text-sm text-gray-600">{g.savedGold} / {g.targetGold} gold · {g.status}</p>
            {g.cancelReason && <p className="text-sm text-amber-700">Pedido: {g.cancelReason}</p>}
          </div>
          {(g.status === 'open' || g.status === 'cancel_requested') && (
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 text-sm bg-green-600 text-white rounded" onClick={() => void act(g.id, 'achieved')}>Alcançada</button>
              <button type="button" className="px-3 py-2 text-sm bg-gray-200 rounded" onClick={() => void act(g.id, 'cancelled')}>Cancelar e devolver</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GoalsPanel;
