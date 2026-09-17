import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, X } from 'lucide-react';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSound } from '../../../contexts/SoundContext';
import { GAME_ACHIEVEMENTS } from '../../../data/achievements';
import { almostThere, progressOf, visibleAchievements } from '../../../services/village/achievements';
import { claimTrophy, seeAchievements } from '../../../services/villageService';
import { getLearning } from '../../../services/learningService';
import type { LearningDoc, NpcId } from '../../../types/village';
import { FRIEND_TIER_NAME } from '../../../types/village';
import { isoWeekOf, weekRangeLabel, weekdayOf } from '../../../utils/clock';
import { useClock } from '../../../contexts/ClockContext';
import AchievementsBadges from '../AchievementsBadges';
import { NPC_QUESTS } from '../../../data/npcQuests';
import { getLevelFromXP } from '../../../utils/levelSystem';
import { liveBuildingLevel } from '../../../services/village/repair';

type Tab = 'conquistas' | 'vida' | 'recordes' | 'trofeus' | 'mapa' | 'historias';
const CAT = ['rotina', 'obras', 'ferraria', 'mina', 'biblioteca', 'banco', 'agenda', 'amizade', 'bau', 'temporada', 'segredos'];

const Torre: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { village, buildings } = useVillage();
  const { progress } = useData();
  const { childUid } = useAuth();
  const { playClick } = useSound();
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
  const inCat = visible.filter((a) => a.category === cat);
  const doneCat = inCat.filter((a) => village.achievementsUnlocked[a.id]).length;
  const shownTab =
    torreLevel < 1 ? 'conquistas' :
    torreLevel < 2 && (tab === 'recordes' || tab === 'trofeus' || tab === 'mapa' || tab === 'historias') ? 'conquistas' :
    torreLevel < 3 && (tab === 'mapa' || tab === 'historias') ? 'conquistas' :
    tab;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 mn-veil" onClick={close}>
      <div className="mc-modal mc-pop rounded-lg w-full max-w-2xl max-h-[96vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center">
          <h2 className="mc-title text-sm">Torre</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={close} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar p-3">
          {([
            ['conquistas', 'Conquistas', 0],
            ['vida', 'Da vida real', 1],
            ['recordes', 'Recordes', 2],
            ['trofeus', 'Troféus', 2],
            ['mapa', 'Mapa', 3],
            ['historias', 'Histórias', 3],
          ] as const).map(([id, label, need]) => {
            const locked = torreLevel < need;
            return (
              <button
                key={id}
                type="button"
                className={`mc-slot rounded px-3 min-h-[44px] ${tab === id ? 'mc-slot-selected' : ''}`}
                onClick={() => {
                  playClick();
                  if (locked) {
                    toast(`Torre nível ${need}`);
                    return;
                  }
                  setTab(id);
                }}
              >
                {locked ? <><Lock className="inline w-4 h-4 mr-1" aria-hidden />{label}</> : label}
              </button>
            );
          })}
        </div>
        <div className="p-4 space-y-3">
          {torreLevel < 1 && tab === 'conquistas' && (
            <p className="text-sm mc-muted">Construa a Torre para ver recordes e troféus.</p>
          )}
          {shownTab === 'conquistas' && (
            <>
              {next.length > 0 && (
                <div className="mc-card p-3">
                  <p className="text-sm font-bold mb-1">Quase lá</p>
                  {next.map((a) => {
                    const p = progressOf(village.stats, a, ctx);
                    return <p key={a.id} className="text-sm">{a.title} {p.current}/{p.target}{village.newAchievements.includes(a.id) ? ' · Novo' : ''}</p>;
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {CAT.map((c) => {
                  const all = GAME_ACHIEVEMENTS.filter((a) => a.category === c && (!a.hidden || village.achievementsUnlocked[a.id]));
                  const n = all.filter((a) => village.achievementsUnlocked[a.id]).length;
                  return (
                    <button key={c} type="button" className={`mc-chip px-2 py-1 ${cat === c ? 'mc-slot-selected' : ''}`} onClick={() => setCat(c)}>
                      {c} {n}/{all.length}
                    </button>
                  );
                })}
              </div>
              {inCat.map((a) => {
                const p = progressOf(village.stats, a, ctx);
                const unlocked = Boolean(village.achievementsUnlocked[a.id]);
                const hidden = a.hidden && !unlocked;
                return (
                  <div key={a.id} className="mc-row rounded p-2 flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{hidden ? '?' : a.title}{village.newAchievements.includes(a.id) ? ' · Novo' : ''}</p>
                      <p className="text-xs mc-muted">{hidden ? 'Segredo' : a.description}</p>
                    </div>
                    <span className="mc-num" style={{ fontSize: 12 }}>{hidden ? '' : `${Math.min(p.current, p.target)}/${p.target}`}</span>
                  </div>
                );
              })}
              <p className="text-xs mc-muted">{doneCat} nesta categoria. Nenhuma conquista do jogo paga gold.</p>
            </>
          )}
          {shownTab === 'vida' && <AchievementsBadges />}
          {shownTab === 'recordes' && (
            <div className="space-y-2">
              <p className="text-sm">Melhor semana: <span className="mc-num" style={{ fontSize: 12 }}>{village.records.weekGold || 0}</span> gold</p>
              <p className="text-sm">Maior sequência de tochas: <span className="mc-num" style={{ fontSize: 12 }}>{village.stats.fullDaysBest || 0}</span></p>
              <p className="text-sm">Melhor prova: <span className="mc-num" style={{ fontSize: 12 }}>{village.records.quizBest || 0}</span></p>
            </div>
          )}
          {shownTab === 'trofeus' && (
            <div className="space-y-2">
              <p className="text-sm">{weekRangeLabel(week)}</p>
              {village.trophies[week] ? (
                <p className="text-sm mc-good">Troféu: {village.trophies[week]}</p>
              ) : (
                <button
                  type="button"
                  className="mc-btn mc-btn-gold min-h-[44px] px-3"
                  disabled={!childUid || (weekdayOf(today) !== 6 && weekdayOf(today) !== 0) || (weekdayOf(today) === 6 && hour < 18)}
                  onClick={() => {
                    if (!childUid) return;
                    void claimTrophy(childUid, week).then((t) => toast.success(`Troféu ${t}`)).catch((e) => toast.error(e instanceof Error ? e.message : 'Ainda não'));
                  }}
                >
                  Troféu da semana
                </button>
              )}
              {Object.entries(village.trophies).map(([w, t]) => (
                <p key={w} className="text-sm">{weekRangeLabel(w)} · {t}</p>
              ))}
            </div>
          )}
          {shownTab === 'mapa' && (
            <div className="space-y-2">
              {!learning && <p className="text-sm mc-muted">O mapa preenche no relatório semanal.</p>}
              {learning && Object.entries(learning.quizAccuracyByCategory).map(([k, v]) => (
                <div key={k}>
                  <p className="text-sm">{k} {v}%</p>
                  <div className="mc-bar"><div className="mc-bar-fill" style={{ width: `${v}%` }} /></div>
                </div>
              ))}
              {learning && <p className="text-sm">Palavras: {learning.wordsMastered} · Reflexões: {learning.reflections} · Guardou {learning.savingsRatePct}%</p>}
            </div>
          )}
          {shownTab === 'historias' && (
            <div className="space-y-2">
              {(Object.keys(village.npcs) as NpcId[]).map((id) => {
                const n = village.npcs[id];
                const q = NPC_QUESTS[id][Math.max(0, n.quest.chapter - 1)];
                const nextQ = NPC_QUESTS[id][n.quest.chapter] || NPC_QUESTS[id][0];
                return (
                  <div key={id} className="mc-card p-3">
                    <p className="text-sm font-bold">{id} · {FRIEND_TIER_NAME[n.tier] || 'Desconhecido'} · {n.points} pts</p>
                    {n.quest.chapter > 0 && q && <p className="text-xs mc-good">Feito: {q.title}</p>}
                    {nextQ && n.quest.chapter < 5 && (
                      n.tier < nextQ.chapter
                        ? <p className="text-sm">Próximo pedido: falta amizade nível {nextQ.chapter} ({FRIEND_TIER_NAME[nextQ.chapter] || nextQ.chapter}).</p>
                        : <p className="text-sm">{id}: {nextQ.ask}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Torre;
