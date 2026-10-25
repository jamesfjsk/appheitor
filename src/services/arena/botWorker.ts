// Robô de xadrez da Arena num Web Worker: o js-chess-engine (MIT) pensa sem travar a tela.
import { aiMove } from 'js-chess-engine';

interface Ask {
  id: number;
  fen: string;
  engine: number;
}

self.onmessage = (e: MessageEvent<Ask>) => {
  const { id, fen, engine } = e.data;
  try {
    const entry = aiMove(fen, engine) as unknown as Record<string, string>;
    const [from, to] = Object.entries(entry)[0] ?? [];
    if (!from || !to) throw new Error('sem lance');
    self.postMessage({ id, from: from.toLowerCase(), to: to.toLowerCase() });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
