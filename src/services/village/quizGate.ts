/** Portão da prova: destinos trancados e abertura só por pedido. */

export function quizLockedFor(opts: {
  quizEnabled?: boolean;
  quizRequired?: boolean;
  completed: boolean;
}): boolean {
  return (opts.quizEnabled ?? true) && Boolean(opts.quizRequired) && !opts.completed;
}

export function quizBlocksDest(id: string): boolean {
  if (id === 'build:arena' || id === 'arena') return false;
  return id === 'market'
    || id === 'workshop'
    || id === 'mine'
    || id === 'npc:ferreiro'
    || id === 'npc:comerciante'
    || id.startsWith('build:');
}

/** A Mesa caída não desliga o cadeado. */
export function quizGateActive(quizLocked: boolean): boolean {
  return quizLocked;
}

/** Pedido (Biblioteca, Placa, Sábio, hotbar) abre mesmo com a Mesa em ruínas. */
export function quizOpensOnRequest(openRequested: boolean | number | undefined): boolean {
  return Boolean(openRequested);
}
