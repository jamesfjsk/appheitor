// ========================================
// Mini-harness de testes (sem vitest/jest): test(name, fn) + expect simples + run().
// Cada arquivo *.test.ts registra casos e termina com `void run()`; o runner
// (scripts/run-english-tests.mjs) empacota com esbuild e executa em Node.
// ========================================

type TestFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
}

const cases: TestCase[] = [];

export function test(name: string, fn: TestFn): void {
  cases.push({ name, fn });
}

export class AssertionError extends Error {}

const show = (v: unknown): string => {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
};

const deepEqual = (a: unknown, b: unknown): boolean => show(a) === show(b);

export interface Expectation {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  /** Array: contém o elemento; string: contém o trecho */
  toContain(item: unknown): void;
  toHaveLength(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toMatch(re: RegExp): void;
  toThrow(): void;
  not: Omit<Expectation, 'not'>;
}

function build(actual: unknown, negate: boolean): Omit<Expectation, 'not'> {
  const check = (pass: boolean, message: string): void => {
    if (pass === negate) throw new AssertionError(negate ? `NÃO esperado: ${message}` : message);
  };
  return {
    toBe: (expected) => check(Object.is(actual, expected), `esperado ${show(expected)}, recebido ${show(actual)}`),
    toEqual: (expected) => check(deepEqual(actual, expected), `esperado ${show(expected)}, recebido ${show(actual)}`),
    toBeTruthy: () => check(Boolean(actual), `esperado verdadeiro, recebido ${show(actual)}`),
    toBeFalsy: () => check(!actual, `esperado falso, recebido ${show(actual)}`),
    toContain: (item) => {
      const has = Array.isArray(actual) ? actual.some((v) => deepEqual(v, item)) : typeof actual === 'string' && actual.includes(String(item));
      check(has, `${show(actual)} não contém ${show(item)}`);
    },
    toHaveLength: (n) => {
      const len = Array.isArray(actual) || typeof actual === 'string' ? actual.length : -1;
      check(len === n, `esperado tamanho ${n}, recebido ${len}`);
    },
    toBeGreaterThanOrEqual: (n) => check(typeof actual === 'number' && actual >= n, `esperado >= ${n}, recebido ${show(actual)}`),
    toBeLessThanOrEqual: (n) => check(typeof actual === 'number' && actual <= n, `esperado <= ${n}, recebido ${show(actual)}`),
    toMatch: (re) => check(typeof actual === 'string' && re.test(actual), `${show(actual)} não casa com ${re}`),
    toThrow: () => {
      let threw = false;
      try {
        if (typeof actual === 'function') (actual as () => unknown)();
      } catch {
        threw = true;
      }
      check(threw, 'esperado lançar erro');
    },
  };
}

export function expect(actual: unknown): Expectation {
  return { ...build(actual, false), not: build(actual, true) };
}

/** Roda os casos registrados, imprime o resumo e marca exitCode 1 se algo falhar */
export async function run(): Promise<void> {
  let failed = 0;
  for (const c of cases) {
    try {
      await c.fn();
      console.log(`  ok   ${c.name}`);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  FAIL ${c.name}\n       ${msg}`);
    }
  }
  console.log(`${cases.length - failed}/${cases.length} casos passaram`);
  const proc = (globalThis as { process?: { exitCode?: number } }).process;
  if (proc && failed > 0) proc.exitCode = 1;
}
