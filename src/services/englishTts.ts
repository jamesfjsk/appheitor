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
const TTS_VOICE_SAGE = 'sage';
/** Mesmo texto da função (`functions/src/index.ts`). O hash inclui isto. */
export const TTS_INSTRUCTIONS =
  'fale devagar e com clareza, tom acolhedor, para uma criança de 10 anos aprendendo inglês, pausa curta entre as palavras';
/** Mesmo texto da função para a voz sage (prova do dia). */
export const TTS_INSTRUCTIONS_PT =
  'Português do Brasil, conversa natural com um menino de 10 anos. Tom de professor paciente. Ritmo de fala normal, não arrastado e não de locutor.';
export const TTS_SPEED = 0.9;
export const TTS_SPEED_SLOW = 0.75;
export const TTS_SPEED_TALK = 1.05;

export type PlayTextOpts = { speed?: number; voice?: 'nova' | 'sage'; lang?: 'en' | 'pt' };
/** Nenhuma reprodução segura a tela por mais que isso */
const PLAY_GUARD_MS = 60_000;
/** Pré-busca: quantas gerações ao mesmo tempo */
const PREFETCH_CONCURRENCY = 4;

const hasSubtle = (): boolean => typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
const hasSpeech = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** URL (ou null) por hash; a promessa é compartilhada entre quem pedir o mesmo texto */
const urlCache = new Map<string, Promise<string | null>>();
const audioCache = new Map<string, HTMLAudioElement>();
let current: HTMLAudioElement | null = null;
let currentSettle: (() => void) | null = null;

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

const clampSpeed = (n: number | undefined): number => {
  if (n === TTS_SPEED_SLOW) return TTS_SPEED_SLOW;
  if (n === TTS_SPEED_TALK) return TTS_SPEED_TALK;
  return TTS_SPEED;
};
const clampVoice = (v: PlayTextOpts['voice']): 'nova' | 'sage' => (v === TTS_VOICE_SAGE ? TTS_VOICE_SAGE : TTS_VOICE);
const clampLang = (l: PlayTextOpts['lang']): 'en' | 'pt' => (l === 'pt' ? 'pt' : 'en');
const instructionsOf = (lang: 'en' | 'pt'): string => (lang === 'pt' ? TTS_INSTRUCTIONS_PT : TTS_INSTRUCTIONS);

const cacheKey = (normalized: string, speed: number, voice: 'nova' | 'sage', lang: 'en' | 'pt'): string =>
  `${TTS_MODEL}|${voice}|${speed}|${instructionsOf(lang)}|${normalized}`;

const memKey = (normalized: string, speed: number, voice: 'nova' | 'sage', lang: 'en' | 'pt'): string =>
  `${lang}|${voice}|${speed}|${normalized}`;

/** Lê o índice; sem entrada, gera, sobe e grava. Devolve null quando não dá para ter o mp3. */
async function resolveUrl(hash: string, normalized: string, speed: number, voice: 'nova' | 'sage', lang: 'en' | 'pt'): Promise<string | null> {
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
    voice,
    lang,
    input: normalized,
    model: TTS_MODEL,
    speed,
  });
  const data = result.data as { url?: string };
  return typeof data.url === 'string' && data.url ? data.url : null;
}

export function audioUrlFor(text: string, opts?: PlayTextOpts): Promise<string | null> {
  const normalized = normalizeText(text);
  const speed = clampSpeed(opts?.speed);
  const voice = clampVoice(opts?.voice);
  const lang = clampLang(opts?.lang);
  if (!normalized || !hasSubtle()) return Promise.resolve(null);
  const key = memKey(normalized, speed, voice, lang);
  const existing = urlCache.get(key);
  if (existing) return existing;
  const task = (async () => {
    const hash = await sha256Hex(cacheKey(normalized, speed, voice, lang));
    return resolveUrl(hash, normalized, speed, voice, lang);
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
  const settle = currentSettle;
  currentSettle = null;
  settle?.();
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
      if (currentSettle === settle) currentSettle = null;
      resolve();
    };
    const fallback = () => {
      settle();
    };
    guard = window.setTimeout(settle, PLAY_GUARD_MS);
    el.addEventListener('ended', settle);
    el.addEventListener('error', fallback);
    currentSettle = settle;
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
  const speed = clampSpeed(opts?.speed);
  const voice = clampVoice(opts?.voice);
  const lang = clampLang(opts?.lang);
  let url = await audioUrlFor(normalized, opts);
  if (!url) {
    urlCache.delete(memKey(normalized, speed, voice, lang));
    url = await audioUrlFor(normalized, opts);
  }
  if (!url) return;
  return playUrl(url);
}

// ---------- Pré-busca ----------

const prefetchQueue: { text: string; speed: number; voice: 'nova' | 'sage'; lang: 'en' | 'pt' }[] = [];
const queued = new Set<string>();
let prefetchRunning = 0;

function pumpPrefetch(): void {
  while (prefetchRunning < PREFETCH_CONCURRENCY && prefetchQueue.length > 0) {
    const job = prefetchQueue.shift();
    if (!job) break;
    prefetchRunning++;
    void audioUrlFor(job.text, { speed: job.speed, voice: job.voice, lang: job.lang }).finally(() => {
      prefetchRunning--;
      queued.delete(memKey(job.text, job.speed, job.voice, job.lang));
      pumpPrefetch();
    });
  }
}

export function prefetchAudio(texts: string[], opts?: PlayTextOpts): void {
  const speed = clampSpeed(opts?.speed);
  const voice = clampVoice(opts?.voice);
  const lang = clampLang(opts?.lang);
  for (const raw of texts) {
    const text = normalizeText(raw);
    const key = memKey(text, speed, voice, lang);
    if (!text || queued.has(key) || urlCache.has(key)) continue;
    queued.add(key);
    prefetchQueue.push({ text, speed, voice, lang });
  }
  pumpPrefetch();
}
