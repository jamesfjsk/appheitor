// Pede um lance ao robô (Web Worker). Um worker só para a Arena inteira, criado na primeira jogada.
import { Chess } from 'chess.js';
import { levelById, randomMove } from './chessGame';

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (r: { from?: string; to?: string; error?: string }) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; from?: string; to?: string; error?: string }>) => {
      const done = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      done?.(e.data);
    };
  }
  return worker;
}

export interface BotMove {
  from: string;
  to: string;
  promotion?: 'q';
}

const promotes = (chess: Chess, from: string, to: string): boolean => {
  const piece = chess.get(from as never);
  return piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'));
};

/** Lance do robô no nível pedido. `engineOverride` serve para a Dica (pensa como o Mestre). */
export function askBot(fen: string, levelId: number, engineOverride?: number): Promise<BotMove> {
  const level = levelById(levelId);
  const chess = new Chess(fen);
  if (!engineOverride && level.random > 0 && Math.random() < level.random) {
    const m = randomMove(chess, Math.random);
    if (m) return Promise.resolve({ from: m.from, to: m.to, ...(m.promotion ? { promotion: 'q' as const } : {}) });
  }
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(id, (r) => {
      if (!r.from || !r.to) {
        // Sem resposta do robô: um lance válido qualquer, para a partida não travar
        const m = randomMove(chess, Math.random);
        if (m) resolve({ from: m.from, to: m.to, ...(m.promotion ? { promotion: 'q' as const } : {}) });
        else reject(new Error(r.error || 'sem lance'));
        return;
      }
      resolve({ from: r.from, to: r.to, ...(promotes(chess, r.from, r.to) ? { promotion: 'q' as const } : {}) });
    });
    getWorker().postMessage({ id, fen, engine: engineOverride ?? level.engine });
  });
}
