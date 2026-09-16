import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-arena', 'hover-shots');
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

const canvasBox = async () => page.$eval('canvas[aria-label="Vila"]', (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

const hoverCanvas = async (nx, ny) => {
  const box = await canvasBox();
  await page.mouse.move(box.x + box.w * nx, box.y + box.h * ny);
};

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name, dest);
};

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

  await hoverCanvas(0.50, 0.86);
  await sleep(350);
  await shot('01-cerca-portao');

  await hoverCanvas(0.38, 0.86);
  await sleep(250);
  await shot('02-cerca-asa');

  await hoverCanvas(0.155, 0.37);
  await sleep(250);
  await shot('03-fornalha');

  await hoverCanvas(0.80, 0.62);
  await sleep(250);
  await shot('04-arena');
} finally {
  await browser.close();
}
