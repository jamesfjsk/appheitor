import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

function appVersion(): string {
  const day = new Date().toISOString().slice(0, 10);
  let hash = 'dev';
  try {
    hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    /* git ausente */
  }
  return `${day}-${hash}`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Windows: se o terminal abre em c:\ (minúscula), o Vite serve tudo por /@fs/C:/... e duplica módulos
  // (erro intermitente "useAuth deve ser usado dentro de AuthProvider" só em dev, 19/09). Raiz com a letra canônica.
  const root = fs.realpathSync.native(process.cwd());
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';
  return {
    root,
    plugins: [react()],
    optimizeDeps: {
      include: ['phaser'],
      exclude: ['lucide-react'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion()),
      __TEST_CHILD_EMAIL__: JSON.stringify(isDev ? (env.TEST_CHILD_EMAIL || 'teste@flash.com') : ''),
      __TEST_CHILD_PASSWORD__: JSON.stringify(isDev ? (env.TEST_CHILD_PASSWORD || '') : ''),
    },
  };
});
