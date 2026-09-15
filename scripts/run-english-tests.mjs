// Roda testes puros em Node (esbuild). Pastas: english e village.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const esbuildBin = require.resolve('esbuild/bin/esbuild');

const dirs = process.argv.slice(2);
const targets = (dirs.length ? dirs : ['english', 'village']).map((name) => ({
  name,
  dir: join(root, 'src', 'services', name, '__tests__'),
}));

const outDir = mkdtempSync(join(tmpdir(), 'app-tests-'));
let failed = 0;
let filesRun = 0;

try {
  for (const { name, dir } of targets) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.test.ts')).sort();
    for (const file of files) {
      filesRun++;
      const outfile = join(outDir, `${name}-${file.replace(/\.ts$/, '.cjs')}`);
      console.log(`\n== ${name}/${file}`);
      const bundle = spawnSync(
        process.execPath,
        [esbuildBin, join(dir, file), '--bundle', '--platform=node', '--format=cjs', '--log-level=warning', `--outfile=${outfile}`],
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
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} arquivo(s) de teste com falha` : `\nTodos os ${filesRun} arquivos de teste passaram`);
process.exit(failed ? 1 : 0);
