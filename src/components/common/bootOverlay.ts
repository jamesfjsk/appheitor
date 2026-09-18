const TIPS = [
  'A tocha da entrada já está acesa.',
  'Carrinho no trilho. Falta o minerador.',
  'Gold no baú, picareta na mão.',
  'Quem lê o livro do dia mina melhor.',
  'Esmeralda no bolso, o resto no baú.',
  'A vila espera. As missões também.',
  'Três de ferro, um de carvão. Sem pressa.',
  'O Baú do Dia só abre de noite.',
];

const STEPS = [
  'Acendendo as tochas',
  'Colocando os trilhos',
  'Chamando o minerador',
  'Abrindo o mapa da vila',
];

type BootWindow = Window & { __mmBootT0?: number };

let raf = 0;
let t0 = 0;
let customStatus: string | null = null;
let ticking = false;

function overlay(): HTMLElement | null {
  return document.getElementById('mm-boot-root');
}

function reduced(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stepFor(progress: number): string {
  if (progress < 22) return STEPS[0];
  if (progress < 48) return STEPS[1];
  if (progress < 74) return STEPS[2];
  return STEPS[3];
}

function applyFrame(now: number) {
  const root = overlay();
  if (!root) return;
  const s = Math.max(0, (now - t0) / 1000);
  const progress = reduced() ? 70 : Math.min(94, 94 * (1 - Math.exp(-s / 1.35)));
  const fill = root.querySelector<HTMLElement>('.mn-boot-bar-fill');
  const cart = root.querySelector<HTMLElement>('.mn-boot-cart-wrap');
  const statusEl = root.querySelector('.mn-boot-status');
  const tip = root.querySelector('.mn-boot-tip');
  if (fill) fill.style.width = `${progress}%`;
  if (cart) cart.style.left = `clamp(0px, calc(${progress}% - 22px), calc(100% - 44px))`;
  if (statusEl) {
    const generic = !customStatus || customStatus === 'Carregando...';
    statusEl.textContent = generic ? stepFor(progress) : customStatus;
  }
  if (tip) tip.textContent = TIPS[Math.floor(s / 3.1) % TIPS.length];
}

function tick(now: number) {
  applyFrame(now);
  if (!ticking) return;
  raf = requestAnimationFrame(tick);
}

function startTick() {
  const root = overlay();
  if (!root) return;
  root.classList.remove('is-preboot');
  root.querySelector('.mn-boot-fill-wait')?.classList.remove('mn-boot-fill-wait');
  if (!t0) {
    const w = window as BootWindow;
    t0 = w.__mmBootT0 || performance.now();
  }
  if (ticking) {
    applyFrame(performance.now());
    return;
  }
  ticking = true;
  raf = requestAnimationFrame(tick);
}

function stopTick() {
  ticking = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

export function primeBoot() {
  startTick();
}

export function showBoot(message?: string) {
  const root = overlay();
  if (!root) return;
  if (root.classList.contains('is-off')) t0 = performance.now();
  if (message) customStatus = message;
  else customStatus = null;
  root.classList.remove('is-off');
  root.setAttribute('aria-busy', 'true');
  startTick();
}

export function dismissBoot() {
  try {
    if (new URLSearchParams(window.location.search).get('boot') === '1') return;
  } catch {
    /* ignore */
  }
  stopTick();
  const root = overlay();
  if (!root) return;
  root.classList.add('is-off');
  root.setAttribute('aria-busy', 'false');
}
