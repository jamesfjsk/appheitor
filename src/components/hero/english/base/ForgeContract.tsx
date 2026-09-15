// ========================================
// A Base: contrato da Ferraria. 6 peças: scramble (blocos clicáveis com desfazer),
// gap (3 opções) e typed (campo). Erro -> regra + 1 tentativa (vale metade) -> revela.
// Peças erradas voltam uma vez no fim (repescagem, sem material).
// ========================================

import React, { useEffect, useState } from 'react';
import { Undo2, Volume2 } from 'lucide-react';
import type { ForgeItem } from '../../../../types/english';
import { forgeMaterial } from '../../../../config/englishRewards';
import { playText, prefetchAudio, stopAudio } from '../../../../services/englishTts';
import type { ContractScreenProps } from './ContractShell';

type Earned = 0 | 0.5 | 1;
type Resolved = 'correct' | 'revealed' | null;
type Phase = 'main' | 'redo' | 'summary';

const MAIN_TRIES = 2;
const REDO_TRIES = 1;

const norm = (s: string): string => s.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const answerOf = (item: ForgeItem): string => {
  switch (item.kind) {
    case 'scramble':
      return item.answer;
    case 'gap':
      return item.options[item.answer] ?? '';
    case 'typed':
      return item.accepted[0] ?? '';
  }
};

const fullSentence = (item: ForgeItem): string => (item.kind === 'scramble' ? item.answer : item.sentence.replace('___', answerOf(item)));

const KIND_LABEL: Record<ForgeItem['kind'], string> = {
  scramble: 'Monte a frase na ordem certa',
  gap: 'Escolha a forma certa',
  typed: 'Digite o que falta',
};

