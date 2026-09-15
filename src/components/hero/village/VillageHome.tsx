import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { getTodayBrazil } from '../../../utils/timezone';
import { DISTRICT_ICONS, HOTBAR_ICONS } from '../../../config/village';
import { BUILDING_BY_ID, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import { dueTasksOn } from '../../../services/village/schedule';
import { chestAllowed } from '../../../services/village/chest';
import { noticesForNow, habitTipForNow, pickLine } from '../../../services/village/notices';
import { CHILD_BIRTHDAY_MMDD } from '../../../config/rules';
import { VILLAGE_LINES } from '../../../data/villageLines';
import { HABIT_LINES } from '../../../data/habitLines';
import HeroHeader from '../HeroHeader';
import DailyChecklist from '../DailyChecklist';
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
import type { BuildingId } from '../../../types/english';
import type { Period } from '../../../types/village';
import BuildingCard from './BuildingCard';

type District = 'mine' | 'library' | 'workshop' | 'market' | 'tower' | 'map' | 'timer' | 'chest' | 'editor' | null;

interface Props {
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
  guidedMode: boolean;
  onToggleGuidedMode: () => void;
  onOpenRewards: () => void;
  onOpenCalendar: () => void;
  onOpenTimer: () => void;
  onOpenQuiz: () => void;
  quizLocked: boolean;
}

function brazilHour(): number {
  if (import.meta.env.DEV) {
    // Só quando ?h= está na URL: Number(null) é 0 e fazia a Vila ficar sempre de noite em desenvolvimento
    const raw = new URLSearchParams(window.location.search).get('h');
    if (raw !== null && raw !== '') {
      const h = Number(raw);
      if (Number.isFinite(h) && h >= 0 && h < 24) return h;
    }
  }
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()));
}

