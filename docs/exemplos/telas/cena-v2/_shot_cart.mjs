import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, 'tmp-arena', 'cart-shots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(25000);
await page.setViewport({ width: 1280, height: 1000 });
page.on('pageerror', (err) => console.error('pageerror', err.message));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const shot = async (name) => {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(name, file);
};

const parseGoal = (target, loaded, need) => ({
  loaded: Number(loaded) || 0,
  target: Number(target) || 0,
  need: need ? Number(need) : null,
});

const winMask = (crates, loaded, target, need) => {
  const n = crates.length;
  for (let m = 1; m < (1 << n); m++) {
    let sum = loaded;
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (m & (1 << i)) {
        sum += crates[i];
        count += 1;
      }
    }
    if (sum === target && (need == null || count === need)) return m;
  }
  return 0;
};

try {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(outDir, { recursive: true });

  await page.goto(`${BASE}/login?dev=minerar`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2500));
  const loginBtn = (await page.$('[data-testid="login-teste"]'))
    || (await page.$('[data-testid="login-heitor"]'));
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-heitor"]'), { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  for (let i = 0; i < 4; i += 1) {
    await new Promise((r) => setTimeout(r, 400));
    await clickLabel('Mais tarde');
  }

  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForSelector('[data-testid="english-base"]', { timeout: 20000 });
  await page.waitForSelector('[data-testid="tab-redstone"]', { timeout: 25000 });
  await page.click('[data-testid="tab-redstone"]');
  await page.waitForSelector('[data-testid="redstone-play"]', { timeout: 12000 });
  await page.waitForSelector('[data-testid="cart-bench"]', { timeout: 12000 });
  await new Promise((r) => setTimeout(r, 900));

  const hud = await page.evaluate(() => {
    const t = document.body.innerText;
    const bench = document.querySelector('[data-testid="cart-bench"]');
    return {
      locked: Boolean(document.querySelector('[data-testid="redstone-locked"]')),
      done: Boolean(document.querySelector('[data-testid="redstone-done"]')),
      enviar: Boolean(document.querySelector('[data-testid="redstone-ready"]')),
      goal: document.querySelector('[data-testid="redstone-goal"]')?.textContent || '',
      target: bench?.getAttribute('data-target') || '',
      loaded: bench?.getAttribute('data-loaded') || '0',
      need: bench?.getAttribute('data-need') || '',
      wagons: document.querySelectorAll('.vg-wagon').length,
      lecture: /Soma de cabeça|O peso só aparece|já tem|No chão|Etapa \d de 3/i.test(t),
      ban: /anel|marcada|puxa as duas|desliga a/i.test(t),
    };
  });
  console.log('hud', JSON.stringify(hud));
  await shot('00-start');
  if (hud.locked || hud.done) {
    await page.evaluate(() => {
      document.querySelector('.rs-play-lock')?.remove();
      document.querySelector('[data-testid="cart-scale"]')?.remove();
      const line = document.querySelector('[data-testid="cart-body"]');
      if (line && !document.querySelector('[data-testid="redstone-ready"]')) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'vg-send';
        b.setAttribute('data-testid', 'redstone-ready');
        b.innerHTML = '<img src="/assets/english/ui/cart/signal.png" alt="" class="vg-signal mc-pixel" draggable="false"><span>Enviar</span>';
        line.appendChild(b);
      }
    });
    await new Promise((r) => setTimeout(r, 200));
    await shot('00-layout');
    console.log('blocked', hud.locked ? 'recado' : 'claimed');
  } else {
  await page.click('[data-testid="cart-crate-0"]');
  await new Promise((r) => setTimeout(r, 180));
  await shot('00-hitch');
  const resetBtn = await page.$('[data-testid="redstone-retry"]');
  if (resetBtn) await resetBtn.click();
  await new Promise((r) => setTimeout(r, 250));
  const crateCount = await page.evaluate(() => document.querySelectorAll('[data-testid^="cart-crate-"]').length);
  for (let i = 0; i < crateCount; i += 1) {
    await page.click(`[data-testid="cart-crate-${i}"]`);
  }
  await page.click('[data-testid="redstone-ready"]');
  await new Promise((r) => setTimeout(r, 800));
  const mash = await page.evaluate(() => ({
    why: document.querySelector('[data-testid="cart-why"]')?.textContent || '',
    scale: document.querySelector('[data-testid="cart-scale"]')?.textContent || '',
    fail: document.querySelector('.vg-line.is-fail') !== null,
  }));
  console.log('mash', JSON.stringify(mash));
  await shot('01-mash-fail');
  await new Promise((r) => setTimeout(r, 450));
  await shot('01-return');
  await new Promise((r) => setTimeout(r, 900));

  const board = await page.evaluate(() => {
    const bench = document.querySelector('[data-testid="cart-bench"]');
    const crates = [...document.querySelectorAll('[data-testid^="cart-crate-"]')].map((el) => ({
      i: Number((el.getAttribute('data-testid') || '').replace('cart-crate-', '')),
      n: Number(el.querySelector('.vg-wagon-tag')?.textContent || '0'),
    }));
    crates.sort((a, b) => a.i - b.i);
    return {
      target: bench?.getAttribute('data-target') || '',
      loaded: bench?.getAttribute('data-loaded') || '0',
      need: bench?.getAttribute('data-need') || '',
      crates,
    };
  });
  const parsed = parseGoal(board.target, board.loaded, board.need);
  const values = board.crates.map((c) => c.n);
  const mask = winMask(values, parsed.loaded, parsed.target, parsed.need);
  console.log('solve', JSON.stringify({ board, parsed, mask }));
  for (let i = 0; i < values.length; i += 1) {
    if (mask & (1 << i)) await page.click(`[data-testid="cart-crate-${i}"]`);
  }
  await page.click('[data-testid="redstone-ready"]');
  await new Promise((r) => setTimeout(r, 800));
  const win = await page.evaluate(() => ({
    go: document.querySelector('.vg-line.is-go') !== null,
    scale: document.querySelector('[data-testid="cart-scale"]')?.textContent || '',
    look: document.querySelector('[data-testid="cart-scale"]')?.textContent || '',
  }));
  console.log('win', JSON.stringify(win));
  await shot('02-win');
  await new Promise((r) => setTimeout(r, 1600));
  const stage2 = await page.evaluate(() => ({
    title: [...document.querySelectorAll('.vg-dots i.is-now')].length,
    loaded: document.querySelector('[data-testid="cart-loaded"] .vg-wagon-tag')?.textContent || '',
    goal: document.querySelector('[data-testid="redstone-goal"]')?.textContent || '',
    loaded: document.querySelector('[data-testid="cart-loaded"]')?.textContent || '',
  }));
  console.log('stage2', JSON.stringify(stage2));
  await shot('03-stage2');
  await page.click('[data-testid="redstone-quit"]');
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
