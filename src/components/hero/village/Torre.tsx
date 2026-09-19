import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSound } from '../../../contexts/SoundContext';
import { GAME_ACHIEVEMENTS } from '../../../data/achievements';
import { almostThere, progressOf, visibleAchievements } from '../../../services/village/achievements';
import { claimTrophy, seeAchievements } from '../../../services/villageService';
import { getLearning } from '../../../services/learningService';
import type { GameAchievement, LearningDoc, NpcId } from '../../../types/village';
import { FRIEND_TIER_NAME } from '../../../types/village';
import { isoWeekOf, weekRangeLabel, weekdayOf } from '../../../utils/clock';
import { useClock } from '../../../contexts/ClockContext';
import AchievementsBadges from '../AchievementsBadges';
import { NPC_QUESTS } from '../../../data/npcQuests';
import { getLevelFromXP } from '../../../utils/levelSystem';
import { liveBuildingLevel } from '../../../services/village/repair';
import { itemFrame } from '../../../config/items';
import type { ItemRarity } from '../../../types/items';
import { NPC_LABEL } from '../../../config/village';
import { buildLine, VILLAGE_LINES } from '../../../data/villageLines';
import ChildSheet from './ChildSheet';

type Tab = 'conquistas' | 'vida' | 'recordes' | 'trofeus' | 'mapa' | 'historias';

const TABS: Array<[Tab, string, number]> = [
  ['conquistas', 'Conquistas', 0],
  ['vida', 'Vida real', 1],
  ['recordes', 'Recordes', 2],
  ['trofeus', 'Troféus', 2],
  ['mapa', 'Mapa', 3],
  ['historias', 'Histórias', 3],
];

const CAT: Array<[string, string]> = [
  ['rotina', 'Rotina'],
  ['obras', 'Obras'],
  ['ferraria', 'Ferraria'],
  ['mina', 'Mina'],
  ['biblioteca', 'Biblioteca'],
  ['banco', 'Banco'],
  ['agenda', 'Agenda'],
  ['amizade', 'Amizade'],
  ['bau', 'Baú'],
  ['temporada', 'Temporada'],
  ['segredos', 'Segredos'],
];

const PIXEL: Record<string, string> = {
  map: '/assets/english/ui/map.webp',
  torch: '/assets/english/ui/torch.webp',
  sun: '/assets/english/ui/sun.webp',
  clock: '/assets/english/ui/clock.webp',
  forge: '/assets/english/ui/crafting.webp',
  home: '/assets/english/ui/miner.webp',
  pickaxe: '/assets/english/ui/pickaxe.webp',
  helmet: '/assets/english/ui/base/i_helmet.webp',
  book: '/assets/english/ui/book.webp',
  chest: '/assets/english/ui/chest.webp',
  star: '/assets/english/ui/star.webp',
  trophy: '/assets/english/ui/trophy.webp',
  gold: '/assets/english/ui/gold.webp',
  heart: '/assets/english/ui/star.webp',
};

const TIER_FRAME: Record<GameAchievement['tier'], ItemRarity> = {
  bronze: 'comum',
  prata: 'raro',
  ouro: 'epico',
  exclusiva: 'exclusivo',
};

function achIcon(icon: string): string {
  return PIXEL[icon] || '/assets/english/ui/star.webp';
}

function shortDay(iso: string): string {
  const d = iso.slice(0, 10).split('-');
  if (d.length < 3) return '';
  return `${d[2]}/${d[1]}`;
}

function lockLine(need: number): string {
  if (need <= 1) return 'A Torre ainda não subiu.';
  if (need === 2) return buildLine('torre', 2);
  return 'Mapa e histórias. Quando a Torre crescer mais.';
}

