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
await page.setViewport({ width: 1280, height: 900 });

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

try {
  await page.goto(`${BASE}/login?dev=minerar&h=22`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]', { timeout: 40000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await clickLabel('Mais tarde');
  await new Promise((r) => setTimeout(r, 400));
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2200));
  for (let i = 0; i < 10; i++) {
    await clickLabel('Mais tarde');
    await new Promise((r) => setTimeout(r, 280));
  }
  await new Promise((r) => setTimeout(r, 800));
  const canvas = await page.$('canvas[aria-label="Vila"]');
  if (canvas) {
    await canvas.screenshot({ path: path.join(dir, 'vila-h22.png') });
    console.log('vila-h22-canvas');
  }
  await page.screenshot({ path: path.join(dir, 'vila-h22-pagina.png') });
  console.log('vila-h22');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
