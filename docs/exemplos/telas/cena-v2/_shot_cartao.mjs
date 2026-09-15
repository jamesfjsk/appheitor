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
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(25000);

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const hit = await clickLabel('Mais tarde');
    const prova = await page.evaluate(() => document.body.innerText.includes('Prova do dia'));
    if (!hit && !prova) return;
  }
};

const clickCanvas = async (px, py) => {
  await page.evaluate((x, y) => {
    const canvas = document.querySelector('canvas[aria-label="Vila"]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + (x / 1280) * rect.width;
    const cy = rect.top + (y / 640) * rect.height;
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
  }, px, py);
};

try {
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));
  }
  await dismissQuiz();
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await dismissQuiz();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 15000 });
  await dismissQuiz();
  await page.waitForFunction(() => !document.body.innerText.includes('Prova do dia'), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(dir, 'vila-h14.png') });
  console.log('vila-h14');

  await clickCanvas(250, 220);
  await page.waitForFunction(() => /furnace/i.test(document.body.innerText), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'cartao-fornalha.png') });
  console.log('cartao-fornalha');
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 400));

  await clickCanvas(330, 490);
  await page.waitForFunction(() => /enchanting|ainda não construída/i.test(document.body.innerText), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'cartao-vazio.png') });
  console.log('cartao-vazio');
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 400));

  await clickCanvas(440, 220);
  await page.waitForFunction(() => /chest/i.test(document.body.innerText) && document.querySelector('button[aria-label="Fechar"]'), { timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => /inventário/i.test(el.textContent || ''));
    if (b && !b.disabled) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(dir, 'cartao-bau.png') });
  console.log('cartao-bau');
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, '1b-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
