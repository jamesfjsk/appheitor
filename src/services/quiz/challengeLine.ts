import { addDays } from '../../utils/clock';

export const CHALLENGE_LINE = 'Ele acertou quase tudo nas últimas duas semanas: suba um degrau. A conta tem uma etapa a mais, e cada distrator é o resultado de uma etapa feita pela metade.';

export interface ChallengeItem {
  date: string;
  correct: boolean;
  msToAnswer?: number;
  kind?: string;
}

/** Últimos 14 dias, fora o dilema. Sem 12 perguntas ou sem 90% de acerto, sem linha. */
export function challengeLine(items: ChallengeItem[], today: string): string | null {
  const since = addDays(today, -14);
  const window = items.filter((item) => item.date >= since && item.date < today && item.kind !== 'dilemma');
  if (window.length < 12) return null;
  const hits = window.filter((item) => item.correct).length;
  if (hits / window.length < 0.9) return null;
  return CHALLENGE_LINE;
}