const Torre: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { village, buildings } = useVillage();
  const { progress } = useData();
  const { childUid } = useAuth();
  const { playClick, playError } = useSound();
  const { today, hour } = useClock();
  const [tab, setTab] = useState<Tab>('conquistas');
  const [cat, setCat] = useState('rotina');
  const [learning, setLearning] = useState<LearningDoc | null>(null);
  const week = isoWeekOf(today);
  const close = () => {
    if (childUid) void seeAchievements(childUid).catch(() => undefined);
    onClose();
  };

  useEffect(() => {
    if (!childUid) return;
    void getLearning(childUid).then(setLearning).catch(() => setLearning(null));
  }, [childUid]);

  const minerLevel = getLevelFromXP(progress.totalXP || 0);
  const torreLevel = liveBuildingLevel(buildings, village.cracks, 'torre');
  const ctx = useMemo(() => ({
    buildings,
    gear: village.gear,
    npcTiers: Object.fromEntries(Object.entries(village.npcs).map(([id, n]) => [id, n.tier])),
    owned: village.owned,
    level: minerLevel,
  }), [buildings, village.gear, village.npcs, village.owned, minerLevel]);

  const visible = visibleAchievements(village.achievementsUnlocked);
  const next = almostThere(village.stats, village.achievementsUnlocked, ctx);
  const inCat = visible
    .filter((a) => a.category === cat)
    .slice()
    .sort((a, b) => {
      const newA = village.newAchievements.includes(a.id) ? 0 : 1;
      const newB = village.newAchievements.includes(b.id) ? 0 : 1;
      if (newA !== newB) return newA - newB;
      const unA = village.achievementsUnlocked[a.id] ? 0 : 1;
      const unB = village.achievementsUnlocked[b.id] ? 0 : 1;
      if (unA !== unB) return unA - unB;
      const pa = progressOf(village.stats, a, ctx);
      const pb = progressOf(village.stats, b, ctx);
      return (pb.current / pb.target) - (pa.current / pa.target);
    });
  const shownTab =
    torreLevel < 1 ? 'conquistas' :
    torreLevel < 2 && (tab === 'recordes' || tab === 'trofeus' || tab === 'mapa' || tab === 'historias') ? 'conquistas' :
    torreLevel < 3 && (tab === 'mapa' || tab === 'historias') ? 'conquistas' :
    tab;
  const trophyNight = (weekdayOf(today) === 6 && hour >= 18) || weekdayOf(today) === 0;
  const look = VILLAGE_LINES.olheiro.find((l) => l.id === 'o3')?.text || buildLine('torre', Math.max(1, torreLevel));

  return (
    <ChildSheet
      onClose={close}
      wide="lg"
      title={(
        <span className="flex items-center gap-2 min-w-0">
          <img src="/assets/english/ui/base/b_torre.webp" alt="" className="w-8 h-8 mc-pixel" draggable={false} />
          Torre
        </span>
      )}
      tabs={(
        <div className="mc-hotbar px-3 py-2">
          {TABS.map(([id, label, need]) => {
            const locked = torreLevel < need;
            return (
              <button
                key={id}
                type="button"
                className={`mc-slot rounded px-3 min-h-[44px] ${tab === id ? 'mc-slot-selected' : ''} ${locked ? 'is-lock' : ''}`}
                title={locked ? lockLine(need) : undefined}
                onClick={() => {
                  if (locked) {
                    playError();
                    toast(lockLine(need), { id: 'tower-lock' });
                    return;
                  }
                  playClick();
                  setTab(id);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    >
      <div className="p-3 space-y-2">
        {shownTab === 'conquistas' && (
          <>
            <p className="text-sm">{look}</p>
            {next.length > 0 && (
              <div className="mc-inv p-1">
                <p className="mc-lbl px-1">Quase lá</p>
                {next.map((a) => {
                  const p = progressOf(village.stats, a, ctx);
                  const pct = Math.round((p.current / p.target) * 100);
                  return (
                    <div key={a.id} className="mc-row rounded px-2 py-1 flex items-center gap-2">
                      <img src={achIcon(a.icon)} alt="" className="w-6 h-6 mc-pixel shrink-0" draggable={false} />
                      <p className="text-sm font-bold truncate min-w-0 flex-1">{a.title}</p>
                      <div className="mc-bar w-28 shrink-0"><div className="mc-bar-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="mc-num shrink-0" style={{ fontSize: 11 }}>{p.current}/{p.target}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mc-hotbar">
              {CAT.map(([id, label]) => {
                const all = GAME_ACHIEVEMENTS.filter((a) => a.category === id && (!a.hidden || village.achievementsUnlocked[a.id]));
                const n = all.filter((a) => village.achievementsUnlocked[a.id]).length;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`mc-slot rounded px-2 text-[13px] min-h-[44px] ${cat === id ? 'mc-slot-selected' : ''}`}
                    onClick={() => { playClick(); setCat(id); }}
                  >
                    {label} {n}/{all.length}
                  </button>
                );
              })}
            </div>
            <div className="mc-inv space-y-1">
              {inCat.map((a) => {
                const p = progressOf(village.stats, a, ctx);
                const unlocked = Boolean(village.achievementsUnlocked[a.id]);
                const hidden = Boolean(a.hidden && !unlocked);
                const isNew = village.newAchievements.includes(a.id);
                const frame = itemFrame(TIER_FRAME[a.tier]);
                const pct = Math.min(100, Math.round((p.current / p.target) * 100));
                const when = unlocked ? shortDay(village.achievementsUnlocked[a.id]) : '';
                return (
                  <div key={a.id} className={`mc-row rounded p-2 flex items-center gap-2 ${unlocked ? 'is-done' : 'is-locked'}`}>
                    <span className="mc-slot w-11 h-11 p-1 shrink-0" style={{ boxShadow: `inset 0 0 0 2px ${frame.color}` }}>
                      <img
                        src={achIcon(a.icon)}
                        alt=""
                        className="w-8 h-8 mc-pixel"
                        draggable={false}
                        style={unlocked || hidden ? undefined : { filter: 'grayscale(1)', opacity: 0.7 }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">
                        {hidden ? '?' : a.title}
                        {isNew ? <span className="mc-warn"> Novo</span> : null}
                      </p>
                      <p className="text-sm mc-muted truncate">{hidden ? 'Segredo.' : a.description}</p>
                      {!unlocked && !hidden && (
                        <div className="mc-bar mt-1"><div className="mc-bar-fill" style={{ width: `${pct}%` }} /></div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {!hidden && <span className="mc-num" style={{ fontSize: 12 }}>{Math.min(p.current, p.target)}/{p.target}</span>}
                      {when ? <p className="text-xs mc-muted">{when}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {shownTab === 'vida' && <AchievementsBadges embedded />}
        {shownTab === 'recordes' && (
          <div className="mc-inv space-y-2">
            <p className="text-sm">Numa semana você juntou <span className="mc-num" style={{ fontSize: 12 }}>{village.records.weekGold || 0}</span> gold.</p>
            <p className="text-sm">Tochas seguidas: <span className="mc-num" style={{ fontSize: 12 }}>{village.stats.fullDaysBest || 0}</span>.</p>
            <p className="text-sm">Melhor prova: <span className="mc-num" style={{ fontSize: 12 }}>{village.records.quizBest || 0}</span>.</p>
          </div>
        )}
        {shownTab === 'trofeus' && (
          <div className="space-y-3">
            <p className="text-sm">{weekRangeLabel(week)}</p>
            {village.trophies[week] ? (
              <p className="text-sm mc-good">Troféu desta semana: {village.trophies[week]}</p>
            ) : (
              <button
                type="button"
                className={`mc-btn w-full min-h-[44px] font-bold ${trophyNight ? 'mc-btn-gold' : 'mc-btn-dark'}`}
                onClick={() => {
                  if (!childUid || !trophyNight) {
                    playError();
                    return;
                  }
                  playClick();
                  void claimTrophy(childUid, week).then((t) => toast.success(`Troféu ${t}`)).catch((e) => toast.error(e instanceof Error ? e.message : 'Ainda não'));
                }}
              >
                {trophyNight ? 'Troféu da semana' : 'Volta sábado à noite'}
              </button>
            )}
            {Object.entries(village.trophies).map(([w, t]) => (
              <p key={w} className="text-sm">{weekRangeLabel(w)} · {t}</p>
            ))}
            {Object.keys(village.trophies).length === 0 && (
              <p className="text-sm mc-muted">Ainda não tem troféu nesta prateleira.</p>
            )}
          </div>
        )}
        {shownTab === 'mapa' && (
          <div className="space-y-3">
            {!learning && <p className="text-sm">O Sábio anota as matérias no relatório da semana.</p>}
            {learning && Object.entries(learning.quizAccuracyByCategory).map(([k, v]) => (
              <div key={k}>
                <p className="text-sm">{k} <span className="mc-num" style={{ fontSize: 12 }}>{v}</span>%</p>
                <div className="mc-bar"><div className="mc-bar-fill" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
            {learning && (
              <p className="text-sm">
                Palavras <span className="mc-num" style={{ fontSize: 12 }}>{learning.wordsMastered}</span>
                {' · '}Reflexões <span className="mc-num" style={{ fontSize: 12 }}>{learning.reflections}</span>
                {' · '}Guardou <span className="mc-num" style={{ fontSize: 12 }}>{learning.savingsRatePct}</span>%
              </p>
            )}
          </div>
        )}
        {shownTab === 'historias' && (
          <div className="space-y-2">
            {(Object.keys(village.npcs) as NpcId[]).map((id) => {
              const n = village.npcs[id];
              const q = NPC_QUESTS[id][Math.max(0, n.quest.chapter - 1)];
              const nextQ = NPC_QUESTS[id][n.quest.chapter] || NPC_QUESTS[id][0];
              const name = NPC_LABEL[id] || id;
              return (
                <div key={id} className="mc-card p-3">
                  <p className="text-sm font-bold">{name} · {FRIEND_TIER_NAME[n.tier] || 'Desconhecido'}</p>
                  {n.quest.chapter > 0 && q && <p className="text-sm mc-good">Feito: {q.title}</p>}
                  {nextQ && n.quest.chapter < 5 && (
                    n.tier < nextQ.chapter
                      ? <p className="text-sm">Próximo pedido: falta ser {FRIEND_TIER_NAME[nextQ.chapter] || 'amigo'}.</p>
                      : <p className="text-sm">{nextQ.ask}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChildSheet>
  );
};

export default Torre;
