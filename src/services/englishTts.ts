// ========================================
// Arena de Inglês: voz das frases (seção 4.7)
// Chave = sha256("gpt-4o-mini-tts|nova|0.95|texto normalizado"); índice em
// englishAudio/{hash} com a URL do mp3 em english/tts/{hash}.mp3 (Storage).
// Sem cache: gera na OpenAI, sobe o mp3 e grava o índice. Falha em qualquer
// ponto cai na fala do navegador (speakAsync en-US). Nada aqui rejeita.
// ========================================

import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../config/firebase';
import { speakAsync } from './englishGameService';
import { DEFAULT_MODULES } from '../config/village';
import { getSettings } from './settingsService';
import type { ModuleSettings } from '../types/village';

const TTS_MODEL = 'gpt-4o-mini-tts';
const TTS_VOICE = 'nova';
const TTS_SPEED = 0.95;
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

const cacheKey = (normalized: string): string => `${TTS_MODEL}|${TTS_VOICE}|${TTS_SPEED}|${normalized}`;

/** Lê o índice; sem entrada, gera, sobe e grava. Devolve null quando não dá para ter o mp3. */
async function resolveUrl(hash: string, normalized: string): Promise<string | null> {
  const indexRef = doc(db, 'englishAudio', hash);
  const indexed = await getDoc(indexRef);
  if (indexed.exists()) {
    const url = indexed.data().url;
    if (typeof url === 'string' && url) return url;
  }
  const modules = await getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>) as unknown as ModuleSettings;
  if (modules.tts === false) return null;
  const openai = httpsCallable(functions, 'openai');
  const result = await openai({ kind: 'tts', voice: TTS_VOICE, input: normalized, model: TTS_MODEL });
  const data = result.data as { url?: string };
  return typeof data.url === 'string' && data.url ? data.url : null;
}

/** URL do mp3 do texto (cache em memória, índice no Firestore, geração quando falta); null se não der */
export function audioUrlFor(text: string): Promise<string | null> {
  const normalized = normalizeText(text);
  if (!normalized || !hasSubtle()) return Promise.resolve(null);
  // A chave do cache em memória é o texto normalizado: o hash só existe depois de um await
  const existing = urlCache.get(normalized);
  if (existing) return existing;
  const task = (async () => {
    const hash = await sha256Hex(cacheKey(normalized));
    return resolveUrl(hash, normalized);
  })();
  const guarded = task.catch((error: unknown) => {
    console.warn('englishTts: sem áudio para o texto', error);
    // Libera para tentar de novo mais tarde (queda de rede, cota)
    urlCache.delete(normalized);
    return null;
  });
  urlCache.set(normalized, guarded);
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

function playUrl(url: string, text: string): Promise<void> {
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
      if (settled) return;
      detach();
      void speakAsync(text, 'en-US').then(settle);
    };
    guard = window.setTimeout(settle, PLAY_GUARD_MS);
    el.addEventListener('ended', settle);
    el.addEventListener('error', fallback);
    current = el;
    el.currentTime = 0;
    el.play().catch(fallback);
  });
}

/** Toca o texto (mp3 com cache; fala do navegador como reserva) e resolve no fim. Nunca rejeita. */
export async function playText(text: string): Promise<void> {
  stopAudio();
  const normalized = normalizeText(text);
  if (!normalized) return;
  const url = await audioUrlFor(normalized);
  if (!url) return speakAsync(normalized, 'en-US');
  return playUrl(url, normalized);
}

// ---------- Pré-busca ----------

const prefetchQueue: string[] = [];
const queued = new Set<string>();
let prefetchRunning = 0;

function pumpPrefetch(): void {
  while (prefetchRunning < PREFETCH_CONCURRENCY && prefetchQueue.length > 0) {
    const text = prefetchQueue.shift() as string;
    prefetchRunning++;
    void audioUrlFor(text).finally(() => {
      prefetchRunning--;
      queued.delete(text);
      pumpPrefetch();
    });
  }
}

/** Gera (ou confirma) o áudio das frases em segundo plano, poucas por vez, sem repetir */
export function prefetchAudio(texts: string[]): void {
  for (const raw of texts) {
    const text = normalizeText(raw);
    if (!text || queued.has(text) || urlCache.has(text)) continue;
    queued.add(text);
    prefetchQueue.push(text);
  }
  pumpPrefetch();
}
