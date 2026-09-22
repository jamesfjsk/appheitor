/** Teto de tokens da prova: 300 por pergunta pedida + folga do JSON. */

export const QUIZ_SPARE = 3;

/**
 * Rejeição ligada (pacote 6): código no sanitize tira a pergunta.
 * A substituição e o banco offline completam até 8; não trocam a prova inteira.
 */
export const QUIZ_VALIDATOR_ENFORCE = true;

/** No modo observação, menos que isto manda a prova inteira para o offline. */
export const QUIZ_AI_MIN = 5;

export function quizMaxTokens(count: number, spare = QUIZ_SPARE): number {
  return 300 * (count + spare) + 1200;
}
