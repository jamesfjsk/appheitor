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
import { addDays, completeDailyQuiz, ensureDailyQuiz, payThenComplete, quizRewards, regenerateDailyQuiz, shouldOpenReflection, stashQuizAnswers, subscribeDailyQuiz, type QuizTiming } from '../../services/dailyQuizService';
import { prepareTodayThenTomorrow } from '../../services/quiz/prefetch';
import { freshQuizUi } from '../../services/quiz/closeQuiz';
import { judgeReflection, type ReflectionJudge } from '../../services/aiDailyQuiz';
import { DAILY_QUIZ_QUESTIONS } from '../../config/rules';
import { quizDoneToday, quizOpensOnRequest } from '../../services/village/quizGate';
import { setAppBusy } from '../../services/appUpdate';
import { EXPLAIN_READ_MS, LESSON_READ_MS, quizScoreOf, readingMs, readRingDash, reflectionOk, SAGE_DOT_MS, SAGE_LINE_MS, sageReadFrame, sageReadSpeech } from '../../services/quiz/provaRules';
import { prefetchLesson, prefetchVerdicts, speakProvaLesson, speakProvaVerdict, stopProvaVoice } from '../../services/quiz/provaSpeak';
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

const SageOnPaper: React.FC<{ kicker: string; step?: string; reading?: boolean }> = ({ kicker, step, reading }) => (
  <div className="mn-papiro-head">
    <img src={ISO_NPC.sabio} alt="" className={`mn-papiro-face mc-pixel${reading ? ' is-reading' : ''}`} draggable={false} />
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

  const dash = readRingDash(p, reduced, locked);

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
  const { playTaskComplete, playLevelUp, playClick, playProvaHit, playProvaMiss, playQuill, setMusicDuck, isSoundEnabled } = useSound();
  const reducedMotion = useReducedMotion();

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
  const [readMs, setReadMs] = useState(0);
  const [pendingVerdict, setPendingVerdict] = useState<ReflectionJudge | null>(null);
  const readGen = useRef(0);
  const readStarted = useRef(0);
  const verdictAt = useRef<number | null>(null);
  const pendingRef = useRef<ReflectionJudge | null>(null);
  const revealLock = useRef(false);
  const [voiceDone, setVoiceDone] = useState(true);
  const prefetched = useRef<string | null>(null);
  const askedAt = useRef(0);
  const choseAt = useRef(0);
  const timingsRef = useRef<QuizTiming[]>([]);
  const stepLock = useRef(false);
  const voiceTick = useRef(0);

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
    const busy = open && (phase === 'lesson' || phase === 'questions' || (phase === 'results' && !paid));
    setAppBusy('quiz', busy);
    return () => setAppBusy('quiz', false);
  }, [open, phase, paid]);

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
    // por dia, não por montagem: a aba que fica aberta na virada precisa preparar a prova nova e a de amanhã
    if (!loaded || !childUid || !enabled || prefetched.current === today) return;
    prefetched.current = today;
    const regen = import.meta.env.DEV && new URLSearchParams(window.location.search).get('quiz') === 'regen';
    if (regen && !quiz?.completed) {
      void regenerateDailyQuiz(childUid, today, today, count)
        .then((q) => {
          setQuiz(q);
          if (import.meta.env.DEV) {
            const w = window as unknown as { __lastQuiz?: typeof q; __quizEpoch?: number };
            w.__lastQuiz = q;
            w.__quizEpoch = (w.__quizEpoch ?? 0) + 1;
          }
        })
        .catch((e) => console.warn('DailyQuiz: regen falhou', e));
      return;
    }
    const needsToday = !quiz || (quiz.questions.length === 0 && !quiz.completed);
    void prepareTodayThenTomorrow({
      needsToday,
      prepare,
      prefetchTomorrow: () => ensureDailyQuiz(childUid, addDays(today, 1), today, count),
    }).catch((e) => console.warn('DailyQuiz: prefetch de amanhã falhou', e));
  }, [loaded, childUid, enabled, quiz, prepare, today, count]);

  useEffect(() => {
    if (import.meta.env.DEV && quiz) {
      (window as unknown as { __lastQuiz?: DailyQuizDoc }).__lastQuiz = quiz;
    }
  }, [quiz]);

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
  const canLeaveReflection = Boolean(quiz && shouldOpenReflection(quiz) && phase === 'results' && !paid);
  const canClose = Boolean((quiz?.completed && (phase === 'prompt' || paid)) || canLeaveReflection);
  const lessonKey = quiz
    ? [quiz.theme.title, quiz.theme.lesson, quiz.theme.whyItMatters, quiz.theme.curiosity].join('\n')
    : '';

  useEffect(() => {
    if (!open || phase === 'prompt') return;
    if (!quiz?.theme.lesson) return;
    prefetchLesson(quiz.theme);
    for (const q of quiz.questions) {
      if (q.explanation) prefetchVerdicts(q.explanation);
    }
  }, [open, phase, quiz?.id, lessonKey, quiz]);

  useEffect(() => {
    if (!open || phase !== 'lesson' || !quiz?.theme.lesson) return;
    const tick = ++voiceTick.current;
    const theme = quiz.theme;
    if (!isSoundEnabled) {
      setVoiceDone(true);
      return;
    }
    setVoiceDone(false);
    void speakProvaLesson(theme, true, () => voiceTick.current !== tick).finally(() => {
      if (voiceTick.current === tick) setVoiceDone(true);
    });
    return () => {
      voiceTick.current += 1;
      stopProvaVoice();
    };
  }, [open, phase, lessonKey, isSoundEnabled, quiz?.theme.title, quiz?.theme.lesson, quiz?.theme.whyItMatters, quiz?.theme.curiosity]);

  const postpone = () => {
    playClick();
    readGen.current += 1;
    pendingRef.current = null;
    setPendingVerdict(null);
    setSaving(false);
    voiceTick.current += 1;
    stopProvaVoice();
    setVoiceDone(true);
    setOpen(false);
    if (!quiz?.completed) setPhase('prompt');
  };

  const start = () => {
    playClick();
    if (quiz && shouldOpenReflection(quiz)) {
      setPhase('results');
      return;
    }
    setPhase('lesson');
  };

  useEffect(() => {
    const ui = freshQuizUi();
    setCurrent(ui.current);
    setSelected(ui.selected);
    setAnswers(ui.answers);
    setScore(ui.score);
    setReward(ui.reward);
    setReflection(ui.reflection);
    setJudgeSay(ui.judgeSay);
    setPaid(ui.paid);
    setPhase(ui.phase);
    timingsRef.current = [];
    askedAt.current = 0;
    choseAt.current = 0;
    stepLock.current = false;
    revealLock.current = false;
    readGen.current += 1;
    pendingRef.current = null;
    setPendingVerdict(null);
    setSaving(false);
  }, [today]);

  useEffect(() => {
    if (!quiz || !shouldOpenReflection(quiz)) return;
    const stored = quiz.answers ?? [];
    setAnswers(stored);
    const scored = typeof quiz.score === 'number'
      ? { correct: quiz.score, total: quiz.totalQuestions ?? quizScoreOf(quiz.questions, stored).total }
      : quizScoreOf(quiz.questions, stored);
    setScore(scored.correct);
    setReward(quizRewards(scored.correct, scored.total, economy));
    if (open) setPhase('results');
  }, [quiz, open, economy]);

  useEffect(() => {
    if (phase !== 'questions' || selected) return;
    askedAt.current = performance.now();
  }, [phase, current, selected]);

  useEffect(() => {
    if (!quiz?.awaitingReflection) return;
    const stored = quiz.timings;
    if (!stored?.length || timingsRef.current.length >= stored.length) return;
    timingsRef.current = stored;
  }, [quiz]);

  const choose = (option: string) => {
    if (selected || !question) return;
    choseAt.current = performance.now();
    setSelected(option);
    const ok = option === question.answer;
    if (question.kind === 'dilemma') playClick();
    else if (ok) playProvaHit();
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
    const msToAnswer = Math.max(1, Math.round(choseAt.current - askedAt.current));
    const msReadingExplain = Math.max(1, Math.round(performance.now() - choseAt.current));
    const nextTimings = timingsRef.current.slice();
    while (nextTimings.length < current) nextTimings.push({ msToAnswer: 0, msReadingExplain: 0 });
    nextTimings[current] = { msToAnswer, msReadingExplain };
    timingsRef.current = nextTimings;
    setAnswers(nextAnswers);
    if (!isLast) {
      setCurrent(current + 1);
      setSelected(null);
      stepLock.current = false;
      return;
    }
    const scored = quizScoreOf(quiz.questions, nextAnswers);
    setScore(scored.correct);
    setReward(quizRewards(scored.correct, scored.total, economy));
    setPhase('results');
    if (childUid) {
      void stashQuizAnswers(childUid, today, nextAnswers, scored.correct, scored.total, timingsRef.current).catch((e) => {
        console.warn('DailyQuiz: não deu para guardar as respostas', e);
      });
    }
  };

  const conclude = async () => {
    if (!quiz || !childUid || paid || saving || !reflectionOk(reflection, {
      prompt: quiz.reflectionPrompt,
      title: quiz.theme.title,
      lesson: quiz.theme.lesson,
    })) return;
    const gen = ++readGen.current;
    revealLock.current = false;
    verdictAt.current = null;
    pendingRef.current = null;
    setPendingVerdict(null);
    setJudgeSay(null);
    readStarted.current = performance.now();
    setReadMs(0);
    setSaving(true);
    playQuill();
    try {
      const verdict = await judgeReflection({
        text: reflection,
        prompt: quiz.reflectionPrompt,
        title: quiz.theme.title,
        lesson: quiz.theme.lesson,
        forceOffline: modules.aiGeneration === false,
      });
      if (gen !== readGen.current) return;
      pendingRef.current = verdict;
      verdictAt.current = performance.now() - readStarted.current;
      setPendingVerdict(verdict);
    } catch (e) {
      if (gen !== readGen.current) return;
      console.error('DailyQuiz: erro ao salvar resultado', e);
      toast.error('A mesa não gravou. Tenta de novo.');
      setSaving(false);
    }
  };

  const revealRef = useRef<() => void>(() => {});
  revealRef.current = () => {
    if (revealLock.current) return;
    const verdict = pendingRef.current;
    if (!verdict || !quiz || !childUid) return;
    const gen = readGen.current;
    revealLock.current = true;
    if (verdict.ok) playProvaHit();
    else playProvaMiss();
    const hold = 1200;
    window.setTimeout(() => {
      if (readGen.current !== gen) return;
      if (!verdict.ok) {
        setJudgeSay(verdict.say);
        pendingRef.current = null;
        setPendingVerdict(null);
        setSaving(false);
        return;
      }
      const finalAnswers = answers;
      const scored = quizScoreOf(quiz.questions, finalAnswers);
      const correct = scored.correct;
      const total = scored.total;
      const r = quizRewards(correct, total, economy);
      void (async () => {
        try {
          await payThenComplete(
            () => FirestoreService.payQuizRewards(childUid, today, r.xp, r.gold),
            () => completeDailyQuiz(childUid, today, {
              score: correct,
              totalQuestions: total,
              xpEarned: r.xp,
              goldEarned: r.gold,
              answers: finalAnswers,
              reflection,
              reflectionNote: verdict.say,
              about: {
                prompt: quiz.reflectionPrompt,
                title: quiz.theme.title,
                lesson: quiz.theme.lesson,
              },
              timings: timingsRef.current,
            }),
          );
          if (readGen.current !== gen) return;
          setScore(correct);
          setReward(r);
          if (total > 0 && correct / total >= 0.75) playLevelUp();
          else playTaskComplete();
          setJudgeSay(verdict.say);
          setPaid(true);
          localStorage.setItem(QUIZ_DONE_KEY(childUid, today), '1');
          onComplete();
          setSaving(false);
        } catch (e) {
          if (readGen.current !== gen) return;
          console.error('DailyQuiz: erro ao salvar resultado', e);
          toast.error('A mesa não gravou. Tenta de novo.');
          revealLock.current = false;
          setSaving(false);
        }
      })();
    }, hold);
  };

  useEffect(() => {
    if (!saving) return;
    let dead = false;
    let timer = 0;
    const arm = () => {
      if (dead) return;
      const elapsed = performance.now() - readStarted.current;
      setReadMs(elapsed);
      const frame = sageReadFrame(elapsed, verdictAt.current);
      if (frame.kind === 'verdict' && pendingRef.current) {
        revealRef.current();
        return;
      }
      const nextLine = (Math.floor(elapsed / SAGE_LINE_MS) + 1) * SAGE_LINE_MS;
      const nextDot = (Math.floor(elapsed / SAGE_DOT_MS) + 1) * SAGE_DOT_MS;
      timer = window.setTimeout(arm, Math.max(40, Math.min(nextLine, nextDot) - elapsed));
    };
    arm();
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [saving, pendingVerdict]);

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

  const readFrame = saving ? sageReadFrame(readMs, verdictAt.current) : null;

  if (!enabled || !open || !quiz) return null;

  const explainText = selected && question ? question.explanation : '';
  const aboutReflect = {
    prompt: quiz.reflectionPrompt,
    title: quiz.theme.title,
    lesson: quiz.theme.lesson,
  };
  const counted = quizScoreOf(quiz.questions, quiz.answers?.length ? quiz.answers : answers);
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
                        <p>{quiz.score ?? score} de {counted.total}. O Sábio já leu.</p>
                      </>
                    ) : shouldOpenReflection(quiz) ? (
                      <>
                        <h3 className="mn-papiro-title">As oito respostas estão na mesa</h3>
                        <p>Falta a frase para o Sábio. A Mina ainda espera.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="mn-papiro-title">
                          {required ? 'A prova de hoje ainda espera' : 'A prova de hoje está na Biblioteca'}
                        </h3>
                        <p>
                          {ready
                            ? `Uma ideia na mesa e ${quiz.questions.length} perguntas. A Mina abre depois.`
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
                      kicker={question.kind === 'dilemma' ? 'E você?' : question.kind === 'lesson' ? 'Sobre a ideia' : question.subject}
                      step={`${current + 1} de ${quiz.questions.length}`}
                    />
                    <h3 className="mn-papiro-title">{question.question}</h3>
                    <div className="mn-prova-opts">
                      {question.options.map((option, i) => {
                        const isCorrect = option === question.answer;
                        const isChosen = option === selected;
                        let rowClass = 'mn-prova-opt';
                        if (selected && question.kind !== 'dilemma') {
                          if (isCorrect) rowClass += ' is-right';
                          else if (isChosen) rowClass += ' is-wrong';
                          else rowClass += ' is-dim';
                        } else if (selected && question.kind === 'dilemma') {
                          if (isChosen) rowClass += ' is-right';
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
                        {question.kind !== 'dilemma' && (
                          <p className="mn-papiro-why">{selected === question.answer ? 'Isso.' : 'Não foi dessa vez.'}</p>
                        )}
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
                        <p className="mn-papiro-title">{score} de {counted.total}</p>
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
                        <p className="mn-sabio-line">{judgeSay || 'O Sábio leu. A Mina abre.'}</p>
                      </>
                    ) : (
                      <>
                        <SageOnPaper kicker="O Sábio pergunta" reading={readFrame?.kind === 'line'} />
                        {readFrame?.kind === 'line' && (
                          <p
                            key={readFrame.index}
                            className="mn-papiro-why mn-sabio-line"
                            data-sage={String(readFrame.index)}
                            aria-live="polite"
                          >
                            {sageReadSpeech(
                              readFrame.text,
                              Math.max(0, readMs - readFrame.index * SAGE_LINE_MS),
                              reducedMotion,
                            )}
                          </p>
                        )}
                        {readFrame?.kind === 'verdict' && pendingVerdict && (
                          <p key="veredito" className="mn-papiro-why mn-sabio-line" data-sage="verdict">
                            {pendingVerdict.say}
                          </p>
                        )}
                        {!saving && <p className="mn-papiro-why">{quiz.reflectionPrompt}</p>}
                        <textarea
                          value={reflection}
                          readOnly={saving}
                          onChange={(e) => {
                            setReflection(e.target.value);
                            if (judgeSay) setJudgeSay(null);
                          }}
                          placeholder="Com as suas palavras."
                          rows={4}
                          className={`mn-papiro-write${saving ? ' is-held' : ''}`}
                        />
                        {!saving && judgeSay && (
                          <div className="mn-papiro-explain mn-sabio-line">
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
                  {shouldOpenReflection(quiz) ? 'Escrever para o Sábio' : ready ? 'Abrir a mesa' : generating ? 'Escrevendo...' : 'Tentar de novo'}
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
                  voiceTick.current += 1;
                  stopProvaVoice();
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
            ) : saving ? (
              <button type="button" onClick={postpone} className="mc-btn mc-btn-stone min-h-[44px] px-6">
                Voltar à Vila
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { void conclude(); }}
                  disabled={!canDeliver}
                  className={`mc-btn min-h-[44px] px-6 ${canDeliver ? 'mc-btn-green' : 'mc-btn-stone'}`}
                >
                  Entregar
                </button>
                <button type="button" onClick={postpone} className="mc-btn mc-btn-stone min-h-[44px] px-6">
                  Voltar à Vila
                </button>
              </>
            ))}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default DailyQuiz;
