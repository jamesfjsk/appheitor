// ========================================
// A Base: contrato da Carta. Texto sempre visível (duas colunas no PC), glossário
// por hover de 400 ms ou toque longo, 3 perguntas com feedback; ao errar a evidência
// é destacada; na decisão a criança clica na frase que prova; tradução no fim.
// ========================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import type { LetterQuestion } from '../../../../types/english';
import { letterMaterial } from '../../../../config/englishRewards';
import { playText, prefetchAudio, stopAudio } from '../../../../services/englishTts';
import type { ContractScreenProps } from './ContractShell';

const HOVER_MS = 400;
const TOUCH_KEEP_MS = 1200;

interface Segment {
  text: string;
  /** Tradução quando o pedaço é uma entrada do glossário */
  gloss?: string;
}

interface Sentence {
  id: number;
  text: string;
  segments: Segment[];
  breakAfter: boolean;
}

interface QState {
  picked: number | null;
  correct: boolean | null;
  /** Só na pergunta de decisão acertada: pedir a frase que prova */
  evidenceStage: 'none' | 'ask' | 'done';
  evidenceOk: boolean | null;
  clicked: number | null;
}

const WORD_RE = /^[A-Za-z'’-]/;

/** Minúsculas, sem pontuação, espaços colapsados (comparar evidência e frase) */
const norm = (s: string): string => s.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const hasEvidence = (sentence: string, evidence: string): boolean => {
  const a = norm(sentence);
  const b = norm(evidence);
  if (!a || !b) return false;
  // evidência dentro da frase, ou frase inteira dentro de uma evidência maior
  return a.includes(b) || (b.length >= 12 && b.includes(a));
};

/** Divide o texto em frases, respeitando as quebras de linha (diálogos, listas) */
function splitSentences(text: string): { text: string; breakAfter: boolean }[] {
  const out: { text: string; breakAfter: boolean }[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, li) => {
    const parts = line.match(/[^.!?]+[.!?]*["”']?\s*/g) ?? [];
    const kept = parts.filter((p) => p.trim().length > 0);
    if (kept.length === 0 && line.trim()) kept.push(line);
    kept.forEach((p, pi) => out.push({ text: p, breakAfter: pi === kept.length - 1 && li < lines.length - 1 }));
  });
  return out;
}

/** Marca as palavras (ou expressões) do glossário dentro da frase */
function segment(sentence: string, glossary: Map<string, string>, maxWords: number): Segment[] {
  const tokens = sentence.match(/[A-Za-z'’-]+|[^A-Za-z'’-]+/g) ?? [sentence];
  const segs: Segment[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!WORD_RE.test(tokens[i])) {
      segs.push({ text: tokens[i] });
      i++;
      continue;
    }
    let matched = false;
    for (let n = maxWords; n >= 1 && !matched; n--) {
      const wordIdx: number[] = [];
      let j = i;
      while (wordIdx.length < n && j < tokens.length) {
        if (WORD_RE.test(tokens[j])) wordIdx.push(j);
        else if (tokens[j].trim() !== '') break; // pontuação encerra uma expressão composta
        j++;
      }
      if (wordIdx.length < n) continue;
      const end = wordIdx[n - 1];
      const phrase = tokens.slice(i, end + 1).join('');
      const pt = glossary.get(norm(phrase));
      if (pt !== undefined) {
        segs.push({ text: phrase, gloss: pt });
        i = end + 1;
        matched = true;
      }
    }
    if (!matched) {
      segs.push({ text: tokens[i] });
      i++;
    }
  }
  return segs;
}

/** Palavra do glossário: tradução após 400 ms de hover, toque longo ou foco */
const GlossWord: React.FC<{ text: string; pt: string; onShow: () => void }> = ({ text, pt, onShow }) => {
  const [show, setShow] = useState(false);
  const timer = useRef(0);
  const hideTimer = useRef(0);

  const arm = () => {
    window.clearTimeout(timer.current);
    window.clearTimeout(hideTimer.current);
    timer.current = window.setTimeout(() => {
      setShow(true);
      onShow();
    }, HOVER_MS);
  };
  const disarm = () => {
    window.clearTimeout(timer.current);
    setShow(false);
  };
  /** No toque, a tradução fica um pouco depois de soltar */
  const release = () => {
    window.clearTimeout(timer.current);
    hideTimer.current = window.setTimeout(() => setShow(false), TOUCH_KEEP_MS);
  };
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    window.clearTimeout(hideTimer.current);
  }, []);

  return (
    <span className="relative inline-block">
      <span
        tabIndex={0}
        className="underline decoration-dotted decoration-2 underline-offset-2 cursor-help text-sky-900 font-semibold"
        onMouseEnter={arm}
        onMouseLeave={disarm}
        onTouchStart={arm}
        onTouchEnd={release}
        onTouchCancel={disarm}
        onTouchMove={disarm}
        onFocus={arm}
        onBlur={disarm}
        onContextMenu={(e) => e.preventDefault()}
      >
        {text}
      </span>
      {show && (
        <span role="tooltip" className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-20 whitespace-nowrap mc-panel text-white text-xs px-2 py-1 rounded">
          {pt}
        </span>
      )}
    </span>
  );
};

