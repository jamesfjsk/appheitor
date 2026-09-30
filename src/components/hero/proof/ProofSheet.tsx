import React, { useState } from 'react';
import type { Proof, ProofKind } from '../../../types/proof';
import { proofReady } from '../../../services/assignments/machine';
import { useSound } from '../../../contexts/SoundContext';
import {
  adultBand,
  changeAsk,
  failAsk,
  photoFatherLine,
  showFatherLine,
} from '../../../services/assignments/voice';

interface Props {
  criteria: string[];
  questions: string[];
  kinds: ProofKind[];
  adult?: boolean;
  askMeta?: boolean;
  again?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (payload: { proof: Proof; whatWentWrong?: string; whatChanged?: string }) => void;
}

const ProofSheet: React.FC<Props> = ({
  criteria, questions, kinds, adult, askMeta, again, busy, onCancel, onSubmit,
}) => {
  const { playClick } = useSound();
  const [marks, setMarks] = useState<boolean[]>(() => criteria.map(() => false));
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);
  const [changed, setChanged] = useState('');

  const proof: Proof = {
    kinds,
    ...(kinds.includes('checklist') ? { checklist: marks } : {}),
    ...(kinds.includes('questions')
      ? { answers: questions.map((q, i) => ({ q, a: answers[i] || '' })) }
      : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
  };
  const ready = proofReady({ kinds, questions }, proof, criteria.length)
    && (!askMeta || !failed || changed.trim().length > 0);

  return (
    <div className="space-y-3" data-testid="encomendas-proof">
      <p className="font-bold">Como mostrar</p>
      {adult && <p className="mc-card p-3 text-sm font-bold">{adultBand()}</p>}
      {kinds.includes('checklist') && criteria.map((line, i) => (
        <button
          key={line}
          type="button"
          className={`mc-row rounded px-3 py-2 w-full text-left min-h-[44px] ${marks[i] ? 'mc-slot-selected' : ''}`}
          aria-pressed={marks[i]}
          onClick={() => { playClick(); setMarks((prev) => prev.map((on, n) => (n === i ? !on : on))); }}
        >
          <span className="text-sm">{marks[i] ? 'Pronto' : 'Ainda'} · {line}</span>
        </button>
      ))}
      {kinds.includes('questions') && questions.map((q, i) => (
        <label key={q} className="block space-y-1">
          <span className="text-sm font-bold">{q}</span>
          <textarea
            className="w-full rounded p-2 text-sm text-black min-h-[72px]"
            value={answers[i] || ''}
            onChange={(e) => setAnswers((prev) => prev.map((a, n) => (n === i ? e.target.value : a)))}
          />
        </label>
      ))}
      {kinds.includes('inPerson') && (
        <div className="mc-card p-3 space-y-2">
          <p className="text-sm">{showFatherLine()}</p>
          <textarea
            className="w-full rounded p-2 text-sm text-black min-h-[44px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Uma frase, se quiser"
          />
        </div>
      )}
      {kinds.includes('photo') && <p className="text-sm">{photoFatherLine()}</p>}
      {askMeta && (
        <div className="mc-card p-3 space-y-2">
          <p className="text-sm font-bold">{failAsk()}</p>
          <div className="flex gap-2">
            <button type="button" className={`mc-btn min-h-[44px] px-3 ${failed ? 'mc-btn-wood' : 'mc-btn-stone'}`} onClick={() => { playClick(); setFailed(true); }}>Sim</button>
            <button type="button" className={`mc-btn min-h-[44px] px-3 ${failed ? 'mc-btn-stone' : 'mc-btn-wood'}`} onClick={() => { playClick(); setFailed(false); setChanged(''); }}>Não</button>
          </div>
          {failed && (
            <label className="block space-y-1">
              <span className="text-sm">{changeAsk()}</span>
              <input className="w-full rounded p-2 text-sm text-black min-h-[44px]" value={changed} onChange={(e) => setChanged(e.target.value)} />
            </label>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => { playClick(); onCancel(); }}>Voltar</button>
        <button
          type="button"
          data-testid="entregar-prova"
          className="mc-btn mc-btn-green min-h-[44px] px-3 flex-1"
          disabled={!ready || busy}
          onClick={() => {
            playClick();
            onSubmit({
              proof,
              ...(askMeta && failed ? { whatWentWrong: 'sim', whatChanged: changed.trim() } : {}),
            });
          }}
        >
          {again ? 'Entregar de novo' : 'Entregar'}
        </button>
      </div>
    </div>
  );
};

export default ProofSheet;
