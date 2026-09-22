import React, { useCallback, useEffect, useState } from 'react';
import { Brain, RefreshCw, Sparkles, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { FirestoreService } from '../../services/firestoreService';
import { getTodayBrazil } from '../../utils/timezone';
import { DailyQuiz } from '../../types';
import { addDays, ensureDailyQuiz, getRecentDailyQuizzes, regenerateDailyQuiz } from '../../services/dailyQuizService';
import { DAILY_QUIZ_QUESTIONS } from '../../config/rules';
import { isAIConfigured } from '../../services/aiQuiz';

const DailyQuizManager: React.FC = () => {
  const { childUid } = useAuth();
  const { progress } = useData();
  const today = getTodayBrazil();
  const tomorrow = addDays(today, 1);

  const enabled = progress.quizEnabled ?? true;
  const required = progress.quizRequired ?? false;
  const count = progress.quizQuestionCount || DAILY_QUIZ_QUESTIONS;

  const [history, setHistory] = useState<DailyQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childUid) return;
    setLoading(true);
    try {
      const recent = await getRecentDailyQuizzes(childUid, tomorrow, 16);
      setHistory(recent);
    } catch (e) {
      console.error('DailyQuizManager: erro ao carregar', e);
      toast.error('Não foi possível carregar o quiz diário');
    } finally {
      setLoading(false);
    }
  }, [childUid, tomorrow]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = (d: string) => history.find((q) => q.date === d) ?? null;
  const todayQuiz = byDate(today);
  const tomorrowQuiz = byDate(tomorrow);

  const saveSetting = async (updates: { quizEnabled?: boolean; quizRequired?: boolean; quizQuestionCount?: number }, ok: string) => {
    if (!childUid) return;
    setBusy('settings');
    try {
      await FirestoreService.updateUserProgress(childUid, { ...updates, updatedAt: new Date() });
      toast.success(ok);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setBusy(null);
    }
  };

  const generate = async (date: string, force: boolean) => {
    if (!childUid) return;
    if (force && !confirm('Descartar a prova atual e gerar outra?')) return;
    setBusy(date);
    try {
      if (force) await regenerateDailyQuiz(childUid, date, today, count);
      else await ensureDailyQuiz(childUid, date, today, count);
      toast.success(force ? 'Nova prova gerada' : 'Prova pronta');
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar a prova');
    } finally {
      setBusy(null);
    }
  };

  const QuizCard = ({ label, date, quiz }: { label: string; date: string; quiz: DailyQuiz | null }) => {
    const hasQuestions = Boolean(quiz && quiz.questions.length > 0);
    const isPreview = preview === date;
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label} · {date.split('-').reverse().join('/')}</p>
            <h3 className="text-lg font-bold text-gray-900">{hasQuestions ? quiz!.theme.title : 'Ainda não gerada'}</h3>
            {hasQuestions && <p className="text-sm text-gray-500">{quiz!.theme.category} · {quiz!.questions.length} perguntas · {quiz!.source === 'ai' ? 'IA' : 'banco offline'}</p>}
          </div>
          {quiz?.completed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
              <CheckCircle className="w-4 h-4" /> {quiz.score}/{quiz.totalQuestions}
            </span>
          ) : hasQuestions ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              <Clock className="w-4 h-4" /> pronta
            </span>
          ) : null}
        </div>

        {quiz?.completed && (
          <div className="mb-3 rounded-xl bg-gray-50 p-3 text-sm">
            <p className="text-gray-600">+{quiz.xpEarned} XP · +{quiz.goldEarned} gold</p>
            <p className="mt-2 font-semibold text-gray-800">Reflexão: {quiz.reflectionPrompt}</p>
            <p className="mt-1 text-gray-700 italic">{quiz.reflection ? `"${quiz.reflection}"` : 'Ainda não respondeu.'}</p>
            {quiz.reflectionNote && <p className="mt-1 text-gray-500">{quiz.reflectionNote}</p>}
          </div>
        )}

        {hasQuestions && isPreview && (
          <div className="mb-3 rounded-xl bg-gray-50 p-3 text-sm space-y-3">
            <p className="text-gray-700 whitespace-pre-line">{quiz!.theme.lesson}</p>
            <ol className="list-decimal pl-5 space-y-1 text-gray-700">
              {quiz!.questions.map((q, i) => (
                <li key={i}>
                  {q.question} <span className="text-green-700">({q.answer})</span>
                </li>
              ))}
            </ol>
            <p className="font-semibold text-gray-800">Reflexão: {quiz!.reflectionPrompt}</p>
            {quiz!.sanitize && (
              <p className="text-xs text-gray-500">
                sanitize kept {quiz!.sanitize.kept} · dropped {JSON.stringify(quiz!.sanitize.dropped)}
                {quiz!.sanitize.duvidas ? ` · dúvidas ${quiz!.sanitize.duvidas.length}` : ''}
                {quiz!.sanitize.perQuestion ? ` · por pergunta ${JSON.stringify(quiz!.sanitize.perQuestion)}` : ''}
                {quiz!.sanitize.review?.length ? ` · revisor ${JSON.stringify(quiz!.sanitize.review)}` : ''}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {hasQuestions && (
            <button onClick={() => setPreview(isPreview ? null : date)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">
              {isPreview ? 'Esconder' : 'Ver prova'}
            </button>
          )}
          {!hasQuestions && !quiz?.completed && (
            <button onClick={() => void generate(date, false)} disabled={busy === date} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {busy === date ? 'Gerando...' : 'Gerar agora'}
            </button>
          )}
          {hasQuestions && !quiz?.completed && (
            <button onClick={() => void generate(date, true)} disabled={busy === date} className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> {busy === date ? 'Gerando...' : 'Gerar outra'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const Toggle = ({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) => (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 cursor-pointer">
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{hint}</p>
      </div>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} disabled={busy === 'settings'} className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-blue-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Quiz diário</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Uma ideia do dia (filosofia, caráter, ciência, história, lógica, inglês, futebol) com perguntas para pensar e uma reflexão escrita.
          A prova é gerada com antecedência; a de amanhã fica pronta enquanto o app está aberto.
          {!isAIConfigured() && <span className="block mt-1 text-amber-700 font-semibold">Chave da OpenAI não configurada: as provas usam o banco offline.</span>}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle on={enabled} onChange={(v) => void saveSetting({ quizEnabled: v }, v ? 'Quiz ativado' : 'Quiz desativado')} label="Quiz ativo" hint="Aparece na tela da criança todo dia" />
          <Toggle on={required} onChange={(v) => void saveSetting({ quizRequired: v }, v ? 'Quiz obrigatório' : 'Quiz opcional')} label="Obrigatório" hint="Sem 'mais tarde': precisa fazer antes de usar o app" />
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4">
            <div>
              <p className="font-semibold text-gray-900">Perguntas por dia</p>
              <p className="text-sm text-gray-500">3 sobre a ideia do dia, o resto de conhecimento</p>
            </div>
            <select value={count} onChange={(e) => void saveSetting({ quizQuestionCount: Number(e.target.value) }, 'Quantidade salva')} className="rounded-lg border border-gray-300 px-3 py-2">
              {[6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <QuizCard label="Hoje" date={today} quiz={todayQuiz} />
          <QuizCard label="Amanhã" date={tomorrow} quiz={tomorrowQuiz} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Últimos dias</h3>
        {history.filter((q) => q.date < today).length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma prova anterior.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.filter((q) => q.date < today).map((q) => (
              <li key={q.id} className="py-3 flex flex-wrap items-start gap-3">
                <span className="w-24 text-sm text-gray-500">{q.date.split('-').reverse().join('/')}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{q.theme.title || 'Prova do dia'}</p>
                  {q.reflection && <p className="text-sm text-gray-600 italic">"{q.reflection}"</p>}
                </div>
                <span className={`text-sm font-semibold ${q.completed ? 'text-green-700' : 'text-gray-400'}`}>
                  {q.completed ? `${q.score}/${q.totalQuestions}` : 'não fez'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DailyQuizManager;
