import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, XCircle, Trophy, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';
import { getTodayBrazil } from '../../utils/timezone';
import { DailyQuiz as DailyQuizDoc } from '../../types';
import { addDays, completeDailyQuiz, ensureDailyQuiz, quizRewards, saveReflection, subscribeDailyQuiz } from '../../services/dailyQuizService';
import { isQuizSnoozed, snoozeQuiz } from '../../services/aiQuiz';
import { DAILY_QUIZ_QUESTIONS } from '../../config/rules';

interface DailyQuizProps {
  onComplete: () => void;
}

type Phase = 'prompt' | 'lesson' | 'questions' | 'results';

const font = { fontFamily: 'Comic Neue, cursive' } as const;

const DailyQuiz: React.FC<DailyQuizProps> = ({ onComplete }) => {
  const { childUid } = useAuth();
  const { progress, adjustUserXP, adjustUserGold } = useData();
  const { playTaskComplete, playLevelUp, playError, playClick } = useSound();

  const today = getTodayBrazil();
  const enabled = progress.quizEnabled ?? true;
  const required = progress.quizRequired ?? false;
  const count = progress.quizQuestionCount || DAILY_QUIZ_QUESTIONS;

  const [quiz, setQuiz] = useState<DailyQuizDoc | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('prompt');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [reward, setReward] = useState({ xp: 0, gold: 0 });
  const [reflection, setReflection] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const prefetched = useRef(false);

  // Acompanha o documento do dia
  useEffect(() => {
    if (!childUid || !enabled) return;
    const unsub = subscribeDailyQuiz(childUid, today, (q) => {
      setQuiz(q);
      setLoaded(true);
    }, () => setLoaded(true));
    return unsub;
  }, [childUid, today, enabled]);

  // Garante a prova de hoje (e prepara a de amanhã em segundo plano)
  const prepare = useCallback(async () => {
    if (!childUid) return;
    setGenerating(true);
    setError(null);
    try {
      const q = await ensureDailyQuiz(childUid, today, today, count);
      setQuiz(q);
    } catch (e) {
      console.error('DailyQuiz: erro ao preparar a prova', e);
      setError('Não consegui preparar a prova de hoje. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }, [childUid, today, count]);

  useEffect(() => {
    if (!loaded || !childUid || !enabled || prefetched.current) return;
    prefetched.current = true;
    if (!quiz || (quiz.questions.length === 0 && !quiz.completed)) void prepare();
    // amanhã, sem esperar
    ensureDailyQuiz(childUid, addDays(today, 1), today, count).catch((e) => console.warn('DailyQuiz: prefetch de amanhã falhou', e));
  }, [loaded, childUid, enabled, quiz, prepare, today, count]);

  // Decide se abre
  useEffect(() => {
    if (!loaded || !childUid || !enabled || !quiz) return;
    if (quiz.completed) return;
    if (!required && isQuizSnoozed('daily', childUid, today)) return;
    setOpen(true);
  }, [loaded, childUid, enabled, quiz, required, today]);

  const ready = Boolean(quiz && quiz.questions.length > 0 && !quiz.completed);
  const question = quiz?.questions[current];
  const isLast = quiz ? current === quiz.questions.length - 1 : false;

  const start = () => {
    playClick();
    setPhase('lesson');
  };

  const postpone = () => {
    if (childUid) snoozeQuiz('daily', childUid, today);
    setOpen(false);
  };

  const choose = (option: string) => {
    if (selected || !question) return;
    setSelected(option);
    if (option === question.answer) playTaskComplete();
    else playError();
  };

  const next = async () => {
    if (!quiz || !question || !selected) return;
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);
    if (!isLast) {
      setCurrent(current + 1);
      setSelected(null);
      return;
    }
    await finish(nextAnswers);
  };

  const finish = async (finalAnswers: string[]) => {
    if (!quiz || !childUid) return;
    setSaving(true);
    try {
      const correct = finalAnswers.filter((a, i) => quiz.questions[i] && a === quiz.questions[i].answer).length;
      const total = quiz.questions.length;
      const r = quizRewards(correct, total);
      setScore(correct);
      setReward(r);

      await completeDailyQuiz(childUid, today, { score: correct, totalQuestions: total, xpEarned: r.xp, goldEarned: r.gold, answers: finalAnswers });
      await adjustUserXP(r.xp);
      await adjustUserGold(r.gold);
      await FirestoreService.createGoldTransaction(childUid, r.gold, 'earned', 'quiz', `Quiz diário: ${correct} de ${total} acertos`, {
        metadata: { score: correct, totalQuestions: total, xpEarned: r.xp, date: today, theme: quiz.theme.title },
      });
      if (correct / total >= 0.75) playLevelUp();
      else playTaskComplete();
      setPhase('results');
      onComplete();
    } catch (e) {
      console.error('DailyQuiz: erro ao salvar resultado', e);
      toast.error('Erro ao salvar o resultado do quiz');
    } finally {
      setSaving(false);
    }
  };

  const sendReflection = async () => {
    if (!childUid || !reflection.trim()) return;
    setSaving(true);
    try {
      await saveReflection(childUid, today, reflection);
      setReflectionSaved(true);
      toast.success('Resposta enviada!');
    } catch (e) {
      console.error('DailyQuiz: erro ao salvar reflexão', e);
      toast.error('Não deu para enviar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  if (!enabled || !open || !quiz) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        >
          {/* Cabeçalho */}
          <div className="bg-gradient-to-r from-hero-primary to-hero-secondary text-white p-5 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold leading-tight" style={font}>Prova do dia</h2>
                <p className="text-white/80 text-sm truncate">{quiz.theme.title || 'Preparando o tema de hoje'}</p>
              </div>
              {phase === 'questions' && (
                <div className="text-right">
                  <div className="text-2xl font-bold">{current + 1}/{quiz.questions.length}</div>
                </div>
              )}
            </div>
            {phase === 'questions' && (
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${(current / quiz.questions.length) * 100}%` }} />
              </div>
            )}
          </div>

          <div className="p-6">
            {/* Convite */}
            {phase === 'prompt' && (
              <div className="text-center py-4">
                <Sparkles className="w-12 h-12 text-hero-primary mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-800 mb-2" style={font}>
                  {required ? 'Hoje tem prova antes de tudo' : 'A prova de hoje está pronta'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {ready
                    ? `Uma ideia para pensar e ${quiz.questions.length} perguntas. Cada acerto vale XP e gold.`
                    : generating
                      ? 'Preparando a prova de hoje. Leva alguns segundos.'
                      : error ?? 'Ainda não há prova para hoje.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={ready ? start : () => void prepare()}
                    disabled={generating}
                    className="px-6 py-3 bg-hero-primary text-white rounded-xl font-bold hover:bg-hero-primary/90 transition-colors disabled:opacity-60"
                  >
                    {ready ? 'Começar' : generating ? 'Preparando...' : 'Tentar de novo'}
                  </button>
                  {!required && (
                    <button onClick={postpone} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                      Mais tarde
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ideia do dia */}
            {phase === 'lesson' && (
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-hero-primary uppercase tracking-wide mb-2">
                  <BookOpen className="w-4 h-4" /> Ideia do dia · {quiz.theme.category}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4" style={font}>{quiz.theme.title}</h3>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">{quiz.theme.lesson}</p>
                {quiz.theme.whyItMatters && (
                  <p className="mt-4 p-4 bg-hero-primary/10 rounded-xl text-hero-primary font-semibold">{quiz.theme.whyItMatters}</p>
                )}
                <button onClick={() => { playClick(); setPhase('questions'); }} className="mt-6 w-full px-6 py-3 bg-hero-primary text-white rounded-xl font-bold hover:bg-hero-primary/90 transition-colors flex items-center justify-center gap-2">
                  Ir para as perguntas <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Perguntas com correção na hora */}
            {phase === 'questions' && question && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {question.kind === 'lesson' ? 'Sobre a ideia do dia' : question.subject}
                </p>
                <h3 className="text-xl font-bold text-gray-900 mb-5" style={font}>{question.question}</h3>
                <div className="space-y-3">
                  {question.options.map((option) => {
                    const isCorrect = option === question.answer;
                    const isChosen = option === selected;
                    let cls = 'border-gray-200 hover:border-hero-primary hover:bg-hero-primary/5';
                    if (selected) {
                      if (isCorrect) cls = 'border-green-500 bg-green-50 text-green-800';
                      else if (isChosen) cls = 'border-red-400 bg-red-50 text-red-800';
                      else cls = 'border-gray-200 opacity-60';
                    }
                    return (
                      <button key={option} onClick={() => choose(option)} disabled={Boolean(selected)} className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${cls}`}>
                        <span className="flex items-center gap-3">
                          {selected && isCorrect && <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
                          {selected && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selected && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 p-4 rounded-xl ${selected === question.answer ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}>
                    <p className="font-bold mb-1">{selected === question.answer ? 'Isso.' : 'Não foi dessa vez.'}</p>
                    <p className="text-sm leading-relaxed">{question.explanation}</p>
                  </motion.div>
                )}
                <button
                  onClick={() => void next()}
                  disabled={!selected || saving}
                  className="mt-5 w-full px-6 py-3 bg-hero-primary text-white rounded-xl font-bold hover:bg-hero-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : isLast ? 'Ver resultado' : 'Próxima'}
                </button>
              </div>
            )}

            {/* Resultado e reflexão */}
            {phase === 'results' && (
              <div className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-gradient-to-r from-hero-primary to-hero-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1" style={font}>
                  {score} de {quiz.questions.length}
                </h3>
                <p className="text-gray-600 mb-4">+{reward.xp} XP e +{reward.gold} gold</p>

                <div className="text-left bg-gray-50 rounded-2xl p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Para pensar</p>
                  <p className="font-bold text-gray-900 mb-3">{quiz.reflectionPrompt}</p>
                  {reflectionSaved ? (
                    <p className="text-green-700 font-semibold">Resposta enviada. Seu responsável vai ler.</p>
                  ) : (
                    <>
                      <textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="Escreva com as suas palavras..."
                        rows={3}
                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-hero-primary outline-none"
                      />
                      <button onClick={() => void sendReflection()} disabled={saving || reflection.trim().length < 3} className="mt-2 px-5 py-2 bg-hero-primary text-white rounded-xl font-bold disabled:opacity-50">
                        Enviar resposta
                      </button>
                    </>
                  )}
                </div>

                <button onClick={() => setOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DailyQuiz;
