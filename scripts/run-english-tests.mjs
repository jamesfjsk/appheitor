// Roda os testes de src/services/english/__tests__/*.test.ts: cada arquivo vira um
// bundle CommonJS (esbuild, o mesmo do Vite) num diretório temporário e é executado
// em Node. Sai com código 1 se qualquer arquivo falhar. Uso: npm run test:english
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const testsDir = join(root, 'src', 'services', 'english', '__tests__');
const files = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts')).sort();
// Lançador JS do esbuild: evita depender de npx/shell no Windows
const esbuildBin = require.resolve('esbuild/bin/esbuild');
const outDir = mkdtempSync(join(tmpdir(), 'english-tests-'));

let failed = 0;
try {
  for (const file of files) {
    const outfile = join(outDir, file.replace(/\.ts$/, '.cjs'));
    console.log(`\n== ${file}`);
    const bundle = spawnSync(
      process.execPath,
      [esbuildBin, join(testsDir, file), '--bundle', '--platform=node', '--format=cjs', '--log-level=warning', `--outfile=${outfile}`],
      { stdio: 'inherit' }
    );
    if (bundle.status !== 0) {
      failed++;
      console.error(`  bundle falhou: ${file}`);
      continue;
    }
    const run = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
    if (run.status !== 0) failed++;
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} arquivo(s) de teste com falha` : `\nTodos os ${files.length} arquivos de teste passaram`);
process.exit(failed ? 1 : 0);
