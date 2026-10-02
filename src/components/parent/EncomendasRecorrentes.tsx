import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { AssignmentRecurrence } from '../../types/assignment';
import { generateAssignmentsNow, setRecurrenceActive } from '../../services/assignmentsService';
import { WEEKDAY_NAME } from '../../services/assignments/labels';

const EncomendasRecorrentes: React.FC<{ uid: string; rows: AssignmentRecurrence[] }> = ({ uid, rows }) => {
  const [busy, setBusy] = useState(false);

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="encomendas-recorrentes">
      <div className="flex justify-between items-center gap-2 mb-3">
        <h2 className="text-xl font-bold text-gray-900">Recorrentes</h2>
        <button
          type="button"
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void generateAssignmentsNow(uid)
              .then((out) => toast.success(out.via === 'server'
                ? `Geradas: ${out.created.length}. Prazo passado: ${out.expired.length}.`
                : `Gravei daqui: ${out.created.length}. Prazo passado: ${out.expired.length}.`))
              .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Não deu para gerar.'))
              .finally(() => setBusy(false));
          }}
        >
          Gerar hoje
        </button>
      </div>
      {rows.length === 0 && <p className="text-sm text-gray-500">Nenhuma encomenda repetida.</p>}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="border border-gray-200 rounded p-3 flex justify-between gap-3 items-center">
            <div>
              <p className="font-medium text-gray-900">{row.title}</p>
              <p className="text-sm text-gray-600">
                {row.weekdays.map((day) => WEEKDAY_NAME[day]).join(', ') || 'sem dia'}
                {row.active ? '' : ' · pausada'}
              </p>
            </div>
            <button
              type="button"
              className="px-3 py-2 border rounded text-sm text-blue-700"
              onClick={() => {
                void setRecurrenceActive(row.id, !row.active)
                  .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Não deu.'));
              }}
            >
              {row.active ? 'Pausar' : 'Voltar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default EncomendasRecorrentes;
