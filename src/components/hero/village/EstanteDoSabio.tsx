// ========================================
// Estante do Sábio: contar um livro e, se o Sábio acreditar, conversar.
// A pergunta de fato não trava mais o relato. A conversa vem depois do pagamento.
// Regras puras em services/village/books.ts e bookTalk.ts; Firestore em bookService.ts.
// ========================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useClock } from '../../../contexts/ClockContext';
import { useSound } from '../../../contexts/SoundContext';
import { useVillage } from '../../../contexts/VillageContext';
import { ISO_NPC } from '../../../config/village';
import { setAppBusy } from '../../../services/appUpdate';
import { childAgeToday } from '../../../config/rules';
import type { BookDoc, BookJudge, BookReportDoc, BookTalk } from '../../../types';
import {
  BOOK_EASY_BOOKS,
  BOOK_MOLDE,
  LIKED_LABELS,
  SABIO_LENDO_MIN_MS,
  bookWordCount,
  claimKeyForBookDay,
  daysBetween,
  goldForBook,
  localCheck,
  minWordsFor,
  priorRefusalsOf,
  readingLineAt,
  reportBlocksRetell,
  returnedSay,
  verdictOf,
} from '../../../services/village/books';
import {
  SAGE_NUDGE,
  answerMissesStory,
  closingSpeech,
  localFullClosing,
  needsNudge,
  talkStep,
} from '../../../services/village/bookTalk';
import {
  addBook,
  fetchSageClosing,
  fetchSageFollow,
  fetchSageQuestion,
  finishBookTalk,
  judgeBook,
  payBookReport,
  saveBookReport,
  saveBookTalk,
  subscribeBookReports,
  subscribeBooks,
} from '../../../services/bookService';
import { speakProvaVerdict, stopProvaVoice } from '../../../services/quiz/provaSpeak';
import ChildSheet from './ChildSheet';

const GOLD = '/assets/english/ui/gold.webp';
const SPINE_COLORS = ['#7a4a2b', '#2f5d8a', '#8a2f3c', '#3d6b3a', '#6b4a8a', '#8a6b2f', '#2f7a7a', '#5a5a5a'];
const FACES: Array<{ label: (typeof LIKED_LABELS)[number]; glyph: string }> = [
  { label: 'Não gostei', glyph: '😕' },
  { label: 'Gostei', glyph: '🙂' },
  { label: 'Gostei muito', glyph: '😄' },
  { label: 'Amei', glyph: '🤩' },
];

type Phase = 'shelf' | 'propose' | 'form' | 'reading' | 'result' | 'talk' | 'talk-wait' | 'talk-done';

interface ResultState {
  say: string;
  accepted: boolean;
  gold: number;
  needsParent: boolean;
  reportId: string;
  canTalk: boolean;
}

interface RecAlt {
  transcript: string;
}
interface RecEvent {
  results: ArrayLike<ArrayLike<RecAlt>>;
}
interface BrowserRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: RecEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecCtor = new () => BrowserRec;

function speechCtor(): RecCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function micAvailable(): Promise<boolean> {
  if (!speechCtor() || !navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const list = await navigator.mediaDevices.enumerateDevices();
    return list.some((d) => d.kind === 'audioinput');
  } catch {
    return false;
  }
}

interface Props {
  onClose: () => void;
  quizLocked: boolean;
}

const SageHead: React.FC<{ kicker: string; reading?: boolean }> = ({ kicker, reading }) => (
  <div className="mn-papiro-head">
    <img src={ISO_NPC.sabio} alt="" className={`mn-papiro-face mc-pixel${reading ? ' is-reading' : ''}`} draggable={false} />
    <div className="mn-papiro-head-say">
      <p className="mn-papiro-who">Sábio</p>
      <p className="mn-papiro-kicker-line">{kicker}</p>
    </div>
  </div>
);

const Papiro: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mn-papiro is-open">
    <div className="mn-papiro-rod" aria-hidden />
    <div className="mn-papiro-well">
      <div className="mn-papiro-page">{children}</div>
    </div>
    <div className="mn-papiro-rod is-foot" aria-hidden />
  </div>
);

