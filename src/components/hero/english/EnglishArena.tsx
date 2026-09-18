// ========================================
// Arena de Inglês: hub dos jogos (visual de mina: painel de pedra, botões em bloco, ícones em pixel art)
// Lógica: escolhe categoria, abre um jogo, grava a rodada (recordRound) e aplica XP/gold pelo DataContext.
// ========================================

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { FirestoreService } from '../../../services/firestoreService';
import { EnglishGameId } from '../../../types';
import { ENGLISH_CATEGORIES, ENGLISH_WORDS, EnglishCategory, EnglishWord } from '../../../data/englishVocabulary';
import {
  ENGLISH_DAILY_REWARDED_ROUNDS,
  EnglishProgressDoc,
  GAME_INFO,
  MASTERY_STREAK,
  RoundResult,
  RoundReward,
  isMastered,
  playWord,
  recordRound,
  rewardedRoundsLeft,
  subscribeEnglishProgress,
} from '../../../services/englishGameService';
import BlockMemory from './BlockMemory';
import CreeperQuiz from './CreeperQuiz';
import CraftingWords from './CraftingWords';
import MineRush from './mine/MineRush';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'hub' | 'words' | EnglishGameId;

/** Ícones em pixel art gerados para a interface (public/assets/english/ui) */
export const UI = {
  banner: '/assets/english/ui/banner.webp',
  minecart: '/assets/english/ui/minecart.webp',
  memory: '/assets/english/ui/memory.webp',
  creeper: '/assets/english/ui/creeper.webp',
  crafting: '/assets/english/ui/crafting.webp',
  book: '/assets/english/ui/book.webp',
  pickaxe: '/assets/english/ui/pickaxe.webp',
  chest: '/assets/english/ui/chest.webp',
} as const;

const GAME_ICON: Record<EnglishGameId, string> = {
  mine_rush: UI.minecart,
  block_memory: UI.memory,
  creeper_quiz: UI.creeper,
  crafting_words: UI.crafting,
};

/** Jogos de treino, mostrados abaixo do Mine Rush */
const SIDE_GAMES: EnglishGameId[] = ['block_memory', 'creeper_quiz', 'crafting_words'];

/** Palavras erradas da rodada, sem repetição, na ordem em que apareceram */
const missedWordsOf = (r: RoundResult): EnglishWord[] => {
  const seen = new Set<string>();
  const out: EnglishWord[] = [];
  for (const w of r.words) {
    if (w.correct || seen.has(w.id)) continue;
    seen.add(w.id);
    const ew = ENGLISH_WORDS.find((x) => x.id === w.id);
    if (ew) out.push(ew);
  }
  return out;
};

const roundsLabel = (left: number) => (left > 0 ? `${left} rodada${left > 1 ? 's' : ''} com prêmio hoje` : 'Sem prêmio hoje, só treino');

/** Figura da palavra (imagem em pixel art ou quadrado da cor) */
const WordThumb: React.FC<{ word: EnglishWord; size?: string }> = ({ word, size = 'w-10 h-10' }) => (
  word.image
    ? <img src={word.image} alt="" className={`${size} object-contain mc-pixel shrink-0`} draggable={false} />
    : <span className={`${size} shrink-0 border-2 border-black/60`} style={{ backgroundColor: word.hex ?? '#999' }} />
);

/** Espaço de inventário com a palavra: figura, palavra, tradução e botão de ouvir */
const WordSlot: React.FC<{ word: EnglishWord; tone?: 'good' | 'bad' | 'none'; badge?: React.ReactNode }> = ({ word, tone = 'none', badge }) => (
  <button
    onClick={() => playWord(word)}
    className={`mc-slot flex items-center gap-2 p-2 text-left w-full ${tone === 'good' ? 'mc-slot-good' : tone === 'bad' ? 'mc-slot-bad' : ''}`}
  >
    <WordThumb word={word} />
    <span className="min-w-0 flex-1">
      <span className="block font-bold text-white leading-tight break-words">{word.word}</span>
      <span className="block text-xs mc-muted truncate">{word.translation}</span>
    </span>
    {badge}
    <Volume2 className="w-4 h-4 text-sky-300 shrink-0" />
  </button>
);

