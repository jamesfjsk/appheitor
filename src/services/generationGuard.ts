/** Conta de teste. Em dev, só ela gera prova e plano. */
export const TEST_QUIZ_UID = 'DydxTQ0cGEbX46LLlQxxD123pQD3';

/** Frase do painel do pai quando a aba está velha. */
export const VERSION_PANEL = 'A prova espera a versão nova. Recarregue a página.';

/** Motivo real quando a aba de desenvolvimento não é a conta de teste. */
export const DEV_ACCOUNT_PANEL = 'Em desenvolvimento só a conta de teste gera a prova.';

/** Frase da mesa, quando a Biblioteca abre sem prova. */
export const VERSION_TABLE = 'Tem versão nova do jogo. A página vai recarregar.';

export type GenerationBlock = 'version' | 'dev-account';

export function isDevGuard(input: { dev: boolean; hostname?: string }): boolean {
  const host = (input.hostname || '').toLowerCase();
  return input.dev || host === 'localhost' || host === '127.0.0.1';
}

/**
 * Versão igual gera. Versão diferente não gera. `latest` vazio (rede) gera.
 * Dev, e também localhost ou 127.0.0.1 num build de produção, só a conta de teste.
 */
export function generationBlock(input: {
  running: string;
  latest: string;
  dev: boolean;
  uid: string;
  hostname?: string;
}): GenerationBlock | null {
  if (input.latest !== '' && input.latest !== input.running) return 'version';
  if (isDevGuard(input) && input.uid !== TEST_QUIZ_UID) return 'dev-account';
  return null;
}

export function refuseMessage(block: GenerationBlock): string {
  return block === 'version' ? VERSION_PANEL : DEV_ACCOUNT_PANEL;
}

export function mayGenerateNow(input: {
  running: string;
  latest: string;
  dev: boolean;
  uid: string;
  hostname?: string;
}): boolean {
  return generationBlock(input) === null;
}

export function guardHost(): string {
  return typeof location !== 'undefined' ? location.hostname : '';
}
