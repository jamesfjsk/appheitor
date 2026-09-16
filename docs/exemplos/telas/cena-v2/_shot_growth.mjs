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

const login = async (hour) => {
  await page.goto(`${BASE}/flash?h=${hour}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1200);
  }
  for (let i = 0; i < 12; i++) {
    await clickLabel('Mais tarde');
    await sleep(160);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(900);
};

try {
  await login(10);
  const stage = await page.$eval('canvas[aria-label="Vila"]', (el) => el.getAttribute('data-growth-stage'));
  console.log('growth-stage', stage);
  await page.screenshot({ path: path.join(dir, 'vila-crescimento.png') });
  console.log('vila-crescimento');

  await login(22);
  await sleep(1800);
  await page.screenshot({ path: path.join(dir, 'vila-sabio-noite.png') });
  console.log('vila-sabio-noite');
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, 'growth-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