const ForgeContract: React.FC<ContractScreenProps<'forge'>> = ({ contract, sfx, onFinish }) => {
  const items = contract.content.items;
  const [phase, setPhase] = useState<Phase>('main');
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [earned, setEarned] = useState<Earned[]>(() => items.map(() => 0));
  const [redoCorrect, setRedoCorrect] = useState(0);
  // estado da peça atual
  const [tries, setTries] = useState(0);
  const [resolved, setResolved] = useState<Resolved>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [gapWrong, setGapWrong] = useState<number[]>([]);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    prefetchAudio(items.map(fullSentence));
    return () => stopAudio();
  }, [items]);

  const cur = order[pos];
  const item: ForgeItem | undefined = items[cur];
  const maxTries = phase === 'redo' ? REDO_TRIES : MAIN_TRIES;
  const wrongIdx = items.map((_, i) => i).filter((i) => earned[i] < 1);

  const record = (ok: boolean, triesUsed: number) => {
    if (phase === 'main') {
      const value: Earned = ok ? (triesUsed === 1 ? 1 : 0.5) : 0;
      setEarned((prev) => prev.map((e, i) => (i === cur ? value : e)));
    } else if (ok) {
      setRedoCorrect((n) => n + 1);
    }
  };

  const check = (ok: boolean) => {
    if (!item || resolved) return;
    const t = tries + 1;
    setTries(t);
    if (ok) {
      sfx.hit(t === 1 ? 2 : 0);
      setResolved('correct');
      record(true, t);
      return;
    }
    sfx.miss();
    if (t >= maxTries) {
      setResolved('revealed');
      record(false, t);
    }
  };

  const next = () => {
    stopAudio();
    setTries(0);
    setResolved(null);
    setBuilt([]);
    setTyped('');
    setGapWrong([]);
    if (pos + 1 < order.length) {
      setPos(pos + 1);
      return;
    }
    if (phase === 'main' && wrongIdx.length > 0) {
      setPhase('redo');
      setOrder(wrongIdx);
      setPos(0);
      return;
    }
    setPhase('summary');
  };

  const listen = async (s: string) => {
    if (speaking) return;
    setSpeaking(true);
    await playText(s);
    setSpeaking(false);
  };

  const deliver = () => {
    const hits = earned.reduce<number>((a, b) => a + b, 0);
    onFinish({
      score: hits,
      max: items.length,
      materialEarned: forgeMaterial(hits),
      // wrongItems: índices lidos por englishAi.yesterdayMistakes (2 deles voltam na Ferraria de amanhã)
      details: { perItem: earned, wrongItems: wrongIdx, redo: wrongIdx, redoCorrect, target: contract.content.target },
    });
  };

  // ---------- Scramble ----------
  const pushWord = (idx: number) => {
    if (!item || item.kind !== 'scramble' || resolved) return;
    setBuilt((b) => [...b, idx]);
    void playText(item.words[idx]);
  };
  const popWord = (k: number) => {
    if (resolved) return;
    setBuilt((b) => b.filter((_, i) => i !== k));
  };
  const checkScramble = () => {
    if (!item || item.kind !== 'scramble') return;
    check(norm(built.map((i) => item.words[i]).join(' ')) === norm(item.answer));
  };

  // ---------- Gap ----------
  const pickGap = (idx: number) => {
    if (!item || item.kind !== 'gap' || resolved || gapWrong.includes(idx)) return;
    if (idx !== item.answer) setGapWrong((w) => [...w, idx]);
    check(idx === item.answer);
  };

  // ---------- Typed ----------
  const checkTyped = () => {
    if (!item || item.kind !== 'typed' || !typed.trim()) return;
    check(item.accepted.some((a) => norm(a) === norm(typed)));
  };

  if (phase === 'summary') {
    const hits = earned.reduce<number>((a, b) => a + b, 0);
    return (
      <div className="text-center py-4" data-testid="forge-summary">
        <p className="mc-title text-xs sm:text-sm">Ferraria</p>
        <p className="mc-font text-2xl text-white mt-3">{hits % 1 === 0 ? hits : hits.toFixed(1)}<span className="mc-muted text-base"> / {items.length}</span></p>
        <p className="text-sm mc-muted mt-1">peças consertadas (2ª tentativa vale metade)</p>
        {wrongIdx.length > 0 && (
          <p className="text-sm text-white/85 mt-3">Repescagem: {redoCorrect} de {wrongIdx.length} peças refeitas certas (só treino).</p>
        )}
        <button onClick={deliver} className="mc-btn mc-btn-green mt-6 px-8 py-3 text-base font-bold uppercase" data-testid="forge-deliver">Entregar contrato</button>
      </div>
    );
  }

  if (!item) return null;

  const showRule = tries > 0 && !(resolved === 'correct' && tries === 1);
  const done = resolved !== null;

  return (
    <div data-testid="forge-contract">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <span className="mc-font text-[9px] sm:text-[10px] mc-muted uppercase">
          {phase === 'redo' ? `Repescagem ${pos + 1} de ${order.length} (só treino)` : `Peça ${pos + 1} de ${order.length}`}
        </span>
        <span className="text-xs mc-muted">{contract.content.target}</span>
      </div>
      <div className="mc-bar mb-3"><div className="mc-bar-fill" style={{ width: `${((phase === 'main' ? pos : items.length) / items.length) * 100}%` }} /></div>

      <div className="mc-card p-3" data-testid={`forge-item-${cur}`}>
        <p className="mc-font text-[9px] mc-warn uppercase mb-2">{KIND_LABEL[item.kind]}</p>

        {item.kind === 'scramble' && (
          <div>
            {/* Linha de resposta: clicar num bloco devolve ao monte */}
            <div className="mc-slot min-h-[3.25rem] p-2 flex flex-wrap gap-1.5 items-center" data-testid="scramble-line">
              {built.length === 0 && <span className="text-xs mc-muted">Clique nos blocos na ordem certa</span>}
              {built.map((wi, k) => (
                <button key={`${wi}-${k}`} onClick={() => popWord(k)} disabled={done} className="mc-btn mc-btn-gold px-2.5 py-1.5 text-sm font-bold">{item.words[wi]}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3 min-h-[2.5rem]">
              {item.words.map((w, wi) =>
                built.includes(wi) ? null : (
                  <button key={wi} onClick={() => pushWord(wi)} disabled={done} className="mc-btn mc-btn-stone px-2.5 py-1.5 text-sm font-bold" data-testid={`block-${wi}`}>{w}</button>
                )
              )}
            </div>
            {!done && (
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => setBuilt((b) => b.slice(0, -1))} disabled={built.length === 0} className="mc-btn mc-btn-dark px-3 py-2 text-sm font-bold"><Undo2 className="w-4 h-4" /> Desfazer</button>
                <button onClick={checkScramble} disabled={built.length !== item.words.length} className="mc-btn mc-btn-green px-5 py-2 text-sm font-bold" data-testid="forge-check">Conferir</button>
              </div>
            )}
          </div>
        )}

        {item.kind === 'gap' && (
          <div>
            <p className="text-base font-bold text-white mb-3 font-mono tracking-wide">{done ? fullSentence(item) : item.sentence}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {item.options.map((opt, idx) => {
                const wrong = gapWrong.includes(idx);
                const right = done && idx === item.answer;
                return (
                  <button key={idx} onClick={() => pickGap(idx)} disabled={done || wrong} className={`mc-slot px-3 py-2 text-sm text-white ${right ? 'mc-slot-good' : ''} ${wrong ? 'mc-slot-bad opacity-60' : ''}`} data-testid={`gap-${idx}`}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {item.kind === 'typed' && (
          <div>
            <p className="text-sm text-white/85 mb-1">{item.prompt}</p>
            <p className="text-base font-bold text-white mb-3 font-mono tracking-wide">{done ? fullSentence(item) : item.sentence}</p>
            {!done && (
              <div className="flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') checkTyped(); }}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoComplete="off"
                  placeholder="..."
                  className="mc-slot flex-1 min-w-0 text-white text-base px-3 py-2 outline-none placeholder:text-white/40"
                  data-testid="typed-input"
                />
                <button onClick={checkTyped} disabled={!typed.trim()} className="mc-btn mc-btn-green px-5 py-2 text-sm font-bold" data-testid="forge-check">Conferir</button>
              </div>
            )}
          </div>
        )}

        {showRule && (
          <p className={`mt-3 text-sm leading-snug ${resolved === 'correct' ? 'mc-good' : 'mc-warn'}`} data-testid="forge-rule">
            {resolved === 'revealed' ? 'Resposta: ' : resolved === 'correct' ? 'Certo na 2ª tentativa. ' : 'Não foi assim. '}
            {resolved === 'revealed' && <span className="font-bold text-white">{fullSentence(item)}. </span>}
            {item.rule}
          </p>
        )}
        {resolved === 'correct' && tries === 1 && <p className="mt-3 text-sm mc-good font-bold">Certo.</p>}

        {done && (
          <div className="flex items-center gap-2 mt-4 justify-end">
            <button onClick={() => void listen(fullSentence(item))} disabled={speaking} className="mc-btn mc-btn-stone px-3 py-2 text-sm font-bold"><Volume2 className="w-4 h-4" /> Ouvir</button>
            <button onClick={next} className="mc-btn mc-btn-green px-5 py-2 text-sm font-bold" data-testid="forge-next">
              {pos + 1 < order.length ? 'Próxima peça' : phase === 'main' && wrongIdx.length > 0 ? 'Repescagem' : 'Ver o resultado'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgeContract;
