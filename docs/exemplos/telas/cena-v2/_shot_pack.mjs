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

const clickCanvas = async (px, py) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el, x, y) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + (x / 1280) * rect.width, y: rect.top + (y / 640) * rect.height };
  }, px, py);
  await page.mouse.click(box.x, box.y);
};

try {
  page.on('pageerror', (err) => console.error('pageerror', err.message));
  await page.goto(`${BASE}/login?dev=minerar`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2500));
  const dump = await page.evaluate(() => ({
    url: location.href,
    text: (document.body.innerText || '').slice(0, 400),
    heitor: Boolean(document.querySelector('[data-testid="login-heitor"]')),
    teste: Boolean(document.querySelector('[data-testid="login-teste"]')),
    canvas: Boolean(document.querySelector('canvas[aria-label="Vila"]')),
  }));
  console.log('dump', JSON.stringify(dump));
  await page.screenshot({ path: path.join(dir, 'vila-pack-boot.png') });

  const loginBtn = (await page.$('[data-testid="login-teste"]'))
    || (await page.$('[data-testid="login-heitor"]'));
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-heitor"]'), { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  for (let i = 0; i < 4; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    await clickLabel('Mais tarde');
  }
  await page.waitForFunction(() => !/Prova do dia/.test(document.body.innerText), { timeout: 8000 }).catch(() => undefined);
  await new Promise((r) => setTimeout(r, 800));

  const canvas = await page.$('canvas[aria-label="Vila"]');
  if (canvas) {
    await canvas.screenshot({ path: path.join(dir, 'vila-pack.png') });
    console.log('vila-pack');
  }

  await clickCanvas(610, 372);
  await page.waitForFunction(() => /Mochila|Equipado|Materiais/.test(document.body.innerText), { timeout: 8000 });
  console.log('mochila-ok');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
