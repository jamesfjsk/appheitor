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

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 450));
    const hit = await clickLabel('Mais tarde');
    const prova = await page.evaluate(() => document.body.innerText.includes('Prova do dia'));
    if (!hit && !prova) return;
  }
};

const ready = async () => {
  await dismissQuiz();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 15000 });
  await dismissQuiz();
  await page.waitForFunction(() => !document.body.innerText.includes('Prova do dia'), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 700));
};

const clickCanvas = async (px, py) => {
  await page.evaluate((x, y) => {
    const canvas = document.querySelector('canvas[aria-label="Vila"]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: rect.left + (x / 1280) * rect.width,
      clientY: rect.top + (y / 640) * rect.height,
    }));
  }, px, py);
};

try {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));
  }
  await ready();

  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await ready();
  await page.screenshot({ path: path.join(dir, 'vila-h14.png') });
  console.log('vila-h14');

  await clickCanvas(250, 220);
  await page.waitForFunction(() => /furnace/i.test(document.body.innerText), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: path.join(dir, 'cartao-fornalha.png') });
  console.log('cartao-fornalha');
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());

  await page.goto(`${BASE}/flash?h=22`, { waitUntil: 'domcontentloaded' });
  await ready();
  await page.screenshot({ path: path.join(dir, 'vila-h22.png') });
  console.log('vila-h22');

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await ready();
  await page.screenshot({ path: path.join(dir, 'vila-390.png') });
  console.log('vila-390');
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, '1b-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
