// ========================================
// Arena de Inglês: voz das frases (seção 4.7)
// Chave = sha256("gpt-4o-mini-tts|nova|velocidade|instructions|texto normalizado");
// índice em englishAudio/{hash} com a URL do mp3 em english/tts/{hash}.mp3 (Storage).
// Sem cache: gera na OpenAI, sobe o mp3 e grava o índice. Sem fala do
// navegador: a voz é sempre nova (gpt-4o-mini-tts). Sem URL, silêncio.
// ========================================

import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../config/firebase';
import { DEFAULT_MODULES } from '../config/village';
import { getSettings } from './settingsService';
import type { ModuleSettings } from '../types/village';

const TTS_MODEL = 'gpt-4o-mini-tts';
const TTS_VOICE = 'nova';
/** Mesmo texto da função (`functions/src/index.ts`). O hash inclui isto. */
export const TTS_INSTRUCTIONS =
  'fale devagar e com clareza, tom acolhedor, para uma criança de 10 anos aprendendo inglês, pausa curta entre as palavras';
export const TTS_SPEED = 0.9;
export const TTS_SPEED_SLOW = 0.75;

export type PlayTextOpts = { speed?: number };
/** Nenhuma reprodução segura a tela por mais que isso */
const PLAY_GUARD_MS = 60_000;
/** Pré-busca: quantas gerações ao mesmo tempo */
const PREFETCH_CONCURRENCY = 2;

const hasSubtle = (): boolean => typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
const hasSpeech = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** URL (ou null) por hash; a promessa é compartilhada entre quem pedir o mesmo texto */
const urlCache = new Map<string, Promise<string | null>>();
const audioCache = new Map<string, HTMLAudioElement>();
let current: HTMLAudioElement | null = null;

/** Espaços únicos e aspas retas: o mesmo texto com formatação diferente vira o mesmo áudio */
function normalizeText(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const clampSpeed = (n: number | undefined): number => (n === TTS_SPEED_SLOW ? TTS_SPEED_SLOW : TTS_SPEED);

const cacheKey = (normalized: string, speed: number): string =>
  `${TTS_MODEL}|${TTS_VOICE}|${speed}|${TTS_INSTRUCTIONS}|${normalized}`;

const memKey = (normalized: string, speed: number): string => `${speed}|${normalized}`;

/** Lê o índice; sem entrada, gera, sobe e grava. Devolve null quando não dá para ter o mp3. */
async function resolveUrl(hash: string, normalized: string, speed: number): Promise<string | null> {
  const indexRef = doc(db, 'englishAudio', hash);
  const indexed = await getDoc(indexRef);
  if (indexed.exists()) {
    const url = indexed.data().url;
    if (typeof url === 'string' && url) return url;
  }
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  if (modules.tts === false) return null;
  const openai = httpsCallable(functions, 'openai');
  const result = await openai({
    kind: 'tts',
    voice: TTS_VOICE,
    input: normalized,
    model: TTS_MODEL,
    speed,
    instructions: TTS_INSTRUCTIONS,
  });
  const data = result.data as { url?: string };
  return typeof data.url === 'string' && data.url ? data.url : null;
}

/** URL do mp3 do texto (cache em memória, índice no Firestore, geração quando falta); null se não der */
export function audioUrlFor(text: string, opts?: PlayTextOpts): Promise<string | null> {
  const normalized = normalizeText(text);
  const speed = clampSpeed(opts?.speed);
  if (!normalized || !hasSubtle()) return Promise.resolve(null);
  const key = memKey(normalized, speed);
  const existing = urlCache.get(key);
  if (existing) return existing;
  const task = (async () => {
    const hash = await sha256Hex(cacheKey(normalized, speed));
    return resolveUrl(hash, normalized, speed);
  })();
  const guarded = task.catch((error: unknown) => {
    console.warn('englishTts: sem áudio para o texto', error);
    urlCache.delete(key);
    return null;
  });
  urlCache.set(key, guarded);
  return guarded;
}

function audioFor(url: string): HTMLAudioElement {
  let el = audioCache.get(url);
  if (!el) {
    // Sem crossOrigin: a URL do Storage toca direto e não precisa de CORS
    el = new Audio(url);
    el.preload = 'auto';
    audioCache.set(url, el);
  }
  return el;
}

/** Para o áudio atual e a fala do navegador */
export function stopAudio(): void {
  if (current) {
    current.pause();
    current.currentTime = 0;
    current = null;
  }
  if (hasSpeech()) window.speechSynthesis.cancel();
}

function playUrl(url: string): Promise<void> {
  const el = audioFor(url);
  return new Promise<void>((resolve) => {
    let settled = false;
    let guard = 0;
    const detach = () => {
      el.removeEventListener('ended', settle);
      el.removeEventListener('error', fallback);
    };
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      detach();
      if (current === el) current = null;
      resolve();
    };
    const fallback = () => {
      settle();
    };
    guard = window.setTimeout(settle, PLAY_GUARD_MS);
    el.addEventListener('ended', settle);
    el.addEventListener('error', fallback);
    current = el;
    el.currentTime = 0;
    el.play().catch(fallback);
  });
}

/** Toca o mp3 da voz nova. Sem URL, silêncio. Nunca rejeita. */
export async function playText(text: string, opts?: PlayTextOpts): Promise<void> {
  stopAudio();
  const normalized = normalizeText(text);
  if (!normalized) return;
  let url = await audioUrlFor(normalized, opts);
  if (!url) {
    urlCache.delete(memKey(normalized, clampSpeed(opts?.speed)));
    url = await audioUrlFor(normalized, opts);
  }
  if (!url) return;
  return playUrl(url);
}

// ---------- Pré-busca ----------

const prefetchQueue: { text: string; speed: number }[] = [];
const queued = new Set<string>();
let prefetchRunning = 0;

function pumpPrefetch(): void {
  while (prefetchRunning < PREFETCH_CONCURRENCY && prefetchQueue.length > 0) {
    const job = prefetchQueue.shift();
    if (!job) break;
    prefetchRunning++;
    void audioUrlFor(job.text, { speed: job.speed }).finally(() => {
      prefetchRunning--;
      queued.delete(memKey(job.text, job.speed));
      pumpPrefetch();
    });
  }
}

/** Gera (ou confirma) o áudio das frases em segundo plano, poucas por vez, sem repetir */
export function prefetchAudio(texts: string[], opts?: PlayTextOpts): void {
  const speed = clampSpeed(opts?.speed);
  for (const raw of texts) {
    const text = normalizeText(raw);
    const key = memKey(text, speed);
    if (!text || queued.has(key) || urlCache.has(key)) continue;
    queued.add(key);
    prefetchQueue.push({ text, speed });
  }
  pumpPrefetch();
}
