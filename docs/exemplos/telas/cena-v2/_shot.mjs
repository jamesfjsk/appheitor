import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = dir;
fs.mkdirSync(out, { recursive: true });
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
  await new Promise((r) => setTimeout(r, 800));
  await clickLabel('Mais tarde');
  await new Promise((r) => setTimeout(r, 400));
};

try {
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2500));
  }
  await dismissQuiz();
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2000));
  await dismissQuiz();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(out, 'vila-dia.png') });
  console.log('vila-dia');
  await clickLabel('Mina');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(out, 'base-lotes.png') });
  console.log('base-lotes');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