function Shelf({ books, pending, onTalk }: { books: BookDoc[]; pending: Set<string>; onTalk: (b: BookDoc) => void }) {
  if (books.length === 0) {
    return <p className="text-sm mc-muted">A estante está vazia. Quando terminar um livro, vem me contar.</p>;
  }
  const shown = books.slice(0, 12);
  const more = books.length - shown.length;
  return (
    <div className="mc-inv p-2">
      <div className="flex items-end gap-1 overflow-x-auto pb-1" data-testid="estante-lombadas">
        {shown.map((b, i) => {
          const wait = pending.has(b.id);
          const spine = (
            <span
              className="mc-pixel shrink-0 flex items-end justify-center"
              style={{
                width: wait ? 44 : 26,
                height: 84 + (i % 3) * 8,
                background: SPINE_COLORS[i % SPINE_COLORS.length],
                border: '2px solid #1a1008',
                borderRadius: 3,
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="text-white font-bold"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, lineHeight: 1, padding: '6px 0', maxHeight: 76, overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                {b.title}
              </span>
            </span>
          );
          if (!wait) {
            return (
              <div key={b.id} title={b.title} className="shrink-0">
                {spine}
              </div>
            );
          }
          return (
            <button
              key={b.id}
              type="button"
              className="shrink-0 flex flex-col items-center gap-1 bg-transparent border-0 p-0 cursor-pointer"
              style={{ width: 96 }}
              onClick={() => onTalk(b)}
              data-testid={`lombada-conversa-${b.id}`}
              aria-label={`${b.title}. O Sábio quer conversar`}
            >
              {spine}
              <span className="mc-warn text-center font-semibold" style={{ fontSize: 11, lineHeight: 1.25 }}>
                O Sábio quer conversar
              </span>
            </button>
          );
        })}
        {more > 0 && <span className="mc-num self-center" style={{ fontSize: 11 }}>+{more}</span>}
      </div>
      <p className="text-xs mc-muted mt-1">{books.length === 1 ? '1 livro lido' : `${books.length} livros lidos`}</p>
    </div>
  );
}

const EstanteDoSabio: React.FC<Props> = ({ onClose, quizLocked }) => {
  const { childUid } = useAuth();
  const { today } = useClock();
  const { village } = useVillage();
  const { playClick, playTaskComplete, playProvaMiss, isSoundEnabled } = useSound();

  const [books, setBooks] = useState<BookDoc[]>([]);
  const [reports, setReports] = useState<BookReportDoc[]>([]);
  const [phase, setPhase] = useState<Phase>('shelf');
  const [book, setBook] = useState<BookDoc | null>(null);
  const [liked, setLiked] = useState<0 | 1 | 2 | 3 | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [pasted, setPasted] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const [readingMs, setReadingMs] = useState(0);
  const [result, setResult] = useState<ResultState | null>(null);
  const [busy, setBusy] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propPages, setPropPages] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [talk, setTalk] = useState<BookTalk | null>(null);
  const [draft, setDraft] = useState('');
  const [nudgeUsed, setNudgeUsed] = useState(false);
  const [nudgeLine, setNudgeLine] = useState<string | null>(null);
  const [xpJust, setXpJust] = useState(0);
  const [canMic, setCanMic] = useState(false);
  const [heardSage, setHeardSage] = useState(false);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const typingStart = useRef<number | null>(null);
  const readingStart = useRef(0);
  const skipRef = useRef(false);
  const recRef = useRef<BrowserRec | null>(null);

  const stopRec = () => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.stop(); } catch { /* já parado */ }
    setListening(false);
  };

  useEffect(() => {
    setAppBusy('book', text.trim().length > 0);
    return () => setAppBusy('book', false);
  }, [text]);

  useEffect(() => {
    if (!childUid) return;
    const a = subscribeBooks(childUid, setBooks, () => undefined);
    const b = subscribeBookReports(childUid, setReports, () => undefined);
    return () => { a(); b(); };
  }, [childUid]);

  useEffect(() => {
    if (phase !== 'reading' && phase !== 'talk-wait') return;
    readingStart.current = performance.now();
    setReadingMs(0);
    const id = window.setInterval(() => setReadingMs(performance.now() - readingStart.current), 400);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => () => {
    stopProvaVoice();
    const rec = recRef.current;
    if (!rec) return;
    try { rec.stop(); } catch { /* já parado */ }
  }, []);

  const done = useMemo(() => books.filter((b) => b.status === 'done').sort((a, b) => (b.doneOn || '').localeCompare(a.doneOn || '')), [books]);
  const toRead = useMemo(() => books.filter((b) => b.status === 'to_read'), [books]);
  const dayUsed = Boolean(village.claimed?.[claimKeyForBookDay(today)]);
  const minWords = minWordsFor(done.length);
  const words = bookWordCount(text);
  const acceptedOf = (b: BookDoc) => reports.find((r) => r.accepted && (r.bookId === b.id || r.titleKey === b.titleKey));
  const pendingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of done) {
      const r = reports.find((x) => x.accepted && (x.bookId === b.id || x.titleKey === b.titleKey));
      if (r && !r.talk?.doneAt) ids.add(b.id);
    }
    return ids;
  }, [done, reports]);
  const lastReply = done.find((b) => b.parentReply);
  const returnedNote = reports.find((r) => r.parentDecision === 'returned' && r.parentReply);
  const returnedOf = (b: BookDoc) => reports.find((r) =>
    (r.bookId === b.id || r.titleKey === b.titleKey) && r.parentDecision === 'returned' && r.parentReply,
  )?.parentReply;
  const replyAfterTalk = Boolean(lastReply && reports.some((r) => r.accepted && (r.bookId === lastReply.id || r.titleKey === lastReply.titleKey) && r.talk?.doneAt));

  const sageNow = talk ? ([...talk.turns].reverse().find((t) => t.by === 'sabio')?.text || talk.question) : '';
  useEffect(() => { setHeardSage(false); }, [sageNow]);
  const doneSpeech = talk?.closing ? closingSpeech(talk.closing) : '';
  const voiceLine = phase === 'talk' ? (nudgeLine || sageNow) : phase === 'talk-done' ? doneSpeech : '';

  useEffect(() => {
    if (!voiceLine || !isSoundEnabled) return undefined;
    void speakProvaVerdict(voiceLine, true);
    return () => { stopProvaVoice(); };
  }, [voiceLine, isSoundEnabled]);

  const backToShelf = () => {
    playClick();
    skipRef.current = true;
    stopRec();
    stopProvaVoice();
    setPhase('shelf');
    setSay(null);
    setResult(null);
    setNudgeLine(null);
    setMicNote(null);
  };

  const startForm = (b: BookDoc) => {
    playClick();
    const waitingDad = reports.some((r) =>
      (r.bookId === b.id || r.titleKey === b.titleKey) && reportBlocksRetell(r),
    );
    if (waitingDad) {
      setSay('Seu pai ainda vai ler o que você contou. Espera a resposta dele.');
      return;
    }
    setBook(b);
    setLiked(null);
    setRating(null);
    setText('');
    setPasted(false);
    setSay(null);
    setResult(null);
    setTalk(null);
    setDraft('');
    typingStart.current = null;
    setPhase('form');
  };

  const propose = async () => {
    if (!childUid) return;
    playClick();
    setBusy(true);
    try {
      await addBook(childUid, { title: propTitle, pages: Number(propPages), addedBy: 'child', today });
      toast.success('Livro na estante. Quando terminar, vem me contar.');
      setPropTitle('');
      setPropPages('');
      setPhase('shelf');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para guardar o livro');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (j: BookJudge) => {
    if (!childUid || !book) return;
    const gold = goldForBook(book);
    const v = verdictOf({
      judge: j,
      verifyOk: null,
      title: book.title,
      gold,
      priorRefusals: priorRefusalsOf(reports, book),
    });
    const childHold = v.accepted && book.addedBy === 'child';
    const needsParent = v.needsParent || childHold;
    const accepted = v.accepted && !needsParent;
    const attempt = reports.filter((r) => r.bookId === book.id || r.titleKey === book.titleKey).length + 1;
    const typedMs = typingStart.current ? Math.round(performance.now() - typingStart.current) : 0;
    const id = await saveBookReport(childUid, {
      bookId: book.id,
      title: book.title,
      titleKey: book.titleKey,
      liked: liked ?? 1,
      rating,
      text: text.trim(),
      words,
      typedMs,
      pasted,
      attempt,
      date: today,
      readingDays: daysBetween(book.addedOn, today),
      judge: j,
      verdict: v.verdict,
      accepted,
      needsParent,
      flagged: v.flagged,
    });
    setReportId(id);
    setSourceText(text.trim());
    if (accepted) {
      const paid = await payBookReport(childUid, id, book, today);
      if (paid.paid) {
        playTaskComplete();
        setResult({ say: v.say, accepted: true, gold: paid.gold, needsParent: false, reportId: id, canTalk: true });
      } else {
        setResult({
          say: paid.reason === 'day' ? 'Hoje eu já ouvi um livro. Amanhã conto com outro.' : 'Esse você já me contou.',
          accepted: false,
          gold: 0,
          needsParent: false,
          reportId: id,
          canTalk: false,
        });
      }
    } else if (childHold) {
      playTaskComplete();
      setResult({
        say: `Acreditei.${j.comentario ? ` ${j.comentario}` : ''} Como esse livro entrou pela sua mão, o gold sai quando seu pai der o ok.`,
        accepted: true,
        gold: 0,
        needsParent: true,
        reportId: id,
        canTalk: false,
      });
    } else if (v.needsParent) {
      setResult({ say: v.say, accepted: false, gold: 0, needsParent: true, reportId: id, canTalk: false });
    } else {
      playProvaMiss();
      setResult({ say: v.say, accepted: false, gold: 0, needsParent: false, reportId: id, canTalk: false });
    }
    setPhase('result');
  };

  const submit = async () => {
    if (!childUid || !book || busy) return;
    playClick();
    if (liked === null) {
      setSay('Antes me diz: gostou do livro?');
      return;
    }
    const same = (r: BookReportDoc) => r.bookId === book.id || r.titleKey === book.titleKey;
    const local = localCheck({
      text,
      pasted,
      booksDone: done.length,
      previousTexts: reports.filter((r) => !same(r)).map((r) => r.text),
      sameBookTexts: reports.filter(same).map((r) => r.text),
    });
    if (!local.ok) {
      playProvaMiss();
      setSay(local.say);
      if (local.code === 'colado') {
        setText('');
        setPasted(false);
      }
      return;
    }
    setSay(null);
    setBusy(true);
    setPhase('reading');
    const t0 = performance.now();
    try {
      const j = await judgeBook({ title: book.title, pages: book.pages, text, age: childAgeToday(), days: daysBetween(book.addedOn, today) });
      const wait = SABIO_LENDO_MIN_MS - (performance.now() - t0);
      if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
      if (!j) {
        setPhase('form');
        setSay('Piscei e perdi a linha. Me entrega de novo.');
        return;
      }
      await finish(j);
    } catch (e) {
      console.warn('EstanteDoSabio: juiz falhou', e);
      setPhase('form');
      setSay('O Sábio não conseguiu ler agora. Tenta daqui a pouco.');
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    playClick();
    setResult(null);
    setPhase('form');
  };

  const runQuestion = async (b: BookDoc, id: string, source: string) => {
    skipRef.current = false;
    setBusy(true);
    setPhase('talk-wait');
    try {
      const q = await fetchSageQuestion({ title: b.title, text: source });
      if (skipRef.current) return;
      const next: BookTalk = { theme: q.theme, question: q.question, turns: [{ by: 'sabio', text: q.question }] };
      try { await saveBookTalk(id, next); } catch (e) { console.warn('EstanteDoSabio: guardar conversa', e); }
      setTalk(next);
      setNudgeUsed(false);
      setNudgeLine(null);
      setPhase('talk');
    } finally {
      setBusy(false);
    }
  };

  const runFollow = async (b: BookDoc, id: string, current: BookTalk) => {
    skipRef.current = false;
    setBusy(true);
    setPhase('talk-wait');
    try {
      const answer = [...current.turns].reverse().find((t) => t.by === 'heitor')?.text || 'Não sei';
      const f = await fetchSageFollow({ title: b.title, theme: current.theme, question: current.question, answer });
      if (skipRef.current) return;
      const next: BookTalk = {
        ...current,
        flagged: Boolean(current.flagged || f.flagged),
        turns: [...current.turns, { by: 'sabio', text: f.question, move: f.move }],
      };
      try { await saveBookTalk(id, next); } catch (e) { console.warn('EstanteDoSabio: guardar conversa', e); }
      setTalk(next);
      setNudgeUsed(false);
      setNudgeLine(null);
      setPhase('talk');
    } finally {
      setBusy(false);
    }
  };

  const runClosing = async (b: BookDoc, id: string, current: BookTalk) => {
    if (!childUid) return;
    skipRef.current = false;
    setBusy(true);
    setPhase('talk-wait');
    try {
      const answers = current.turns.filter((t) => t.by === 'heitor').map((t) => t.text);
      const closing = await fetchSageClosing({ title: b.title, theme: current.theme, question: current.question, answers });
      if (skipRef.current) return;
      const next: BookTalk = {
        ...current,
        closing,
        flagged: Boolean(current.flagged || answers.some(answerMissesStory)),
      };
      const out = await finishBookTalk(childUid, id, next);
      setTalk({ ...next, doneAt: out.doneAt });
      setXpJust(out.xp);
      setPhase('talk-done');
    } catch (e) {
      console.warn('EstanteDoSabio: fecho', e);
      const answers = current.turns.filter((t) => t.by === 'heitor').map((t) => t.text);
      const closing = localFullClosing({ title: b.title, theme: current.theme, answers });
      const next: BookTalk = { ...current, closing };
      setTalk(next);
      setPhase('talk-done');
      setMicNote('Guardei o que você pensou. A pergunta fica para o jantar.');
    } finally {
      setBusy(false);
    }
  };

  const openTalk = async (b: BookDoc, id: string, source: string, existing?: BookTalk) => {
    playClick();
    stopRec();
    const talk0: BookTalk = existing && (existing.question || existing.turns.length)
      ? existing
      : { theme: '', question: '', turns: [] };
    setBook(b);
    setReportId(id);
    setSourceText(source);
    setTalk(talk0);
    setDraft('');
    setNudgeUsed(false);
    setNudgeLine(null);
    setMicNote(null);
    setXpJust(0);
    setCanMic(false);
    void micAvailable().then(setCanMic);
    const step = talkStep(talk0);
    if (step === 'done') {
      setPhase('talk-done');
      return;
    }
    if (step === 'need-question') {
      await runQuestion(b, id, source);
      return;
    }
    if (step === 'need-follow') {
      await runFollow(b, id, talk0);
      return;
    }
    if (step === 'need-closing') {
      await runClosing(b, id, talk0);
      return;
    }
    setPhase('talk');
  };

  const openFromShelf = (b: BookDoc) => {
    const r = acceptedOf(b);
    if (!r) return;
    void openTalk(b, r.id, r.text, r.talk);
  };

  const skipTalk = async () => {
    playClick();
    skipRef.current = true;
    stopRec();
    stopProvaVoice();
    const id = result?.reportId || reportId;
    const base = talk ?? { theme: '', question: '', turns: [] as BookTalk['turns'] };
    if (id && !base.doneAt) {
      try { await saveBookTalk(id, { ...base, skipped: true }); } catch (e) { console.warn('EstanteDoSabio: deixar para depois', e); }
    }
    setPhase('shelf');
    setSay(null);
    setNudgeLine(null);
  };

  const submitTalk = async () => {
    if (!book || !reportId || !talk || busy) return;
    playClick();
    stopRec();
    const said = draft.trim();
    if (needsNudge(said) && !nudgeUsed) {
      setNudgeUsed(true);
      setNudgeLine(SAGE_NUDGE);
      return;
    }
    const line = said || 'Não sei';
    const step = talkStep(talk);
    const next: BookTalk = {
      ...talk,
      flagged: Boolean(talk.flagged || answerMissesStory(line)),
      turns: [...talk.turns, { by: 'heitor', text: line }],
    };
    setDraft('');
    setNudgeUsed(false);
    setNudgeLine(null);
    setTalk(next);
    if (step === 'answer-2' || step === 'need-closing') await runClosing(book, reportId, next);
    else await runFollow(book, reportId, next);
  };

  const speakSage = () => {
    playClick();
    setHeardSage(true);
    const line = nudgeLine || sageNow;
    if (!line) return;
    stopProvaVoice();
    void speakProvaVerdict(line, true);
  };

  const toggleMic = () => {
    playClick();
    if (listening) {
      stopRec();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) {
      setCanMic(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let heard = '';
      for (let i = 0; i < ev.results.length; i++) heard += ev.results[i][0]?.transcript || '';
      setDraft(heard.trim());
    };
    rec.onerror = () => {
      stopRec();
      setMicNote('O microfone não abriu. Escreve do seu jeito.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setMicNote(null);
    } catch {
      stopRec();
      setMicNote('O microfone não abriu. Escreve do seu jeito.');
    }
  };

  const step = talk ? talkStep(talk) : 'need-question';
  const earlier = talk && sageNow
    ? talk.turns.filter((t, i) => !(t.by === 'sabio' && t.text === sageNow && i === talk.turns.length - 1))
    : [];
  const qTestId = step === 'answer-2' ? 'livro-conversa-segunda' : 'livro-conversa-pergunta';

  const title = (
    <span className="flex items-center gap-2 min-w-0">
      <img src={ISO_NPC.sabio} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
      Estante do Sábio
    </span>
  );

  return (
    <ChildSheet onClose={onClose} wide="lg" title={title}>
      <div className="p-3 space-y-3">
        {phase === 'shelf' && (
          <>
            <Papiro>
              <SageHead kicker="A estante" />
              <p className="mn-papiro-why">
                {quizLocked
                  ? 'Primeiro a prova de hoje. Depois a gente fala de livros.'
                  : dayUsed
                    ? 'Hoje eu já ouvi um livro. Amanhã conto com outro.'
                    : 'Terminou um livro? Me conta como se eu nunca tivesse ouvido falar dele.'}
              </p>
              {returnedNote?.parentReply && (
                <div className="mn-papiro-explain">
                  <p className="mn-papiro-why" data-testid="livro-pai-devolveu">{returnedSay(returnedNote.parentReply)}</p>
                </div>
              )}
              {lastReply && (
                <div className="mn-papiro-explain">
                  <p className="mn-papiro-why">
                    {replyAfterTalk
                      ? `Seu pai leu a conversa e disse: ${lastReply.parentReply}`
                      : `Seu pai leu o que você contou de "${lastReply.title}" e disse: ${lastReply.parentReply}`}
                  </p>
                </div>
              )}
            </Papiro>
            <Shelf books={done} pending={pendingIds} onTalk={openFromShelf} />
            <div className="mc-inv p-2 space-y-1">
              <p className="mc-lbl px-1">Para ler</p>
              {toRead.length === 0 && <p className="text-sm mc-muted px-1">Nenhum livro esperando. Peça para o pai pôr um na estante, ou proponha um.</p>}
              {toRead.map((b) => (
                <div key={b.id} className="mc-row rounded px-2 py-1 flex items-center gap-2" data-testid={`livro-${b.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{b.title}</p>
                    <p className="text-xs mc-muted">
                      {b.pages} páginas · vale {goldForBook(b)} gold{b.addedBy === 'child' ? ' · proposto por você' : ''}
                    </p>
                    {returnedOf(b) && (
                      <p className="text-sm" data-testid={`livro-devolvido-${b.id}`}>{returnedSay(returnedOf(b) || '')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`mc-btn min-h-[44px] px-3 font-bold ${quizLocked || dayUsed ? 'mc-btn-stone' : 'mc-btn-green'}`}
                    disabled={quizLocked || dayUsed}
                    onClick={() => startForm(b)}
                  >
                    Terminei
                  </button>
                </div>
              ))}
              {say && <p className="text-sm mc-warn px-1">{say}</p>}
            </div>
            <button type="button" className="mc-btn mc-btn-dark w-full min-h-[44px] font-bold" onClick={() => { playClick(); setSay(null); setPhase('propose'); }}>
              Propor um livro
            </button>
          </>
        )}

        {phase === 'propose' && (
          <Papiro>
            <SageHead kicker="Um livro novo" />
            <p className="mn-papiro-why">Que livro você quer ler? Livro que entra pela sua mão paga quando seu pai der o ok.</p>
            <label className="mc-lbl block mt-2 mb-1" htmlFor="book-title">Título</label>
            <input
              id="book-title"
              value={propTitle}
              maxLength={80}
              onChange={(e) => setPropTitle(e.target.value)}
              className="mc-slot w-full text-white text-sm px-3 py-2 outline-none placeholder:text-white/40"
              placeholder="ex.: O Menino Maluquinho"
            />
            <label className="mc-lbl block mt-2 mb-1" htmlFor="book-pages">Quantas páginas</label>
            <input
              id="book-pages"
              value={propPages}
              inputMode="numeric"
              onChange={(e) => setPropPages(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mc-slot w-32 text-white text-sm px-3 py-2 outline-none placeholder:text-white/40"
              placeholder="ex.: 96"
            />
            <div className="flex gap-2 mt-3">
              <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-6 font-bold" disabled={busy || propTitle.trim().length < 3 || !Number(propPages)} onClick={() => void propose()}>
                Pôr na estante
              </button>
              <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-6" onClick={backToShelf}>Voltar</button>
            </div>
          </Papiro>
        )}

        {phase === 'form' && book && (
          <Papiro>
            <SageHead kicker={`Contando "${book.title}"`} />
            <p className="mn-papiro-why">Gostou do livro?</p>
            <div className="mc-hotbar mt-1" data-testid="livro-rostos">
              {FACES.map((f, i) => (
                <button
                  key={f.label}
                  type="button"
                  className={`mc-slot mn-livro-slot rounded px-2 min-h-[44px] flex-col gap-0 ${liked === i ? 'mc-slot-selected' : ''}`}
                  onClick={() => { playClick(); setLiked(i as 0 | 1 | 2 | 3); }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{f.glyph}</span>
                  <span style={{ fontSize: 11 }}>{f.label}</span>
                </button>
              ))}
            </div>
            <p className="mn-papiro-why mt-2">Nota de 0 a 10, se quiser:</p>
            <div className="flex flex-wrap gap-1" data-testid="livro-nota">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  className={`mc-slot mn-livro-slot rounded min-h-[36px] w-9 ${rating === n ? 'mc-slot-selected' : ''}`}
                  style={{ fontSize: 12 }}
                  onClick={() => { playClick(); setRating(rating === n ? null : n); }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mn-papiro-why mt-2">Agora me conta o livro, do seu jeito. Pelo menos {minWords} palavras.</p>
            {done.length < BOOK_EASY_BOOKS && (
              <button
                type="button"
                className="mc-btn mc-btn-stone w-full min-h-[40px] text-left text-sm normal-case"
                onClick={() => { playClick(); if (!text.trim()) { setText(BOOK_MOLDE.replace(/…/g, '').replace(/\s+/g, ' ').trim() + ' '); typingStart.current = typingStart.current ?? performance.now(); } }}
                title="Toca para começar com o molde"
              >
                {BOOK_MOLDE}
              </button>
            )}
            <textarea
              value={text}
              onChange={(e) => {
                if (typingStart.current === null) typingStart.current = performance.now();
                setText(e.target.value);
                if (say) setSay(null);
              }}
              onPaste={(e) => {
                const pastedText = e.clipboardData?.getData('text') || '';
                if (pastedText.trim().length > 20) setPasted(true);
              }}
              placeholder="Com as suas palavras."
              rows={7}
              className="mn-papiro-write"
              data-testid="livro-texto"
            />
            <div className="flex items-center justify-between">
              <span className="mc-num" style={{ fontSize: 12 }} data-testid="livro-contador">{words} / {minWords} palavras</span>
              <span className="text-xs mc-muted">vale {goldForBook(book)} gold</span>
            </div>
            {say && (
              <div className="mn-papiro-explain mn-sabio-line">
                <p className="mn-papiro-why">{say}</p>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className={`mc-btn min-h-[44px] px-6 font-bold ${words >= minWords && liked !== null && !busy ? 'mc-btn-green' : 'mc-btn-stone'}`}
                disabled={busy}
                onClick={() => void submit()}
                data-testid="livro-entregar"
              >
                Entregar
              </button>
              <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-6" onClick={backToShelf}>Voltar</button>
            </div>
          </Papiro>
        )}

        {phase === 'reading' && book && (
          <Papiro>
            <SageHead kicker="O Sábio lê" reading />
            <p className="mn-papiro-why mn-sabio-line" data-testid="livro-lendo">{readingLineAt(readingMs)}</p>
            <textarea value={text} readOnly rows={7} className="mn-papiro-write is-held" />
          </Papiro>
        )}

        {phase === 'result' && book && result && (
          <Papiro>
            <SageHead kicker={result.accepted ? 'Livro contado' : result.needsParent ? 'Para o seu pai' : 'Ainda não'} />
            <p className="mn-papiro-why mn-sabio-line" data-testid="livro-veredito">{result.say}</p>
            {result.accepted && result.gold > 0 && (
              <p className="mn-papiro-title flex items-center gap-2">
                <img src={GOLD} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                +{result.gold} gold
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {result.canTalk ? (
                <>
                  <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-6 font-bold" onClick={() => void openTalk(book, result.reportId, sourceText)}>
                    Conversar
                  </button>
                  <button type="button" className="mc-btn mc-btn-wood min-h-[44px] px-6 font-bold" onClick={() => void skipTalk()}>
                    Conversar depois
                  </button>
                </>
              ) : result.accepted || result.needsParent ? (
                <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-6 font-bold" onClick={backToShelf}>Ver a estante</button>
              ) : (
                <>
                  <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-6 font-bold" onClick={retry}>Tentar de novo</button>
                  <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-6" onClick={backToShelf}>Voltar</button>
                </>
              )}
            </div>
          </Papiro>
        )}

        {phase === 'talk-wait' && (
          <Papiro>
            <SageHead kicker="O Sábio pensa" reading />
            <p className="mn-papiro-why mn-sabio-line">{readingLineAt(readingMs)}</p>
            <button type="button" className="mc-btn mc-btn-wood min-h-[44px] px-6 font-bold mt-2" onClick={() => void skipTalk()}>
              Conversar depois
            </button>
          </Papiro>
        )}

        {phase === 'talk' && talk && (
          <Papiro>
            <SageHead kicker={step === 'answer-2' ? 'Mais uma' : 'Uma pergunta'} />
            {earlier.length > 0 && (
              <div className="mb-2" style={{ maxHeight: 72, overflow: 'auto' }}>
                {earlier.map((t, i) => (
                  <p key={`${t.by}-${i}`} className="text-sm" style={{ fontWeight: t.by === 'heitor' ? 500 : 700, margin: '0 0 4px' }}>
                    {t.text}
                  </p>
                ))}
              </div>
            )}
            {nudgeLine && <p className="mn-papiro-why mn-sabio-line">{nudgeLine}</p>}
            <p className="mn-papiro-title mn-sabio-line" data-testid={qTestId}>{sageNow}</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Com as suas palavras. Não sei também vale."
              rows={2}
              className="mn-papiro-write"
              style={{ minHeight: 64 }}
              data-testid="livro-conversa-resposta"
            />
            {micNote && <p className="mn-papiro-why">{micNote}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-6 font-bold" disabled={busy} onClick={() => void submitTalk()}>
                Responder
              </button>
              <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-6 font-bold" onClick={speakSage}>
                Falar
              </button>
              {canMic && heardSage && (
                <button type="button" className="mc-btn mc-btn-wood min-h-[44px] px-6 font-bold" onClick={toggleMic}>
                  {listening ? 'Ouvindo' : 'Dizer'}
                </button>
              )}
              <button type="button" className="mc-btn mc-btn-wood min-h-[44px] px-6 font-bold" onClick={() => void skipTalk()}>
                Conversar depois
              </button>
            </div>
          </Papiro>
        )}

        {phase === 'talk-done' && talk?.closing && (
          <Papiro>
            <SageHead kicker="Para levar" />
            <p className="mn-papiro-why mn-sabio-line" data-testid="livro-conversa-fecho">{doneSpeech}</p>
            {xpJust > 0 && (
              <p className="mn-papiro-title">+{xpJust} XP</p>
            )}
            {book?.parentReply && (
              <div className="mn-papiro-explain">
                <p className="mn-papiro-why">Seu pai leu a conversa e disse: {book.parentReply}</p>
              </div>
            )}
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-6 font-bold mt-2" onClick={backToShelf}>
              Ver a estante
            </button>
          </Papiro>
        )}
      </div>
    </ChildSheet>
  );
};

export default EstanteDoSabio;
