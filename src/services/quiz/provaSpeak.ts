import { playText, prefetchAudio, stopAudio, TTS_SPEED_TALK } from '../englishTts';
import { speakVerdict } from './provaRules';

/** Mesma voz da Mina (mp3 da IA), em português, ritmo de conversa. Sem voz do navegador. */
const PROVA_VOICE = { voice: 'nova' as const, speed: TTS_SPEED_TALK, lang: 'pt' as const };

export { stopAudio as stopProvaVoice };

export function prefetchVerdicts(explanation: string): void {
  const line = speakVerdict(explanation);
  if (!line) return;
  prefetchAudio([line], PROVA_VOICE);
}

export async function speakProvaVerdict(explanation: string, soundOn: boolean): Promise<void> {
  if (!soundOn) return;
  const line = speakVerdict(explanation);
  if (!line) return;
  await playText(line, PROVA_VOICE);
}
