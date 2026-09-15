import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { HABITS } from '../../config/village';
import { deleteNotice, saveNotice, subscribeNotices } from '../../services/villageService';
import { saveSettings, subscribeSettings } from '../../services/settingsService';
import type { FatherNotice, NoticeType, PauseDaysSettings } from '../../types/village';
import NotificationSender from './NotificationSender';

const TEMPLATES: Array<{ id: string; type: NoticeType; text: string; pause?: boolean }> = [
  { id: 'treino', type: 'compromisso', text: 'Treino de futebol hoje.' },
  { id: 'consulta', type: 'compromisso', text: 'Consulta marcada. Sem pressa nas missões.' },
  { id: 'videogame', type: 'regra', text: 'Sem videogame hoje.' },
  { id: 'visita', type: 'visita', text: 'Vamos receber visita.', pause: true },
  { id: 'viagem', type: 'viagem', text: 'Viagem: a Vila fica em folga.', pause: true },
];

const PlacaManager: React.FC = () => {
  const { childUid } = useAuth();
  const [tab, setTab] = useState<'placa' | 'habitos'>('placa');
  const [notices, setNotices] = useState<FatherNotice[]>([]);
  const [text, setText] = useState('');
  const [type, setType] = useState<NoticeType>('recado');
  const [when, setWhen] = useState('');
  const [until, setUntil] = useState('');
  const [pauseDays, setPauseDays] = useState<PauseDaysSettings>({ dates: [] });

  useEffect(() => {
    if (!childUid) return;
    const u1 = subscribeNotices(childUid, setNotices);
    const u2 = subscribeSettings('pauseDays', { dates: [] }, (v) => setPauseDays(v as PauseDaysSettings));
    return () => { u1(); u2(); };
  }, [childUid]);

  const applyPause = async (date: string) => {
    if (!date) return;
    const dates = Array.from(new Set([...pauseDays.dates, date])).sort();
    await saveSettings('pauseDays', { dates });
  };

  const createFromTemplate = async (tpl: typeof TEMPLATES[number]) => {
    if (!childUid) return;
    const today = new Date().toISOString().slice(0, 10);
    await saveNotice(childUid, { type: tpl.type, text: tpl.text, when: today });
    if (tpl.pause && window.confirm('Marcar hoje como folga?')) {
      await applyPause(today);
    }
    toast.success('Recado na placa');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childUid || !text.trim()) return;
    await saveNotice(childUid, { type, text: text.trim(), when: when || undefined, until: until || undefined });
    setText('');
    toast.success('Recado salvo');
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button type="button" className={`px-4 py-2 rounded-lg ${tab === 'placa' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setTab('placa')}>Placa</button>
        <button type="button" className={`px-4 py-2 rounded-lg ${tab === 'habitos' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setTab('habitos')}>Hábitos</button>
      </div>

      {tab === 'placa' && (
        <>
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Modelos de 1 toque</h2>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <button key={tpl.id} type="button" className="px-3 py-2 bg-blue-50 text-blue-800 rounded-lg" onClick={() => void createFromTemplate(tpl)}>
                  {tpl.text}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Novo recado</h2>
            <form onSubmit={submit} className="space-y-3">
              <select className="border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value as NoticeType)}>
                <option value="recado">Recado</option>
                <option value="compromisso">Compromisso</option>
                <option value="regra">Regra do dia</option>
                <option value="visita">Visita</option>
                <option value="viagem">Viagem</option>
              </select>
              <textarea className="w-full border rounded px-3 py-2" maxLength={90} value={text} onChange={(e) => setText(e.target.value)} placeholder="Até 90 caracteres" />
              <div className="flex gap-2">
                <label className="text-sm">Quando <input type="date" className="border rounded px-2 py-1" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
                <label className="text-sm">Até <input type="date" className="border rounded px-2 py-1" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Publicar na placa</button>
            </form>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Na placa agora</h2>
            {notices.length === 0 ? <p className="text-sm text-gray-500">Nenhum recado.</p> : notices.map((n) => (
              <div key={n.id} className="flex justify-between items-start border-b border-gray-100 py-2 gap-3">
                <div>
                  <p className="text-sm font-medium">{n.text}</p>
                  <p className="text-xs text-gray-500">{n.type} {n.when || ''} {n.ackAt ? '· combinado' : ''}</p>
                </div>
                <button type="button" className="text-sm text-red-600" onClick={() => void deleteNotice(n.id)}>Apagar</button>
              </div>
            ))}
          </section>

          <NotificationSender />
        </>
      )}

      {tab === 'habitos' && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Catálogo de hábitos</h2>
          <p className="text-sm text-gray-600 mb-4">A criança confirma na Vila, sem gold nem XP. O catálogo desta etapa é fixo.</p>
          <ul className="space-y-2">
            {HABITS.map((h) => (
              <li key={h.id} className="border border-gray-100 rounded-lg px-3 py-2">
                <p className="font-medium">{h.label}</p>
                <p className="text-sm text-gray-600">Turno: {h.period === 'any' ? 'qualquer' : h.period} · Botão: {h.confirmLabel}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default PlacaManager;
