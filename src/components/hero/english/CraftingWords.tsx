import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Delete, Lightbulb, Volume2 } from 'lucide-react';
import { EnglishCategory, EnglishWord } from '../../../data/englishVocabulary';
import { EnglishProgressDoc, pickWords, playWord, shuffle, RoundResult } from '../../../services/englishGameService';

interface Props {
  category: EnglishCategory | 'mixed';
  progress: EnglishProgressDoc | null;
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}

const ROUNDS = 6;
const EXTRA_LETTERS = 2;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

interface Tile {
  key: string;
  letter: string;
}

function tilesFor(word: EnglishWord): Tile[] {
  const letters = word.word.replace(/[^a-z]/gi, '').toLowerCase().split('');
  const extras: string[] = [];
  while (extras.length < EXTRA_LETTERS) {
    const l = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!letters.includes(l)) extras.push(l);
  }
  return shuffle([...letters, ...extras].map((letter, i) => ({ key: `${i}:${letter}`, letter })));
}

const CraftingWords: React.FC<Props> = ({ category, progress, onFinish, onQuit }) => {
  const words = useMemo(() => pickWords(category, ROUNDS, progress), [category, progress]);
  const [index, setIndex] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(() => (words[0] ? tilesFor(words[0]) : []));
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [status, setStatus] = useState<'typing' | 'right' | 'wrong' | 'reveal'>('typing');
  const [hints, setHints] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const results = useRef<{ id: string; correct: boolean }[]>([]);
  const startedAt = useRef(Date.now());

  const word = words[index];
  if (!word) return null;
  const target = word.word.replace(/[^a-z]/gi, '').toLowerCase();
  const typed = placed.map((t) => t.letter).join('');

  const place = (tile: Tile) => {
    if (status !== 'typing' || placed.length >= target.length) return;
    setPlaced([...placed, tile]);
    setTiles(tiles.filter((t) => t.key !== tile.key));
  };
  const undo = () => {
    if (status !== 'typing' || placed.length === 0) return;
    const last = placed[placed.length - 1];
    setPlaced(placed.slice(0, -1));
    setTiles([...tiles, last]);
  };
  const hint = () => {
    if (status !== 'typing') return;
    const pos = placed.length;
    if (pos >= target.length) return;
    // corrige o que estiver errado até aqui e coloca a próxima letra certa
    const correctSoFar = placed.filter((t, i) => t.letter === target[i]);
    const wrongOnes = placed.filter((t, i) => t.letter !== target[i]);
    const nextLetter = target[correctSoFar.length];
    const pool = [...tiles, ...wrongOnes];
    const tile = pool.find((t) => t.letter === nextLetter);
    if (!tile) return;
    setPlaced([...correctSoFar, tile]);
    setTiles(pool.filter((t) => t.key !== tile.key));
    setHints(hints + 1);
  };

  const advance = (correct: boolean) => {
    results.current.push({ id: word.id, correct });
    setTimeout(() => {
      if (index === words.length - 1) {
        onFinish({
          game: 'crafting_words',
          category,
          correct: results.current.filter((r) => r.correct).length,
          total: words.length,
          score,
          durationSec: Math.floor((Date.now() - startedAt.current) / 1000),
          words: results.current,
        });
        return;
      }
      const next = words[index + 1];
      setIndex(index + 1);
      setTiles(tilesFor(next));
      setPlaced([]);
      setStatus('typing');
      setHints(0);
      setAttempts(0);
    }, 1200);
  };

  const check = () => {
    if (typed.length !== target.length) return;
    if (typed === target) {
      setStatus('right');
      playWord(word);
      const gained = Math.max(3, 15 - hints * 4 - attempts * 3);
      setScore((s) => s + gained);
      advance(hints === 0 && attempts === 0 ? true : hints <= 1 && attempts <= 1);
    } else if (attempts >= 1) {
      setStatus('reveal');
      playWord(word);
      advance(false);
    } else {
      setStatus('wrong');
      setAttempts(attempts + 1);
      setTimeout(() => {
        setTiles([...tiles, ...placed]);
        setPlaced([]);
        setStatus('typing');
      }, 700);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm font-semibold text-gray-600">
        <span>Palavra {index + 1}/{words.length}</span>
        <span>{score} pts</span>
        <button onClick={onQuit} className="text-red-600 hover:underline">Sair</button>
      </div>

      <div className="text-center mb-4">
        {word.image ? (
          <img src={word.image} alt="" className="w-28 h-28 object-contain mx-auto" draggable={false} />
        ) : (
          <span className="block w-20 h-20 mx-auto rounded-lg border-4 border-stone-500" style={{ backgroundColor: word.hex ?? '#999' }} />
        )}
        <p className="text-lg font-bold text-gray-900 mt-2">{word.translation}</p>
        <button onClick={() => playWord(word)} className="mt-1 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
          <Volume2 className="w-4 h-4" /> ouvir em inglês
        </button>
      </div>

      <motion.div animate={status === 'wrong' ? { x: [0, -8, 8, -6, 6, 0] } : {}} className="flex justify-center gap-1.5 mb-4 min-h-[56px]">
        {target.split('').map((_, i) => {
          const t = placed[i];
          const tone = status === 'right' ? 'border-green-500 bg-green-100' : status === 'wrong' ? 'border-red-500 bg-red-100' : status === 'reveal' ? 'border-amber-500 bg-amber-100' : t ? 'border-stone-600 bg-amber-200' : 'border-dashed border-stone-400 bg-white';
          return (
            <button key={i} onClick={undo} className={`w-11 h-14 rounded-md border-4 text-2xl font-black uppercase flex items-center justify-center ${tone}`}>
              {status === 'reveal' ? target[i] : t?.letter ?? ''}
            </button>
          );
        })}
      </motion.div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {tiles.map((t) => (
          <motion.button key={t.key} whileTap={{ scale: 0.9 }} onClick={() => place(t)} disabled={status !== 'typing'} className="w-12 h-12 rounded-md border-4 border-stone-700 bg-stone-300 text-2xl font-black uppercase shadow-[inset_0_-4px_0_#78716c] disabled:opacity-50">
            {t.letter}
          </motion.button>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={undo} disabled={status !== 'typing' || placed.length === 0} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold inline-flex items-center gap-1 disabled:opacity-50">
          <Delete className="w-4 h-4" /> Apagar
        </button>
        <button onClick={hint} disabled={status !== 'typing'} className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 font-semibold inline-flex items-center gap-1 disabled:opacity-50">
          <Lightbulb className="w-4 h-4" /> Dica
        </button>
        <button onClick={check} disabled={status !== 'typing' || typed.length !== target.length} className="px-5 py-2 rounded-lg bg-green-600 text-white font-bold disabled:opacity-50">
          Confirmar
        </button>
      </div>
      {status === 'reveal' && <p className="mt-3 text-center text-sm text-gray-600">Era <strong>{word.word}</strong>. Na próxima você pega.</p>}
    </div>
  );
};

export default CraftingWords;
