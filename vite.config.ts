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
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion()),
      __TEST_CHILD_EMAIL__: JSON.stringify(isDev ? (env.TEST_CHILD_EMAIL || 'teste@flash.com') : ''),
      __TEST_CHILD_PASSWORD__: JSON.stringify(isDev ? (env.TEST_CHILD_PASSWORD || '') : ''),
    },
  };
});