const VillageHome: React.FC<Props> = ({
  selectedPeriod, onPeriodChange, guidedMode, onToggleGuidedMode,
  onOpenRewards, onOpenCalendar, onOpenTimer, onOpenQuiz, quizLocked,
}) => {
  const { village, materials, buildings, economy, pauseDays, notices, ackNotice } = useVillage();
  const { tasks, progress } = useData();
  const { playClick } = useSound();
  const [hour, setHour] = useState(brazilHour);
  const [district, setDistrict] = useState<District>(null);
  const [lot, setLot] = useState<BuildingId | null>(null);
  const [speech, setSpeech] = useState<{ npc: string; text: string } | null>(null);
  const dismissSpeech = useCallback(() => setSpeech(null), []);
  const today = getTodayBrazil();
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const t = setInterval(() => setHour(brazilHour()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDistrict(null); setLot(null); return; }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'm') { setDistrict(null); setLot(null); }
      if (k === 'b') setDistrict('chest');
      if (k === 'e') { if (quizLocked) onOpenQuiz(); else setDistrict('mine'); }
      if (k === 'o') { if (quizLocked) onOpenQuiz(); else setDistrict('workshop'); }
      if (k === 'l') { if (quizLocked) onOpenQuiz(); else setDistrict('market'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quizLocked, onOpenQuiz]);

  useEffect(() => {
    if (!district && !lot) return;
    window.history.pushState({ villageModal: true }, '');
    const onPop = () => { setDistrict(null); setLot(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [district, lot]);

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
  const turnMin = done >= Math.min(due.length, 1) && !quizLocked;
  const turnFull = due.length > 0 && done >= due.length && gate.reason === 'already';

  const openDistrict = (id: string) => {
    playClick();
    if (id === 'character') { setDistrict('editor'); return; }
    if (id === 'mine') {
      if (quizLocked) onOpenQuiz();
      else setDistrict('mine');
      return;
    }
    if (id.startsWith('npc:')) {
      const npc = id.slice(4) as keyof typeof VILLAGE_LINES;
      const lines = VILLAGE_LINES[npc];
      if (!lines?.length) return;
      const text = npc === 'sabio' && quizLocked
        ? lines[0].text
        : lines[Math.abs(hour) % lines.length].text;
      setSpeech({ npc, text });
      return;
    }
    if (id === 'build:cofre') {
      setSpeech({ npc: 'sabio', text: 'O Cofre da Vila ainda está sendo cavado. Em breve você guarda gold aqui.' });
      return;
    }
    if (id.startsWith('build:')) {
      if (quizLocked) onOpenQuiz();
      else {
        const bid = id.slice('build:'.length);
        if (bid in BUILDING_BY_ID) setLot(bid as BuildingId);
      }
      return;
    }
  };

  const fullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-2 pb-28">
      <HeroHeader
        progress={progress}
        onOpenRewards={onOpenRewards}
        onOpenCalendar={onOpenCalendar}
        onOpenTimer={onOpenTimer}
        hour={hour}
        avatar={<CharacterPreview character={village.character} gear={village.gear} size={52} />}
        subtitle={`${village.characterName} · ${village.name}`}
        fullDays={village.fullDays}
        extraButton={
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" title="Tela cheia" onClick={() => { playClick(); fullscreen(); }}>
            <Maximize2 className="w-5 h-5" />
          </button>
        }
      />
      <VacationBanner />
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
        />
        {(ticker || habitLine.text) && (
          <div className="mn-ticker">
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
      <div className="mn-status mc-panel rounded-lg px-3 py-2 mt-2">
        <span className="mc-num text-white">{done}/{due.length}</span>
        <span className="text-sm">{turnFull ? 'Turno completo' : turnMin ? 'Turno mínimo' : 'Turno em andamento'}</span>
        <span className="text-sm mc-muted">
          Baú: {gate.ok ? 'pronto' : gate.reason === 'already' ? 'aberto' : gate.reason === 'hour' ? `abre às ${economy.chestOpenHour}h` : 'faltam missões'}
        </span>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(MATERIAL_LABELS) as Array<keyof typeof MATERIAL_LABELS>).map((m) => (
            <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
              <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
              <span className="mc-num text-white">{materials[m] || 0}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 ml-auto">
          {([
            ['chest', 'Baú do Dia', () => setDistrict('chest')],
            ['library', 'Biblioteca', () => onOpenQuiz()],
            ['tower', 'Torre', () => setDistrict('tower')],
          ] as const).map(([id, label, fn]) => {
            const locked = quizLocked && (id === 'chest' || id === 'library');
            return (
              <button
                key={id}
                type="button"
                className="mc-btn mc-btn-dark min-h-[44px] px-3"
                onClick={() => { playClick(); fn(); }}
              >
                {DISTRICT_ICONS[id] && (
                  <img
                    src={DISTRICT_ICONS[id]}
                    alt=""
                    className="w-5 h-5 mc-pixel"
                    style={locked ? { filter: 'grayscale(1) brightness(0.5)' } : undefined}
                    draggable={false}
                  />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <ProgressBar progress={progress} compact />
      <div id="vila-missoes" className="mt-3 scroll-mt-24">
      <DailyChecklist
        tasks={tasks}
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        guidedMode={guidedMode}
        onToggleGuidedMode={onToggleGuidedMode}
      />
      </div>

      <nav className="mc-hotbar fixed bottom-0 inset-x-0 z-30 justify-center py-2 bg-[#2f2a27]/95">
        {([
          ['Vila', () => { setDistrict(null); setLot(null); }],
          ['Missões', () => document.getElementById('vila-missoes')?.scrollIntoView({ behavior: 'smooth' })],
          ['Mina', () => (quizLocked ? onOpenQuiz() : setDistrict('mine'))],
          ['Oficina', () => (quizLocked ? onOpenQuiz() : setDistrict('workshop'))],
          ['Mercado', () => (quizLocked ? onOpenQuiz() : setDistrict('market'))],
        ] as Array<[string, () => void]>).map(([label, fn]) => (
          <button key={label} type="button" className="mc-slot rounded px-3 min-h-[44px] flex items-center gap-1" onClick={() => { playClick(); fn(); }}>
            {HOTBAR_ICONS[label] && <img src={HOTBAR_ICONS[label]} alt="" className="w-5 h-5 mc-pixel" draggable={false} />}
            {label}
          </button>
        ))}
      </nav>

      {lot && (
        <BuildingCard
          id={lot}
          onClose={() => setLot(null)}
          onOpenMine={() => { setLot(null); if (quizLocked) onOpenQuiz(); else setDistrict('mine'); }}
          onOpenChest={() => { setLot(null); setDistrict('chest'); }}
          onOpenTower={() => { setLot(null); setDistrict('tower'); }}
          onOpenWorkshop={() => { setLot(null); setDistrict('workshop'); }}
          onOpenQuiz={() => { setLot(null); onOpenQuiz(); }}
        />
      )}
      {district === 'chest' && <DailyChest hour={hour} onClose={() => setDistrict(null)} />}
      {district === 'workshop' && <Oficina onClose={() => setDistrict(null)} />}
      {district === 'market' && <Mercado onClose={() => setDistrict(null)} onOpenRewards={onOpenRewards} />}
      {district === 'editor' && <CharacterEditor onClose={() => setDistrict(null)} onBuy={() => setDistrict('market')} />}
      {district === 'mine' && <EnglishBase onClose={() => setDistrict(null)} />}
      {district === 'tower' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setDistrict(null)}>
          <div className="max-w-lg w-full mc-modal rounded-lg p-3" onClick={(e) => e.stopPropagation()}><AchievementsBadges /></div>
        </div>
      )}
    </div>
  );
};

export default VillageHome;
