import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NPC_LABEL } from '../../config/village';
import { NPC_QUESTS } from '../../data/npcQuests';
import { FRIEND_TIER_NAME, type NpcId, type VillageDoc } from '../../types/village';
import { subscribeVillage } from '../../services/villageService';
import { initialVillageDoc } from '../../config/village';

const CharactersPanel: React.FC = () => {
  const { childUid } = useAuth();
  const [village, setVillage] = useState<VillageDoc>(initialVillageDoc(childUid || 'pending', new Date().toISOString()));

  useEffect(() => {
    if (!childUid) return;
    return subscribeVillage(childUid, setVillage);
  }, [childUid]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
      <h2 className="text-xl font-bold text-gray-900">Personagens</h2>
      <p className="text-sm text-gray-600">Amizade e pedidos. As falas do dia só depois que a criança viu.</p>
      {(Object.keys(village.npcs) as NpcId[]).map((id) => {
        const n = village.npcs[id];
        const next = NPC_QUESTS[id][n.quest.chapter];
        return (
          <div key={id} className="border rounded p-3">
            <p className="font-semibold">{NPC_LABEL[id]} · {FRIEND_TIER_NAME[n.tier]} · {n.points} pts</p>
            {next && <p className="text-sm text-gray-700">Pedido: {next.ask}</p>}
            <p className="text-xs text-gray-500">Capítulo {n.quest.chapter}/5</p>
          </div>
        );
      })}
    </div>
  );
};

export default CharactersPanel;