const EnglishArena: React.FC<Props> = ({ isOpen, onClose }) => {
  const { childUid } = useAuth();
  const { adjustUserXP, adjustUserGold } = useData();
  const { playTaskComplete, playLevelUp, playClick } = useSound();
  const [progress, setProgress] = useState<EnglishProgressDoc | null>(null);
  const [view, setView] = useState<View>('hub');
  const [category, setCategory] = useState<EnglishCategory | 'mixed'>('mixed');
  const [result, setResult] = useState<{ r: RoundResult; reward: RoundReward } | null>(null);
  const [saving, setSaving] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    if (!childUid || !isOpen) return;
    return subscribeEnglishProgress(childUid, setProgress);
  }, [childUid, isOpen]);

  if (!isOpen) return null;

  const mastered = ENGLISH_WORDS.filter((w) => isMastered(progress?.words[w.id])).length;
  const masteredPct = ENGLISH_WORDS.length ? Math.round((mastered / ENGLISH_WORDS.length) * 100) : 0;
  const bestDepth = progress?.bestDepth ?? 0;

  const start = (game: EnglishGameId) => {
    playClick();
    setResult(null);
    setGameKey((k) => k + 1);
    setView(game);
  };

  const backToHub = () => {
    setResult(null);
    setView('hub');
  };

  const finish = async (r: RoundResult) => {
    if (!childUid) return;
    setSaving(true);
    try {
      const reward = await recordRound(childUid, r);
      if (reward.xp > 0) await adjustUserXP(reward.xp);
      if (reward.gold > 0) {
        await adjustUserGold(reward.gold);
        await FirestoreService.createGoldTransaction(childUid, reward.gold, 'earned', 'english_game', `Arena de Inglês: ${GAME_INFO[r.game].title} (${r.correct}/${r.total})`, {
          metadata: { game: r.game, category: r.category, correct: r.correct, total: r.total, score: r.score },
        });
      }
      if (r.correct === r.total) playLevelUp();
      else playTaskComplete();
      setResult({ r, reward });
    } catch (e) {
      console.error('EnglishArena: erro ao salvar rodada', e);
      toast.error('Não deu para salvar a rodada');
      setView('hub');
    } finally {
      setSaving(false);
    }
  };

  const gameProps = { category, progress, onFinish: finish, onQuit: backToHub };
  const inGame = !result && !saving && view !== 'hub' && view !== 'words';
  const isMine = result?.r.game === 'mine_rush';
  const missed = result ? missedWordsOf(result.r) : [];
  const headerSubtitle = view === 'words' ? 'Toque numa palavra para ouvir' : inGame ? GAME_INFO[view as EnglishGameId].title : `${mastered} de ${ENGLISH_WORDS.length} palavras dominadas`;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          data-testid="english-arena"
          className="mc-panel mn-child-sheet rounded-lg w-full max-w-2xl text-white overflow-hidden"
          style={{ fontFamily: 'var(--font-hero)' }}
        >
          {/* Cabeçalho: entrada da mina */}
          <div className="relative h-28 sm:h-36 overflow-hidden border-b-4 border-[#17130f] shrink-0">
            <img src={UI.banner} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-4 pb-3 flex items-end gap-3">
              <img src={UI.pickaxe} alt="" className="w-12 h-12 sm:w-16 sm:h-16 mc-pixel drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]" draggable={false} />
              <div className="min-w-0 flex-1">
                <h2 className="mc-title text-sm sm:text-lg">Arena de Inglês</h2>
                <p className="text-xs sm:text-sm text-white/85 mt-1 truncate">{headerSubtitle}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="mc-btn mc-btn-dark absolute top-2 right-2 w-9 h-9 p-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mn-child-body p-3 sm:p-5">
            {/* Resultado da rodada */}
            {result && (
              <div className="text-center py-2">
                <img src={isMine ? UI.minecart : UI.chest} alt="" className="w-24 h-24 mx-auto mc-pixel" draggable={false} />
                <p className="mc-title text-xs sm:text-sm mt-2">{isMine ? (result.r.correct === result.r.total ? 'Mina completa' : 'Fim da corrida') : 'Rodada concluída'}</p>
                <p className="mc-font text-2xl sm:text-3xl text-white mt-3">{result.r.correct}<span className="mc-muted text-base"> / {result.r.total}</span></p>
                <p className="text-sm mc-muted mt-1">acertos</p>

                <div className={`mt-4 grid gap-2 ${isMine ? 'grid-cols-3' : 'grid-cols-1 max-w-[200px] mx-auto'}`}>
                  <div className="mc-slot py-2 px-1">
                    <p className="mc-font text-[9px] mc-muted uppercase">Pontos</p>
                    <p className="mc-font text-sm mc-warn mt-1">{result.r.score}</p>
                  </div>
                  {isMine && (
                    <>
                      <div className="mc-slot py-2 px-1">
                        <p className="mc-font text-[9px] mc-muted uppercase">Blocos</p>
                        <p className="mc-font text-sm mc-diamond mt-1">{result.r.depth ?? 0}</p>
                      </div>
                      <div className="mc-slot py-2 px-1">
                        <p className="mc-font text-[9px] mc-muted uppercase">Combo</p>
                        <p className="mc-font text-sm text-white mt-1">x{result.r.maxCombo ?? 0}</p>
                      </div>
                    </>
                  )}
                </div>

                {result.reward.rewarded ? (
                  <p className="mc-font text-xs sm:text-sm mc-good mt-4">+{result.reward.xp} XP <span className="mc-warn">+{result.reward.gold} GOLD</span></p>
                ) : (
                  <p className="text-sm mc-muted mt-4">Rodadas premiadas de hoje já usadas neste jogo. Essa foi por diversão e treino.</p>
                )}
                {isMine && bestDepth > 0 && (result.r.depth ?? 0) >= bestDepth && (
                  <p className="mc-font text-[10px] mc-diamond mt-2 uppercase">Novo recorde de profundidade</p>
                )}
                {result.reward.newlyMastered.length > 0 && (
                  <p className="mt-3 text-sm mc-good">
                    Palavras dominadas: <span className="font-bold text-white">{result.reward.newlyMastered.map((id) => ENGLISH_WORDS.find((w) => w.id === id)?.word).filter(Boolean).join(', ')}</span>
                  </p>
                )}
                {missed.length > 0 && (
                  <div className="mt-5 text-left">
                    <p className="mc-font text-[10px] mc-bad uppercase mb-2">Palavras para treinar</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {missed.map((w) => <WordSlot key={w.id} word={w} tone="bad" />)}
                    </div>
                  </div>
                )}
                <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  <button onClick={() => start(result.r.game)} className="mc-btn mc-btn-green py-3 font-bold text-base">Jogar de novo</button>
                  <button onClick={backToHub} className="mc-btn mc-btn-stone py-3 font-bold text-base">Voltar</button>
                </div>
              </div>
            )}

            {saving && !result && <p className="mc-font text-xs text-center mc-muted py-10">Salvando rodada...</p>}

            {/* Hub */}
            {!result && !saving && view === 'hub' && (
              <div>
                {/* Domínio das palavras */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="mc-font text-[9px] sm:text-[10px] mc-muted uppercase">Palavras dominadas</span>
                      <span className="mc-font text-[10px] text-white">{mastered}/{ENGLISH_WORDS.length}</span>
                    </div>
                    <div className="mc-bar"><div className="mc-bar-fill" style={{ width: `${masteredPct}%` }} /></div>
                  </div>
                </div>

                {/* Categoria */}
                <p className="mc-font text-[9px] sm:text-[10px] mc-muted uppercase mb-2">Categoria</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {[{ id: 'mixed' as const, label: 'Todas' }, ...ENGLISH_CATEGORIES].map((c) => {
                    const on = category === c.id;
                    return (
                      <button key={c.id} onClick={() => setCategory(c.id)} className={`mc-slot px-3 py-1.5 text-sm font-bold ${on ? 'mc-slot-selected mc-warn' : 'text-white/80 hover:text-white'}`}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                {/* Jogo principal */}
                {(() => {
                  const left = progress ? rewardedRoundsLeft(progress, 'mine_rush') : ENGLISH_DAILY_REWARDED_ROUNDS;
                  return (
                    <button onClick={() => start('mine_rush')} className="mc-card mc-card-hover w-full text-left p-3 sm:p-4 flex items-center gap-3 sm:gap-5">
                      <img src={UI.minecart} alt="" className="w-20 h-20 sm:w-28 sm:h-28 mc-pixel shrink-0" draggable={false} />
                      <span className="min-w-0 flex-1">
                        <span className="mc-title block text-xs sm:text-base">Mine Rush</span>
                        <span className="block text-sm text-white/85 mt-1.5 leading-snug">{GAME_INFO.mine_rush.description}</span>
                        <span className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {bestDepth > 0 && <span className="mc-font text-[9px] mc-diamond">Recorde {bestDepth} blocos</span>}
                          <span className={`mc-font text-[9px] ${left > 0 ? 'mc-good' : 'mc-muted'}`}>{roundsLabel(left)}</span>
                        </span>
                        <span className="mc-btn mc-btn-green mt-3 px-5 py-2 text-sm font-bold uppercase">Descer na mina</span>
                      </span>
                    </button>
                  );
                })()}

                {/* Jogos de treino */}
                <p className="mc-font text-[9px] sm:text-[10px] mc-muted uppercase mt-5 mb-2">Treinos</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SIDE_GAMES.map((g) => {
                    const left = progress ? rewardedRoundsLeft(progress, g) : ENGLISH_DAILY_REWARDED_ROUNDS;
                    return (
                      <button key={g} onClick={() => start(g)} className="mc-card mc-card-hover text-left p-3 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2">
                        <img src={GAME_ICON[g]} alt="" className="w-12 h-12 sm:w-14 sm:h-14 mc-pixel shrink-0" draggable={false} />
                        <span className="min-w-0 flex-1">
                          <span className="mc-font block text-[10px] text-white leading-relaxed">{GAME_INFO[g].title}</span>
                          <span className="block text-xs text-white/75 mt-1 leading-snug">{GAME_INFO[g].description}</span>
                          <span className={`mc-font block text-[8px] mt-2 ${left > 0 ? 'mc-good' : 'mc-muted'}`}>{roundsLabel(left)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button onClick={() => setView('words')} className="mc-btn mc-btn-stone mt-5 w-full py-3 font-bold text-base">
                  <img src={UI.book} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
                  Estudar as palavras
                </button>
              </div>
            )}

            {/* Lista de palavras */}
            {!result && !saving && view === 'words' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={backToHub} className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold">Voltar</button>
                  <span className="mc-font text-[10px] text-white">{mastered}/{ENGLISH_WORDS.length} <span className="mc-muted">dominadas</span></span>
                </div>
                {ENGLISH_CATEGORIES.map((c) => (
                  <div key={c.id} className="mb-5">
                    <p className="mc-font text-[10px] mc-warn uppercase mb-2">{c.label}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ENGLISH_WORDS.filter((w) => w.category === c.id).map((w) => {
                        const s = progress?.words[w.id];
                        const done = isMastered(s);
                        const badge = done
                          ? <Check className="w-4 h-4 mc-good shrink-0" />
                          : s && s.seen > 0
                            ? <span className="mc-font text-[8px] mc-muted shrink-0">{Math.min(s.streak, MASTERY_STREAK)}/{MASTERY_STREAK}</span>
                            : null;
                        return <WordSlot key={w.id} word={w} tone={done ? 'good' : 'none'} badge={badge} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Jogos */}
            {!result && !saving && view === 'mine_rush' && <MineRush key={gameKey} {...gameProps} />}
            {!result && !saving && view === 'block_memory' && <div className="mc-paper rounded p-3 sm:p-4 text-gray-900"><BlockMemory key={gameKey} {...gameProps} /></div>}
            {!result && !saving && view === 'creeper_quiz' && <div className="mc-paper rounded p-3 sm:p-4 text-gray-900"><CreeperQuiz key={gameKey} {...gameProps} /></div>}
            {!result && !saving && view === 'crafting_words' && <div className="mc-paper rounded p-3 sm:p-4 text-gray-900"><CraftingWords key={gameKey} {...gameProps} /></div>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnglishArena;
