// ========================================
// A Base: contrato do Recado. Brief em PT, molde de referência conforme o andaime,
// fichas do banco inseridas no cursor (estágios 0-1) ou "Dica" paga em ferro (estágio 2),
// pré-checagem local com 1 tentativa livre e juiz por IA com diff por palavra.
// ========================================

import React, { useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { NoteInfo, NoteJudgement } from '../../../../types/english';
import { MATERIAL_ICONS } from '../../../../config/englishBase';
import { noteMaterial } from '../../../../config/englishRewards';
import { judgeNote, precheckNote } from '../../../../services/englishJudge';
import { playText } from '../../../../services/englishTts';
import { seedFromString } from '../../../../services/english/shuffle';
import type { ContractScreenProps } from './ContractShell';

type Stage = 'write' | 'judging' | 'judged';

interface DiffTok {
  text: string;
  changed: boolean;
}

const NOTE_TAG_PT: Record<string, string> = {
  plural: 'Plural',
  article: 'Artigo (a/an/the)',
  verb: 'Verbo',
  spelling: 'Grafia',
  word_order: 'Ordem das palavras',
  preposition: 'Preposição',
  other: 'Outro',
};

const words = (s: string): string[] => s.split(/\s+/).filter(Boolean);
const wordKey = (w: string): string => w.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9']/g, '');

/** Diff por palavra (LCS): o que sobrou de um lado e o que entrou do outro */
function wordDiff(a: string, b: string): { left: DiffTok[]; right: DiffTok[] } {
  const x = words(a);
  const y = words(b);
  const n = x.length;
  const m = y.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = wordKey(x[i]) === wordKey(y[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const left: DiffTok[] = [];
  const right: DiffTok[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (wordKey(x[i]) === wordKey(y[j])) {
      left.push({ text: x[i], changed: false });
      right.push({ text: y[j], changed: false });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      left.push({ text: x[i], changed: true });
      i++;
    } else {
      right.push({ text: y[j], changed: true });
      j++;
    }
  }
  while (i < n) left.push({ text: x[i++], changed: true });
  while (j < m) right.push({ text: y[j++], changed: true });
  return { left, right };
}

const DiffLine: React.FC<{ tokens: DiffTok[]; tone: 'bad' | 'good' }> = ({ tokens, tone }) => (
  <p className="text-sm leading-relaxed">
    {tokens.map((t, k) => (
      <React.Fragment key={k}>
        <span className={t.changed ? (tone === 'bad' ? 'bg-red-200 line-through decoration-red-600 px-0.5 rounded' : 'bg-green-200 font-bold px-0.5 rounded') : ''}>{t.text}</span>{' '}
      </React.Fragment>
    ))}
  </p>
);

const IronStars: React.FC<{ score: number }> = ({ score }) => (
  <div className="flex justify-center gap-2" aria-label={`${score} de 3`}>
    {[0, 1, 2].map((i) => (
      <img key={i} src={MATERIAL_ICONS.ferro} alt="" draggable={false} className={`w-12 h-12 mc-pixel ${i < score ? '' : 'opacity-25 grayscale'}`} />
    ))}
  </div>
);

const NoteContract: React.FC<ContractScreenProps<'note'>> = ({ contract, level, base, sfx, onFinish }) => {
  const { content } = contract;
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>('write');
  const [missing, setMissing] = useState<NoteInfo[] | null>(null);
  const [freeAttemptUsed, setFreeAttemptUsed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [judgement, setJudgement] = useState<NoteJudgement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const scaffold = base.scaffoldStage;
  // Molde de referência (estágio 0): escolhido por semente estável do contrato, nunca preenche sozinho
  const templateUsed = scaffold === 0 && content.templates.length > 0 ? content.templates[seedFromString(`${contract.id}|${contract.theme}`) % content.templates.length] : null;
  const bankVisible = scaffold < 2 || hintUsed;
  const canBuyHint = scaffold === 2 && !hintUsed && base.materials.ferro >= 1;

  /** Insere a ficha no cursor com os espaços necessários e devolve o foco */
  const insertWord = (w: string) => {
    if (stage !== 'write') return;
    const el = areaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? start;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const ins = `${before.length > 0 && !/\s$/.test(before) ? ' ' : ''}${w}${after.length > 0 && !/^\s/.test(after) ? ' ' : ''}`;
    const next = before + ins + after;
    setText(next);
    const pos = start + ins.length;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const submit = async () => {
    const t = text.trim();
    if (stage !== 'write' || words(t).length < 2) return;
    setAttempts((a) => a + 1);
    const miss = precheckNote(t, content);
    if (miss.length > 0 && !freeAttemptUsed) {
      setMissing(miss);
      setFreeAttemptUsed(true);
      sfx.miss();
      return;
    }
    setMissing(null);
    setStage('judging');
    const j = await judgeNote({ text: t, content, level, scaffoldStage: scaffold, templateUsed });
    setJudgement(j);
    setStage('judged');
    if (j.score === 3) sfx.checkpoint();
    else if (j.score === 0) sfx.miss();
    else sfx.hit(j.score);
  };

  const listen = async (s: string) => {
    if (speaking) return;
    setSpeaking(true);
    await playText(s);
    setSpeaking(false);
  };

  const deliver = () => {
    if (!judgement) return;
    onFinish({
      score: judgement.score,
      max: 3,
      materialEarned: noteMaterial(judgement.score),
      answer: text.trim(),
      correction: judgement,
      details: { hintUsed, templateUsed, attempts, scaffoldStage: scaffold, precheckMissing: freeAttemptUsed },
    });
  };

  const diff = judgement && judgement.corrected ? wordDiff(text.trim(), judgement.corrected) : null;

  return (
    <div data-testid="note-contract">
      {/* Pedido em destaque */}
      <div className="mc-paper rounded p-3 text-gray-900 mb-3">
        <p className="mc-font text-[9px] uppercase text-gray-600 mb-1">O pedido</p>
        <p className="text-base leading-snug font-bold">{content.brief}</p>
        {content.hint && <p className="text-xs text-gray-700 mt-2">Dica de estrutura: {content.hint}</p>}
      </div>

      {stage !== 'judged' && (
        <>
          {templateUsed && (
            <p className="text-sm text-white/90 mb-2">
              <span className="mc-font text-[9px] mc-muted uppercase mr-2">Molde</span>
              <span className="font-mono tracking-wide">{templateUsed}</span>
            </p>
          )}

          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={stage === 'judging'}
            rows={3}
            maxLength={300}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            placeholder="Escreva o recado em inglês..."
            className="w-full mc-slot text-white text-base p-3 leading-relaxed outline-none focus:mc-slot-selected placeholder:text-white/40"
            data-testid="note-text"
          />
          <p className="text-[11px] mc-muted mt-1">{words(text).length} palavras</p>

          {/* Banco de palavras ou Dica paga */}
          {bankVisible ? (
            <div className="mt-2">
              <p className="mc-font text-[9px] mc-muted uppercase mb-1">Banco de palavras {hintUsed && <span className="mc-warn">(dica usada: 1 ferro)</span>}</p>
              <div className="flex flex-wrap gap-1.5">
                {content.wordBank.map((w) => (
                  <button key={w} onClick={() => insertWord(w)} disabled={stage === 'judging'} className="mc-slot px-2 py-1 text-sm text-white hover:mc-slot-selected" data-testid={`bank-${w}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button onClick={() => setHintUsed(true)} disabled={!canBuyHint} className="mc-btn mc-btn-stone px-3 py-2 text-sm font-bold" data-testid="note-hint">
                <img src={MATERIAL_ICONS.ferro} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                Dica (custa 1 ferro)
              </button>
              {!canBuyHint && base.materials.ferro < 1 && <span className="text-xs mc-muted">Sem ferro para a dica.</span>}
            </div>
          )}

          {missing && missing.length > 0 && (
            <div className="mc-card p-3 mt-3" data-testid="note-missing">
              <p className="text-sm mc-warn font-bold">Faltou dizer: {missing.map((m) => m.pt).join('; ')}.</p>
              <p className="text-xs text-white/80 mt-1">Complete o recado e envie de novo.</p>
            </div>
          )}

          <div className="flex justify-end mt-3">
            <button onClick={() => void submit()} disabled={stage === 'judging' || words(text).length < 2} className="mc-btn mc-btn-green px-6 py-3 text-base font-bold uppercase" data-testid="note-submit">
              {stage === 'judging' ? 'O ferreiro está lendo...' : 'Enviar'}
            </button>
          </div>
        </>
      )}

      {stage === 'judged' && judgement && (
        <div data-testid="note-judged">
          <IronStars score={judgement.score} />
          <p className="mc-font text-[10px] text-center text-white mt-2">{judgement.score} de 3 em ferro</p>

          {!judgement.isEnglish && <p className="text-sm mc-bad text-center mt-2">O ferreiro não entendeu: parece que o recado não está em inglês.</p>}
          {judgement.missing.length > 0 && <p className="text-sm mc-warn text-center mt-2">Faltou: {judgement.missing.join('; ')}.</p>}

          <div className="grid gap-2 sm:grid-cols-2 mt-3">
            <div className="mc-paper rounded p-3 text-gray-900">
              <p className="mc-font text-[9px] uppercase text-gray-600 mb-1">Você escreveu</p>
              {diff ? <DiffLine tokens={diff.left} tone="bad" /> : <p className="text-sm">{text.trim()}</p>}
            </div>
            <div className="mc-paper rounded p-3 text-gray-900">
              <div className="flex items-center justify-between mb-1">
                <p className="mc-font text-[9px] uppercase text-gray-600">Correção do ferreiro</p>
                <button onClick={() => void listen(judgement.corrected || text.trim())} disabled={speaking} aria-label="Ouvir a correção" className="mc-btn mc-btn-dark w-8 h-8 p-0">
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              {diff ? <DiffLine tokens={diff.right} tone="good" /> : <p className="text-sm">{judgement.errors.length === 0 ? 'Sem correções.' : 'O ferreiro só marcou os erros abaixo.'}</p>}
            </div>
          </div>

          {judgement.note && <p className="text-sm text-white/90 mt-3 leading-snug">{judgement.note}</p>}

          {judgement.errors.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1.5">
                {judgement.errors.map((e, i) => (
                  <span key={i} className="mc-slot px-2 py-1 text-[11px] text-white">
                    <span className="mc-warn font-bold">{NOTE_TAG_PT[e.tag] ?? e.tag}</span>: {e.wrong} <span className="mc-muted">-&gt;</span> {e.fix}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button onClick={deliver} className="mc-btn mc-btn-green px-6 py-3 text-base font-bold uppercase" data-testid="note-deliver">Entregar o recado</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteContract;
