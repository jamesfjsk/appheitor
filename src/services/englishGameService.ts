// ========================================
// Arena de Inglês: progresso por palavra, sessões de jogo e prêmios
//   englishProgress/{uid}   -> domínio de cada palavra, contadores do dia, últimas sessões
//   englishSessions/{id}    -> uma linha por rodada jogada
// ========================================

import { collection, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EnglishGameId, EnglishProgress, EnglishWordStat } from '../types';
import { ENGLISH_WORDS, EnglishCategory, EnglishWord } from '../data/englishVocabulary';
import { getTodayBrazil } from '../utils/timezone';

/** Rodadas premiadas por jogo por dia; depois disso joga sem XP/gold (evita "farmar") */
export const ENGLISH_DAILY_REWARDED_ROUNDS = 3;
/** Acertos seguidos para considerar a palavra dominada */
export const MASTERY_STREAK = 3;

export const GAME_INFO: Record<EnglishGameId, { title: string; description: string; maxXp: number; maxGold: number }> = {
  mine_rush: { title: 'Mine Rush', description: 'Desça na mina de carrinho e quebre o bloco certo antes de bater.', maxXp: 30, maxGold: 12 },
  block_memory: { title: 'Block Memory', description: 'Vire os blocos e combine a figura com a palavra em inglês.', maxXp: 20, maxGold: 8 },
  creeper_quiz: { title: 'Creeper Quiz', description: 'Responda antes do creeper explodir. Três vidas.', maxXp: 25, maxGold: 10 },
  crafting_words: { title: 'Crafting Words', description: 'Monte a palavra em inglês com os blocos de letras.', maxXp: 25, maxGold: 10 },
};

export interface SessionSummary {
  game: EnglishGameId;
  category: string;
  date: string;
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
  goldEarned: number;
  rewarded: boolean;
  /** Mine Rush: blocos quebrados na corrida */
  depth?: number;
}

export interface EnglishProgressDoc extends EnglishProgress {
  daily: { date: string; counts: Partial<Record<EnglishGameId, number>> };
  recent: SessionSummary[];
}

const emptyProgress = (userId: string): EnglishProgressDoc => ({
  userId,
  words: {},
  sessions: 0,
  updatedAt: new Date(0),
  daily: { date: '', counts: {} },
  recent: [],
});

function parse(userId: string, data: Record<string, unknown> | undefined): EnglishProgressDoc {
  if (!data) return emptyProgress(userId);
  const words: Record<string, EnglishWordStat> = {};
  const raw = (data.words ?? {}) as Record<string, Record<string, unknown>>;
  for (const [id, w] of Object.entries(raw)) {
    words[id] = {
      seen: Number(w.seen) || 0,
      correct: Number(w.correct) || 0,
      wrong: Number(w.wrong) || 0,
      streak: Number(w.streak) || 0,
      lastAt: (w.lastAt as Timestamp | undefined)?.toDate?.(),
    };
  }
  const daily = (data.daily ?? {}) as { date?: string; counts?: Record<string, number> };
  return {
    userId,
    words,
    sessions: Number(data.sessions) || 0,
    updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate?.() ?? new Date(0),
    daily: { date: daily.date ?? '', counts: (daily.counts ?? {}) as Partial<Record<EnglishGameId, number>> },
    recent: Array.isArray(data.recent) ? (data.recent as SessionSummary[]) : [],
    ...(typeof data.bestDepth === 'number' ? { bestDepth: data.bestDepth } : {}),
    ...(typeof data.bestScore === 'number' ? { bestScore: data.bestScore } : {}),
  };
}

export async function getEnglishProgress(userId: string): Promise<EnglishProgressDoc> {
  const snap = await getDoc(doc(db, 'englishProgress', userId));
  return parse(userId, snap.exists() ? snap.data() : undefined);
}

export function subscribeEnglishProgress(userId: string, onChange: (p: EnglishProgressDoc) => void): () => void {
  return onSnapshot(doc(db, 'englishProgress', userId), (snap) => onChange(parse(userId, snap.exists() ? snap.data() : undefined)));
}

export const isMastered = (s?: EnglishWordStat): boolean => Boolean(s && s.streak >= MASTERY_STREAK);

export function rewardedRoundsLeft(progress: EnglishProgressDoc, game: EnglishGameId): number {
  const today = getTodayBrazil();
  const used = progress.daily.date === today ? progress.daily.counts[game] ?? 0 : 0;
  return Math.max(0, ENGLISH_DAILY_REWARDED_ROUNDS - used);
}

export function wordsOf(category: EnglishCategory | 'mixed'): EnglishWord[] {
  return category === 'mixed' ? ENGLISH_WORDS : ENGLISH_WORDS.filter((w) => w.category === category);
}

/** Sorteia palavras dando preferência às que ele ainda erra ou não domina */
export function pickWords(category: EnglishCategory | 'mixed', count: number, progress: EnglishProgressDoc | null): EnglishWord[] {
  const pool = wordsOf(category);
  const weight = (w: EnglishWord) => {
    const s = progress?.words[w.id];
    if (!s || s.seen === 0) return 3;       // nunca vista: alta
    if (s.wrong > s.correct) return 4;      // erra mais do que acerta: máxima
    if (!isMastered(s)) return 2;
    return 1;                               // dominada: aparece menos
  };
  const bag = pool.map((w) => ({ w, r: Math.random() * weight(w) }));
  bag.sort((a, b) => b.r - a.r);
  return bag.slice(0, Math.min(count, pool.length)).map((x) => x.w);
}

