import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(25000);
page.on('pageerror', (err) => console.error('pageerror', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('console', msg.text());
});
await page.setViewport({ width: 1280, height: 900 });

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  await new Promise((r) => setTimeout(r, 700));
  await clickLabel('Mais tarde');
  await new Promise((r) => setTimeout(r, 300));
};

const waitVila = async () => {
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 900));
};

const clickCanvas = async (px, py) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (canvas, x, y) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (x / 1280) * rect.width,
      y: rect.top + (y / 640) * rect.height,
    };
  }, px, py);
  await page.mouse.click(box.x, box.y);
};

try {
  await page.goto(`${BASE}/login?dev=minerar`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]', { timeout: 40000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await dismissQuiz();
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(dir, 'casa-cena.png') });
  console.log('casa-cena');

  const grid = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Arena · em breve')));
  console.log('grid', grid);

  await clickCanvas(616, 414);
  await page.waitForFunction(() => /Mochila|Equipado|Materiais/.test(document.body.innerText), { timeout: 8000 });
  console.log('mochila-ok');
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 400));

  await clickCanvas(1130, 310);
  await page.waitForFunction(() => /Casa do Minerador/.test(document.body.innerText), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'casa-interior.png') });
  console.log('casa-interior');

  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 400));

  const extras = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.mn-dock button')].map((el) => (el.textContent || '').trim());
    return labels;
  });
  console.log('dock', JSON.stringify(extras));

  await page.goto(`${BASE}/flash?h=22`, { waitUntil: 'domcontentloaded' });
  await dismissQuiz();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(dir, 'casa-noite.png') });
  console.log('casa-noite');
} catch (err) {
  console.error(err);
  const info = await page.evaluate(() => ({
    canvas: !!document.querySelector('canvas[aria-label="Vila"]'),
    login: !!document.querySelector('[data-testid="login-teste"]'),
    bootOff: document.getElementById('mm-boot-root')?.classList.contains('is-off') ?? null,
    href: location.href,
    root: (document.getElementById('root')?.innerText || '').slice(0, 400),
  }));
  console.error('dom', JSON.stringify(info));
  await page.screenshot({ path: path.join(dir, 'casa-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
