import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { useAuth } from '../../../contexts/AuthContext';
import { houseSprite, houseTitle } from '../../../config/village';
import type { AgendaItem, DailyCheckinAnswers, Period } from '../../../types/village';
import DailyChecklist from '../DailyChecklist';
import FlashTimer from '../FlashTimer';
import CharacterPreview from './CharacterPreview';
import { dayTimeline, occurrencesBetween } from '../../../services/village/agenda';
import { markAgendaDone } from '../../../services/agendaService';
import { dueTasksOn, periodAllowedAt } from '../../../services/village/schedule';
import { addDays, getTodayBrazil, isNightHour } from '../../../utils/clock';
import { savePlan, submitCheckin } from '../../../services/villageService';
import { FirestoreService } from '../../../services/firestoreService';

const SUN = '/assets/english/ui/sun.webp';
const MOON = '/assets/english/ui/moon.webp';
const CLOCK = '/assets/english/ui/clock.webp';
const LANTERN = '/assets/village/items/lantern.png';
const CHEST = '/assets/village/buildings/bau-1.png';

type Tab = 'missoes' | 'plano' | 'fechar';

const Casa: React.FC<{
  onClose: () => void;
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
  guidedMode: boolean;
  onToggleGuidedMode: () => void;
  hour: number;
  done: number;
  due: number;
  chestReady?: boolean;
  onOpenChest?: () => void;
  agendaItems?: AgendaItem[];
}> = ({
  onClose, selectedPeriod, onPeriodChange, guidedMode, onToggleGuidedMode,
  hour, done, due, chestReady, onOpenChest, agendaItems = [],
}) => {
  const { village, economy } = useVillage();
  const { tasks, completeTask } = useData();
  const { childUid } = useAuth();
  const { playClick } = useSound();
  const [tab, setTab] = useState<Tab>('missoes');
  const [focusMin, setFocusMin] = useState<number | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [check, setCheck] = useState<DailyCheckinAnswers>({ water: false, stretch: false, kindness: false, screen: false, tomorrow: '' });
  const [closed, setClosed] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const night = isNightHour(hour);
  const allDone = due > 0 && done >= due;
  const name = village.characterName || 'Heitor';
  const title = houseTitle(village.season);
  const src = houseSprite(village.season);
  const today = getTodayBrazil();
  const line = dayTimeline(agendaItems, tasks, village.plan, today);
  const tomorrow = occurrencesBetween(agendaItems, addDays(today, 1), addDays(today, 1));
  const dueToday = useMemo(() => dueTasksOn(tasks, today), [tasks, today]);
  const planned = village.plan.date === today && village.plan.order.length > 0;

  useEffect(() => {
    if (planned) {
      setOrder(village.plan.order);
      setFocusId(village.plan.focusTaskId);
      return;
    }
    setOrder(dueToday.map((t) => t.id));
  }, [planned, village.plan.order, village.plan.focusTaskId, dueToday]);

  useEffect(() => {
    if (!childUid) return;
    void FirestoreService.getDailyProgress(childUid, today).then((d) => {
      if (d?.checkin) setClosed(true);
    });
  }, [childUid, today]);

  const move = (id: string, dir: -1 | 1) => {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
      return next;
    });
  };

  const startTurn = async () => {
    if (!childUid || planBusy || hour >= 12 || planned) return;
    setPlanBusy(true);
    try {
      await savePlan(childUid, { date: today, order, focusTaskId: focusId });
      toast.success('Turno começado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para gravar o plano');
    } finally {
      setPlanBusy(false);
    }
  };

  const closeDay = async () => {
    if (!childUid || closeBusy || closed) return;
    setCloseBusy(true);
    try {
      const xp = await submitCheckin(childUid, today, check);
      setClosed(true);
      toast.success(`Dia fechado · +${xp} XP`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para fechar o dia');
    } finally {
      setCloseBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mn-veil" onClick={onClose}>
      <div className="mc-modal mn-casa mc-pop rounded-lg w-full max-w-4xl max-h-[96vh] overflow-hidden text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-casa-hero">
          <img src={src} alt="" className="mn-casa-sprite mc-pixel" draggable={false} />
          <CharacterPreview character={village.character} gear={village.gear} size={88} />
          <div className="min-w-0 flex-1">
            <h2 className="mc-h">
              <img src={src} alt="" className="mc-pixel" draggable={false} />
              Casa do Minerador
            </h2>
            <p className="text-sm mt-1">
              {title} de {name}. {allDone ? 'A chaminé está acesa: o dia foi feito.' : 'Aqui moram as missões do dia.'}
            </p>
            <p className="mc-num text-white mt-2" style={{ fontSize: 12 }}>{done}/{due} hoje</p>
          </div>
          <span className={`mn-casa-window ${night ? '' : 'is-day'}`} aria-hidden />
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className={`mn-casa-hearth ${allDone ? 'is-on' : ''}`} aria-hidden />
        <div className="mc-hotbar px-4 pt-3">
          {([
            ['missoes', 'Missões', src],
            ['plano', 'Plano do turno', SUN],
            ['fechar', 'Fechar o dia', MOON],
          ] as const).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={`mc-slot rounded px-3 min-h-[44px] ${tab === id ? 'mc-slot-selected' : ''}`}
              onClick={() => { playClick(); setTab(id); }}
            >
              <img src={icon} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
              {label}
            </button>
          ))}
        </div>
        <div className="mn-casa-room">
          {tab === 'missoes' && (
            <>
              {chestReady && onOpenChest && (
                <button
                  type="button"
                  className="mc-btn mc-btn-gold min-h-[44px] px-4 mb-3"
                  onClick={() => { playClick(); onOpenChest(); }}
                >
                  <img src={CHEST} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                  Baú do Dia
                </button>
              )}
              {line.length > 0 && (
                <div className="mc-card p-3 mb-3 space-y-2">
                  <p className="text-sm font-bold">Linha do dia</p>
                  {line.map((row) => (
                    <div key={row.id} className="flex justify-between items-center gap-2">
                      <p className="text-sm">
                        {row.time || (row.period === 'morning' ? 'Manhã' : row.period === 'afternoon' ? 'Tarde' : row.period === 'evening' ? 'Noite' : '')}
                        {' · '}{row.title}
                      </p>
                      {row.kind === 'mission' && row.taskId && (() => {
                        const full = tasks.find((x) => x.id === row.taskId);
                        if (!full) return null;
                        if (full.status === 'done' && full.lastCompletedDate === today) return null;
                        if (!periodAllowedAt(full.period, hour, economy)) return null;
                        return (
                          <button type="button" className="mc-btn mc-btn-green min-h-[36px] px-2" onClick={() => { playClick(); void completeTask(row.taskId!); }}>Concluir</button>
                        );
                      })()}
                      {row.kind === 'focus' && row.taskId && (() => {
                        const full = tasks.find((x) => x.id === row.taskId);
                        if (full && full.status === 'done' && full.lastCompletedDate === today) return null;
                        return (
                          <button type="button" className="mc-btn mc-btn-gold min-h-[36px] px-2" onClick={() => {
                            playClick();
                            setFocusTaskId(row.taskId!);
                            setFocusMin(15);
                          }}>Foco</button>
                        );
                      })()}
                      {row.kind === 'agenda' && row.agendaId && childUid && (
                        <button type="button" className="mc-btn mc-btn-green min-h-[36px] px-2" onClick={() => {
                          playClick();
                          void markAgendaDone(childUid, row.agendaId!).then((xp) => toast.success(xp >= 10 ? '+10 XP, planejou com antecedência' : '+5 XP'));
                        }}>Feito</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {focusMin && (
                <FlashTimer
                  isOpen
                  embedded
                  minutes={focusMin}
                  onClose={() => { setFocusMin(null); setFocusTaskId(null); }}
                  onFinished={() => {
                    if (focusTaskId) void completeTask(focusTaskId);
                    toast.success('Foco concluído');
                    setFocusMin(null);
                    setFocusTaskId(null);
                  }}
                />
              )}
              <DailyChecklist
                tasks={tasks}
                selectedPeriod={selectedPeriod}
                onPeriodChange={onPeriodChange}
                guidedMode={guidedMode}
                onToggleGuidedMode={onToggleGuidedMode}
              />
            </>
          )}
          {tab === 'plano' && (
            <div className="mn-casa-sheet p-5 space-y-3">
              <h3 className="mc-h">
                <img src={CLOCK} alt="" className="mc-pixel" draggable={false} />
                Mesa da manhã
              </h3>
              <p className="text-sm">
                Até o meio-dia, escolha a ordem das missões e uma missão-foco (material em dobro, uma vez).
              </p>
              {hour >= 12 && !planned && (
                <p className="text-sm mc-muted">O plano fecha ao meio-dia. As missões seguem a ordem do papai.</p>
              )}
              {planned && <p className="text-sm mc-good">Turno gravado. A missão-foco está marcada na lista.</p>}
              {order.map((id) => {
                const t = tasks.find((x) => x.id === id);
                if (!t) return null;
                return (
                  <div key={id} className="mc-row rounded p-2 flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <button type="button" className="mc-btn mc-btn-dark min-h-[32px] px-2" disabled={planned || hour >= 12} onClick={() => { playClick(); move(id, -1); }}>↑</button>
                      <button type="button" className="mc-btn mc-btn-dark min-h-[32px] px-2" disabled={planned || hour >= 12} onClick={() => { playClick(); move(id, 1); }}>↓</button>
                    </div>
                    <p className="text-sm flex-1">{t.title}</p>
                    <button
                      type="button"
                      className={`mc-btn min-h-[36px] px-3 ${focusId === id ? 'mc-btn-gold' : 'mc-btn-dark'}`}
                      disabled={planned || hour >= 12}
                      onClick={() => { playClick(); setFocusId(id); }}
                    >
                      Foco
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="mc-btn mc-btn-green min-h-[44px] px-4"
                disabled={planBusy || planned || hour >= 12 || order.length === 0 || !childUid}
                onClick={() => { playClick(); void startTurn(); }}
              >
                Começar o turno
              </button>
            </div>
          )}
          {tab === 'fechar' && (
            <div className="mn-casa-sheet p-5 space-y-3">
              <h3 className="mc-h">
                <img src={LANTERN} alt="" className="mc-pixel" draggable={false} />
                Lanterna da noite
              </h3>
              {hour < 20 && !chestReady && (
                <p className="text-sm mc-muted">Fecha o dia depois das 20h, ou depois de abrir o Baú.</p>
              )}
              {closed && <p className="text-sm mc-good">Dia fechado. O Sábio responde amanhã na Placa.</p>}
              {([
                ['water', 'Bebi água?'],
                ['stretch', 'Alonguei?'],
                ['kindness', 'Fui gentil?'],
                ['screen', 'Tela no limite?'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`mc-row rounded p-2 flex items-center justify-between gap-2 w-full text-left ${check[key] ? 'is-done' : ''}`}
                  disabled={closed}
                  onClick={() => { playClick(); setCheck((c) => ({ ...c, [key]: !c[key] })); }}
                >
                  <span className="text-sm">{label}</span>
                  <span className={`mc-slot w-10 h-10 p-0 shrink-0 flex items-center justify-center ${check[key] ? 'mc-slot-good' : ''}`} aria-hidden>
                    {check[key] ? 'ok' : ''}
                  </span>
                </button>
              ))}
              <label className="block text-sm">
                Amanhã eu...
                <input
                  value={check.tomorrow}
                  disabled={closed}
                  maxLength={80}
                  onChange={(e) => setCheck((c) => ({ ...c, tomorrow: e.target.value }))}
                  className="mc-slot w-full mt-1 px-3 py-2 text-white"
                  placeholder="três palavras no mínimo"
                />
              </label>
              {tomorrow.length > 0 && (
                <p className="text-sm">Amanhã você tem: {tomorrow.map((i) => i.title).join(', ')}</p>
              )}
              <button
                type="button"
                data-testid="fechar-dia-btn"
                className="mc-btn mc-btn-gold min-h-[44px] px-4"
                disabled={closeBusy || closed || !childUid || (hour < 20 && !chestReady)}
                onClick={() => { playClick(); void closeDay(); }}
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Casa;
