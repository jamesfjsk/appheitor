import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Volume2 } from 'lucide-react';
import { EnglishCategory, EnglishWord } from '../../../data/englishVocabulary';
import { EnglishProgressDoc, distractors, pickWords, playWord, shuffle, RoundResult } from '../../../services/englishGameService';

interface Props {
  category: EnglishCategory | 'mixed';
  progress: EnglishProgressDoc | null;
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}

type Mode = 'image_to_word' | 'word_to_translation' | 'translation_to_word';
const QUESTIONS = 10;
const SECONDS = 12;
const LIVES = 3;

interface Question {
  word: EnglishWord;
  mode: Mode;
  options: EnglishWord[];
}

const CreeperQuiz: React.FC<Props> = ({ category, progress, onFinish, onQuit }) => {
  const questions = useMemo<Question[]>(() => {
    const pool = pickWords(category, QUESTIONS, progress);
    const list = pool.length >= QUESTIONS ? pool : [...pool, ...pickWords(category, QUESTIONS - pool.length, progress)];
    return list.slice(0, QUESTIONS).map((word) => {
      const modes: Mode[] = word.image ? ['image_to_word', 'word_to_translation', 'translation_to_word'] : ['word_to_translation', 'translation_to_word'];
      const mode = modes[Math.floor(Math.random() * modes.length)];
      return { word, mode, options: shuffle([word, ...distractors(word, 3)]) };
    });
  }, [category, progress]);

  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const results = useRef<{ id: string; correct: boolean }[]>([]);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  const q = questions[index];

  const finish = (finalLives: number) => {
    if (finished.current) return;
    finished.current = true;
    const correct = results.current.filter((r) => r.correct).length;
    onFinish({
      game: 'creeper_quiz',
      category,
      correct,
      total: questions.length,
      score: score + (finalLives > 0 ? finalLives * 5 : 0),
      durationSec: Math.floor((Date.now() - startedAt.current) / 1000),
      words: results.current,
    });
  };

  const answer = (option: EnglishWord | null) => {
    if (chosen || !q) return;
    const ok = option?.id === q.word.id;
    setChosen(option?.id ?? 'timeout');
    results.current.push({ id: q.word.id, correct: ok });
    if (ok) {
      setScore((s) => s + 10 + Math.ceil(timeLeft / 2));
      playWord(q.word);
    }
    const nextLives = ok ? lives : lives - 1;
    if (!ok) setLives(nextLives);
    setTimeout(() => {
      if (nextLives <= 0 || index === questions.length - 1) {
        // perguntas não respondidas contam como erradas
        for (let i = index + 1; i < questions.length; i++) results.current.push({ id: questions[i].word.id, correct: false });
        finish(nextLives);
      } else {
        setIndex(index + 1);
        setChosen(null);
        setTimeLeft(SECONDS);
      }
    }, 1100);
  };

  useEffect(() => {
    if (chosen) return;
    if (timeLeft <= 0) {
      answer(null);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contagem por segundo
  }, [timeLeft, chosen]);

  if (!q) return null;

  const prompt =
    q.mode === 'image_to_word' ? 'What is this?' : q.mode === 'word_to_translation' ? `O que significa "${q.word.word}"?` : `Como se diz "${q.word.translation}" em inglês?`;
  const label = (o: EnglishWord) => (q.mode === 'word_to_translation' ? o.translation : o.word);
  const pct = (timeLeft / SECONDS) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm font-semibold text-gray-600">
        <span>{index + 1}/{questions.length}</span>
        <span className="flex gap-1">
          {Array.from({ length: LIVES }).map((_, i) => (
            <Heart key={i} className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-current' : 'text-gray-300'}`} />
          ))}
        </span>
        <span>{score} pts</span>
        <button onClick={onQuit} className="text-red-600 hover:underline">Sair</button>
      </div>

      <div className="h-3 rounded-full bg-gray-200 overflow-hidden mb-4">
        <motion.div className={`h-full ${pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} animate={{ width: `${pct}%` }} transition={{ ease: 'linear', duration: 1 }} />
      </div>

      <div className="text-center mb-4">
        {q.mode === 'image_to_word' && q.word.image && <img src={q.word.image} alt="" className="w-32 h-32 object-contain mx-auto mb-2" draggable={false} />}
        <p className="text-xl font-bold text-gray-900">{prompt}</p>
        {q.mode !== 'translation_to_word' && (
          <button onClick={() => playWord(q.word)} className="mt-1 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
            <Volume2 className="w-4 h-4" /> ouvir
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map((o) => {
          const isCorrect = o.id === q.word.id;
          let cls = 'border-stone-400 bg-white hover:bg-amber-50';
          if (chosen) cls = isCorrect ? 'border-green-500 bg-green-100' : chosen === o.id ? 'border-red-500 bg-red-100' : 'border-gray-200 opacity-60';
          return (
            <button key={o.id} onClick={() => answer(o)} disabled={Boolean(chosen)} className={`rounded-lg border-4 p-4 font-bold text-lg transition ${cls}`}>
              {label(o)}
            </button>
          );
        })}
      </div>
      {chosen && chosen !== q.word.id && (
        <p className="mt-3 text-center text-sm text-gray-600">
          Resposta: <strong>{q.word.word}</strong> = {q.word.translation}
        </p>
      )}
    </div>
  );
};

export default CreeperQuiz;
