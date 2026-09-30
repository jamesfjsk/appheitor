/** Conta de teste. Em dev, só ela gera prova e plano. */
export const TEST_QUIZ_UID = 'DydxTQ0cGEbX46LLlQxxD123pQD3';

/**
 * Versão igual gera. Versão diferente não gera. `latest` vazio (rede) gera.
 * Em dev, só a conta de teste.
 */
export function mayGenerateNow(input: {
  running: string;
  latest: string;
  dev: boolean;
  uid: string;
}): boolean {
  if (input.latest !== '' && input.latest !== input.running) return false;
  if (input.dev && input.uid !== TEST_QUIZ_UID) return false;
  return true;
}
