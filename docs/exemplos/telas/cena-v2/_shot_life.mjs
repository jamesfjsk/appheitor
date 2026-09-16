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

const setHour = async (hour) => {
  await page.evaluate((h) => {
    const u = new URL(window.location.href);
    u.searchParams.set('h', String(h));
    history.replaceState({}, '', u);
    window.dispatchEvent(new Event('clock-override'));
  }, hour);
};

const waitWalk = async (who, ms) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const walk = await page.$eval('canvas[aria-label="Vila"]', (el) => el.getAttribute('data-npc-walk') || '');
    if (walk.split(',').includes(who)) return walk;
    await sleep(120);
  }
  return page.$eval('canvas[aria-label="Vila"]', (el) => el.getAttribute('data-npc-walk') || '');
};

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
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

  await page.screenshot({ path: path.join(dir, 'vila-lotes.png') });
  console.log('vila-lotes');
  const canvas = await page.$('canvas[aria-label="Vila"]');
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.screenshot({
      path: path.join(dir, 'lago-manha.png'),
      clip: {
        x: box.x + box.width * 0.68,
        y: box.y + box.height * 0.42,
        width: box.width * 0.30,
        height: box.height * 0.48,
      },
    });
    console.log('lago-manha');
  }

  await setHour(15);
  const merch = await waitWalk('comerciante', 2500);
  await sleep(3200);
  const merch2 = await page.$eval('canvas[aria-label="Vila"]', (el) => el.getAttribute('data-npc-walk') || '');
  console.log('walk-tarde', merch, merch2);
  await page.screenshot({ path: path.join(dir, 'vila-comerciante-anda.png') });
  console.log('vila-comerciante-anda');
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.screenshot({
      path: path.join(dir, 'fogueira-tarde.png'),
      clip: {
        x: box.x + box.width * 0.68,
        y: box.y + box.height * 0.12,
        width: box.width * 0.22,
        height: box.height * 0.38,
      },
    });
    console.log('fogueira-tarde');
  }

  await setHour(20);
  const sage = await waitWalk('sabio', 2500);
  await sleep(4200);
  const sage2 = await page.$eval('canvas[aria-label="Vila"]', (el) => el.getAttribute('data-npc-walk') || '');
  console.log('walk-noite', sage, sage2);
  await page.screenshot({ path: path.join(dir, 'vila-sabio-anda.png') });
  console.log('vila-sabio-anda');

  await setHour(22);
  await sleep(1600);
  await page.screenshot({ path: path.join(dir, 'vila-vagalumes.png') });
  console.log('vila-vagalumes');
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, 'life-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
