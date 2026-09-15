import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const dismiss = async () => {
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const hit = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Mais tarde'));
      b?.click();
      return Boolean(b);
    });
    if (!hit) break;
  }
};

try {
  await page.goto('http://localhost:5174/flash?h=22', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1200));
  }
  await dismiss();
  await page.goto('http://localhost:5174/flash?h=22', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 15000 });
  await dismiss();
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(dir, 'vila-h22.png') });
  console.log('vila-h22');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
