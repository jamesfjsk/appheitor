import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { useAuth } from '../../../contexts/AuthContext';
import { houseSprite, houseTitle } from '../../../config/village';
import type { AgendaItem, DailyCheckinAnswers, DayMood, Period } from '../../../types/village';
import DailyChecklist from '../DailyChecklist';
import CharacterPreview from './CharacterPreview';
import ChildSheet from './ChildSheet';
import { dayTimeline, occurrencesBetween } from '../../../services/village/agenda';
import { markAgendaDone } from '../../../services/agendaService';
import { addDays, getTodayBrazil, isNightHour } from '../../../utils/clock';
import { savePlan, submitCheckin } from '../../../services/villageService';
import { subscribePlan } from '../../../services/englishBaseService';
import { FirestoreService } from '../../../services/firestoreService';
import { getDailyQuiz } from '../../../services/dailyQuizService';
import { hasClaim, claimKey } from '../../../services/village/claims';

const MOON = '/assets/english/ui/moon.webp';
const LANTERN = '/assets/village/items/lantern.png';
const CHEST = '/assets/village/buildings/bau-1.png';
const TORCH = '/assets/english/ui/torch.webp';
const BOOK = '/assets/english/ui/book.webp';
const GOLD = '/assets/english/ui/gold.webp';
const MOOD = {
  bom: '/assets/village/ui/mood-bom.png',
  normal: '/assets/village/ui/mood-normal.png',
  dificil: '/assets/village/ui/mood-dificil.png',
} as const;

