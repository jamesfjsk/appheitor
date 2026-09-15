// ========================================
// Arena de Inglês: embaralhamento determinístico por semente
// Mesma abordagem do xorshift32 de components/hero/english/mine/engine.ts, sem estado
// compartilhado: createRng devolve um gerador fechado sobre a própria semente.
// ========================================

export type Rng = () => number;

/** FNV-1a de 32 bits: semente estável a partir de uid + data */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0 || 0x9e3779b9;
}

/** Deriva outra semente a partir de uma base e um sal (índice da pergunta, tipo...) */
export function mixSeed(seed: number, salt: number | string): number {
  return seedFromString(`${seed >>> 0}|${salt}`);
}

/** Gerador em [0, 1) (xorshift32) */
export function createRng(seed: number): Rng {
  let x = (seed >>> 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

const asRng = (seed: number | Rng): Rng => (typeof seed === 'function' ? seed : createRng(seed));

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickOne<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Fisher-Yates sem tocar no array original */
export function seededShuffle<T>(arr: readonly T[], seed: number | Rng): T[] {
  const rng = asRng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sameOrder = <T>(a: readonly T[], b: readonly T[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Embaralha opções e remapeia o índice da resposta. Nunca devolve a ordem original
 * quando há pelo menos 2 valores distintos (rotaciona por 1 nesse caso).
 */
export function shuffleOptions<T>(options: readonly T[], answer: number, seed: number | Rng): { options: T[]; answer: number } {
  const idx = seededShuffle(options.map((_, i) => i), seed);
  const distinct = new Set(options).size > 1;
  if (distinct && idx.every((v, i) => v === i)) idx.push(idx.shift() as number);
  let out = idx.map((i) => options[i]);
  // Valores repetidos podem reproduzir a ordem original mesmo com índices trocados
  if (distinct && sameOrder(out, options)) {
    idx.push(idx.shift() as number);
    out = idx.map((i) => options[i]);
  }
  return { options: out, answer: idx.indexOf(answer) };
}
