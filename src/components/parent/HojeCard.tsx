import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { subscribeGoals } from '../../services/goalsService';
import { subscribeChallenges } from '../../services/challengesService';
import { subscribeClientErrors } from '../../services/observability';
import type { GoalDoc, ChallengeDoc } from '../../types/village';
import { getTodayBrazil, addDays } from '../../utils/clock';
import { AI_MONTHLY_CALL_CAP, currentUsageMonth, getUsage, textCallsOf } from '../../services/aiUsage';
import { subscribeHealth } from '../../services/observability';
import { subscribeDailyQuiz } from '../../services/dailyQuizService';
import { dilemmaOf } from '../../services/quiz/provaRules';
import type { DailyQuiz } from '../../types';

const HojeCard: React.FC<{ onOpen: (tab: string) => void }> = ({ onOpen }) => {
  const { childUid } = useAuth();
  const { redemptions, tasks } = useData();
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [challenges, setChallenges] = useState<ChallengeDoc[]>([]);
  const [errors, setErrors] = useState(0);
  const [aiHot, setAiHot] = useState(false);
  const [unclosed, setUnclosed] = useState(false);
  const [todayQuiz, setTodayQuiz] = useState<DailyQuiz | null>(null);
  const [yestQuiz, setYestQuiz] = useState<DailyQuiz | null>(null);
  const today = getTodayBrazil();
  const soon = addDays(today, 1);
  const yesterday = addDays(today, -1);

  useEffect(() => {
    if (!childUid) return;
    const u1 = subscribeGoals(childUid, setGoals);
    const u2 = subscribeChallenges(childUid, setChallenges);
    const u3 = subscribeClientErrors(childUid, (rows) => {
      const cut = Date.now() - 24 * 3600 * 1000;
      setErrors(rows.filter((r) => {
        const ms = Date.parse(r.createdAt);
        return Number.isFinite(ms) && ms >= cut;
      }).length);
    });
    const u4 = subscribeHealth(childUid, (h) => {
      setUnclosed(Boolean(h?.lastCloseDay && h.lastCloseDay < yesterday));
    });
    const u5 = subscribeDailyQuiz(childUid, today, setTodayQuiz);
    const u6 = subscribeDailyQuiz(childUid, yesterday, setYestQuiz);
    void getUsage(currentUsageMonth()).then((u) => {
      if (!u) return;
      setAiHot(textCallsOf(u) >= AI_MONTHLY_CALL_CAP * 0.8);
    }).catch(() => undefined);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [childUid, yesterday, today]);

  const pendingRedeem = redemptions.filter((r) => r.status === 'pending');
  const achieved = goals.filter((g) => g.status === 'achieved');
  const cancel = goals.filter((g) => g.status === 'cancel_requested');
  const proposedCh = challenges.filter((c) => c.status === 'proposed');
  const proposedTasks = tasks.filter((t) => t.status === 'proposed');
  const ending = challenges.filter((c) => c.status === 'active' && c.endsOn && c.endsOn <= soon && !c.completedAt);

  const rows: Array<{ text: string; tab: string }> = [
    ...pendingRedeem.map((r) => ({ text: `Resgate: ${r.rewardTitle || r.rewardId}`, tab: 'rewards' })),
    ...achieved.map((g) => ({ text: `Meta batida: ${g.title}`, tab: 'goals' })),
    ...cancel.map((g) => ({ text: `Cancelar: ${g.title}`, tab: 'goals' })),
    ...proposedCh.map((c) => ({ text: `Desafio proposto: ${c.title}`, tab: 'challenges' })),
    ...proposedTasks.map((t) => ({ text: `Missão proposta: ${t.title}`, tab: 'tasks' })),
    ...ending.map((c) => ({ text: `Desafio vence: ${c.title}`, tab: 'challenges' })),
  ];
  if (errors) rows.push({ text: `${errors} erro(s) do app nas últimas 24h`, tab: 'system' });
  if (aiHot) rows.push({ text: 'Uso de IA acima de 80% do teto', tab: 'english' });
  if (unclosed) rows.push({ text: 'Há dias sem fechar', tab: 'village' });

  const dilemmaSource = todayQuiz?.completed ? todayQuiz : yestQuiz?.completed ? yestQuiz : null;
  const dilemma = dilemmaSource ? dilemmaOf(dilemmaSource) : null;
  const dilemmaWhen = dilemmaSource?.date === today ? 'Dilema de hoje' : 'Dilema de ontem';

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3">Hoje</h2>
      {dilemma && (
        <button type="button" onClick={() => onOpen('quiz')} className="mb-4 w-full text-left rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{dilemmaWhen}</p>
          <p className="mt-1 text-sm text-gray-800">{dilemma.question}</p>
          <p className="mt-2 text-sm text-gray-600">Ele escolheu: “{dilemma.chosen}”</p>
        </button>
      )}
      {rows.length === 0 && !dilemma && <p className="text-sm text-gray-500">Nada pendente.</p>}
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={i}>
            <button type="button" className="text-blue-700 text-sm hover:underline" onClick={() => onOpen(r.tab)}>{r.text}</button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HojeCard;
