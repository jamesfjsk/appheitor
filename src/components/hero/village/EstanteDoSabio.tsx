// ========================================
// Estante do Sábio (decisão 40): contar um livro e ganhar gold de vida real.
// Estante com os livros lidos, lista dos "para ler" (cadastrados pelo pai ou propostos pela criança),
// papiro para contar o livro, o Sábio lendo, uma pergunta de verificação e o veredito.
// Regras puras em services/village/books.ts; Firestore em services/bookService.ts.
// ========================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useClock } from '../../../contexts/ClockContext';
import { useSound } from '../../../contexts/SoundContext';
import { useVillage } from '../../../contexts/VillageContext';
import { ISO_NPC } from '../../../config/village';
import { childAgeToday } from '../../../config/rules';
import type { BookDoc, BookJudge, BookReportDoc, BookVerify } from '../../../types';
import {
  BOOK_ATTEMPTS_PER_DAY,
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
  readingLineAt,
  verdictOf,
} from '../../../services/village/books';
import {
  addBook,
  judgeBook,
  payBookReport,
  saveBookReport,
  subscribeBookReports,
  subscribeBooks,
  verifyBookAnswer,
} from '../../../services/bookService';
import ChildSheet from './ChildSheet';

const GOLD = '/assets/english/ui/gold.webp';
const SPINE_COLORS = ['#7a4a2b', '#2f5d8a', '#8a2f3c', '#3d6b3a', '#6b4a8a', '#8a6b2f', '#2f7a7a', '#5a5a5a'];
const FACES: Array<{ label: (typeof LIKED_LABELS)[number]; glyph: string }> = [
  { label: 'Não gostei', glyph: '😕' },
  { label: 'Gostei', glyph: '🙂' },
  { label: 'Gostei muito', glyph: '😄' },
  { label: 'Amei', glyph: '🤩' },
];

type Phase = 'shelf' | 'propose' | 'form' | 'reading' | 'verify' | 'result';

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

