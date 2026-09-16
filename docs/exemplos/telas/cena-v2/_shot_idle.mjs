import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-arena', 'idle-shots');
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
  for (let i = 0; i < 12; i++) {
    await clickLabel('Mais tarde');
    await sleep(220);
  }
  await page.waitForFunction(() => {
    const t = document.body.innerText || '';
    return !t.includes('Prova do dia') && !t.includes('A prova de hoje');
  }, { timeout: 8000 }).catch(() => {});
};

const canvasBox = async () => page.$eval('canvas[aria-label="Vila"]', (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

const clickCanvas = async (nx, ny) => {
  const box = await canvasBox();
  await page.mouse.click(box.x + box.w * nx, box.y + box.h * ny);
};

const hoverCanvas = async (nx, ny) => {
  const box = await canvasBox();
  await page.mouse.move(box.x + box.w * nx, box.y + box.h * ny);
};

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name, dest);
};

const enter = async (url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(500);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1600);
  }
  await dismissQuiz();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 20000 });
  await sleep(900);
};

try {
  await enter(`${BASE}/flash?h=10`);
  await hoverCanvas(0.50, 0.52);
  await sleep(200);
  await shot('00-plaza-idle');

  await hoverCanvas(0.50, 0.86);
  await sleep(300);
  await shot('01-cerca');

  await clickCanvas(0.484, 0.28);
  await sleep(500);
  await shot('02-balao-coracoes');

  await clickCanvas(0.50, 0.52);
  await sleep(200);
  await clickCanvas(0.155, 0.37);
  await sleep(700);
  await shot('03-andando-fornalha');
  await sleep(2200);
  await shot('04-chegou-fornalha');

  await enter(`${BASE}/flash?h=21`);
  await sleep(400);
  await shot('05-noite-placa');
  await clickCanvas(0.80, 0.39);
  await sleep(450);
  await shot('06-noite-sabio');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
