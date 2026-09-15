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
  await new Promise((r) => setTimeout(r, 700));
  await clickLabel('Mais tarde');
  await new Promise((r) => setTimeout(r, 300));
};

const login = async () => {
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await dismissQuiz();
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

const hoverCanvas = async (px, py) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (canvas, x, y) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (x / 1280) * rect.width,
      y: rect.top + (y / 640) * rect.height,
    };
  }, px, py);
  await page.mouse.move(box.x, box.y);
};

try {
  await login();

  for (const h of [9, 14, 18, 22]) {
    await page.goto(`${BASE}/flash?h=${h}`, { waitUntil: 'domcontentloaded' });
    await dismissQuiz();
    await waitVila();
    await page.setViewport({ width: 1280, height: 900 });
    await page.screenshot({ path: path.join(dir, `vila-h${h}.png`) });
    console.log(`vila-h${h}`);
  }

  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await dismissQuiz();
  await waitVila();
  await hoverCanvas(250, 220);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'hover-lote.png') });
  console.log('hover-lote');

  await clickCanvas(800, 170);
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(dir, 'balao-sabio.png') });
  console.log('balao-sabio');

  await page.goto(`${BASE}/flash?h=14&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await dismissQuiz();
  await waitVila();
  await page.screenshot({ path: path.join(dir, 'quiz-lock.png') });
  console.log('quiz-lock');

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await dismissQuiz();
  await waitVila();
  await page.screenshot({ path: path.join(dir, 'vila-390.png') });
  console.log('vila-390');

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await dismissQuiz();
  await waitVila();

  await clickCanvas(250, 220);
  await page.waitForFunction(() => /dá agora|fornalha/i.test(document.body.innerText), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'cartao-fornalha.png') });
  console.log('cartao-fornalha');
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 300));

  await clickCanvas(330, 490);
  await page.waitForFunction(() => /ainda não construída|mesa de encantamento/i.test(document.body.innerText), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'cartao-vazio.png') });
  console.log('cartao-vazio');
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 300));

  await clickCanvas(440, 220);
  await page.waitForFunction(() => document.body.innerText.includes('Baú'), { timeout: 8000 });
  const inv = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('inventário'));
    if (!b || b.disabled) return false;
    b.click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(dir, 'cartao-bau.png') });
  console.log('cartao-bau', inv);
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, '1b-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
