import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { EnglishCategory, EnglishWord } from '../../../data/englishVocabulary';
import { EnglishProgressDoc, pickWords, playWord, shuffle, RoundResult } from '../../../services/englishGameService';

interface Card {
  key: string;
  wordId: string;
  kind: 'image' | 'word';
  word: EnglishWord;
}

interface Props {
  category: EnglishCategory | 'mixed';
  progress: EnglishProgressDoc | null;
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}

const PAIRS_BY_SIZE = (poolSize: number) => (poolSize >= 10 ? 8 : Math.min(6, poolSize));

const BlockMemory: React.FC<Props> = ({ category, progress, onFinish, onQuit }) => {
  const words = useMemo(() => pickWords(category, PAIRS_BY_SIZE(category === 'mixed' ? 35 : 10), progress), [category, progress]);
  const cards = useMemo<Card[]>(
    () => shuffle(words.flatMap((w) => [
      { key: `${w.id}:img`, wordId: w.id, kind: 'image' as const, word: w },
      { key: `${w.id}:txt`, wordId: w.id, kind: 'word' as const, word: w },
    ])),
    [words],
  );
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const attempts = useRef<Record<string, number>>({});
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (words.length > 0 && matched.size === words.length) {
      const durationSec = Math.floor((Date.now() - startedAt.current) / 1000);
      const perWord = words.map((w) => ({ id: w.id, correct: (attempts.current[w.id] ?? 0) <= 1 }));
      const correct = perWord.filter((p) => p.correct).length;
      const timeBonus = Math.max(0, 60 - durationSec);
      const score = matched.size * 10 + timeBonus - Math.max(0, moves - words.length) * 2;
      setTimeout(() => onFinish({ game: 'block_memory', category, correct, total: words.length, score: Math.max(0, score), durationSec, words: perWord }), 700);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara só quando o último par fecha
  }, [matched]);

  const flip = (card: Card) => {
    if (lock.current || flipped.includes(card.key) || matched.has(card.wordId)) return;
    const next = [...flipped, card.key];
    setFlipped(next);
    if (next.length === 2) {
      lock.current = true;
      setMoves((m) => m + 1);
      const [a, b] = next.map((k) => cards.find((c) => c.key === k)!);
      const hit = a.wordId === b.wordId && a.kind !== b.kind;
      if (hit) {
        playWord(a.word);
        setTimeout(() => {
          setMatched((s) => new Set(s).add(a.wordId));
          setFlipped([]);
          lock.current = false;
        }, 500);
      } else {
        attempts.current[a.wordId] = (attempts.current[a.wordId] ?? 0) + 1;
        attempts.current[b.wordId] = (attempts.current[b.wordId] ?? 0) + 1;
        setTimeout(() => {
          setFlipped([]);
          lock.current = false;
        }, 900);
      }
    }
  };

  const cols = cards.length <= 12 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-4';

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm font-semibold text-gray-600">
        <span>Pares: {matched.size}/{words.length}</span>
        <span>Jogadas: {moves}</span>
        <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
        <button onClick={onQuit} className="text-red-600 hover:underline">Sair</button>
      </div>
      <div className={`grid ${cols} gap-2`}>
        {cards.map((card) => {
          const isUp = flipped.includes(card.key) || matched.has(card.wordId);
          return (
            <motion.button
              key={card.key}
              onClick={() => flip(card)}
              whileTap={{ scale: 0.95 }}
              className={`aspect-square rounded-lg border-4 flex items-center justify-center overflow-hidden select-none transition-colors ${
                matched.has(card.wordId) ? 'border-green-500 bg-green-50' : isUp ? 'border-amber-500 bg-white' : 'border-stone-600 bg-stone-500 hover:bg-stone-400'
              }`}
              style={!isUp ? { backgroundImage: 'linear-gradient(135deg, #6b7280 25%, #57534e 25%, #57534e 50%, #6b7280 50%, #6b7280 75%, #57534e 75%)', backgroundSize: '16px 16px' } : undefined}
            >
              {isUp ? (
                card.kind === 'image' ? (
                  card.word.image ? (
                    <img src={card.word.image} alt="" className="w-full h-full object-contain p-1" draggable={false} />
                  ) : (
                    <span className="w-full h-full" style={{ backgroundColor: card.word.hex ?? '#999' }} />
                  )
                ) : (
                  <span className="font-bold text-gray-900 text-base sm:text-lg px-1 text-center break-words">{card.word.word}</span>
                )
              ) : null}
            </motion.button>
          );
        })}
      </div>
      {matched.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {words.filter((w) => matched.has(w.id)).map((w) => (
            <button key={w.id} onClick={() => playWord(w)} className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-semibold">
              <Volume2 className="w-3 h-3" /> {w.word} · {w.translation}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockMemory;