function Shelf({ books }: { books: BookDoc[] }) {
  if (books.length === 0) {
    return <p className="text-sm mc-muted">A estante está vazia. Quando terminar um livro, vem me contar.</p>;
  }
  const shown = books.slice(0, 12);
  const more = books.length - shown.length;
  return (
    <div className="mc-inv p-2">
      <div className="flex items-end gap-1 overflow-x-auto pb-1" data-testid="estante-lombadas">
        {shown.map((b, i) => (
          <div
            key={b.id}
            title={`${b.title}${b.doneOn ? ` · contado em ${b.doneOn.slice(8, 10)}/${b.doneOn.slice(5, 7)}` : ''}`}
            className="mc-pixel shrink-0 flex items-end justify-center"
            style={{
              width: 26,
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
          </div>
        ))}
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
  const { playClick, playTaskComplete, playProvaMiss } = useSound();

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
  const [judge, setJudge] = useState<BookJudge | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ say: string; accepted: boolean; gold: number; needsParent: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propPages, setPropPages] = useState('');
  const typingStart = useRef<number | null>(null);
  const readingStart = useRef(0);

  useEffect(() => {
    if (!childUid) return;
    const a = subscribeBooks(childUid, setBooks, () => undefined);
    const b = subscribeBookReports(childUid, setReports, () => undefined);
    return () => { a(); b(); };
  }, [childUid]);

  useEffect(() => {
    if (phase !== 'reading') return;
    readingStart.current = performance.now();
    setReadingMs(0);
    const id = window.setInterval(() => setReadingMs(performance.now() - readingStart.current), 400);
    return () => window.clearInterval(id);
  }, [phase]);

  const done = useMemo(() => books.filter((b) => b.status === 'done').sort((a, b) => (b.doneOn || '').localeCompare(a.doneOn || '')), [books]);
  const toRead = useMemo(() => books.filter((b) => b.status === 'to_read'), [books]);
  const dayUsed = Boolean(village.claimed?.[claimKeyForBookDay(today)]);
  const minWords = minWordsFor(done.length);
  const words = bookWordCount(text);
  const attemptsToday = (b: BookDoc) => reports.filter((r) => r.bookId === b.id && r.date === today).length;
  const lastReply = done.find((b) => b.parentReply);

  const startForm = (b: BookDoc) => {
    playClick();
    if (attemptsToday(b) >= BOOK_ATTEMPTS_PER_DAY) {
      setSay('Hoje já foram três tentativas desse livro. Amanhã a gente tenta de novo, com calma.');
      return;
    }
    setBook(b);
    setLiked(null);
    setRating(null);
    setText('');
    setPasted(false);
    setSay(null);
    setJudge(null);
    setAnswer('');
    setResult(null);
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

  const finish = async (j: BookJudge, verify: BookVerify | undefined, verifyOk: boolean | null) => {
    if (!childUid || !book) return;
    const gold = goldForBook(book);
    const v = verdictOf({ judge: j, verifyOk, title: book.title, gold });
    const needsParent = v.accepted && book.addedBy === 'child';
    const attempt = attemptsToday(book) + 1;
    const typedMs = typingStart.current ? Math.round(performance.now() - typingStart.current) : 0;
    const reportId = await saveBookReport(childUid, {
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
      verify,
      verdict: v.verdict,
      accepted: v.accepted && !needsParent,
      needsParent,
      flagged: v.flagged,
    });
    if (v.accepted && !needsParent) {
      const paid = await payBookReport(childUid, reportId, book, today);
      if (paid.paid) {
        playTaskComplete();
        setResult({ say: v.say, accepted: true, gold: paid.gold, needsParent: false });
      } else {
        setResult({ say: paid.reason === 'day' ? 'Hoje eu já ouvi um livro. Amanhã conto com outro.' : 'Esse você já me contou.', accepted: false, gold: 0, needsParent: false });
      }
    } else if (v.accepted && needsParent) {
      playTaskComplete();
      setResult({ say: `Acreditei.${j.comentario ? ` ${j.comentario}` : ''} Como esse livro entrou pela sua mão, o gold sai quando seu pai der o ok.`, accepted: true, gold: 0, needsParent: true });
    } else {
      playProvaMiss();
      setResult({ say: v.say, accepted: false, gold: 0, needsParent: false });
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
      setJudge(j);
      const askable = j.pergunta && j.respostaEsperada && j.leu >= 2 && j.suspeito !== 'fora_do_tema';
      if (askable) {
        setPhase('verify');
        return;
      }
      await finish(j, undefined, null);
    } catch (e) {
      console.warn('EstanteDoSabio: juiz falhou', e);
      setPhase('form');
      setSay('O Sábio não conseguiu ler agora. Tenta daqui a pouco.');
    } finally {
      setBusy(false);
    }
  };

  const sendAnswer = async () => {
    if (!book || !judge || !judge.pergunta || !judge.respostaEsperada || busy) return;
    if (answer.trim().length < 2) return;
    playClick();
    setBusy(true);
    setPhase('reading');
    const t0 = performance.now();
    try {
      const r = await verifyBookAnswer({ title: book.title, question: judge.pergunta, expected: judge.respostaEsperada, answer, text });
      const wait = SABIO_LENDO_MIN_MS - (performance.now() - t0);
      if (wait > 0) await new Promise((res) => window.setTimeout(res, wait));
      const ok = r ? r.ok : true; // resposta malformada do conferente não castiga
      await finish(judge, { question: judge.pergunta, expected: judge.respostaEsperada, answer: answer.trim(), ok }, ok);
    } catch (e) {
      console.warn('EstanteDoSabio: conferência falhou', e);
      await finish(judge, { question: judge.pergunta, expected: judge.respostaEsperada, answer: answer.trim(), ok: true }, null);
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    playClick();
    setResult(null);
    setJudge(null);
    setAnswer('');
    setPhase('form');
  };

  const backToShelf = () => {
    playClick();
    setPhase('shelf');
    setSay(null);
    setResult(null);
  };

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
              {lastReply && (
                <div className="mn-papiro-explain">
                  <p className="mn-papiro-why">Seu pai leu o que você contou de "{lastReply.title}" e disse: {lastReply.parentReply}</p>
                </div>
              )}
            </Papiro>
            <Shelf books={done} />
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

        {phase === 'verify' && book && judge?.pergunta && (
          <Papiro>
            <SageHead kicker="Uma pergunta antes" />
            <p className="mn-papiro-title" data-testid="livro-pergunta">{judge.pergunta}</p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Responde com o que você lembra."
              rows={2}
              className="mn-papiro-write"
              data-testid="livro-resposta"
            />
            <div className="flex gap-2 mt-2">
              <button type="button" className={`mc-btn min-h-[44px] px-6 font-bold ${answer.trim().length >= 2 && !busy ? 'mc-btn-green' : 'mc-btn-stone'}`} disabled={busy || answer.trim().length < 2} onClick={() => void sendAnswer()}>
                Responder
              </button>
            </div>
          </Papiro>
        )}

        {phase === 'result' && book && result && (
          <Papiro>
            <SageHead kicker={result.accepted ? 'Livro contado' : 'Ainda não'} />
            <p className="mn-papiro-why mn-sabio-line" data-testid="livro-veredito">{result.say}</p>
            {result.accepted && result.gold > 0 && (
              <p className="mn-papiro-title flex items-center gap-2">
                <img src={GOLD} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                +{result.gold} gold
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {result.accepted ? (
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
      </div>
    </ChildSheet>
  );
};

export default EstanteDoSabio;
