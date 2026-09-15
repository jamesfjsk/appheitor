import { useEffect } from 'react';
import { dismissBoot } from './bootOverlay';

/** Tira o boot da mina quando a tela de verdade já está no ar. */
export function useDismissBoot(ready = true) {
  useEffect(() => {
    if (ready) dismissBoot();
  }, [ready]);
}

export function ReadyBoot() {
  useDismissBoot(true);
  return null;
}
