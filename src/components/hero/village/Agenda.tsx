import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useClock } from '../../../contexts/ClockContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import type { AgendaItem, AgendaKind } from '../../../types/village';
import { nextEvents, occurrencesBetween, organizationXp, studyPlanFor } from '../../../services/village/agenda';
import { acceptStudyPlan, createAgendaItem, deleteAgendaItem, markAgendaDone, subscribeAgenda, updateAgendaItem } from '../../../services/agendaService';
import { addDays } from '../../../utils/clock';
import FlashTimer from '../FlashTimer';
import CalendarModal from '../CalendarModal';

const KIND_LABEL: Record<AgendaKind, string> = {
  prova: 'Prova',
  trabalho: 'Trabalho',
  evento: 'Evento',
  aniversario: 'Aniversário',
  treino: 'Treino',
  compromisso: 'Compromisso',
  outro: 'Outro',
};

const REMINDS = [
  { n: 0, label: 'Na hora' },
  { n: 30, label: '30 min antes' },
  { n: 60, label: '1 h antes' },
  { n: 1440, label: '1 dia antes' },
];

const Agenda: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { childUid } = useAuth();
  const { today } = useClock();
  const { completeTask } = useData();
  const { playClick } = useSound();
  const [tab, setTab] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AgendaKind>('prova');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [remind, setRemind] = useState(0);
  const [repeat, setRepeat] = useState<'none' | 'weekly'>('none');
  const [notes, setNotes] = useState('');
  const [askPlan, setAskPlan] = useState<string | null>(null);
  const [planDays, setPlanDays] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [focusMin, setFocusMin] = useState<number | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!childUid) return;
    return subscribeAgenda(childUid, setItems);
  }, [childUid]);

  const weekEnd = addDays(today, 6);
  const todayItems = occurrencesBetween(items, today, today);
  const weekItems = occurrencesBetween(items, today, weekEnd);
  const next = nextEvents(items, today, 1)[0];

  const resetForm = () => {
    setTitle('');
    setTime('');
    setNotes('');
    setRepeat('none');
    setRemind(0);
    setEditing(null);
    setDate(today);
  };

  const save = async () => {
    if (!childUid) return;
    if (!title.trim()) {
      toast.error('Dê um nome ao compromisso');
      return;
    }
    playClick();
    try {
      if (editing) {
        await updateAgendaItem(editing, {
          title: title.trim().slice(0, 40),
          kind,
          date,
          time: time.trim(),
          remindMinutesBefore: remind,
          repeat,
          notes: notes.trim().slice(0, 140),
        });
        toast.success('Compromisso atualizado');
        resetForm();
        return;
      }
      const id = await createAgendaItem(childUid, {
        title: title.trim(),
        kind,
        date,
        time: time || undefined,
        remindMinutesBefore: remind,
        repeat,
        notes: notes.trim().slice(0, 140) || undefined,
        createdBy: 'child',
      });
      toast.success('Compromisso salvo');
      const savedKind = kind;
      const savedDate = date;
      const savedTitle = title;
      resetForm();
      if (savedKind === 'prova' || savedKind === 'trabalho') {
        setAskPlan(id);
        setPlanDays(studyPlanFor({ kind: savedKind, date: savedDate, title: savedTitle }, today));
      }
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

  const startEdit = (item: AgendaItem) => {
    setEditing(item.id);
    setTitle(item.title);
    setKind(item.kind);
    setDate(item.date);
    setTime(item.time || '');
    setRemind(item.remindMinutesBefore ?? 0);
    setRepeat(item.repeat === 'weekly' ? 'weekly' : 'none');
    setNotes(item.notes || '');
    setTab('hoje');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 mn-veil" onClick={onClose}>
      <div className="mc-modal mc-pop rounded-lg w-full max-w-2xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center">
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
          {tab === 'hoje' && (
            <>
              <div className="flex gap-2">
                <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => setFocusMin(15)}>Foco 15 min</button>
                <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => setFocusMin(25)}>Foco 25 min</button>
              </div>
              {focusMin && (
                <FlashTimer
                  isOpen
                  embedded
                  minutes={focusMin}
                  onClose={() => setFocusMin(null)}
                  onFinished={() => {
                    if (focusTaskId) void completeTask(focusTaskId);
                    toast.success('Foco concluído');
                    setFocusMin(null);
                    setFocusTaskId(null);
                  }}
                />
              )}
              {next && <p className="text-sm">Próximo: {next.title} {next.date === today ? 'hoje' : `em ${next.date.split('-').reverse().slice(0, 2).join('/')}`}</p>}
              {todayItems.map((i) => (
                <div key={i.id + i.date} className="mc-card p-3 flex justify-between items-center gap-2">
                  <div>
                    <p className="font-bold">{i.title}</p>
                    <p className="text-sm mc-muted">{i.time || 'sem hora'} · {KIND_LABEL[i.kind]}{i.createdBy === 'admin' ? ' · do pai' : ''}</p>
                    {i.notes && <p className="text-sm mc-muted">{i.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {!i.doneAt && <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3" onClick={() => void done(i.id)}>Feito</button>}
                    <button type="button" className="mc-btn mc-btn-stone min-h-[36px] px-2" onClick={() => startEdit(i)}>Editar</button>
                    <button type="button" className="mc-btn mc-btn-red min-h-[36px] px-2" onClick={() => { playClick(); void deleteAgendaItem(i.id).then(() => toast.success('Apagado')); }}>Apagar</button>
                  </div>
                </div>
              ))}
            </>
          )}
          {tab === 'semana' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(today, i);
                const list = weekItems.filter((x) => x.date === d);
                return (
                  <div key={d} className="mc-card p-2">
                    <p className="text-xs font-bold mb-1">{d.split('-').reverse().slice(0, 2).join('/')}</p>
                    {list.map((x) => <p key={x.id + x.date} className="text-xs">{x.time ? `${x.time} ` : ''}{x.title}</p>)}
                  </div>
                );
              })}
            </div>
          )}
          {tab === 'mes' && (
            <CalendarModal
              isOpen
              embedded
              onClose={onClose}
              agendaItems={items}
              onMarkAgenda={(id) => void done(id)}
            />
          )}
          <div className="mc-card p-3 space-y-2">
            <p className="font-bold">{editing ? 'Editar item' : 'Novo item'}</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(KIND_LABEL) as AgendaKind[]).map((k) => (
                <button key={k} type="button" className={`mc-btn min-h-[36px] px-2 ${kind === k ? 'mc-btn-gold' : 'mc-btn-stone'}`} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
              ))}
            </div>
            <input className="mc-input w-full text-black px-2 py-2" maxLength={40} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="mc-input w-full text-black px-2 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="mc-input w-full text-black px-2 py-2" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <div className="flex flex-wrap gap-1">
              {REMINDS.map((r) => (
                <button key={r.n} type="button" className={`mc-btn min-h-[36px] px-2 ${remind === r.n ? 'mc-btn-gold' : 'mc-btn-stone'}`} onClick={() => setRemind(r.n)}>{r.label}</button>
              ))}
            </div>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={repeat === 'weekly'} onChange={(e) => setRepeat(e.target.checked ? 'weekly' : 'none')} />
              Repetir toda semana
            </label>
            <input className="mc-input w-full text-black px-2 py-2" maxLength={140} placeholder="Nota" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-4" onClick={() => void save()}>{editing ? 'Salvar alteração' : 'Salvar'}</button>
            {editing && <button type="button" className="mc-btn mc-btn-stone min-h-[36px] px-3" onClick={resetForm}>Cancelar edição</button>}
          </div>
          {askPlan && childUid && (
            <div className="mc-card p-3">
              <p className="text-sm mb-2">Quer um plano de estudo?</p>
              <p className="text-sm mc-muted mb-2">
                {planDays.length === 0 ? 'A prova é perto demais para 3 blocos.' : `Três focos de 15 min: ${planDays.map((d) => d.split('-').reverse().slice(0, 2).join('/')).join(', ')}`}
              </p>
              <div className="flex gap-2">
                <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-4" onClick={() => {
                  void acceptStudyPlan(childUid, askPlan).then((ids) => {
                    toast.success(`${ids.length} missões de Foco criadas`);
                    setFocusTaskId(ids[0] || null);
                    setAskPlan(null);
                  }).catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
                }}>Aceitar plano</button>
                <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-4" onClick={() => setAskPlan(null)}>Não</button>
              </div>
            </div>
          )}
          {next && organizationXp(next) >= 10 && <p className="text-sm mc-good">Planejar com 2 dias de antecedência rende +5 XP extra.</p>}
        </div>
      </div>
    </div>
  );
};

export default Agenda;
