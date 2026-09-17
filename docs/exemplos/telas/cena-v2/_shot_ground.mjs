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
  for (let i = 0; i < 8; i++) {
    await clickLabel('Mais tarde');
    await sleep(160);
  }
};

const clickCanvas = async (nx, ny) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * nx, box.y + box.h * ny);
};

const heroOf = async () => page.$eval('canvas[aria-label="Vila"]', (el) => ({
  pos: el.dataset.hero || '',
  walking: el.dataset.walking || '0',
}));

const waitStand = async (ms = 2800) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const h = await heroOf();
    if (h.walking === '0') return h;
    await sleep(120);
  }
  return heroOf();
};

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name, dest);
};

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(500);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1600);
  }
  await dismissQuiz();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(800);
  await dismissQuiz();
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Mais tarde'));
    if (btn) btn.click();
  });
  await sleep(400);
  await page.waitForFunction(() => !(document.body.innerText || '').includes('Prova do dia'), { timeout: 8000 }).catch(() => {});
  await page.keyboard.press('Escape');
  await sleep(250);

  const start = await heroOf();
  console.log('start', start);
  await shot('g00-plaza');

  await clickCanvas(0.61, 0.61);
  await sleep(480);
  const mid = await heroOf();
  console.log('mid-east', mid);
  await shot('g01-trilha-meio');
  console.log('east', await waitStand());
  await shot('g02-trilha-chegou');

  const beforeWater = await heroOf();
  await clickCanvas(0.938, 0.64);
  await sleep(400);
  const water = await heroOf();
  console.log('water', beforeWater, '->', water);
  await shot('g03-agua');

  await clickCanvas(0.08, 0.08);
  await sleep(400);
  const sky = await heroOf();
  console.log('sky', sky);
  await shot('g04-ceu');

  await clickCanvas(0.85, 0.78);
  await sleep(600);
  const shore = await heroOf();
  console.log('shore', shore);
  await shot('g05-orla-meio');
  console.log('end', await waitStand(3600));
  await shot('g06-orla-chegou');
} catch (err) {
  console.error(err);
  await shot('g-zz-fail');
  process.exitCode = 1;
} finally {
  await browser.close();
}
