import React from 'react';
import type { Assignment } from '../../types/assignment';
import { workPortrait } from '../../services/assignments/portrait';
import { getTodayBrazil } from '../../utils/clock';

const EncomendasTrabalho: React.FC<{ rows: Assignment[] }> = ({ rows }) => {
  const portrait = workPortrait(rows, getTodayBrazil());
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="encomendas-trabalho">
      <h2 className="text-xl font-bold text-gray-900 mb-3">Como ele trabalha</h2>
      <div className="space-y-2">
        {portrait.lines.map((line) => <p key={line} className="text-sm text-gray-800">{line}</p>)}
        {portrait.pace && <p className="text-sm text-gray-500">{portrait.pace}</p>}
      </div>
    </section>
  );
};

export default EncomendasTrabalho;
