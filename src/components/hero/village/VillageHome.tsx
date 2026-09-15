import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { getTodayBrazil } from '../../../utils/timezone';
import { DISTRICT_ICONS, DISTRICT_LABELS, HOTBAR_ICONS, NPC_PORTRAIT } from '../../../config/village';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
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
import type { Period } from '../../../types/village';

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
    const h = Number(new URLSearchParams(window.location.search).get('h'));
    if (Number.isFinite(h) && h >= 0 && h < 24) return h;
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
  const [speech, setSpeech] = useState<string | null>(null);
  const today = getTodayBrazil();
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const t = setInterval(() => setHour(brazilHour()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDistrict(null); return; }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'm') setDistrict(null);
      if (k === 'b') setDistrict('chest');
      if (k === 'e') { if (quizLocked) onOpenQuiz(); else setDistrict('mine'); }
      if (k === 'o') { if (quizLocked) onOpenQuiz(); else setDistrict('workshop'); }
      if (k === 'l') { if (quizLocked) onOpenQuiz(); else setDistrict('market'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quizLocked, onOpenQuiz]);

  useEffect(() => {
    if (!district) return;
    window.history.pushState({ villageModal: true }, '');
    const onPop = () => setDistrict(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [district]);

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
  const turnMin = done >= Math.min(due.length, 1) && !quizLocked;
  const turnFull = due.length > 0 && done >= due.length && gate.reason === 'already';

  const openDistrict = (id: string) => {
    playClick();
    if (id === 'character') { setDistrict('editor'); return; }
    if (id.startsWith('npc:sabio')) {
      setSpeech(quizLocked ? VILLAGE_LINES.sabio[0].text : VILLAGE_LINES.sabio[1].text);
      return;
    }
    if (id.startsWith('npc:comerciante')) {
      setSpeech(VILLAGE_LINES.comerciante[hour % 3].text);
      return;
    }
    if (id.startsWith('build:')) {
      if (quizLocked) onOpenQuiz();
      else setDistrict('workshop');
      return;
    }
  };

  const fullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-4 pb-24">
      <HeroHeader
        progress={progress}
        onOpenRewards={onOpenRewards}
        onOpenCalendar={onOpenCalendar}
        onOpenTimer={onOpenTimer}
        avatar={<CharacterPreview character={village.character} gear={village.gear} size={64} />}
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
      <div className="mc-inv rounded-lg p-3 mt-4">
        {board.slice(0, 3).map((item) => (
          <div key={item.key} className="mc-row rounded px-3 py-2 mb-2 flex justify-between gap-2">
            <p className="text-sm">{item.text}</p>
            {item.kind === 'father' && (
              <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3" onClick={() => void ackNotice(item.key.replace('father:', ''))}>Combinado</button>
            )}
          </div>
        ))}
        <div className="mc-row rounded px-3 py-2 flex items-center gap-3">
          <img src={NPC_PORTRAIT[habit.npc]} alt="" className="w-10 h-10 mc-pixel" />
          <div>
            <p className="mc-lbl">Dica do turno</p>
            <p className="text-sm">{habitLine.text}</p>
          </div>
        </div>
      </div>
      <VillageScene village={village} buildings={buildings} hour={hour} gated={quizLocked} reducedMotion={reduced} onClickSpot={openDistrict} />
      {speech && (
        <div className="mc-card p-3 mt-2 text-white flex justify-between">
          <p>{speech}</p>
          <button type="button" className="mc-btn mc-btn-dark px-3" onClick={() => setSpeech(null)}>Ok</button>
        </div>
      )}
      <div className="mc-inv rounded-lg p-4 mt-4">
        <p className="mc-h mb-2">Hoje</p>
        <p className="text-sm">{turnFull ? 'Turno completo' : turnMin ? 'Turno mínimo' : 'Turno em andamento'}</p>
        <p className="mc-lbl mt-2">{done}/{due.length} missões</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {(Object.keys(MATERIAL_LABELS) as Array<keyof typeof MATERIAL_LABELS>).map((m) => (
            <span key={m} className="mc-chip mc-slot px-2 py-1 flex items-center gap-1">
              <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 mc-pixel" />
              <span className="mc-num text-white">{materials[m] || 0}</span>
              <span className="mc-chip-l">{MATERIAL_LABELS[m]}</span>
            </span>
          ))}
          <span className="mc-chip mc-slot px-2 py-1"><span className="mc-num mc-diamond">{village.rare.diamante}</span> <span className="mc-chip-l">diamante</span></span>
          <span className="mc-chip mc-slot px-2 py-1"><span className="mc-num mc-good">{village.rare.esmeralda}</span> <span className="mc-chip-l">esmeralda</span></span>
        </div>
        <p className="text-sm mt-2">Baú do Dia: {gate.ok ? 'Pronto' : gate.reason === 'already' ? 'Aberto' : gate.reason === 'hour' ? `Abre às ${economy.chestOpenHour}h` : `Faltam missões`}</p>
      </div>
      <ProgressBar progress={progress} />
      <div id="vila-missoes">
      <DailyChecklist
        tasks={tasks}
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        guidedMode={guidedMode}
        onToggleGuidedMode={onToggleGuidedMode}
      />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {([
          ['mine', 'Mina'],
          ['library', 'Biblioteca'],
          ['workshop', 'Oficina'],
          ['market', 'Mercado'],
          ['tower', 'Torre'],
          ['map', 'Mapa'],
          ['timer', 'Ampulheta'],
          ['chest', 'Baú do Dia'],
        ] as const).map(([id, label]) => {
          const locked = quizLocked && (id === 'mine' || id === 'workshop' || id === 'market' || id === 'chest');
          const icon = DISTRICT_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              className="mc-card mc-card-hover rounded-lg p-3 text-left text-white"
              onClick={() => {
                playClick();
                if (locked || id === 'library') { onOpenQuiz(); return; }
                if (id === 'map') { onOpenCalendar(); return; }
                if (id === 'timer') { onOpenTimer(); return; }
                setDistrict(id);
              }}
            >
              <div className="flex items-center gap-2">
                {icon && (
                  <img
                    src={icon}
                    alt=""
                    className="w-8 h-8 mc-pixel"
                    style={locked ? { filter: 'grayscale(1) brightness(0.5)' } : undefined}
                    draggable={false}
                  />
                )}
                <div>
                  <p className="font-bold">{DISTRICT_LABELS[id] || label}</p>
                  {locked && <p className="text-xs mc-muted">Faça a prova do dia</p>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <nav className="mc-hotbar fixed bottom-0 inset-x-0 z-30 justify-center py-2 bg-[#2f2a27]/95">
        {([
          ['Vila', () => setDistrict(null)],
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

      {district === 'chest' && <DailyChest hour={hour} onClose={() => setDistrict(null)} />}
      {district === 'workshop' && <Oficina onClose={() => setDistrict(null)} />}
      {district === 'market' && <Mercado onClose={() => setDistrict(null)} onOpenRewards={onOpenRewards} />}
      {district === 'editor' && <CharacterEditor onClose={() => setDistrict(null)} onBuy={() => setDistrict('market')} />}
      {district === 'mine' && <EnglishBase onClose={() => setDistrict(null)} />}
      {district === 'tower' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setDistrict(null)}>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}><AchievementsBadges /></div>
        </div>
      )}
    </div>
  );
};

export default VillageHome;
