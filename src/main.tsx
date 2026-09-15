import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import Teaser from './components/Teaser.tsx';
import './index.css';
import './styles/miner.css';

// Modo obras: com VITE_MAINTENANCE=1 o site público mostra o teaser do jogo.
// O pai entra no app de verdade abrindo ?dev=minerar uma vez (fica salvo no navegador); ?dev=sair volta ao teaser.
// O App (e o Firebase) só é carregado quando o teaser não está ativo.
const App = lazy(() => import('./App.tsx'));
function maintenanceActive(): boolean {
  if (import.meta.env.VITE_MAINTENANCE !== '1') return false;
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {maintenanceActive() ? (
      <Teaser />
    ) : (
      <Suspense fallback={<div className="mn-page" />}>
        <App />
      </Suspense>
    )}
  </StrictMode>
);
