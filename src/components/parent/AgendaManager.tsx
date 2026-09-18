import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClock } from '../../contexts/ClockContext';
import type { AgendaItem, AgendaKind } from '../../types/village';
import { createAgendaItem, deleteAgendaItem, subscribeAgenda } from '../../services/agendaService';

const KIND: AgendaKind[] = ['prova', 'trabalho', 'evento', 'aniversario', 'treino', 'compromisso', 'outro'];
const KIND_LABEL: Record<AgendaKind, string> = {
  prova: 'Prova',
  trabalho: 'Trabalho',
  evento: 'Evento',
  aniversario: 'Aniversário',
  treino: 'Treino',
  compromisso: 'Compromisso',
  outro: 'Outro',
};

const AgendaManager: React.FC = () => {
  const { childUid } = useAuth();
  const { today } = useClock();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AgendaKind>('prova');
  const [date, setDate] = useState(today);
  const [bulk, setBulk] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!childUid) return;
    return subscribeAgenda(childUid, setItems);
  }, [childUid]);

  const save = async () => {
    if (!childUid || !title.trim()) return;
    await createAgendaItem(childUid, { title, kind, date, createdBy: 'admin' });
    setTitle('');
    setMsg('Compromisso do pai salvo');
  };

  const pasteSchool = async () => {
    if (!childUid) return;
    const lines = bulk.split('\n').map((l) => l.trim()).filter(Boolean);
    let n = 0;
    for (const line of lines) {
      const m = line.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
      if (!m) continue;
      const rest = m[2];
      const kindGuess: AgendaKind = /prova/i.test(rest) ? 'prova' : /treino/i.test(rest) ? 'treino' : /anivers/i.test(rest) ? 'aniversario' : 'evento';
      await createAgendaItem(childUid, { title: rest.slice(0, 40), kind: kindGuess, date: m[1], createdBy: 'admin' });
      n += 1;
    }
    setBulk('');
    setMsg(`${n} datas coladas`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Agenda</h3>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <ul className="text-sm space-y-1">
        {items.slice(0, 40).map((i) => (
          <li key={i.id} className="flex justify-between gap-2 border-b py-1">
            <span>{i.date} · {KIND_LABEL[i.kind]} · {i.title}{i.createdBy === 'admin' ? ' (do pai)' : ''}</span>
            <button type="button" className="text-red-600" onClick={() => void deleteAgendaItem(i.id)}>Apagar</button>
          </li>
        ))}
      </ul>
      <div className="grid sm:grid-cols-4 gap-2">
        <select className="border rounded px-2 py-2" value={kind} onChange={(e) => setKind(e.target.value as AgendaKind)}>
          {KIND.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <input className="border rounded px-2 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" maxLength={40} />
        <input className="border rounded px-2 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => void save()}>Criar (do pai)</button>
      </div>
      <div>
        <p className="text-sm font-medium mb-1">Calendário da escola</p>
        <textarea className="w-full border rounded px-2 py-2 text-sm" rows={4} placeholder="2026-10-03 Prova de história" value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <button type="button" className="mt-2 px-3 py-2 border rounded" onClick={() => void pasteSchool()}>Colar datas</button>
      </div>
    </div>
  );
};

export default AgendaManager;
