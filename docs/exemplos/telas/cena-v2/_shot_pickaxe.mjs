import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-arena', 'pick-shots');
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1400);
  }
  for (let i = 0; i < 8; i++) {
    await clickLabel('Mais tarde');
    await sleep(150);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(600);
  await page.click('button[title="Mochila"]');
  await sleep(700);
  if (!(await page.evaluate(() => /Salvar visual|Salvo/.test(document.body.innerText || '')))) {
    throw new Error('mochila nao abriu');
  }
  await page.click('[aria-label="Picareta"]');
  await sleep(350);
  await page.click('[aria-label="Picareta de madeira"]');
  await sleep(350);
  await page.screenshot({ path: path.join(dir, '01-picareta-madeira.png') });
  for (const [label, name] of [
    ['Picareta de pedra', '01b-pedra'],
    ['Picareta de ferro', '01c-ferro'],
    ['Picareta de ouro', '01d-ouro'],
    ['Picareta de diamante', '02-previa-diamante'],
  ]) {
    await page.click(`[aria-label="${label}"]`);
    await sleep(400);
    await page.screenshot({ path: path.join(dir, `${name}.png`) });
  }
  console.log('ok', dir);
} finally {
  await browser.close();
}
