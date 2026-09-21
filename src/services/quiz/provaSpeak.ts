import { playText, prefetchAudio, stopAudio, TTS_SPEED_TALK } from '../englishTts';
import { lessonSpeakText, speakChunks, speakVerdict } from './provaRules';

/** Mesma voz da Mina (mp3 da IA), em português, ritmo de conversa. Sem voz do navegador. */
const PROVA_VOICE = { voice: 'nova' as const, speed: TTS_SPEED_TALK, lang: 'pt' as const };

export { stopAudio as stopProvaVoice };

export function prefetchVerdicts(explanation: string): void {
  const line = speakVerdict(explanation);
  if (!line) return;
  prefetchAudio([line], PROVA_VOICE);
}

export function prefetchLesson(theme: { title?: string; lesson?: string; whyItMatters?: string; curiosity?: string }): void {
  const parts = speakChunks(lessonSpeakText(theme));
  if (parts.length === 0) return;
  prefetchAudio(parts, PROVA_VOICE);
}

export async function speakProvaVerdict(explanation: string, soundOn: boolean): Promise<void> {
  if (!soundOn) return;
  const line = speakVerdict(explanation);
  if (!line) return;
  await playText(line, PROVA_VOICE);
}

/** Narra a ideia do dia inteira, fatia a fatia. Para se `stopped` virar true. */
export async function speakProvaLesson(
  theme: { title?: string; lesson?: string; whyItMatters?: string; curiosity?: string },
  soundOn: boolean,
  stopped?: () => boolean,
): Promise<void> {
  if (!soundOn) return;
  for (const part of speakChunks(lessonSpeakText(theme))) {
    if (stopped?.()) return;
    await playText(part, PROVA_VOICE);
  }
}
