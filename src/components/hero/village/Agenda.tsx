import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useClock } from '../../../contexts/ClockContext';
import { useSound } from '../../../contexts/SoundContext';
import type { AgendaItem, AgendaKind } from '../../../types/village';
import { nextEvents, occurrencesBetween, organizationXp } from '../../../services/village/agenda';
import { acceptStudyPlan, createAgendaItem, markAgendaDone, subscribeAgenda } from '../../../services/agendaService';
import { addDays } from '../../../utils/clock';

const KINDS: AgendaKind[] = ['prova', 'trabalho', 'evento', 'aniversario', 'treino', 'compromisso', 'outro'];

const Agenda: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { childUid } = useAuth();
  const { today } = useClock();
  const { playClick } = useSound();
  const [tab, setTab] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AgendaKind>('prova');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [askPlan, setAskPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!childUid) return;
    return subscribeAgenda(childUid, setItems);
  }, [childUid]);

  const weekEnd = addDays(today, 6);
  const todayItems = occurrencesBetween(items, today, today);
  const weekItems = occurrencesBetween(items, today, weekEnd);
  const next = nextEvents(items, today, 1)[0];

  const save = async () => {
    if (!childUid) return;
    playClick();
    try {
      const id = await createAgendaItem(childUid, {
        title,
        kind,
        date,
        time: time || undefined,
        createdBy: 'child',
      });
      toast.success('Compromisso salvo');
      setTitle('');
      if (kind === 'prova' || kind === 'trabalho') setAskPlan(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    }
  };

  const done = async (id: string) => {
    if (!childUid) return;
    playClick();
    try {
      const xp = await markAgendaDone(childUid, id);
      toast.success(xp >= 10 ? '+10 XP, planejou com antecedência' : '+5 XP');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="mc-modal rounded-lg w-full max-w-2xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-4 border-[#17130f] flex justify-between">
          <h2 className="mc-title text-sm">Agenda</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar p-3">
          {(['hoje', 'semana', 'mes'] as const).map((t) => (
            <button key={t} type="button" className={`mc-slot rounded px-3 ${tab === t ? 'mc-slot-selected' : ''}`} onClick={() => { playClick(); setTab(t); }}>
              {t === 'hoje' ? 'Hoje' : t === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          {next && tab === 'hoje' && (
            <p className="text-sm">Próximo: {next.title} em {next.date}</p>
          )}
          {tab === 'hoje' && todayItems.map((i) => (
            <div key={i.id + i.date} className="mc-card p-3 flex justify-between items-center gap-2">
              <div>
                <p className="font-bold">{i.title}</p>
                <p className="text-sm mc-muted">{i.time || 'sem hora'} · {i.kind}</p>
              </div>
              {!i.doneAt && <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3" onClick={() => void done(i.id)}>Feito</button>}
            </div>
          ))}
          {tab === 'semana' && weekItems.map((i) => (
            <div key={i.id + i.date} className="mc-row rounded p-2 text-sm">{i.date} · {i.title}</div>
          ))}
          {tab === 'mes' && occurrencesBetween(items, addDays(today, -31), addDays(today, 31)).map((i) => (
            <div key={i.id + i.date} className="mc-row rounded p-2 text-sm">{i.date} · {i.title}{i.doneAt ? ' · feito' : ''}</div>
          ))}
          <div className="mc-card p-3 space-y-2">
            <p className="font-bold">Novo item</p>
            <div className="flex flex-wrap gap-1">
              {KINDS.map((k) => (
                <button key={k} type="button" className={`mc-btn min-h-[36px] px-2 ${kind === k ? 'mc-btn-gold' : 'mc-btn-stone'}`} onClick={() => setKind(k)}>{k}</button>
              ))}
            </div>
            <input className="mc-input w-full text-black px-2 py-2" maxLength={40} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="mc-input w-full text-black px-2 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="mc-input w-full text-black px-2 py-2" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-4" onClick={() => void save()}>Salvar</button>
          </div>
          {askPlan && childUid && (
            <div className="mc-card p-3">
              <p className="text-sm mb-2">Quer um plano de estudo?</p>
              <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-4" onClick={() => {
                void acceptStudyPlan(childUid, askPlan).then((ids) => {
                  toast.success(`${ids.length} missões de Foco criadas`);
                  setAskPlan(null);
                }).catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
              }}>Aceitar plano</button>
            </div>
          )}
          <p className="text-xs mc-muted">Organizar paga XP, nunca gold. {organizationXp({ plannedAheadDays: 2 })} XP se planejar com 2 dias de antecedência.</p>
        </div>
      </div>
    </div>
  );
};

export default Agenda;
