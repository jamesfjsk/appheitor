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

const ruleOk = (v, say) => {
  if (say.includes('ímpares')) return v % 2 === 1;
  if (say.includes('pares')) return v % 2 === 0;
  if (say.includes('Sem o 5')) return v !== 5;
  if (say.includes('Sem o 7')) return v !== 7;
  if (say.includes('maior que 7')) return v <= 7;
  if (say.includes('menor que 4')) return v >= 4;
  return true;
};

const winMask = (crates, loaded, target, need, kind, say) => {
  const n = crates.length;
  for (let m = 1; m < (1 << n); m++) {
    let sum = 0;
    let count = 0;
    let product = 1;
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (m & (1 << i)) {
        const v = crates[i];
        if (!ruleOk(v, say)) ok = false;
        sum += v;
        count += 1;
        product *= v;
      }
    }
    if (!ok) continue;
    if (kind === 'product' && count >= 2 && product === target) return m;
    if (kind === 'divide' && sum > 0 && loaded % sum === 0 && loaded / sum === target) return m;
    if (kind !== 'product' && kind !== 'divide' && loaded + sum === target && (need == null || count === need)) return m;
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
      fuse: document.querySelector('[data-testid="cart-fuse"]')?.getAttribute('data-left') || '',
      lecture: /Soma de cabeça|O peso só aparece|já tem|No chão|Etapa \d de 3/i.test(t),
      ban: /anel|marcada|puxa as duas|desliga a/i.test(t),
    };
  });
  console.log('hud', JSON.stringify(hud));
  await shot('00-start');
  if (!hud.locked && !hud.done) {
    await page.click('[data-testid="cart-smith"]');
    await new Promise((r) => setTimeout(r, 180));
    await shot('00-smith');
  }
  await new Promise((r) => setTimeout(r, 2200));
  const fuseBurn = await page.evaluate(() => document.querySelector('[data-testid="cart-fuse"]')?.getAttribute('data-left') || '');
  console.log('fuse-burn', fuseBurn);
  await shot('00-fuse');
  if (hud.locked || hud.done) {
    const closed = await page.evaluate(() => ({
      pay: document.querySelector('[data-testid="redstone-done"]')?.textContent || '',
      say: document.querySelector('[data-testid="cart-say"]')?.textContent || '',
      overlay: Boolean(document.querySelector('.rs-play-lock')),
    }));
    console.log('closed', JSON.stringify(closed));
    await shot('05-closed');
    console.log('blocked', hud.locked ? 'recado' : 'claimed');
  } else {
  await page.click('[data-testid="cart-crate-0"]');
  await new Promise((r) => setTimeout(r, 180));
  await shot('00-hitch');
  const resetBtn = await page.$('[data-testid="redstone-retry"]');
  const fuseBeforeRetry = await page.evaluate(() => document.querySelector('[data-testid="cart-fuse"]')?.getAttribute('data-left') || '');
  if (resetBtn) await resetBtn.click();
  await new Promise((r) => setTimeout(r, 250));
  const fuseAfterRetry = await page.evaluate(() => document.querySelector('[data-testid="cart-fuse"]')?.getAttribute('data-left') || '');
  console.log('fuse-denovo', JSON.stringify({ fuseBeforeRetry, fuseAfterRetry }));
  const crateCount = await page.evaluate(() => document.querySelectorAll('[data-testid^="cart-crate-"]').length);
  for (let i = 0; i < crateCount; i += 1) {
    await page.click(`[data-testid="cart-crate-${i}"]`);
  }
  await new Promise((r) => setTimeout(r, 450));
  await shot('00-full');
  await page.click('[data-testid="redstone-ready"]');
  await new Promise((r) => setTimeout(r, 800));
  const mash = await page.evaluate(() => ({
    why: document.querySelector('[data-testid="cart-why"]')?.textContent || '',
    scale: document.querySelector('[data-testid="cart-scale"]')?.textContent || '',
    say: document.querySelector('[data-testid="cart-say"]')?.textContent || '',
    fail: document.querySelector('.vg-line.is-fail') !== null,
  }));
  console.log('mash', JSON.stringify(mash));
  await shot('01-mash-fail');
  await new Promise((r) => setTimeout(r, 450));
  await shot('01-return');
  await new Promise((r) => setTimeout(r, 1100));
  await page.waitForSelector('[data-testid="redstone-ready"]', { timeout: 8000 });

  const readBoard = async () => page.evaluate(() => {
    const bench = document.querySelector('[data-testid="cart-bench"]');
    const crates = [...document.querySelectorAll('[data-testid^="cart-crate-"]')].map((el) => ({
      i: Number((el.getAttribute('data-testid') || '').replace('cart-crate-', '')),
      n: Number(el.querySelector('.vg-wagon-tag')?.textContent || '0'),
    }));
    crates.sort((a, b) => a.i - b.i);
    return {
      kind: bench?.getAttribute('data-kind') || 'sum',
      target: Number(bench?.getAttribute('data-target') || 0),
      loaded: Number(bench?.getAttribute('data-loaded') || 0),
      need: bench?.getAttribute('data-need') || '',
      say: document.querySelector('[data-testid="cart-say"]')?.textContent || '',
      crates,
    };
  });
  const playWin = async (name) => {
    await page.waitForSelector('[data-testid="redstone-ready"]', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 400));
    const board = await readBoard();
    const need = board.need ? Number(board.need) : null;
    const mask = winMask(board.crates.map((c) => c.n), board.loaded, board.target, need, board.kind, board.say);
    console.log(name, JSON.stringify({ kind: board.kind, target: board.target, loaded: board.loaded, need, mask, say: board.say }));
    for (let i = 0; i < board.crates.length; i += 1) {
      if (mask & (1 << i)) await page.click(`[data-testid="cart-crate-${i}"]`);
    }
    await page.waitForSelector('[data-testid="redstone-ready"]:not([disabled])', { timeout: 8000 });
    await page.click('[data-testid="redstone-ready"]');
    await new Promise((r) => setTimeout(r, 900));
    await shot(name);
    await new Promise((r) => setTimeout(r, 1600));
  };
  await playWin('02-win');
  await shot('03-stage2');
  await playWin('03-stage2-win');
  await playWin('04-stage3-win');
  await page.waitForSelector('[data-testid="redstone-done"]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 400));
  const closed = await page.evaluate(() => ({
    pay: document.querySelector('[data-testid="redstone-done"]')?.textContent || '',
    say: document.querySelector('[data-testid="cart-say"]')?.textContent || '',
    overlay: Boolean(document.querySelector('.rs-play-lock')),
  }));
  console.log('pay', JSON.stringify(closed));
  await shot('05-closed');
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
