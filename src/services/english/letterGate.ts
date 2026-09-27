/** Tempo mínimo da Carta se ele parar o áudio ou a voz falhar. 600 ms por palavra, entre 12 s e 45 s. */
export function letterGateMs(words: number): number {
  const n = Number.isFinite(words) ? Math.max(0, words) : 0;
  return Math.min(45000, Math.max(12000, n * 600));
}

export interface LetterAsk {
  struck: number[];
  misses: number;
  open: boolean;
  mark: 'found' | 'shown' | null;
  showId: number | null;
}

export const letterAskEmpty = (): LetterAsk => ({ struck: [], misses: 0, open: false, mark: null, showId: null });

/** Compreensão: a frase certa abre as opções; uma errada não; duas erradas abrem com a certa marcada. */
export function letterQuestionStep(state: LetterAsk, sentenceId: number, evidence: boolean, correctId: number): LetterAsk {
  if (state.open) return state;
  if (evidence) return { ...state, open: true, mark: 'found' };
  const misses = state.misses + 1;
  const struck = state.struck.includes(sentenceId) ? state.struck : [...state.struck, sentenceId];
  if (misses >= 2) return { struck, misses, open: true, mark: 'shown', showId: correctId };
  return { struck, misses, open: false, mark: null, showId: null };
}
