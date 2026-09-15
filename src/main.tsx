import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import Teaser from './components/Teaser.tsx';
import LoadingSpinner from './components/common/LoadingSpinner';
import { dismissBoot, primeBoot } from './components/common/bootOverlay';
import './index.css';
import './styles/miner.css';

// Modo obras: no site público (flashmissons.com e *.vercel.app) o teaser do jogo aparece por padrão.
// VITE_MAINTENANCE=1 força o teaser em qualquer endereço (testes locais); VITE_MAINTENANCE=0 desliga (jogo pronto).
// O pai entra no app de verdade abrindo ?dev=minerar uma vez (fica salvo no navegador); ?dev=sair volta ao teaser.
// O App (e o Firebase) só é carregado quando o teaser não está ativo.
const App = lazy(() => import('./App.tsx'));
const PUBLIC_HOSTS = ['flashmissons.com', 'www.flashmissons.com'];

function maintenanceActive(): boolean {
  const flag = import.meta.env.VITE_MAINTENANCE;
  if (flag === '0') return false;
  const host = window.location.hostname;
  const isPublic = PUBLIC_HOSTS.includes(host) || host.endsWith('.vercel.app');
  if (flag !== '1' && !isPublic) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const dev = params.get('dev');
    if (dev === 'minerar') localStorage.setItem('mm_dev', '1');
    if (dev === 'sair') localStorage.removeItem('mm_dev');
    if (dev) window.history.replaceState(null, '', window.location.pathname);
    return localStorage.getItem('mm_dev') !== '1';
  } catch {
    return true;
  }
}

const root = document.getElementById('root')!;
const maintenance = maintenanceActive();

if (maintenance) dismissBoot();
else primeBoot();

createRoot(root).render(
  <StrictMode>
    {maintenance ? (
      <Teaser />
    ) : (
      <Suspense fallback={<LoadingSpinner />}>
        <App />
      </Suspense>
    )}
  </StrictMode>
);
