import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DAY_CHANGED_EVENT, useClock } from '../../../contexts/ClockContext';
import { HOTBAR_ICONS, houseSprite, kidName, villageLabel, visibleCracks, crackedListSentence } from '../../../config/village';
import { BUILDING_BY_ID, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import { dueTasksOn, periodAllowedAt } from '../../../services/village/schedule';
import { chestAllowed, chestMapLook, chestWaitCopy, warehouseHoldsChest } from '../../../services/village/chest';
import { liveBuildingLevel } from '../../../services/village/repair';
import { noticesForNow, habitTipForNow, pickLine } from '../../../services/village/notices';
import { nextEvents, occurrencesBetween, reminderDue } from '../../../services/village/agenda';
import { markAgendaDone, subscribeAgenda, updateAgendaItem, weeklyOrganizedBonus } from '../../../services/agendaService';
import { completeNight, repairLot, settleAfter, talkToNpc } from '../../../services/villageService';
import { claimKey, hasClaim } from '../../../services/village/claims';
import { createMineSfx } from '../english/mine/sfx';
import { CHILD_BIRTHDAY_MMDD } from '../../../config/rules';
import { VILLAGE_LINES, buildLine, repairLine } from '../../../data/villageLines';
import { HABIT_LINES } from '../../../data/habitLines';
import { addDays, clockDriftWarning, isoWeekOf, isBeforeLaunch } from '../../../utils/clock';
import { usePunishment } from '../../../contexts/PunishmentContext';
import { useVacation } from '../../../contexts/VacationContext';
import { pickDialogue, type DialogueCtx } from '../../../services/village/dialogue';
import { sageReplyFor } from '../../../services/village/checkin';
import { FirestoreService } from '../../../services/firestoreService';
import type { AgendaItem, NpcId, VillageSceneEvent } from '../../../types/village';
import HeroHeader from '../HeroHeader';
import Casa from './Casa';
import YesterdaySummary from '../YesterdaySummary';
import VillageScene from './VillageScene';
import CharacterPreview from './CharacterPreview';
import DailyChest from './DailyChest';
import Oficina from './Oficina';
import Mercado from './Mercado';
import EnglishBase from '../english/base/EnglishBase';
import Torre from './Torre';
import Cofrinho from './Cofrinho';
import Agenda from './Agenda';
import Mochila, { type PackTab } from './Mochila';
import BuildingCard from './BuildingCard';
import type { DollSlot } from './CharacterEditor';
import type { BuildingId } from '../../../types/english';
import type { Period } from '../../../types/village';
import { getLevelFromXP } from '../../../utils/levelSystem';
import { quizBlocksDest, quizGateActive } from '../../../services/village/quizGate';
import { furnaceOpensForge, type ForgeTab } from '../../../services/village/furnace';

const LETTER = '/assets/english/ui/base/c_letter.webp';
const BOOK = '/assets/english/ui/book.webp';
const CHEST = '/assets/english/ui/chest.webp';
const CLOCK = '/assets/english/ui/clock.webp';
const SUN = '/assets/english/ui/sun.webp';
const CREEPER = '/assets/english/ui/creeper.webp';
const CAKE = '/assets/english/ui/base/i_cake.webp';
const TORCH = '/assets/english/ui/torch.webp';

function MailNote({
  icon,
  kicker,
  body,
  meta,
  action,
}: {
  icon: string;
  kicker?: string;
  body: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <article className="mc-paper mn-mail-note">
      <img src={icon} alt="" className="mn-mail-note-ico mc-pixel" draggable={false} />
      <div className="mn-mail-note-copy">
        {kicker ? <p className="mn-mail-note-kicker">{kicker}</p> : null}
        <p className="mn-mail-note-body">{body}</p>
        {meta ? <p className="mn-mail-note-meta">{meta}</p> : null}
      </div>
      {action}
    </article>
  );
}

function noticeLook(key: string, kind: string): { icon: string; kicker: string } {
  if (kind === 'father') return { icon: LETTER, kicker: 'Papai' };
  if (key.includes(':chest:')) return { icon: CHEST, kicker: 'Baú do Dia' };
  if (key.includes(':quiz:')) return { icon: BOOK, kicker: 'Prova' };
  if (key.includes(':sage:')) return { icon: BOOK, kicker: 'Sábio' };
  if (key.includes(':birthday:')) return { icon: CAKE, kicker: 'Aniversário' };
  if (key.includes(':pause:') || key.includes(':vacation:')) return { icon: SUN, kicker: 'Folga' };
  if (key.includes(':gold:')) return { icon: '/assets/english/ui/gold.webp', kicker: 'Gold' };
  if (key.includes(':agenda:')) return { icon: CLOCK, kicker: 'Hoje' };
  if (key.includes(':ruin:')) return { icon: '/assets/english/ui/crafting.webp', kicker: 'Obra' };
  return { icon: TORCH, kicker: 'Placa' };
}

const nightInFlight = new Set<string>();

function shopBlocksDest(id: string): boolean {
  return id === 'market' || id === 'chest' || id === 'pack' || id === 'chest_streak';
}

type District = 'mine' | 'library' | 'workshop' | 'market' | 'tower' | 'chest' | 'bank' | 'pack' | 'agenda' | 'house' | 'extrato' | null;

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
  const { tasks, progress, flashReminders } = useData();
  const { playClick, playHammer, setMusicDuck } = useSound();
  const { hour, today, now, driftMs } = useClock();
  const { isPunished } = usePunishment();
  const { isActive: vacationOn, config: vacation } = useVacation();
  const lockedShop = punished || isPunished;
  const driftLine = clockDriftWarning(driftMs);
  const [district, setDistrict] = useState<District>(null);
  const [packTab, setPackTab] = useState<PackTab>('ficha');
  const [packSlot, setPackSlot] = useState<DollSlot>('shirt');
  const [lot, setLot] = useState<BuildingId | null>(null);
  const [forgeTab, setForgeTab] = useState<ForgeTab>('gear');
  const [dockTab, setDockTab] = useState<'vila' | 'missoes'>('vila');
  const [speech, setSpeech] = useState<{ npc: string; text: string; rest?: string[] } | null>(null);
  const [buildFx, setBuildFx] = useState<{ id: BuildingId; level: number; at: number } | null>(null);
  const [repairFx, setRepairFx] = useState<{ ids: string[]; at: number } | null>(null);
  const [sceneEvent, setSceneEvent] = useState<VillageSceneEvent | null>(null);
  const [sageLine, setSageLine] = useState<string | null>(null);
  const [yesterdayCtx, setYesterdayCtx] = useState<{ missed: boolean; complete: boolean }>({ missed: false, complete: false });
  const [placaOpen, setPlacaOpen] = useState(false);
  const [compactHud, setCompactHud] = useState(
    typeof window !== 'undefined' ? window.innerHeight < 800 : false,
  );
  const [goalPreset, setGoalPreset] = useState<{ title: string; targetGold: number; rewardId?: string } | undefined>();
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [agendaFlash, setAgendaFlash] = useState<string | null>(null);
  const { childUid } = useAuth();

  useEffect(() => {
    setMusicDuck('mine', district === 'mine');
    return () => setMusicDuck('mine', false);
  }, [district, setMusicDuck]);
  const dismissSpeech = useCallback(() => {
    setSpeech((cur) => {
      if (cur?.rest && cur.rest.length) {
        return { npc: cur.npc, text: cur.rest[0], rest: cur.rest.slice(1) };
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!placaOpen) return;
    const onDown = (ev: MouseEvent) => {
      const node = ev.target as HTMLElement | null;
      if (node?.closest('[data-testid="placa-panel"]') || node?.closest('[data-testid="placa-chip"]') || node?.closest('[data-testid="placa-peek"]')) return;
      setPlacaOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [placaOpen]);
  useEffect(() => {
    if (speech) setPlacaOpen(false);
  }, [speech]);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reminderSfx = useRef<ReturnType<typeof createMineSfx> | null>(null);
  const reminderCtx = useRef<AudioContext | null>(null);
  const remindedStamp = useRef(new Set<string>());
  const repairing = useRef(false);

  useEffect(() => {
    const onResize = () => setCompactHud(window.innerHeight < 800);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onDay = () => toast.success('Novo dia na Vila');
    window.addEventListener(DAY_CHANGED_EVENT, onDay);
    return () => window.removeEventListener(DAY_CHANGED_EVENT, onDay);
  }, []);

  useEffect(() => {
    const onEv = (ev: Event) => {
      const kind = (ev as CustomEvent<{ kind?: VillageSceneEvent['kind'] }>).detail?.kind;
      if (!kind) return;
      setSceneEvent({ kind, at: performance.now() });
    };
    window.addEventListener('village-event', onEv);
    const onLevel = () => setSceneEvent({ kind: 'level_up', at: performance.now() });
    window.addEventListener('miner-level-up', onLevel);
    return () => {
      window.removeEventListener('village-event', onEv);
      window.removeEventListener('miner-level-up', onLevel);
    };
  }, []);

  useEffect(() => {
    if (!childUid) return;
    const yest = addDays(today, -1);
    if (isBeforeLaunch(yest, village.launchedOn)) {
      setYesterdayCtx({ missed: false, complete: false });
      return;
    }
    void FirestoreService.getDailyProgress(childUid, yest).then((d) => {
      if (d?.checkin) setSageLine(sageReplyFor(d.checkin, yest));
      const dueY = d?.totalTasksAvailable || 0;
      const doneY = d?.tasksCompleted || 0;
      setYesterdayCtx({ missed: dueY > 0 && doneY < dueY, complete: dueY > 0 && doneY >= dueY });
    });
  }, [childUid, today, village.launchedOn]);

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
    if (!reminderSfx.current) {
      reminderSfx.current = createMineSfx(() => {
        if (!reminderCtx.current) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          reminderCtx.current = AC ? new AC() : null;
        }
        return reminderCtx.current;
      }, () => true);
    }
    const tick = () => {
      for (const item of occurrencesBetween(agendaItems, addDays(today, -1), addDays(today, 1))) {
        if (!item.title.trim()) continue;
        if (!reminderDue(item, now)) continue;
        const stamp = `${item.id}:${item.date}`;
        if (remindedStamp.current.has(stamp)) continue;
        remindedStamp.current.add(stamp);
        if (childUid) {
          void updateAgendaItem(item.id, { remindedFor: item.date, remindedAt: now.iso }).catch(() => undefined);
        }
        setAgendaFlash(item.id);
        reminderSfx.current?.checkpoint();
        toast((t) => (
          <span className="flex items-center gap-2">
            {item.time ? `${item.time} · ` : ''}{item.title}
            <button type="button" className="mc-btn mc-btn-green min-h-[36px] px-2" onClick={() => { toast.dismiss(t.id); setAgendaFlash(null); }}>Ok</button>
          </span>
        ), { duration: 20000, id: 'child-notice' });
        break;
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [agendaItems, today, now, childUid]);

  const due = useMemo(() => dueTasksOn(tasks, today), [tasks, today]);
  const done = due.filter((t) => {
    const full = tasks.find((x) => x.id === t.id);
    return full?.status === 'done' && full.lastCompletedDate === today;
  }).length;
  const cracks = visibleCracks(village.cracks);
  const broken = (bid: string) => cracks.includes(bid);
  const liveBau = liveBuildingLevel(buildings, village.cracks, 'bau');
  const gate = chestAllowed({
    hourBrazil: hour, settings: economy, due: due.length, done, village, date: today, bauLevel: liveBau,
  });
  const chestLook = chestMapLook({
    bauLevel: liveBau,
    ruined: broken('bau'),
    ready: gate.ok,
    already: gate.reason === 'already',
  });
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
  const turnFull = due.length > 0 && done >= due.length && gate.reason === 'already';
  const todayAgenda = occurrencesBetween(agendaItems, today, today);
  const tomorrowAgenda = occurrencesBetween(agendaItems, addDays(today, 1), addDays(today, 1));
  const upcoming = nextEvents(agendaItems, today, 1)[0];
  const nextEventLabel = upcoming && upcoming.date <= addDays(today, 7)
    ? `${upcoming.date === today ? 'Hoje' : upcoming.date === addDays(today, 1) ? 'Amanhã' : upcoming.date.slice(8)}: ${upcoming.title}`
    : undefined;

  const quizGate = quizGateActive(quizLocked);
  const dashReminders = flashReminders.filter((r) => r.active && r.showOnDashboard);
  const placaCount = board.length
    + todayAgenda.filter((item) => !item.doneAt).length
    + (sageLine ? 1 : 0)
    + (cracks.length > 0 || yesterdayCtx.missed ? 1 : 0)
    + dashReminders.length;
  const peek = (() => {
    const item = board.find((n) => n.kind === 'father') || board[0];
    if (item) return { key: item.key, kind: item.kind, text: item.text };
    const undone = todayAgenda.find((n) => !n.doneAt);
    if (undone) {
      return { key: ':agenda:', kind: 'auto' as const, text: `${undone.time ? `${undone.time} · ` : ''}${undone.title}` };
    }
    if (sageLine) return { key: ':sage:', kind: 'auto' as const, text: sageLine };
    if (dashReminders[0]) return { key: ':note:', kind: 'auto' as const, text: dashReminders[0].message || dashReminders[0].title };
    if (cracks.length) return { key: ':ruin:', kind: 'auto' as const, text: crackedListSentence(cracks) };
    return null;
  })();
  const peekLook = peek ? noticeLook(peek.key, peek.kind) : null;
  const minerLevel = getLevelFromXP(progress.totalXP || 0);
  const chestDone = gate.reason === 'already' || hasClaim(village, claimKey('daily', today));
  const quotasPaid = due.length > 0 && done >= due.length && !quizLocked && chestDone;
  const nightClosed = hour >= 21 && quotasPaid;

  useEffect(() => {
    if (!childUid || !nightClosed || (village.stats.nightComplete || 0) >= 1) return;
    const key = `night:${today}`;
    if (village.claimed[key]) return;
    const flight = `${childUid}:${today}`;
    if (nightInFlight.has(flight)) return;
    nightInFlight.add(flight);
    void completeNight(childUid, today).catch(() => {
      nightInFlight.delete(flight);
    });
  }, [childUid, nightClosed, today, village.claimed, village.stats.nightComplete]);

  const openDistrict = useCallback((id: string) => {
    playClick();
    if (quizGate && quizBlocksDest(id)) {
      onOpenQuiz();
      return;
    }
    if (id === 'build:arena' || id === 'arena') {
      const state = village.npcs.olheiro;
      const ctx: DialogueCtx = {
        hour,
        weekday: now.weekday,
        level: minerLevel,
        tier: state?.tier || 0,
        fullDays: village.fullDays,
        baseLevels: buildings,
        yesterday: yesterdayCtx,
        today: { done, due: due.length, quizDone: !quizLocked },
        pause: pauseDays.dates.includes(today),
        punish: lockedShop,
        firstTime: new Set(state?.lastTalkDate ? [] : ['olheiro']),
      };
      const entry = pickDialogue('olheiro', ctx, state?.seen || [], (state?.seen || []).slice(-14));
      const lines = entry?.lines?.length ? entry.lines : [VILLAGE_LINES.olheiro?.[0]?.text].filter(Boolean) as string[];
      if (lines[0]) setSpeech({ npc: 'olheiro', text: lines[0], rest: lines.slice(1) });
      if (childUid) void talkToNpc(childUid, 'olheiro', today, 0, entry?.id).catch(() => undefined);
      return;
    }
    if (lockedShop && shopBlocksDest(id)) {
      toast.error('Em punição: Mercado, Baú e Loja fechados. Prova e Mina continuam abertas.');
      return;
    }
    if (nightClosed && (id === 'market' || id === 'chest' || id === 'chest_streak')) {
      toast('Por hoje é isso. Amanhã tem mais.', { id: 'child-notice' });
      return;
    }
    const lv = (bid: BuildingId) => buildings[bid] || 0;
    if (id === 'character') { setPackTab('ficha'); setPackSlot('shirt'); setDistrict('pack'); return; }
    if (id === 'house') { setDistrict('house'); return; }
    if (id === 'mine') { setDistrict('mine'); return; }
    if (id === 'pack') { setPackTab('ficha'); setPackSlot('shirt'); setDistrict('pack'); return; }
    if (id === 'market') {
      if (broken('mercado') || lv('mercado') < 1) setLot('mercado');
      else setDistrict('market');
      return;
    }
    if (id === 'workshop') {
      if (broken('fornalha') || lv('fornalha') < 1) {
        setDistrict(null);
        setLot('fornalha');
      } else {
        setForgeTab('gear');
        setLot(null);
        setDistrict('workshop');
      }
      return;
    }
    if (id === 'npc:comerciante' && (hour >= 21 || hour < 7)) {
      toast('volta às 7h');
      return;
    }
    if (id === 'agenda') {
      if (broken('agenda') || lv('agenda') < 1) setLot('agenda');
      else setDistrict('agenda');
      return;
    }
    if (id === 'chest' || id === 'chest_streak') {
      if (!warehouseHoldsChest(liveBau, broken('bau'))) setLot('bau');
      else setDistrict('chest');
      return;
    }
    if (id.startsWith('npc:')) {
      const npc = id.slice(4) as NpcId;
      const state = village.npcs[npc];
      const ctx: DialogueCtx = {
        hour,
        weekday: now.weekday,
        level: minerLevel,
        tier: state?.tier || 0,
        fullDays: village.fullDays,
        baseLevels: buildings,
        yesterday: yesterdayCtx,
        today: { done, due: due.length, quizDone: !quizLocked },
        pause: pauseDays.dates.includes(today),
        punish: lockedShop,
        firstTime: new Set(state?.lastTalkDate ? [] : [npc]),
      };
      const entry = pickDialogue(npc, ctx, state?.seen || [], (state?.seen || []).slice(-14));
      const lines = entry?.lines?.length ? entry.lines : [VILLAGE_LINES[npc]?.[0]?.text].filter(Boolean) as string[];
      if (lines[0]) setSpeech({ npc, text: lines[0], rest: lines.slice(1) });
      if (childUid) void talkToNpc(childUid, npc, today, 0, entry?.id).catch(() => undefined);
      return;
    }
    if (id.startsWith('build:')) {
      const bid = id.slice('build:'.length);
      if (bid === 'fornalha' && furnaceOpensForge(lv('fornalha'), broken('fornalha'))) {
        setForgeTab('fire');
        setLot(null);
        setDistrict('workshop');
        return;
      }
      if (bid in BUILDING_BY_ID) setLot(bid as BuildingId);
      return;
    }
    if (id === 'reserva') {
      toast('Esse lote espera outra obra.');
      return;
    }
    // broken() deriva de village.cracks, já na lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings, hour, lockedShop, onOpenQuiz, playClick, quizGate, village.cracks, village.npcs, village.fullDays, village.claimed, today, childUid, due, done, minerLevel, pauseDays.dates, now.weekday, yesterdayCtx, quizLocked, nightClosed, liveBau]); // broken() usa village.cracks

  useEffect(() => {
    if (!buildFx) return;
    const speak = window.setTimeout(() => {
      setSpeech({ npc: 'ferreiro', text: buildLine(buildFx.id, buildFx.level) });
    }, reduced ? 0 : 420);
    const end = window.setTimeout(() => setBuildFx(null), reduced ? 200 : 1200);
    return () => {
      window.clearTimeout(speak);
      window.clearTimeout(end);
    };
  }, [buildFx, reduced]);

  useEffect(() => {
    const onRep = (ev: Event) => {
      const detail = (ev as CustomEvent<{ gold?: number; lots?: string[] }>).detail;
      const ids = (detail?.lots || []).filter(Boolean);
      if (!ids.length) return;
      playHammer();
      setRepairFx({ ids, at: performance.now() });
    };
    window.addEventListener('miner-repaired', onRep);
    return () => window.removeEventListener('miner-repaired', onRep);
  }, [playHammer]);

  useEffect(() => {
    if (!repairFx) return;
    const speak = window.setTimeout(() => {
      setSpeech({ npc: 'ferreiro', text: repairLine() });
    }, reduced ? 0 : 380);
    const end = window.setTimeout(() => setRepairFx(null), reduced ? 200 : 1100);
    return () => {
      window.clearTimeout(speak);
      window.clearTimeout(end);
    };
  }, [repairFx, reduced]);

  useEffect(() => {
    if (!childUid || repairing.current) return;
    const cracks = village.cracks || [];
    if (!cracks.length || due.length === 0 || done < due.length) return;
    repairing.current = true;
    const lots = [...cracks];
    void repairLot(childUid, addDays(today, -1))
      .then((gold) => {
        window.dispatchEvent(new CustomEvent('miner-repaired', { detail: { gold, lots } }));
        toast.success(gold > 0 ? `Lote consertado: +${gold} gold` : 'Lote consertado');
      })
      .catch(() => undefined)
      .finally(() => { repairing.current = false; });
  }, [childUid, village.cracks, done, due.length, today]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPlacaOpen(false); setDistrict(null); setLot(null); return; }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === '1') { setDistrict(null); setLot(null); setDockTab('vila'); }
      if (k === '2' || k === 'm') { setDistrict('house'); setLot(null); setDockTab('missoes'); }
      if (k === '3' || k === 'e') openDistrict('mine');
      if (k === '4' || k === 'l') openDistrict('market');
      if (k === '5' || k === 'i') openDistrict('pack');
      if (k === 'b') openDistrict('chest');
      if (k === 'a') openDistrict('agenda');
      if (k === 'o') openDistrict('workshop');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDistrict]);

  const fullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  return (
    <div className={`relative z-10 mn-village ${compactHud ? 'is-compact-hud' : ''}`}>
      <div className="mn-hud-wrap">
      <HeroHeader
        progress={progress}
        onOpenGold={() => { if (broken('cofre')) setLot('cofre'); else setDistrict('extrato'); }}
        onOpenPack={() => openDistrict('pack')}
        onOpenTower={() => { setLot(null); setDistrict('tower'); }}
        nextEventLabel={nextEventLabel}
        hour={hour}
        avatar={<CharacterPreview character={village.character} gear={village.gear} size={compactHud ? 40 : 52} />}
        subtitle={`${kidName(village.characterName)} · ${villageLabel(village.name)}`}
        fullDays={village.fullDays}
        compact={compactHud}
        crackLine={cracks.length ? crackedListSentence(cracks) : undefined}
        placaCount={placaCount}
        placaOpen={placaOpen}
        onOpenPlaca={() => setPlacaOpen((v) => !v)}
        extraButton={
          <span className="mn-fs-btn">
            <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" title="Tela cheia" onClick={() => { playClick(); fullscreen(); }}>
              <Maximize2 className="w-5 h-5" />
            </button>
          </span>
        }
      />
      {placaOpen && (
          <div className="mc-modal mc-pop mn-placa-inbox" data-testid="placa-panel" role="dialog" aria-label="Placa da Vila">
            <div className="mn-mail-head">
              <p className="mc-title mn-mail-head-title">Placa</p>
              <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={() => { playClick(); setPlacaOpen(false); }} aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            {vacationOn && vacation && (
              <MailNote icon={SUN} kicker="Férias" body={vacation.title} meta={vacation.message} />
            )}
            {lockedShop && (
              <MailNote icon={CREEPER} kicker="Punição" body="Mercado, Baú e Loja fechados." />
            )}
            <YesterdaySummary compact />
            {driftLine && (
              <MailNote icon={CLOCK} kicker="Relógio" body={driftLine} />
            )}
            {todayAgenda.map((item) => (
              <MailNote
                key={item.id + item.date}
                icon={CLOCK}
                kicker="Hoje"
                body={`${item.time ? `${item.time} · ` : ''}${item.title}`}
                action={!item.doneAt && childUid ? (
                  <button type="button" className={`mc-btn mc-btn-green min-h-[36px] px-2 shrink-0 ${agendaFlash === item.id ? 'mc-pop' : ''}`} onClick={() => {
                    playClick();
                    void markAgendaDone(childUid, item.id).then((xp) => {
                      toast.success(xp >= 10 ? '+10 XP, planejou com antecedência' : '+5 XP');
                      setAgendaFlash(null);
                    }).catch((e) => toast.error(e instanceof Error ? e.message : 'Não deu certo'));
                  }}>Feito</button>
                ) : undefined}
              />
            ))}
            {tomorrowAgenda.length > 0 && (
              <MailNote icon={CLOCK} kicker="Amanhã" body={tomorrowAgenda.map((i) => i.title).join(', ')} />
            )}
            {board.map((item) => {
              const look = noticeLook(item.key, item.kind);
              return (
                <MailNote
                  key={item.key}
                  icon={look.icon}
                  kicker={look.kicker}
                  body={item.text}
                  action={item.kind === 'father' ? (
                    <button type="button" className="mc-btn mc-btn-green min-h-[36px] px-2 shrink-0" onClick={() => { playClick(); void ackNotice(item.key.replace('father:', '')); }}>Combinado</button>
                  ) : undefined}
                />
              );
            })}
            {sageLine && (
              <MailNote icon={BOOK} kicker="Sábio" body={sageLine} />
            )}
            {dashReminders.map((item) => (
              <MailNote key={item.id} icon={TORCH} kicker={item.title} body={item.message} />
            ))}
            {placaCount === 0 ? (
              <MailNote icon={LETTER} body="A placa está limpa hoje." meta={habitLine.text || undefined} />
            ) : null}
          </div>
      )}
      {!placaOpen && peek && peekLook && (
        <button
          type="button"
          className="mc-card mc-pop mn-mail-toast"
          data-testid="placa-peek"
          onClick={() => { playClick(); setPlacaOpen(true); }}
        >
          <img src={peekLook.icon} alt="" className="mn-mail-toast-ico mc-pixel" draggable={false} />
          <span className="mn-mail-toast-copy">
            <span className="mn-mail-toast-kicker">{peekLook.kicker}</span>
            <span className="mn-mail-toast-body">{peek.text}</span>
          </span>
        </button>
      )}
      </div>
      <div className="mn-village-main">
      <div className="mn-stage mt-2">
        <VillageScene
          village={village}
          buildings={buildings}
          hour={hour}
          gated={quizGate}
          reducedMotion={reduced}
          speech={speech}
          onClickSpot={openDistrict}
          onDismissSpeech={dismissSpeech}
          frozen={Boolean(district || lot)}
          houseSmoke={due.length > 0 && done >= due.length}
          buildFx={buildFx ? { id: buildFx.id, at: buildFx.at } : null}
          repairFx={repairFx}
          date={today}
          event={sceneEvent}
          chestLook={chestLook}
        />
        {speech && (
          <button type="button" className="mc-btn mc-btn-wood min-h-[44px] px-3 mn-speech-next" onClick={dismissSpeech}>Continuar</button>
        )}
      </div>
      </div>

      <footer className="mn-dock">
        <div className="mn-dock-inner">
          <div className="mn-dock-meta">
            <span className="mc-num text-white">{done}/{due.length}</span>
            <span className="text-sm">{turnFull ? 'Dia completo, Baú aberto' : due.length > 0 && done >= due.length ? 'Missões feitas' : 'Ainda tem missão'}</span>
        <span className="text-sm mc-muted">
          {gate.ok ? `Baú: ${economy.dailyChestGold[0]} + ${village.fullDays} tochas = ${Math.min(economy.dailyChestGold[1], economy.dailyChestGold[0] + village.fullDays)} gold` : gate.reason === 'warehouse' ? 'Baú: construa o Armazém' : gate.reason === 'already' ? 'Baú: aberto' : (chestWaitCopy({
            due: due.length,
            done,
            hourBrazil: hour,
            chestOpenHour: economy.chestOpenHour,
          }) || 'O baú ainda está fechado.')}
        </span>
            <div className="mn-dock-mats">
              {(Object.keys(MATERIAL_LABELS) as Array<keyof typeof MATERIAL_LABELS>).map((m) => (
                <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
                  <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
                  <span className="mc-num text-white">{materials[m] || 0}</span>
                </span>
              ))}
            </div>
            <div className="mn-dock-extras">
              {(() => {
                const next = due.find((t) => {
                  const full = tasks.find((x) => x.id === t.id);
                  return !(full?.status === 'done' && full.lastCompletedDate === today);
                });
                const full = next ? tasks.find((x) => x.id === next.id) : undefined;
                if (!full) return null;
                const open = periodAllowedAt(full.period, hour, economy);
                const abre = full.period === 'afternoon' ? economy.periodStartHours.afternoon : economy.periodStartHours.evening;
                return (
                  <>
                    <span className="text-sm truncate max-w-[10rem]">{full.title}</span>
                    {open ? (
                      <button
                        type="button"
                        className="mc-btn mc-btn-wood min-h-[44px] px-3"
                        onClick={() => { playClick(); setDistrict('house'); setLot(null); setDockTab('missoes'); }}
                      >
                        Casa
                      </button>
                    ) : (
                      <span className="text-sm mc-muted">às {abre}h</span>
                    )}
                  </>
                );
              })()}
              {gate.ok && (
                <button type="button" className="mc-btn mc-btn-gold min-h-[44px] px-3" onClick={() => openDistrict('chest')}>Baú</button>
              )}
            </div>
          </div>
          <nav className="mc-hotbar mn-dock-nav">
            {([
              ['Vila', 'vila', () => { setDistrict(null); setLot(null); setDockTab('vila'); }],
              ['Missões', 'missoes', () => { setDistrict('house'); setLot(null); setDockTab('missoes'); }],
              ['Mina', 'mine', () => openDistrict('mine')],
              ['Mercado', 'market', () => openDistrict('market')],
              ['Mochila', 'pack', () => openDistrict('pack')],
            ] as Array<[string, string, () => void]>).map(([label, id, fn]) => {
              const on = id === 'vila'
                ? !district && !lot && dockTab !== 'missoes'
                : id === 'missoes'
                  ? district === 'house'
                  : district === id;
              const locked = quizGate && quizBlocksDest(id);
              return (
                <button
                  key={label}
                  type="button"
                  data-testid={`hotbar-${id}`}
                  title={locked ? 'Faça a prova do dia' : undefined}
                  className={`mc-slot rounded px-3 min-h-[44px] flex items-center gap-1 ${on ? 'mc-slot-selected is-on' : ''} ${locked ? 'is-lock' : ''}`}
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
          onOpenMine={() => { setLot(null); openDistrict('mine'); }}
          onOpenTower={() => { setLot(null); setDistrict('tower'); }}
          onOpenWorkshop={(tab?: ForgeTab) => {
            if (visibleCracks(village.cracks).includes('fornalha') || (buildings.fornalha || 0) < 1) {
              setDistrict(null);
              setLot('fornalha');
              return;
            }
            setForgeTab(tab || 'gear');
            setLot(null);
            setDistrict('workshop');
          }}
          onOpenQuiz={() => { setLot(null); onOpenQuiz(); }}
          onOpenBank={() => { setLot(null); setDistrict('bank'); }}
          onOpenAgenda={() => { setLot(null); openDistrict('agenda'); }}
          onOpenMarket={() => { setLot(null); openDistrict('market'); }}
          onCreateGoal={(title, gold, rewardId) => {
            setGoalPreset({ title, targetGold: gold, rewardId });
            if ((buildings.cofre || 0) < 1) {
              setLot('cofre');
              toast('Constrói o Cofre. Aí o gold tem onde esperar.');
              return;
            }
            setLot(null);
            setDistrict('bank');
          }}
          shopLocked={lockedShop}
          onBuilt={(id, newLevel) => {
            setLot(null);
            setDistrict(null);
            playHammer();
            setBuildFx({ id, level: newLevel, at: performance.now() });
            setSceneEvent({ kind: 'build', at: performance.now(), lot: id });
            if (childUid) void settleAfter(childUid, 'ferreiro');
          }}
        />
      )}
      {district === 'chest' && (
        <DailyChest
          hour={hour}
          onClose={() => setDistrict(null)}
        />
      )}
      {district === 'workshop' && (
        <Oficina
          initialTab={forgeTab}
          onClose={() => setDistrict(null)}
          onOpenPack={() => { setPackTab('ficha'); setPackSlot('pickaxe'); setDistrict('pack'); }}
          onOpenLot={(bid) => { setDistrict(null); setLot(bid as BuildingId); }}
        />
      )}
      {district === 'market' && (
        <Mercado
          onClose={() => setDistrict(null)}
          onOpenRewards={() => openDistrict('market')}
          onCreateGoal={(title, gold, rewardId) => {
            setGoalPreset({ title, targetGold: gold, rewardId });
            if ((buildings.cofre || 0) < 1) {
              setDistrict(null);
              setLot('cofre');
              toast('Constrói o Cofre. Aí o gold tem onde esperar.');
              return;
            }
            setDistrict('bank');
          }}
          onOpenPack={() => openDistrict('pack')}
        />
      )}
      {district === 'pack' ? <Mochila startTab={packTab} startSlot={packSlot} onClose={() => setDistrict(null)} onOpenWorkshop={() => openDistrict('workshop')} onOpenMarket={() => openDistrict('market')} /> : null}
      {district === 'mine' && (
        <EnglishBase
          onClose={() => setDistrict(null)}
          onOpenLot={(id) => { setDistrict(null); setLot(id); }}
        />
      )}
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
          onOpenChest={() => openDistrict('chest')}
          agendaItems={agendaItems}
        />
      )}
      {district === 'tower' && <Torre onClose={() => setDistrict(null)} />}
    </div>
  );
};

export default VillageHome;
