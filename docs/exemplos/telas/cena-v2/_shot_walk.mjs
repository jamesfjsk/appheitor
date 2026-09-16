import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-arena', 'walk-shots');
fs.mkdirSync(dir, { recursive: true });
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

const dismissQuiz = async () => {
  await sleep(600);
  await clickLabel('Mais tarde');
  await sleep(300);
  await clickLabel('Mais tarde');
  await sleep(300);
};

const clickCanvas = async (nx, ny) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * nx, box.y + box.h * ny);
};

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name);
};

const closeUi = async () => {
  await page.keyboard.press('Escape');
  await sleep(250);
  await page.keyboard.press('Escape');
  await sleep(200);
};

const stops = [
  ['00c-mochila', 0.48, 0.545],
  ['01-fornalha', 0.155, 0.37],
  ['07-arena', 0.80, 0.62],
  ['08-casa', 0.77, 0.23],
];

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(600);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(2000);
  }
  await dismissQuiz();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 20000 });
  await sleep(900);
  await shot('00-plaza');

  await page.mouse.click(20, 20);
  await sleep(200);

  await clickCanvas(0.484, 0.28);
  await sleep(400);
  await shot('00b-npc-sabio');
  await closeUi();

  for (const [name, nx, ny] of stops) {
    await clickCanvas(nx, ny);
    await sleep(550);
    await shot(`${name}-meio`);
    await sleep(4200);
    await closeUi();
    await sleep(200);
    await shot(`${name}-porta`);
  }
} finally {
  await browser.close();
}
