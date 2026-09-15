import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DAY_CHANGED_EVENT, useClock } from '../../../contexts/ClockContext';
import { HOTBAR_ICONS, houseSprite } from '../../../config/village';
import { BUILDING_BY_ID, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import { dueTasksOn, periodAllowedAt } from '../../../services/village/schedule';
import { chestAllowed } from '../../../services/village/chest';
import { noticesForNow, habitTipForNow, pickLine } from '../../../services/village/notices';
import { nextEvents, occurrencesBetween, reminderDue } from '../../../services/village/agenda';
import { markAgendaDone, subscribeAgenda, weeklyOrganizedBonus } from '../../../services/agendaService';
import { createMineSfx } from '../english/mine/sfx';
import { CHILD_BIRTHDAY_MMDD } from '../../../config/rules';
import { VILLAGE_LINES } from '../../../data/villageLines';
import { HABIT_LINES } from '../../../data/habitLines';
import { addDays, clockDriftWarning, isoWeekOf } from '../../../utils/clock';
import { usePunishment } from '../../../contexts/PunishmentContext';
import type { AgendaItem } from '../../../types/village';
import HeroHeader from '../HeroHeader';
import Casa from './Casa';
import VacationBanner from '../VacationBanner';
import YesterdaySummary from '../YesterdaySummary';
import ProgressBar from '../ProgressBar';
import VillageScene from './VillageScene';
import CharacterPreview from './CharacterPreview';
import DailyChest from './DailyChest';
import Oficina from './Oficina';
import Mercado from './Mercado';
import CharacterEditor from './CharacterEditor';
import EnglishBase from '../english/base/EnglishBase';
import AchievementsBadges from '../AchievementsBadges';
import Cofrinho from './Cofrinho';
import Agenda from './Agenda';
import DesafiosCard from './DesafiosCard';
import Mochila from './Mochila';
import type { BuildingId } from '../../../types/english';
import type { Period } from '../../../types/village';
import BuildingCard from './BuildingCard';

type District = 'mine' | 'library' | 'workshop' | 'market' | 'tower' | 'chest' | 'editor' | 'bank' | 'pack' | 'agenda' | 'house' | 'extrato' | null;

interface Props {
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
  guidedMode: boolean;
  onToggleGuidedMode: () => void;
  onOpenQuiz: () => void;
  quizLocked: boolean;
  punished?: boolean;
}

const VillageHome: React.FC<Props> = ({
  selectedPeriod, onPeriodChange, guidedMode, onToggleGuidedMode,
  onOpenQuiz, quizLocked, punished = false,
}) => {
  const { village, materials, buildings, economy, pauseDays, notices, ackNotice } = useVillage();
  const { tasks, progress, completeTask } = useData();
  const { playClick } = useSound();
  const { hour, minute, today, now, driftMs } = useClock();
  const { isPunished } = usePunishment();
  const lockedShop = punished || isPunished;
  const driftLine = clockDriftWarning(driftMs);
  const [district, setDistrict] = useState<District>(null);
  const [lot, setLot] = useState<BuildingId | null>(null);
  const [dockTab, setDockTab] = useState<'vila' | 'missoes'>('vila');
  const [speech, setSpeech] = useState<{ npc: string; text: string } | null>(null);
  const [goalPreset, setGoalPreset] = useState<{ title: string; targetGold: number; rewardId?: string } | undefined>();
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [agendaFlash, setAgendaFlash] = useState<string | null>(null);
  const { childUid } = useAuth();
  const dismissSpeech = useCallback(() => setSpeech(null), []);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const onDay = () => toast.success('Novo dia na Vila');
    window.addEventListener(DAY_CHANGED_EVENT, onDay);
    return () => window.removeEventListener(DAY_CHANGED_EVENT, onDay);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDistrict(null); setLot(null); return; }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === '1') { setDistrict(null); setLot(null); setDockTab('vila'); }
      if (k === '2' || k === 'm') { setDistrict('house'); setLot(null); setDockTab('missoes'); }
      if (k === '3') setDistrict('mine');
      if (k === '4') {
        if ((buildings.mercado || 0) >= 1) setDistrict('market');
        else setLot('mercado');
      }
      if (k === '5' || k === 'i') setDistrict('pack');
      if (k === 'b') setDistrict('chest');
      if (k === 'a') {
        if ((buildings.agenda || 0) >= 1) setDistrict('agenda');
        else setLot('agenda');
      }
      if (k === 'i') setDistrict('pack');
      if (k === 'e') setDistrict('mine');
      if (k === 'o') {
        if ((buildings.fornalha || 0) >= 1) setDistrict('workshop');
        else setLot('fornalha');
      }
      if (k === 'l') {
        if ((buildings.mercado || 0) >= 1) setDistrict('market');
        else setLot('mercado');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buildings.agenda, buildings.mercado, buildings.fornalha]);

  useEffect(() => {
    if (!district && !lot) return;
    window.history.pushState({ villageModal: true }, '');
    const onPop = () => { setDistrict(null); setLot(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [district, lot]);

  useEffect(() => {
    if (!childUid) return;
    return subscribeAgenda(childUid, setAgendaItems);
  }, [childUid]);

  useEffect(() => {
    if (!childUid) return;
    const week = isoWeekOf(today);
    if (now.weekday !== 0 || now.hour < 18) return;
    void weeklyOrganizedBonus(childUid, week).then((ok) => {
      if (ok) {
        toast.success('Semana organizada: +1 madeira');
        setSpeech({ npc: 'sabio', text: 'Semana organizada. Um material a mais, minerador.' });
      }
    }).catch(() => undefined);
  }, [childUid, today, now.weekday, now.hour]);

  useEffect(() => {
    const sfx = createMineSfx(() => {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      return AC ? new AC() : null;
    }, () => true);
    const tick = () => {
      for (const item of occurrencesBetween(agendaItems, addDays(today, -1), addDays(today, 1))) {
        if (!reminderDue(item, now)) continue;
        if (agendaFlash === item.id) continue;
        setAgendaFlash(item.id);
        sfx.checkpoint();
        toast((t) => (
          <span className="flex items-center gap-2">
            {item.time ? `${item.time} · ` : ''}{item.title}
            <button type="button" className="mc-btn mc-btn-green min-h-[36px] px-2" onClick={() => { toast.dismiss(t.id); setAgendaFlash(null); }}>Ok</button>
          </span>
        ), { duration: 20000 });
        setSpeech({ npc: 'olheiro', text: `${item.title} daqui a pouco. Já está pronto?` });
        break;
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [agendaItems, today, now, agendaFlash]);

  const due = useMemo(() => dueTasksOn(tasks, today), [tasks, today]);
  const done = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;
  const gate = chestAllowed({ hourBrazil: hour, settings: economy, due: due.length, done, village, date: today });
  const board = noticesForNow({
    due: due.length,
    done,
    minDueForChest: economy.minDueForChest,
    chestOpenHour: economy.chestOpenHour,
    birthdayMmDd: CHILD_BIRTHDAY_MMDD,
    gold: progress.availableGold || 0,
    nearestReward: null,
    avgGoldPerDay: 10,
    tomorrowQuizTitle: null,
    pauseDates: pauseDays.dates,
    vacation: false,
    fatherNotices: notices,
    dismissed: village.noticesDismissed,
  }, today, hour);
  const habit = habitTipForNow(today, hour);
  const habitLine = useMemo(() => {
    const lines = HABIT_LINES[habit.npc];
    const dayKey = `habit-tip:${today}:${habit.npc}`;
    try {
      const saved = localStorage.getItem(dayKey);
      const hit = lines.find((l) => l.id === saved);
      if (hit) return hit;
    } catch { /* ignore */ }
    let recent: string[] = [];
    try { recent = JSON.parse(localStorage.getItem('habit-line-recent') || '[]') as string[]; } catch { recent = []; }
    const picked = pickLine(lines, recent);
    try {
      localStorage.setItem(dayKey, picked.id);
      localStorage.setItem('habit-line-recent', JSON.stringify([...recent, picked.id].slice(-14)));
    } catch { /* ignore */ }
    return picked;
  }, [habit.npc, today]);
  const ticker = board.find((item) => item.kind === 'father') || board[0];
  const turnMin = done >= Math.min(due.length, 1);
  const turnFull = due.length > 0 && done >= due.length && gate.reason === 'already';
  const todayAgenda = occurrencesBetween(agendaItems, today, today);
  const tomorrowAgenda = occurrencesBetween(agendaItems, addDays(today, 1), addDays(today, 1));
  const upcoming = nextEvents(agendaItems, today, 1)[0];
  const nextEventLabel = upcoming && upcoming.date <= addDays(today, 7)
    ? `${upcoming.date === today ? 'Hoje' : upcoming.date === addDays(today, 1) ? 'Amanhã' : upcoming.date.slice(8)}: ${upcoming.title}`
    : undefined;

  const openDistrict = (id: string) => {
    playClick();
    if (lockedShop && (id === 'market' || id === 'npc:comerciante' || id === 'chest' || id === 'pack')) {
      toast.error('Em punição: Mercado, Baú e Loja fechados. Prova e Mina continuam abertas.');
      return;
    }
    const lv = (bid: BuildingId) => buildings[bid] || 0;
    if (id === 'character') { setDistrict('editor'); return; }
    if (id === 'mine') { setDistrict('mine'); return; }
    if (id === 'pack') { setDistrict('pack'); return; }
    if (id === 'market') {
      if (lv('mercado') >= 1) setDistrict('market');
      else setLot('mercado');
      return;
    }
    if (id === 'agenda') {
      if (lv('agenda') >= 1) setDistrict('agenda');
      else setLot('agenda');
      return;
    }
    if (id === 'npc:comerciante') {
      if (lv('mercado') >= 1) setDistrict('market');
      else setLot('mercado');
      return;
    }
    if (id === 'npc:ferreiro') {
      if (lv('fornalha') >= 1) setDistrict('workshop');
      else setLot('fornalha');
      return;
    }
    if (id === 'chest_streak') { setDistrict('chest'); return; }
    if (id === 'build:bau' && lv('bau') >= 1) { setDistrict('pack'); return; }
    if (id === 'arena') {
      setSpeech({ npc: 'olheiro', text: 'Quando a Arena abrir, eu quero ver você ganhar do seu pai no xadrez.' });
      return;
    }
    if (id.startsWith('npc:')) {
      const npc = id.slice(4) as keyof typeof VILLAGE_LINES;
      const lines = VILLAGE_LINES[npc];
      if (!lines?.length) return;
      setSpeech({ npc, text: lines[Math.abs(hour) % lines.length].text });
      return;
    }
    if (id.startsWith('build:')) {
      const bid = id.slice('build:'.length);
      if (bid in BUILDING_BY_ID) setLot(bid as BuildingId);
    }
  };

  const fullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-3 pb-32">
      <HeroHeader
        progress={progress}
        onOpenGold={() => setDistrict('extrato')}
        onOpenPack={() => setDistrict('pack')}
        onOpenTower={() => setDistrict('tower')}
        nextEventLabel={nextEventLabel}
        hour={hour}
        avatar={<CharacterPreview character={village.character} gear={village.gear} size={52} />}
        subtitle={`${village.characterName} · ${village.name}`}
        fullDays={village.fullDays}
        extraButton={
          <span className="mn-fs-btn">
            <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" title="Tela cheia" onClick={() => { playClick(); fullscreen(); }}>
              <Maximize2 className="w-5 h-5" />
            </button>
          </span>
        }
      />
      <VacationBanner />
      {lockedShop && (
        <p className="text-sm mc-warn mt-2">Punição: Mercado, Baú e Loja fechados. Prova e Mina continuam abertas, sem gold extra.</p>
      )}
      <YesterdaySummary />
      <div className="mn-stage mt-2">
        <VillageScene
          village={village}
          buildings={buildings}
          hour={hour}
          gated={quizLocked}
          reducedMotion={reduced}
          speech={speech}
          onClickSpot={openDistrict}
          onDismissSpeech={dismissSpeech}
          houseSmoke={due.length > 0 && done >= due.length}
        />
        {(todayAgenda.length > 0 || tomorrowAgenda.length > 0 || ticker || habitLine.text || driftLine) && (
          <div className="mn-ticker">
            {driftLine && <p className="text-xs mc-warn mb-2">{driftLine}</p>}
            {todayAgenda.length > 0 && (
              <div className="space-y-1 mb-2">
                <p className="text-sm font-bold">Hoje você tem</p>
                {todayAgenda.map((item) => (
                  <div key={item.id + item.date} className={`flex justify-between gap-2 items-center ${agendaFlash === item.id ? 'mc-pop' : ''}`}>
                    <p className="text-sm text-white">{item.time ? `${item.time} ` : ''}{item.title}</p>
                    {!item.doneAt && childUid && (
                      <button type="button" className="mc-btn mc-btn-green min-h-[36px] px-2 shrink-0" onClick={() => {
                        void markAgendaDone(childUid, item.id).then((xp) => {
                          toast.success(xp >= 10 ? '+10 XP, planejou com antecedência' : '+5 XP');
                          setAgendaFlash(null);
                        }).catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
                      }}>Feito</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tomorrowAgenda.length > 0 && (
              <p className="text-sm text-white mb-1">Amanhã: {tomorrowAgenda.map((i) => i.title).join(', ')}</p>
            )}
            {ticker && (
              <div className="flex justify-between gap-2 items-center">
                <p className="text-sm text-white">{ticker.text}</p>
                {ticker.kind === 'father' && (
                  <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3 shrink-0" onClick={() => void ackNotice(ticker.key.replace('father:', ''))}>Combinado</button>
                )}
              </div>
            )}
            {habitLine.text && (
              <p className={`text-sm ${ticker ? 'mc-muted mt-0.5' : 'text-white'}`}>{habitLine.text}</p>
            )}
          </div>
        )}
      </div>
      <ProgressBar progress={progress} compact />
      <div className="mt-3 mc-card p-3 flex flex-wrap items-center gap-3">
        <span className="mc-num text-white" style={{ fontSize: 12 }}>{done}/{due.length}</span>
        <span className="text-sm">Hoje</span>
        {(() => {
          const next = due.find((t) => {
            const full = tasks.find((x) => x.id === t.id);
            return !(full?.status === 'done' && full.lastCompletedDate === today);
          });
          const full = next ? tasks.find((x) => x.id === next.id) : undefined;
          if (!full) return <span className="text-sm mc-muted">Missões do dia em dia.</span>;
          const open = periodAllowedAt(full.period, hour, economy);
          const abre = full.period === 'afternoon' ? economy.periodStartHours.afternoon : economy.periodStartHours.evening;
          return (
            <>
              <span className="text-sm truncate max-w-[14rem]">{full.title}</span>
              {open ? (
                <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3" onClick={() => { playClick(); void completeTask(full.id); }}>Concluir</button>
              ) : (
                <span className="text-sm mc-muted">Próxima às {abre}h</span>
              )}
            </>
          );
        })()}
        <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => { playClick(); setDistrict('house'); }}>Abrir a Casa</button>
        {gate.ok && (
          <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => { playClick(); setDistrict('chest'); }}>Baú do Dia</button>
        )}
      </div>
      <DesafiosCard embedded />

      <footer className="mn-dock">
        <div className="mn-dock-inner">
          <div className="mn-dock-meta">
            <span className="mc-num text-white">{done}/{due.length}</span>
            <span className="text-sm">{turnFull ? 'Dia completo' : turnMin ? 'Mínimo do dia' : 'Dia em andamento'}</span>
        <span className="text-sm mc-muted">
          Baú: {gate.ok ? `${economy.dailyChestGold[0]} + ${village.fullDays} tochas = ${Math.min(economy.dailyChestGold[1], economy.dailyChestGold[0] + village.fullDays)} gold` : gate.reason === 'already' ? 'aberto' : gate.reason === 'hour' ? `abre às ${economy.chestOpenHour}h (faltam ${Math.max(0, economy.chestOpenHour - hour)}h${String(Math.max(0, hour >= economy.chestOpenHour ? 0 : 60 - minute)).padStart(2, '0')})` : 'faltam missões'}
        </span>
            <div className="mn-dock-mats">
              {(Object.keys(MATERIAL_LABELS) as Array<keyof typeof MATERIAL_LABELS>).map((m) => (
                <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                  <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
                  <span className="mc-num text-white">{materials[m] || 0}</span>
                </span>
              ))}
            </div>
          </div>
          <nav className="mc-hotbar mn-dock-nav">
            {([
              ['Vila', 'vila', () => { setDistrict(null); setLot(null); setDockTab('vila'); }],
              ['Missões', 'missoes', () => { setDistrict('house'); setLot(null); setDockTab('missoes'); }],
              ['Mina', 'mine', () => setDistrict('mine')],
              ['Mercado', 'market', () => {
                if (lockedShop) { toast.error('Em punição: Mercado fechado'); return; }
                if ((buildings.mercado || 0) >= 1) setDistrict('market');
                else setLot('mercado');
              }],
              ['Mochila', 'pack', () => setDistrict('pack')],
            ] as Array<[string, string, () => void]>).map(([label, id, fn]) => {
              const on = id === 'vila'
                ? !district && !lot && dockTab !== 'missoes'
                : id === 'missoes'
                  ? district === 'house'
                  : district === id;
              return (
                <button
                  key={label}
                  type="button"
                  className={`mc-slot rounded px-3 min-h-[44px] flex items-center gap-1 ${on ? 'mc-slot-selected' : ''}`}
                  onClick={() => { playClick(); fn(); }}
                >
                  {(label === 'Missões' ? houseSprite(village.season) : HOTBAR_ICONS[label]) && (
                    <img src={label === 'Missões' ? houseSprite(village.season) : HOTBAR_ICONS[label]} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                  )}
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </footer>

      {lot && (
        <BuildingCard
          id={lot}
          onClose={() => setLot(null)}
          onOpenMine={() => { setLot(null); setDistrict('mine'); }}
          onOpenChest={() => { setLot(null); setDistrict('chest'); }}
          onOpenTower={() => { setLot(null); setDistrict('tower'); }}
          onOpenWorkshop={() => { setLot(null); setDistrict('workshop'); }}
          onOpenQuiz={() => { setLot(null); onOpenQuiz(); }}
          onOpenBank={() => { setLot(null); setDistrict('bank'); }}
          onOpenAgenda={() => { setLot(null); setDistrict('agenda'); }}
          onOpenMarket={() => { setLot(null); setDistrict('market'); }}
        />
      )}
      {district === 'chest' && <DailyChest hour={hour} onClose={() => setDistrict(null)} />}
      {district === 'workshop' && (
        <Oficina
          onClose={() => setDistrict(null)}
          onOpenPack={() => setDistrict('pack')}
          onOpenLot={(bid) => { setDistrict(null); setLot(bid as BuildingId); }}
        />
      )}
      {district === 'market' && (
        <Mercado
          onClose={() => setDistrict(null)}
          onOpenRewards={() => setDistrict('market')}
          onCreateGoal={(title, gold, rewardId) => {
            setGoalPreset({ title, targetGold: gold, rewardId });
            setDistrict('bank');
          }}
          onOpenPack={() => setDistrict('pack')}
        />
      )}
      {district === 'pack' ? <Mochila onClose={() => setDistrict(null)} onOpenWorkshop={() => setDistrict('workshop')} onOpenMarket={() => setDistrict('market')} /> : null}
      {district === 'editor' ? <CharacterEditor onClose={() => setDistrict(null)} onBuy={() => setDistrict('market')} /> : null}
      {district === 'mine' && <EnglishBase onClose={() => setDistrict(null)} />}
      {district === 'bank' && (
        <Cofrinho
          onClose={() => { setDistrict(null); setGoalPreset(undefined); }}
          preset={goalPreset}
        />
      )}
      {district === 'extrato' && (
        <Cofrinho
          initialTab="extrato"
          onClose={() => setDistrict(null)}
        />
      )}
      {district === 'agenda' && <Agenda onClose={() => setDistrict(null)} />}
      {district === 'house' && (
        <Casa
          onClose={() => setDistrict(null)}
          selectedPeriod={selectedPeriod}
          onPeriodChange={onPeriodChange}
          guidedMode={guidedMode}
          onToggleGuidedMode={onToggleGuidedMode}
          hour={hour}
          done={done}
          due={due.length}
          chestReady={gate.ok}
          onOpenChest={() => setDistrict('chest')}
          agendaItems={agendaItems}
        />
      )}
      {district === 'tower' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setDistrict(null)}>
          <div className="max-w-lg w-full mc-modal rounded-lg p-3" onClick={(e) => e.stopPropagation()}><AchievementsBadges /></div>
        </div>
      )}
    </div>
  );
};

export default VillageHome;
