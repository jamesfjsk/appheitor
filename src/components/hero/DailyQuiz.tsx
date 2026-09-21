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
import { addDays, completeDailyQuiz, ensureDailyQuiz, quizRewards, subscribeDailyQuiz } from '../../services/dailyQuizService';
import { judgeReflection } from '../../services/aiDailyQuiz';
import { DAILY_QUIZ_QUESTIONS } from '../../config/rules';
import { quizDoneToday, quizOpensOnRequest } from '../../services/village/quizGate';
import { EXPLAIN_READ_MS, LESSON_READ_MS, readingMs, reflectionOk } from '../../services/quiz/provaRules';
import { prefetchVerdicts, speakProvaVerdict, stopProvaVoice } from '../../services/quiz/provaSpeak';
import { ISO_NPC } from '../../config/village';

const STAR = '/assets/english/ui/star.webp';
const GOLD = '/assets/english/ui/gold.webp';

interface DailyQuizProps {
  onComplete: () => void;
  onPending?: () => void;
  openRequested?: boolean | number;
}

type Phase = 'prompt' | 'lesson' | 'questions' | 'results';

const QUIZ_DONE_KEY = (uid: string, date: string) => `quiz_completed_${uid}_${date}`;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

function useReadWait(text: string, min: number, max: number, active: boolean) {
  const ms = readingMs(text || 'x', min, max);
  const reduced = useReducedMotion();
  const [p, setP] = useState(active ? 0 : 1);
  const [ready, setReady] = useState(!active);

  useEffect(() => {
    if (!active) {
      setReady(true);
      setP(1);
      return;
    }
    setReady(false);
    setP(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setP(t);
      if (t >= 1) {
        setReady(true);
        setP(1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms, active, reduced]);

  return { p, ready, reduced };
}

const PapyrusUnroll: React.FC<{ open: number; children: React.ReactNode }> = ({ open, children }) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(160);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const sync = () => setFull(el.scrollHeight);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  const t = Math.min(1, Math.max(0, open));
  const sliver = 120;
  const h = Math.round(sliver + (Math.max(full, sliver) - sliver) * t);

  return (
    <div className={`mn-papiro ${t >= 0.995 ? 'is-open' : ''}`}>
      <div className="mn-papiro-rod" aria-hidden />
      <div className="mn-papiro-well" style={t >= 0.995 ? undefined : { height: h, flex: 'none' }}>
        <div className="mn-papiro-page" ref={pageRef}>
          {children}
        </div>
      </div>
      <div className="mn-papiro-rod is-foot" aria-hidden />
    </div>
  );
};

const SageOnPaper: React.FC<{ kicker: string; step?: string }> = ({ kicker, step }) => (
  <div className="mn-papiro-head">
    <img src={ISO_NPC.sabio} alt="" className="mn-papiro-face mc-pixel" draggable={false} />
    <div className="mn-papiro-head-say">
      <p className="mn-papiro-who">Sábio</p>
      <p className="mn-papiro-kicker-line">
        {kicker}
        {step ? ` · ${step}` : ''}
      </p>
    </div>
  </div>
);

const ReadWaitButton: React.FC<{
  text?: string;
  min?: number;
  max?: number;
  active?: boolean;
  clock?: { p: number; ready: boolean; reduced: boolean };
  disabled?: boolean;
  className?: string;
  onFire: () => void;
  children: React.ReactNode;
}> = ({ text = '', min = 0, max = 0, active = true, clock, disabled, className, onFire, children }) => {
  const own = useReadWait(text, min, max, Boolean(active) && !clock);
  const p = clock?.p ?? own.p;
  const ready = clock?.ready ?? own.ready;
  const reduced = clock?.reduced ?? own.reduced;

  const locked = disabled || !ready;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (locked) return;
      e.preventDefault();
      onFire();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, onFire]);

  const dash = reduced ? 0 : Math.max(0, 100 - p * 100);

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => { if (!locked) onFire(); }}
      className={`mc-btn mc-btn-read ${!locked ? (className || 'mc-btn-green') : 'is-wait mc-btn-stone'} ${className?.includes('w-full') ? 'w-full' : ''} min-h-[44px] px-6`}
    >
      <span className="mc-read-ring" aria-hidden>
        <svg viewBox="0 0 200 48" preserveAspectRatio="none">
          <rect className="mc-read-track" x="3" y="3" width="194" height="42" rx="6" />
          <rect
            className="mc-read-fill"
            x="3"
            y="3"
            width="194"
            height="42"
            rx="6"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={dash}
          />
        </svg>
      </span>
      <span className="relative">{children}</span>
    </button>
  );
};

