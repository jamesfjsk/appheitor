import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useVillage } from '../../contexts/VillageContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';
import { getTodayBrazil } from '../../utils/clock';
import { DailyQuiz as DailyQuizDoc } from '../../types';
import { addDays, completeDailyQuiz, ensureDailyQuiz, quizRewards, saveReflection, subscribeDailyQuiz } from '../../services/dailyQuizService';
import { DAILY_QUIZ_QUESTIONS } from '../../config/rules';
import { quizOpensOnRequest } from '../../services/village/quizGate';

const BOOK = '/assets/english/ui/book.webp';
const STAR = '/assets/english/ui/star.webp';
const GOLD = '/assets/english/ui/gold.webp';

interface DailyQuizProps {
  onComplete: () => void;
  openRequested?: boolean | number;
}

type Phase = 'prompt' | 'lesson' | 'questions' | 'results';

const QUIZ_DONE_KEY = (uid: string, date: string) => `quiz_completed_${uid}_${date}`;

const DailyQuiz: React.FC<DailyQuizProps> = ({ onComplete, openRequested }) => {
  const { childUid } = useAuth();
  const { progress } = useData();
  const { economy } = useVillage();
  const { playTaskComplete, playLevelUp, playError, playClick, setMusicDuck } = useSound();

  const today = getTodayBrazil();
  const enabled = progress.quizEnabled ?? true;
  const required = Boolean(progress.quizRequired);
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

  useEffect(() => {
    setMusicDuck('quiz', open);
    return () => setMusicDuck('quiz', false);
  }, [open, setMusicDuck]);

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

  useEffect(() => {
    if (quizOpensOnRequest(openRequested)) setOpen(true);
  }, [openRequested]);

  useEffect(() => {
    if (!quiz?.completed || !childUid) return;
    localStorage.setItem(QUIZ_DONE_KEY(childUid, today), '1');
    onComplete();
  }, [quiz?.completed, childUid, today, onComplete]);

  const ready = Boolean(quiz && quiz.questions.length > 0 && !quiz.completed);
  const question = quiz?.questions[current];
  const isLast = quiz ? current === quiz.questions.length - 1 : false;

  const start = () => {
    playClick();
    setPhase('lesson');
  };

  const postpone = () => {
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
      const r = quizRewards(correct, total, economy);
      setScore(correct);
      setReward(r);

      await completeDailyQuiz(childUid, today, { score: correct, totalQuestions: total, xpEarned: r.xp, goldEarned: r.gold, answers: finalAnswers });
      await FirestoreService.payQuizRewards(childUid, today, r.xp, r.gold);
      if (correct / total >= 0.75) playLevelUp();
      else playTaskComplete();
      setPhase('results');
      localStorage.setItem(QUIZ_DONE_KEY(childUid, today), '1');
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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="mc-panel mn-child-sheet rounded-lg w-full max-w-2xl text-white">
          <div className="p-4 border-b-4 border-[#17130f] flex items-center gap-3 shrink-0">
            <img src={BOOK} alt="" className="w-10 h-10 mc-pixel shrink-0" draggable={false} />
            <div className="flex-1 min-w-0">
              <h2 className="mc-title text-sm">Prova do dia</h2>
              <p className="text-white/80 text-sm truncate">{quiz.theme.title || 'Preparando o tema de hoje'}</p>
            </div>
            {phase === 'questions' && (
              <span className="mc-num">{current + 1}/{quiz.questions.length}</span>
            )}
          </div>
          {phase === 'questions' && (
            <div className="px-4 pt-3">
              <div className="mc-bar">
                <div className="mc-bar-fill" style={{ width: `${(current / quiz.questions.length) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="mn-child-body p-5">
            {phase === 'prompt' && (
              <div className="text-center py-2">
                {quiz.completed ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-2">Prova de hoje feita</h3>
                    <p className="text-white/85 mb-6">
                      Prova de hoje feita: {quiz.score ?? score} de {quiz.totalQuestions || quiz.questions.length || count}
                    </p>
                    <button type="button" onClick={postpone} className="mc-btn mc-btn-stone px-6 py-3 font-bold">
                      Fechar
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {required ? 'Hoje tem prova antes de tudo' : 'A prova de hoje está pronta'}
                    </h3>
                    <p className="text-white/85 mb-6">
                      {ready
                        ? `Uma ideia para pensar e ${quiz.questions.length} perguntas. Cada acerto vale XP e gold.`
                        : generating
                          ? 'Preparando a prova de hoje. Leva alguns segundos.'
                          : error ?? 'Ainda não há prova para hoje.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        type="button"
                        onClick={ready ? start : () => void prepare()}
                        disabled={generating}
                        className="mc-btn mc-btn-green px-6 py-3 font-bold"
                      >
                        {ready ? 'Começar' : generating ? 'Preparando...' : 'Tentar de novo'}
                      </button>
                      {!ready && (
                        <button type="button" onClick={postpone} className="mc-btn mc-btn-stone px-6 py-3 font-bold">
                          Voltar à Vila
                        </button>
                      )}
                      {ready && !required && (
                        <button type="button" onClick={postpone} className="mc-btn mc-btn-stone px-6 py-3 font-bold">
                          Mais tarde
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {phase === 'lesson' && (
              <div>
                <p className="mc-lbl mb-2">Ideia do dia</p>
                <h3 className="text-xl font-bold text-white mb-3">{quiz.theme.title}</h3>
                <div className="mc-paper rounded-lg p-4 text-[#1f1a17]">
                  <p className="text-lg leading-relaxed whitespace-pre-line">{quiz.theme.lesson}</p>
                  {quiz.theme.whyItMatters && (
                    <p className="mt-4 font-semibold">{quiz.theme.whyItMatters}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { playClick(); setPhase('questions'); }}
                  className="mt-6 w-full mc-btn mc-btn-green px-6 py-3 font-bold"
                >
                  Ir para as perguntas
                </button>
              </div>
            )}

            {phase === 'questions' && question && (
              <div className="mc-inv rounded-lg p-4">
                <p className="text-xs mc-muted mb-2">
                  {question.kind === 'lesson' ? 'Sobre a ideia do dia' : question.subject}
                </p>
                <h3 className="text-xl font-bold mb-4">{question.question}</h3>
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const isCorrect = option === question.answer;
                    const isChosen = option === selected;
                    let rowClass = 'mc-row rounded p-4 w-full text-left font-medium';
                    if (selected) {
                      if (isCorrect) rowClass += ' is-done';
                      else if (isChosen) rowClass += ' mc-slot-bad';
                      else rowClass += ' opacity-60';
                    }
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => choose(option)}
                        disabled={Boolean(selected)}
                        className={rowClass}
                        style={selected && isChosen && !isCorrect ? { borderColor: '#b3261e' } : undefined}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {selected && (
                  <div className="mc-card rounded p-4 mt-4">
                    <p className="font-bold mb-1">{selected === question.answer ? 'Isso.' : 'Não foi dessa vez.'}</p>
                    <p className="text-sm leading-relaxed">{question.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {phase === 'results' && (
              <div className="text-center">
                <p className="mc-num mb-2" style={{ fontSize: 28 }}>{score} de {quiz.questions.length}</p>
                <div className="flex justify-center gap-3 mb-4">
                  <span className="mc-slot flex items-center gap-1.5 px-3 py-2">
                    <img src={STAR} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                    <span className="text-sm mc-good">+{reward.xp} XP</span>
                  </span>
                  <span className="mc-slot flex items-center gap-1.5 px-3 py-2">
                    <img src={GOLD} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                    <span className="text-sm mc-warn">+{reward.gold} GOLD</span>
                  </span>
                </div>

                <div className="text-left mc-inv rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold mc-muted mb-1">Para pensar</p>
                  <p className="font-bold mb-3">{quiz.reflectionPrompt}</p>
                  {reflectionSaved ? (
                    <p className="mc-good font-semibold">Resposta enviada. Seu responsável vai ler.</p>
                  ) : (
                    <>
                      <textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="Escreva com as suas palavras..."
                        rows={3}
                        className="w-full p-3 rounded-md bg-white text-[#1f1a17] border-[3px] border-[#373737] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void sendReflection()}
                        disabled={saving || reflection.trim().length < 3}
                        className="mt-2 mc-btn mc-btn-green px-5 py-2 font-bold"
                      >
                        Enviar resposta
                      </button>
                    </>
                  )}
                </div>

                <button type="button" onClick={() => setOpen(false)} className="mc-btn mc-btn-stone px-6 py-3 font-bold">
                  Fechar
                </button>
              </div>
            )}
          </div>
          {phase === 'questions' && (
            <div className="mn-child-foot">
              <button
                type="button"
                onClick={() => void next()}
                disabled={!selected || saving}
                className="w-full mc-btn mc-btn-green px-6 py-3 font-bold"
              >
                {saving ? 'Salvando...' : isLast ? 'Ver resultado' : 'Próxima'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
};

export default DailyQuiz;
