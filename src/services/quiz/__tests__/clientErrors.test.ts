import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, run, test } from '../../english/__tests__/harness';

function loadShouldReport(): (input: { hostname: string; message: string }) => boolean {
  const src = readFileSync(join(process.cwd(), 'src/services/observability.ts'), 'utf8');
  const start = src.indexOf('export function shouldReportClientError');
  if (start < 0) throw new Error('shouldReportClientError não está em observability.ts');
  const rest = src.slice(start);
  const next = rest.indexOf('\nexport ', 10);
  const chunk = (next > 0 ? rest.slice(0, next) : rest)
    .replace(
      'export function shouldReportClientError(input: { hostname: string; message: string }): boolean',
      'function shouldReportClientError(input)',
    )
    .trim();
  const load = new Function(`${chunk}\nreturn shouldReportClientError;`);
  return load() as (input: { hostname: string; message: string }) => boolean;
}

const shouldReportClientError = loadShouldReport();

test('localhost e 127.0.0.1 não gravam clientError', () => {
  expect(shouldReportClientError({
    hostname: 'localhost',
    message: 'useAuth deve ser usado dentro de AuthProvider',
  })).toBe(false);
  expect(shouldReportClientError({
    hostname: '127.0.0.1',
    message: 'useData deve ser usado dentro de DataProvider',
  })).toBe(false);
  expect(shouldReportClientError({
    hostname: 'miner.flash',
    message: 'useAuth deve ser usado dentro de AuthProvider',
  })).toBe(true);
});

void run();