type Tab = 'missoes' | 'fechar';

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
  const { village } = useVillage();
  const { tasks } = useData();
  const { childUid } = useAuth();
  const { playClick } = useSound();
  const [tab, setTab] = useState<Tab>('missoes');
  const [lineOpen, setLineOpen] = useState(false);
  const [check, setCheck] = useState<DailyCheckinAnswers>({ tomorrow: '' });
  const [closed, setClosed] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [quizLine, setQuizLine] = useState('ainda não');
  const [tomorrowTheme, setTomorrowTheme] = useState('');
  const [goldToday, setGoldToday] = useState(0);
  const [mineToday, setMineToday] = useState('—');
  const night = isNightHour(hour);
  const allDone = due > 0 && done >= due;
  const name = village.characterName || 'Heitor';
  const title = houseTitle(village.season);
  const src = houseSprite(village.season);
  const today = getTodayBrazil();
  const line = dayTimeline(agendaItems, tasks, village.plan, today);
  const tomorrow = occurrencesBetween(agendaItems, addDays(today, 1), addDays(today, 1));
  const focusId = village.plan.date === today ? village.plan.focusTaskId : null;
  const closeAllowed = hour >= 20 || Boolean(chestReady);
  const closeWhy = closed
    ? 'Dia fechado'
    : !closeAllowed
      ? 'Abre às 20h ou depois do Baú'
      : !check.mood
        ? 'Escolha como foi o dia'
        : check.tomorrow.trim().split(/\s+/).filter(Boolean).length < 3
          ? 'Escreva o amanhã em 3 palavras'
          : 'Fechar o dia';

  useEffect(() => {
    if (!childUid) return;
    void FirestoreService.getDailyProgress(childUid, today).then((d) => {
      if (d?.checkin) {
        setClosed(true);
        setCheck({
          mood: d.checkin.mood,
          tomorrow: d.checkin.tomorrow,
        });
      }
      setGoldToday(d?.goldEarned || 0);
    });
    void getDailyQuiz(childUid, today).then((q) => {
      if (q?.completed) setQuizLine(`nota ${q.score ?? 0} de ${q.totalQuestions || q.questions.length || 0}`);
      else setQuizLine('ainda não');
    }).catch(() => undefined);
    void getDailyQuiz(childUid, addDays(today, 1)).then((q) => {
      setTomorrowTheme(q?.theme?.title || '');
    }).catch(() => undefined);
    return subscribePlan(childUid, today, (p) => {
      if (!p || p.order.length === 0) {
        setMineToday('—');
        return;
      }
      const n = p.order.filter((id) => p.contracts[id]?.status === 'done').length;
      setMineToday(`${n}/${p.order.length}`);
    });
  }, [childUid, today]);

  const setFocus = async (id: string) => {
    if (!childUid) return;
    playClick();
    try {
      await savePlan(childUid, { date: today, order: [], focusTaskId: id });
      toast.success('Missão-foco: material em dobro');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para marcar o foco');
    }
  };

  const closeDay = async () => {
    if (!childUid || closeBusy || closed || !closeAllowed) return;
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

  const header = (
    <div className="mn-casa-hero">
      <img src={src} alt="" className="mn-casa-sprite mc-pixel" draggable={false} />
      <CharacterPreview character={village.character} gear={village.gear} size={72} />
      <div className="min-w-0 flex-1">
        <h2 className="mc-h">
          <img src={src} alt="" className="mc-pixel" draggable={false} />
          Casa do Minerador
        </h2>
        <p className="text-sm mt-1">
          {title} de {name}. {allDone ? 'A chaminé está acesa: o dia foi feito.' : 'Aqui moram as missões do dia.'}
        </p>
        <p className="mc-num text-white mt-2">{done}/{due} hoje</p>
      </div>
      <span className={`mn-casa-window ${night ? '' : 'is-day'}`} aria-hidden />
      <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar">
        <X />
      </button>
    </div>
  );

  const tabs = (
    <div className="mc-hotbar px-4 pt-3">
      {([
        ['missoes', 'Missões', src],
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
  );

  const footer = tab === 'fechar' ? (
    <button
      type="button"
      data-testid="fechar-dia-btn"
      className="mc-btn mc-btn-gold min-h-[44px] w-full px-4"
      disabled={closeBusy || closed || !childUid || !closeAllowed || !check.mood || check.tomorrow.trim().split(/\s+/).filter(Boolean).length < 3}
      onClick={() => { playClick(); void closeDay(); }}
    >
      {closeWhy}
    </button>
  ) : null;

  return (
    <ChildSheet onClose={onClose} header={header} tabs={tabs} footer={footer} wide="xl" className="mn-casa">
      <div className="mn-casa-hearth" aria-hidden />
      <div className="p-4 space-y-3">
        {tab === 'missoes' && (
          <>
            {chestReady && onOpenChest && (
              <button
                type="button"
                className="mc-btn mc-btn-gold min-h-[44px] px-4"
                onClick={() => { playClick(); onOpenChest(); }}
              >
                <img src={CHEST} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                Baú do Dia
              </button>
            )}
            <DailyChecklist
              tasks={tasks}
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
              guidedMode={guidedMode}
              onToggleGuidedMode={onToggleGuidedMode}
              focusTaskId={focusId}
              onSetFocus={(id) => void setFocus(id)}
            />
            {line.length > 0 && (
              <div className="mc-card p-3 space-y-2">
                <button type="button" className="text-sm font-bold w-full text-left" onClick={() => { playClick(); setLineOpen((v) => !v); }}>
                  {lineOpen ? 'Esconder a linha do dia' : 'Ver a linha do dia'}
                </button>
                {lineOpen && line.map((row) => (
                  <div key={row.id} className="flex justify-between items-center gap-2">
                    <p className="text-sm">
                      {row.time || (row.period === 'morning' ? 'Manhã' : row.period === 'afternoon' ? 'Tarde' : row.period === 'evening' ? 'Noite' : '')}
                      {' · '}{row.title}
                    </p>
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
          </>
        )}
        {tab === 'fechar' && (
          <div className="mn-casa-sheet p-4 space-y-3">
            <h3 className="mc-h">
              <img src={LANTERN} alt="" className="mc-pixel" draggable={false} />
              O dia em números
            </h3>
            <div className="mc-row rounded p-2 flex items-center gap-2">
              <img src={TORCH} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
              <span className="text-sm">Missões {done} de {due}{allDone ? ' · tocha acesa' : ''}</span>
            </div>
            <div className="mc-row rounded p-2 flex items-center gap-2">
              <img src={BOOK} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
              <span className="text-sm">Prova: {quizLine}</span>
            </div>
            <div className="mc-row rounded p-2 flex items-center gap-2">
              <span className="text-sm">Mina: {mineToday}</span>
            </div>
            <div className="mc-row rounded p-2 flex items-center gap-2">
              <img src={GOLD} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
              <span className="text-sm">Gold de hoje: {goldToday}</span>
            </div>
            <div className="mc-row rounded p-2 flex items-center gap-2">
              <img src={CHEST} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
              <span className="text-sm">Baú: {hasClaim(village, claimKey('daily', today)) ? 'aberto' : 'abre às 18h'}</span>
            </div>

            {closed ? (
              <div className="mc-card p-3 space-y-1">
                <p className="text-sm mc-good">Dia fechado</p>
                {check.mood && (
                  <p className="text-sm flex items-center gap-2">
                    <img src={MOOD[check.mood]} alt="" className="w-8 h-8 mc-pixel" />
                    {check.mood === 'bom' ? 'Foi bom' : check.mood === 'normal' ? 'Normal' : 'Difícil'}
                  </p>
                )}
                {check.tomorrow && <p className="text-sm">Amanhã eu {check.tomorrow}</p>}
              </div>
            ) : (
              <>
                <p className="text-sm font-bold">Como foi o dia?</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['bom', 'Foi bom'],
                    ['normal', 'Normal'],
                    ['dificil', 'Difícil'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`mc-btn mn-mood-btn flex flex-col items-center gap-1 px-2 ${check.mood === id ? 'mc-btn-gold' : 'mc-btn-dark'}`}
                      onClick={() => { playClick(); setCheck((c) => ({ ...c, mood: id as DayMood })); }}
                    >
                      <img src={MOOD[id]} alt="" draggable={false} />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
                <label className="block text-sm">
                  Amanhã eu...
                  <input
                    value={check.tomorrow}
                    maxLength={80}
                    onChange={(e) => setCheck((c) => ({ ...c, tomorrow: e.target.value }))}
                    className="mc-slot w-full mt-1 px-3 py-2 text-white"
                    placeholder="três palavras no mínimo"
                  />
                </label>
              </>
            )}
            {tomorrow.length > 0 && (
              <p className="text-sm">Amanhã você tem: {tomorrow.map((i) => i.title).join(', ')}</p>
            )}
            {tomorrowTheme && (
              <p className="text-sm">Amanhã a prova é sobre {tomorrowTheme}</p>
            )}
          </div>
        )}
      </div>
    </ChildSheet>
  );
};

export default Casa;
