// Player de animações da Conversa (lottie-web, versão leve), carregado só quando alguma aparece.
// Serve o emoji animado do Noto e as figurinhas animadas do Telegram.

export type LottiePlayer = (typeof import('lottie-web/build/player/lottie_light'))['default'];

let player: Promise<LottiePlayer> | null = null;
export const loadPlayer = (): Promise<LottiePlayer> => {
  player ??= import('lottie-web/build/player/lottie_light').then((m) => m.default);
  return player;
};

const files = new Map<string, Promise<unknown>>();
/** Baixa o JSON da animação uma vez por endereço. */
export const loadAnimationFile = (url: string): Promise<unknown> => {
  let p = files.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`animação ${r.status}`);
      return r.json();
    });
    p.catch(() => files.delete(url));
    files.set(url, p);
  }
  return p;
};