/** Alternativas erradas para uma palavra (mesma categoria quando possível) */
export function distractors(word: EnglishWord, count: number): EnglishWord[] {
  const same = ENGLISH_WORDS.filter((w) => w.id !== word.id && w.category === word.category);
  const others = ENGLISH_WORDS.filter((w) => w.id !== word.id && w.category !== word.category);
  const pick = [...same].sort(() => Math.random() - 0.5).slice(0, count);
  if (pick.length < count) pick.push(...others.sort(() => Math.random() - 0.5).slice(0, count - pick.length));
  return pick;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Áudio da palavra (arquivo do projeto antigo; fala do navegador como reserva) ----------
const audioCache = new Map<string, HTMLAudioElement>();
export function playWord(word: EnglishWord): void {
  if (word.audio) {
    let el = audioCache.get(word.audio);
    if (!el) {
      el = new Audio(word.audio);
      audioCache.set(word.audio, el);
    }
    el.currentTime = 0;
    el.play().catch(() => speak(word.word));
    return;
  }
  speak(word.word);
}
function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ---------- Fim de rodada ----------
export interface RoundResult {
  game: EnglishGameId;
  category: EnglishCategory | 'mixed';
  correct: number;
  total: number;
  score: number;
  durationSec: number;
  /** resultado por palavra (uma palavra pode aparecer mais de uma vez) */
  words: { id: string; correct: boolean }[];
  /** Mine Rush: blocos quebrados na corrida */
  depth?: number;
  /** Mine Rush: maior sequência de acertos */
  maxCombo?: number;
}

export interface RoundReward {
  xp: number;
  gold: number;
  rewarded: boolean;
  roundsLeft: number;
  newlyMastered: string[];
}

export function computeReward(game: EnglishGameId, correct: number, total: number, rewarded: boolean): { xp: number; gold: number } {
  if (!rewarded || total === 0 || correct === 0) return { xp: 0, gold: 0 };
  const info = GAME_INFO[game];
  const perf = correct / total;
  const perfect = correct === total;
  // Mine Rush: corrida completa sem erro ganha +5 XP além do bônus de rodada perfeita
  const fullRun = game === 'mine_rush' && perfect && total > 0;
  return {
    xp: Math.max(1, Math.round(info.maxXp * perf)) + (perfect ? 5 : 0) + (fullRun ? 5 : 0),
    gold: Math.max(1, Math.round(info.maxGold * perf)) + (perfect ? 2 : 0),
  };
}

/**
 * Grava a rodada, atualiza o domínio das palavras e devolve o prêmio.
 * O XP/gold em si é aplicado pelo componente (via DataContext), como nos outros jogos.
 */
export async function recordRound(userId: string, r: RoundResult): Promise<RoundReward> {
  const today = getTodayBrazil();
  const progressRef = doc(db, 'englishProgress', userId);
  const sessionRef = doc(collection(db, 'englishSessions'));
  let reward: RoundReward = { xp: 0, gold: 0, rewarded: false, roundsLeft: 0, newlyMastered: [] };

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(progressRef);
    const p = parse(userId, snap.exists() ? snap.data() : undefined);
    const counts = p.daily.date === today ? { ...p.daily.counts } : {};
    const used = counts[r.game] ?? 0;
    const rewarded = used < ENGLISH_DAILY_REWARDED_ROUNDS;
    const { xp, gold } = computeReward(r.game, r.correct, r.total, rewarded);
    if (rewarded) counts[r.game] = used + 1;

    const words = { ...p.words };
    const newlyMastered: string[] = [];
    for (const w of r.words) {
      const s = words[w.id] ?? { seen: 0, correct: 0, wrong: 0, streak: 0 };
      const wasMastered = isMastered(s);
      const next: EnglishWordStat = {
        seen: s.seen + 1,
        correct: s.correct + (w.correct ? 1 : 0),
        wrong: s.wrong + (w.correct ? 0 : 1),
        streak: w.correct ? s.streak + 1 : 0,
        lastAt: new Date(),
      };
      words[w.id] = next;
      if (!wasMastered && isMastered(next) && !newlyMastered.includes(w.id)) newlyMastered.push(w.id);
    }

    // Firestore não aceita undefined: só inclui os campos do Mine Rush quando existem
    const mineFields = {
      ...(typeof r.depth === 'number' ? { depth: r.depth } : {}),
      ...(typeof r.maxCombo === 'number' ? { maxCombo: r.maxCombo } : {}),
    };
    const summary: SessionSummary = { game: r.game, category: r.category, date: today, correct: r.correct, total: r.total, score: r.score, xpEarned: xp, goldEarned: gold, rewarded, ...(typeof r.depth === 'number' ? { depth: r.depth } : {}) };
    const recent = [summary, ...p.recent].slice(0, 10);

    // Recordes do Mine Rush (só sobem)
    const records = r.game === 'mine_rush'
      ? {
          bestDepth: Math.max(p.bestDepth ?? 0, r.depth ?? 0),
          bestScore: Math.max(p.bestScore ?? 0, r.score),
        }
      : {};

    tx.set(progressRef, {
      userId,
      words: Object.fromEntries(Object.entries(words).map(([id, s]) => [id, { ...s, lastAt: s.lastAt ? Timestamp.fromDate(s.lastAt) : null }])),
      sessions: p.sessions + 1,
      daily: { date: today, counts },
      recent,
      ...records,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    tx.set(sessionRef, {
      userId,
      game: r.game,
      category: r.category,
      date: today,
      correct: r.correct,
      total: r.total,
      score: r.score,
      durationSec: r.durationSec,
      xpEarned: xp,
      goldEarned: gold,
      rewarded,
      ...mineFields,
      createdAt: serverTimestamp(),
    });

    reward = { xp, gold, rewarded, roundsLeft: Math.max(0, ENGLISH_DAILY_REWARDED_ROUNDS - (counts[r.game] ?? 0)), newlyMastered };
  });

  return reward;
}