const DailyQuiz: React.FC<DailyQuizProps> = ({ onComplete, onPending, openRequested }) => {
  const { childUid } = useAuth();
  const { progress } = useData();
  const { economy, modules } = useVillage();
  const { playTaskComplete, playLevelUp, playClick, playProvaHit, playProvaMiss, setMusicDuck, isSoundEnabled } = useSound();

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
  const [judgeSay, setJudgeSay] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voiceDone, setVoiceDone] = useState(true);
  const prefetched = useRef(false);
  const stepLock = useRef(false);

  const lessonText = [quiz?.theme.lesson, quiz?.theme.whyItMatters, quiz?.theme.curiosity].filter(Boolean).join(' ');
  const lessonWait = useReadWait(
    lessonText,
    LESSON_READ_MS.min,
    LESSON_READ_MS.max,
    Boolean(enabled && open && quiz && phase === 'lesson'),
  );

  useEffect(() => {
    setMusicDuck('quiz', open);
    return () => setMusicDuck('quiz', false);
  }, [open, setMusicDuck]);

  useEffect(() => {
    if (!open) stopProvaVoice();
    return () => stopProvaVoice();
  }, [open]);

  useEffect(() => {
    if (!childUid || !enabled) return;
    const unsub = subscribeDailyQuiz(childUid, today, (q) => {
      setQuiz(q);
      setLoaded(true);
      // chave antiga gravada por engano (aba que virou a meia-noite) não pode manter o dia destrancado
      if (q && !q.completed) { localStorage.removeItem(QUIZ_DONE_KEY(childUid, today)); onPending?.(); }
    }, () => setLoaded(true));
    return () => { unsub(); setQuiz(null); };
  }, [childUid, today, enabled, onPending]);

  const prepare = useCallback(async () => {
    if (!childUid) return;
    setGenerating(true);
    setError(null);
    try {
      const q = await ensureDailyQuiz(childUid, today, today, count);
      setQuiz(q);
    } catch (e) {
      console.error('DailyQuiz: erro ao preparar a prova', e);
      setError('A mesa ainda está vazia. Tenta de novo.');
    } finally {
      setGenerating(false);
    }
  }, [childUid, today, count]);

  useEffect(() => {
    if (!loaded || !childUid || !enabled || prefetched.current) return;
    prefetched.current = true;
    if (!quiz || (quiz.questions.length === 0 && !quiz.completed)) void prepare();
    ensureDailyQuiz(childUid, addDays(today, 1), today, count).catch((e) => console.warn('DailyQuiz: prefetch de amanhã falhou', e));
  }, [loaded, childUid, enabled, quiz, prepare, today, count]);

  useEffect(() => {
    if (quizOpensOnRequest(openRequested)) setOpen(true);
  }, [openRequested]);

  useEffect(() => {
    if (!childUid || !quizDoneToday(quiz, today)) return;
    localStorage.setItem(QUIZ_DONE_KEY(childUid, today), '1');
    onComplete();
  }, [quiz, childUid, today, onComplete]);

  const ready = Boolean(quiz && quiz.questions.length > 0 && !quiz.completed);
  const question = quiz?.questions[current];
  const isLast = quiz ? current === quiz.questions.length - 1 : false;
  const canLeavePrompt = Boolean(quiz?.completed || !required || !ready);
  const canClose = Boolean(quiz?.completed && (phase === 'prompt' || paid));

  useEffect(() => {
    if (!open || !quiz || (phase !== 'lesson' && phase !== 'questions')) return;
    for (const q of quiz.questions) {
      if (q.explanation) prefetchVerdicts(q.explanation);
    }
  }, [open, phase, quiz]);

  const postpone = () => {
    playClick();
    stopProvaVoice();
    setVoiceDone(true);
    setOpen(false);
    if (!quiz?.completed) setPhase('prompt');
  };

  const start = () => {
    playClick();
    setPhase('lesson');
  };

  const choose = (option: string) => {
    if (selected || !question) return;
    setSelected(option);
    const ok = option === question.answer;
    if (ok) playProvaHit();
    else playProvaMiss();
    if (!isSoundEnabled) {
      setVoiceDone(true);
      return;
    }
    setVoiceDone(false);
    void speakProvaVerdict(question.explanation, true).finally(() => setVoiceDone(true));
  };

  const goNext = () => {
    if (!quiz || !question || !selected || stepLock.current) return;
    stepLock.current = true;
    playClick();
    stopProvaVoice();
    setVoiceDone(true);
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);
    if (!isLast) {
      setCurrent(current + 1);
      setSelected(null);
      stepLock.current = false;
      return;
    }
    const correct = nextAnswers.filter((a, i) => quiz.questions[i] && a === quiz.questions[i].answer).length;
    setScore(correct);
    setReward(quizRewards(correct, quiz.questions.length, economy));
    setPhase('results');
  };

  const conclude = async () => {
    if (!quiz || !childUid || paid || saving || !reflectionOk(reflection, {
      prompt: quiz.reflectionPrompt,
      title: quiz.theme.title,
      lesson: quiz.theme.lesson,
    })) return;
    setSaving(true);
    setJudgeSay(null);
    try {
      const verdict = await judgeReflection({
        text: reflection,
        prompt: quiz.reflectionPrompt,
        title: quiz.theme.title,
        lesson: quiz.theme.lesson,
        forceOffline: modules.aiGeneration === false,
      });
      if (!verdict.ok) {
        playProvaMiss();
        setJudgeSay(verdict.say);
        return;
      }
      const finalAnswers = answers;
      const correct = finalAnswers.filter((a, i) => quiz.questions[i] && a === quiz.questions[i].answer).length;
      const total = quiz.questions.length;
      const r = quizRewards(correct, total, economy);
      setScore(correct);
      setReward(r);
      await completeDailyQuiz(childUid, today, {
        score: correct,
        totalQuestions: total,
        xpEarned: r.xp,
        goldEarned: r.gold,
        answers: finalAnswers,
        reflection,
        reflectionNote: verdict.say,
      });
      await FirestoreService.payQuizRewards(childUid, today, r.xp, r.gold);
      if (correct / total >= 0.75) playLevelUp();
      else playTaskComplete();
      setPaid(true);
      localStorage.setItem(QUIZ_DONE_KEY(childUid, today), '1');
      onComplete();
    } catch (e) {
      console.error('DailyQuiz: erro ao salvar resultado', e);
      toast.error('A mesa não gravou. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (canClose || (phase === 'prompt' && canLeavePrompt)) postpone();
        return;
      }
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (phase === 'prompt' && ready && !quiz?.completed) {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!enabled || !open || !quiz) return null;

  const explainText = selected && question ? question.explanation : '';
  const aboutReflect = {
    prompt: quiz.reflectionPrompt,
    title: quiz.theme.title,
    lesson: quiz.theme.lesson,
  };
  const canDeliver = reflectionOk(reflection, aboutReflect);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 pb-24 sm:p-4 sm:pb-24 mn-veil">
        <div className="mc-modal mn-prova-sheet is-scroll mc-pop mn-child-sheet w-full max-w-3xl" role="dialog" aria-label="Prova do dia">
          <div className="mn-child-body">
            <div className="mn-prova-scroll-scene">
              <PapyrusUnroll open={phase === 'lesson' ? lessonWait.p : 1}>
                {phase === 'prompt' && (
                  <>
                    <SageOnPaper kicker="Prova do dia" />
                    {quiz.completed ? (
                      <>
                        <h3 className="mn-papiro-title">A prova de hoje fechou</h3>
                        <p>{quiz.score ?? score} de {quiz.totalQuestions || quiz.questions.length || count}. O Sábio já leu.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="mn-papiro-title">
                          {required ? 'A prova de hoje ainda espera' : 'A prova de hoje está na Biblioteca'}
                        </h3>
                        <p>
                          {ready
                            ? 'Uma ideia na mesa e oito perguntas. A Mina abre depois.'
                            : generating
                              ? 'O Sábio ainda escreve. Um instante.'
                              : error ?? 'A mesa ainda está vazia.'}
                        </p>
                      </>
                    )}
                  </>
                )}

                {phase === 'lesson' && (
                  <>
                    <SageOnPaper kicker="Ideia do dia" />
                    <h3 className="mn-papiro-title">{quiz.theme.title}</h3>
                    <p>{quiz.theme.lesson}</p>
                    {quiz.theme.whyItMatters && (
                      <p className="mn-papiro-why">{quiz.theme.whyItMatters}</p>
                    )}
                    {quiz.theme.curiosity && (
                      <div className="mn-papiro-canto">
                        <p className="mc-lbl mb-1">No canto da mesa</p>
                        <p>{quiz.theme.curiosity}</p>
                      </div>
                    )}
                  </>
                )}

                {phase === 'questions' && question && (
                  <>
                    <SageOnPaper
                      kicker={question.kind === 'lesson' ? 'Sobre a ideia' : question.subject}
                      step={`${current + 1} de ${quiz.questions.length}`}
                    />
                    <h3 className="mn-papiro-title">{question.question}</h3>
                    <div className="mn-prova-opts">
                      {question.options.map((option, i) => {
                        const isCorrect = option === question.answer;
                        const isChosen = option === selected;
                        let rowClass = 'mn-prova-opt';
                        if (selected) {
                          if (isCorrect) rowClass += ' is-right';
                          else if (isChosen) rowClass += ' is-wrong';
                          else rowClass += ' is-dim';
                        }
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => choose(option)}
                            aria-disabled={Boolean(selected)}
                            className={rowClass}
                          >
                            <span className="mn-prova-opt-letter">{String.fromCharCode(65 + i)}</span>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selected && (
                      <div
                        className="mn-papiro-explain"
                        ref={(el) => { el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }}
                      >
                        <p className="mn-papiro-why">{selected === question.answer ? 'Isso.' : 'Não foi dessa vez.'}</p>
                        <p>{question.explanation}</p>
                      </div>
                    )}
                  </>
                )}

                {phase === 'results' && (
                  <>
                    {paid ? (
                      <>
                        <SageOnPaper kicker="Na mesa" />
                        <p className="mn-papiro-title">{score} de {quiz.questions.length}</p>
                        <div className="flex gap-3 my-3 mc-pop">
                          <span className="mc-slot flex items-center gap-1.5 px-3 py-2">
                            <img src={STAR} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                            <span className="text-sm mc-good">+{reward.xp} XP</span>
                          </span>
                          <span className="mc-slot flex items-center gap-1.5 px-3 py-2">
                            <img src={GOLD} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                            <span className="text-sm mc-warn">+{reward.gold} GOLD</span>
                          </span>
                        </div>
                        <p>{judgeSay || 'O Sábio leu. A Mina abre.'}</p>
                      </>
                    ) : (
                      <>
                        <SageOnPaper kicker="O Sábio pergunta" />
                        <p className="mn-papiro-why">{quiz.reflectionPrompt}</p>
                        <textarea
                          value={reflection}
                          onChange={(e) => {
                            setReflection(e.target.value);
                            if (judgeSay) setJudgeSay(null);
                          }}
                          placeholder="Com as suas palavras."
                          rows={4}
                          className="mn-papiro-write"
                        />
                        {judgeSay && (
                          <div className="mn-papiro-explain">
                            <p className="mn-papiro-why">{judgeSay}</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </PapyrusUnroll>
            </div>
          </div>

          <div className="mn-child-foot">
            {phase === 'prompt' && quiz.completed && (
              <button type="button" onClick={postpone} className="mc-btn mc-btn-stone min-h-[44px] px-6">
                Voltar à Vila
              </button>
            )}
            {phase === 'prompt' && !quiz.completed && (
              <>
                <button
                  type="button"
                  onClick={() => { if (ready) start(); else void prepare(); }}
                  disabled={generating}
                  className="mc-btn mc-btn-green min-h-[44px] px-6"
                >
                  {ready ? 'Abrir a mesa' : generating ? 'Escrevendo...' : 'Tentar de novo'}
                </button>
                {canLeavePrompt && (
                  <button type="button" onClick={postpone} className="mc-btn mc-btn-stone min-h-[44px] px-6">
                    Voltar à Vila
                  </button>
                )}
              </>
            )}
            {phase === 'lesson' && (
              <ReadWaitButton
                clock={lessonWait}
                className="mc-btn-green"
                onFire={() => {
                  playClick();
                  setPhase('questions');
                }}
              >
                Começar
              </ReadWaitButton>
            )}
            {phase === 'questions' && (
              <ReadWaitButton
                text={explainText || question?.question || ''}
                min={EXPLAIN_READ_MS.min}
                max={EXPLAIN_READ_MS.max}
                active={Boolean(selected)}
                disabled={!selected || saving || !voiceDone}
                className="mc-btn-green"
                onFire={goNext}
              >
                {isLast ? 'Escrever' : 'Próxima'}
              </ReadWaitButton>
            )}
            {phase === 'results' && (paid ? (
              <button type="button" onClick={postpone} className="mc-btn mc-btn-stone min-h-[44px] px-6">
                Voltar à Vila
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { void conclude(); }}
                disabled={saving || !canDeliver}
                className={`mc-btn min-h-[44px] px-6 ${canDeliver && !saving ? 'mc-btn-green' : 'mc-btn-stone'}`}
              >
                {saving ? 'O Sábio lê...' : 'Entregar'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default DailyQuiz;
