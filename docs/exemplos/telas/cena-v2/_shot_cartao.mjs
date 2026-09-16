import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  for (let i = 0; i < 12; i++) {
    await clickLabel('Mais tarde');
    await sleep(200);
  }
  await page.waitForFunction(() => {
    const t = document.body.innerText || '';
    return !t.includes('Prova do dia') && !t.includes('A prova de hoje');
  }, { timeout: 8000 }).catch(() => {});
};

const clickCanvas = async (nx, ny) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * nx, box.y + box.h * ny);
};

const closeCard = async () => {
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await page.waitForFunction(() => !document.querySelector('button[aria-label="Fechar"]'), { timeout: 5000 }).catch(() => {});
  await sleep(300);
};

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1500);
  }
  await dismissQuiz();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(700);

  await clickCanvas(0.155, 0.37);
  await page.waitForSelector('button[aria-label="Fechar"]', { timeout: 8000 });
  await sleep(350);
  await page.screenshot({ path: path.join(dir, 'cartao-fornalha.png') });
  console.log('cartao-fornalha');
  await closeCard();

  await clickCanvas(0.60, 0.42);
  await page.waitForSelector('button[aria-label="Fechar"]', { timeout: 8000 });
  await sleep(350);
  await page.screenshot({ path: path.join(dir, 'cartao-vazio.png') });
  console.log('cartao-vazio');
  await closeCard();

  await clickCanvas(0.50, 0.86);
  await page.waitForSelector('button[aria-label="Fechar"]', { timeout: 8000 });
  await sleep(350);
  await page.screenshot({ path: path.join(dir, 'cartao-cerca.png') });
  console.log('cartao-cerca');
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, 'cartao-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
