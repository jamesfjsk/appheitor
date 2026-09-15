import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.setDefaultTimeout(25000);

const dismiss = async () => {
  await new Promise((r) => setTimeout(r, 700));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Mais tarde'));
    b?.click();
  });
};

try {
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await dismiss();
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));
  const canvas = await page.$('canvas[aria-label="Vila"]');
  if (canvas) await canvas.screenshot({ path: path.join(dir, 'sombra.png') });
  console.log('sombra');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
