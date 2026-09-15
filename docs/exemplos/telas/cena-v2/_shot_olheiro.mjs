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
    await new Promise((r) => setTimeout(r, 400));
    const hit = await clickLabel('Mais tarde');
    const prova = await page.evaluate(() => document.body.innerText.includes('Prova do dia'));
    if (!hit && !prova) return;
  }
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
  await page.waitForFunction(() => !document.body.innerText.includes('A prova de hoje está pronta'), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));
  page.on('pageerror', (err) => console.error('PAGEERROR', err));
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas[aria-label="Vila"]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + (1180 / 1280) * rect.width;
    const y = rect.top + (90 / 640) * rect.height;
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(dir, 'balao-olheiro.png') });
  console.log('balao-olheiro');

  await page.evaluate(() => {
    const canvas = document.querySelector('canvas[aria-label="Vila"]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + (800 / 1280) * rect.width;
    const y = rect.top + (170 / 640) * rect.height;
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(dir, 'balao-sabio.png') });
  console.log('balao-sabio');
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, 'balao-olheiro-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