const LetterContract: React.FC<ContractScreenProps<'letter'>> = ({ contract, sfx, onFinish }) => {
  const { content } = contract;
  const questions: LetterQuestion[] = content.questions;
  const [qi, setQi] = useState(0);
  const [qs, setQs] = useState<QState[]>(() => questions.map(() => ({ picked: null, correct: null, evidenceStage: 'none', evidenceOk: null, clicked: null })));
  const [glossaryHovers, setGlossaryHovers] = useState(0);
  const [reading, setReading] = useState(false);
  const [readingId, setReadingId] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const readToken = useRef(0);

  const sentences = useMemo<Sentence[]>(() => {
    const map = new Map<string, string>();
    let maxWords = 1;
    for (const g of content.glossary) {
      const k = norm(g.en);
      if (!k) continue;
      map.set(k, g.pt);
      maxWords = Math.max(maxWords, k.split(' ').length);
    }
    return splitSentences(content.text).map((s, id) => ({ id, text: s.text, breakAfter: s.breakAfter, segments: segment(s.text, map, maxWords) }));
  }, [content.text, content.glossary]);

  useEffect(() => {
    prefetchAudio([...sentences.map((s) => s.text.trim()), ...questions.map((q) => q.question)]);
    return () => stopAudio();
  }, [sentences, questions]);

  const q = questions[qi];
  const st = qs[qi];
  const updateQ = (patch: Partial<QState>) => setQs((prev) => prev.map((s, i) => (i === qi ? { ...s, ...patch } : s)));

  const readAll = async () => {
    const token = ++readToken.current;
    setReading(true);
    for (const s of sentences) {
      if (readToken.current !== token) break;
      setReadingId(s.id);
      await playText(s.text.trim());
    }
    if (readToken.current === token) {
      setReadingId(null);
      setReading(false);
    }
  };

  const stopReading = () => {
    readToken.current++;
    stopAudio();
    setReadingId(null);
    setReading(false);
  };

  const pick = (idx: number) => {
    if (!q || !st || st.picked !== null) return;
    const correct = idx === q.answer;
    if (correct) sfx.hit(1);
    else sfx.miss();
    updateQ({ picked: idx, correct, evidenceStage: correct && q.kind === 'decision' ? 'ask' : 'none' });
  };

  const clickSentence = (s: Sentence) => {
    if (!q || !st || st.evidenceStage !== 'ask') return;
    const ok = hasEvidence(s.text, q.evidence);
    if (ok) sfx.hit(2);
    else sfx.miss();
    updateQ({ evidenceStage: 'done', evidenceOk: ok, clicked: s.id });
  };

  const next = () => {
    stopReading();
    if (qi + 1 < questions.length) setQi(qi + 1);
    else setFinished(true);
  };

  const deliver = () => {
    const hits = qs.filter((s) => s.correct).length;
    const decisionIdx = questions.findIndex((x) => x.kind === 'decision');
    const decision = decisionIdx >= 0 ? qs[decisionIdx] : null;
    // evidenceOk=false só quando a decisão foi acertada sem mostrar a frase certa
    const evidenceOk = !(decision && decision.correct && decision.evidenceOk === false);
    const evidenceHits = qs.filter((s) => s.evidenceOk === true).length;
    onFinish({
      score: hits,
      max: questions.length,
      materialEarned: letterMaterial(hits, evidenceOk, questions.length),
      answer: qs.map((s) => (s.picked === null ? '-' : String(s.picked))).join(','),
      details: { glossaryHovers, evidenceHits, evidenceOk, answers: qs.map((s) => s.picked), kinds: questions.map((x) => x.kind), genre: content.genre },
    });
  };

  const showEvidence = Boolean(st && (st.correct === false || st.evidenceStage === 'done'));
  const evidenceIds = useMemo(() => (q ? sentences.filter((s) => hasEvidence(s.text, q.evidence)).map((s) => s.id) : []), [q, sentences]);
  const askingEvidence = st?.evidenceStage === 'ask';
  const canNext = Boolean(st && st.picked !== null && st.evidenceStage !== 'ask');

  return (
    <div className="grid gap-3 md:grid-cols-2" data-testid="letter-contract">
      {/* Texto */}
      <div className="md:sticky md:top-2 self-start">
        <div className="flex items-center gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="mc-font text-[10px] text-white leading-relaxed">{content.title}</p>
            <p className="text-xs mc-muted">de {content.sender}</p>
          </div>
          {reading ? (
            <button onClick={stopReading} className="mc-btn mc-btn-red px-3 py-1.5 text-sm font-bold"><Square className="w-4 h-4" /> Parar</button>
          ) : (
            <button onClick={() => void readAll()} className="mc-btn mc-btn-stone px-3 py-1.5 text-sm font-bold"><Volume2 className="w-4 h-4" /> Ouvir o texto</button>
          )}
        </div>
        <div className={`mc-paper rounded p-3 text-gray-900 text-[15px] leading-relaxed ${askingEvidence ? 'ring-2 ring-yellow-400' : ''}`} data-testid="letter-text">
          {sentences.map((s) => {
            const isEvidence = showEvidence && evidenceIds.includes(s.id);
            const isWrongClick = st?.evidenceStage === 'done' && st.evidenceOk === false && st.clicked === s.id;
            const cls = [
              askingEvidence ? 'cursor-pointer hover:bg-sky-100' : '',
              isEvidence ? 'bg-yellow-200' : '',
              isWrongClick ? 'bg-red-200 line-through decoration-red-500' : '',
              readingId === s.id ? 'bg-sky-100' : '',
            ].join(' ');
            return (
              <React.Fragment key={s.id}>
                <span
                  role={askingEvidence ? 'button' : undefined}
                  className={`rounded px-0.5 ${cls}`}
                  onClick={() => clickSentence(s)}
                  data-testid={`sentence-${s.id}`}
                >
                  {s.segments.map((seg, k) =>
                    seg.gloss !== undefined ? (
                      <GlossWord key={k} text={seg.text} pt={seg.gloss} onShow={() => setGlossaryHovers((n) => n + 1)} />
                    ) : (
                      <React.Fragment key={k}>{seg.text}</React.Fragment>
                    )
                  )}
                </span>
                {s.breakAfter && <br />}
              </React.Fragment>
            );
          })}
        </div>
        <p className="text-[11px] mc-muted mt-1">Palavras sublinhadas: passe o mouse ou segure o dedo para ver o significado.</p>
      </div>

      {/* Perguntas ou tradução */}
      <div>
        {!finished && q && st && (
          <div className="mc-card p-3" data-testid={`question-${qi}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="mc-font text-[9px] mc-muted uppercase">Pergunta {qi + 1} de {questions.length}</span>
              <button onClick={() => void playText(q.question)} aria-label="Ouvir a pergunta" className="mc-btn mc-btn-dark w-8 h-8 p-0"><Volume2 className="w-4 h-4" /></button>
            </div>
            <p className="text-base font-bold text-white leading-snug mb-3">{q.question}</p>
            <div className="grid gap-2">
              {q.options.map((opt, idx) => {
                const picked = st.picked === idx;
                const reveal = st.picked !== null;
                const tone = reveal && idx === q.answer ? 'mc-slot-good' : picked ? 'mc-slot-bad' : '';
                return (
                  <button
                    key={idx}
                    onClick={() => pick(idx)}
                    disabled={reveal}
                    className={`mc-slot text-left px-3 py-2 text-sm text-white ${tone} ${picked ? 'mc-slot-selected' : ''} disabled:opacity-90`}
                    data-testid={`option-${idx}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {st.picked !== null && (
              <div className="mt-3 text-sm">
                {st.correct ? (
                  <p className="mc-good font-bold">Certo.</p>
                ) : (
                  <p className="mc-bad font-bold">Não foi essa. A prova está marcada em amarelo no texto.</p>
                )}
                {!st.correct && <p className="text-white/85 mt-1">{q.explanation}</p>}
              </div>
            )}

            {askingEvidence && (
              <p className="mt-3 text-sm mc-warn font-bold" data-testid="ask-evidence">Agora mostre no texto: clique na frase que prova a resposta.</p>
            )}
            {st.evidenceStage === 'done' && (
              <p className={`mt-2 text-sm font-bold ${st.evidenceOk ? 'mc-good' : 'mc-bad'}`}>
                {st.evidenceOk ? 'Essa é a frase.' : 'A prova era a frase em amarelo.'}
              </p>
            )}

            {canNext && (
              <button onClick={next} className="mc-btn mc-btn-green mt-4 px-5 py-2.5 font-bold" data-testid="next-question">
                {qi + 1 < questions.length ? 'Próxima pergunta' : 'Ver a tradução'}
              </button>
            )}
          </div>
        )}

        {finished && (
          <div className="mc-card p-3" data-testid="letter-finished">
            <p className="mc-font text-[9px] mc-muted uppercase mb-1">Resultado</p>
            <p className="mc-font text-lg text-white">{qs.filter((s) => s.correct).length}<span className="mc-muted text-sm"> / {questions.length}</span></p>
            <p className="mc-font text-[9px] mc-muted uppercase mt-3 mb-1">Tradução</p>
            <div className="mc-paper rounded p-3 text-gray-900 text-sm leading-relaxed whitespace-pre-line">{content.translation}</div>
            <button onClick={deliver} className="mc-btn mc-btn-green mt-4 w-full py-3 font-bold uppercase" data-testid="letter-deliver">Entregar contrato</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LetterContract;
