import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-arena', 'look-shots');
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(30000);
page.on('pageerror', (err) => console.error('pageerror', err.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === label || (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  for (let i = 0; i < 12; i++) {
    await clickLabel('Mais tarde');
    await sleep(180);
  }
};

const clickCanvas = async (px, py) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (canvas, x, y) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (x / 1280) * rect.width,
      y: rect.top + (y / 640) * rect.height,
    };
  }, px, py);
  await page.mouse.click(box.x, box.y);
};

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name, dest);
};

const editorOpen = async () => page.evaluate(() => /Salvar visual|Salvo/.test(document.body.innerText || ''));

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1400);
  }
  await dismissQuiz();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(800);

  for (const [x, y] of [[640, 320], [640, 300], [640, 340], [620, 310]]) {
    if (await editorOpen()) break;
    await clickCanvas(x, y);
    await sleep(400);
  }
  if (!(await editorOpen())) {
    await page.click('[data-testid="hotbar-pack"]').catch(() => {});
    await sleep(500);
  }
  if (!(await editorOpen())) {
    throw new Error('mochila nao abriu');
  }
  await sleep(250);
  await shot('00-ficha');

  const clickSlot = async (label) => {
    await page.waitForSelector(`[aria-label="${label}"]`, { timeout: 8000 });
    if (!(await editorOpen())) {
      await page.click('[data-testid="hotbar-pack"]').catch(() => {});
      await sleep(400);
    }
    await page.click(`[aria-label="${label}"]`);
    await sleep(220);
  };

  await clickSlot('Camisa');
  await clickSlot('Camisa vermelha');
  await sleep(80);
  await shot('01-camisa-vermelha');

  await clickSlot('Calça');
  await clickSlot('Calça azul');
  await sleep(80);
  await shot('02-calca-azul');

  await clickSlot('Chapéu');
  await clickSlot('Boné');
  await sleep(80);
  await shot('03-chapeu-bone');

  await clickSlot('Capacete da Forja');
  await sleep(80);
  await shot('03b-forja');

  await clickSlot('Coroa');
  await sleep(80);
  await shot('03c-coroa');

  await clickSlot('Capa');
  await clickSlot('Capa vermelha');
  await sleep(80);
  await shot('04-capa-vermelha');

  await clickSlot('Cachecol da vila');
  await sleep(80);
  await shot('04b-cachecol');

  await clickSlot('Capa da Mina');
  await clickSlot('Chapéu');
  await clickSlot('Capacete da Forja');
  await sleep(80);
  await shot('04c-forja-capa');

  await clickSlot('Picareta');
  await shot('05-picareta');

  await clickSlot('Botas');
  await shot('05b-botas');

  await clickLabel('Sacola');
  await sleep(300);
  await shot('06-sacola');
} catch (err) {
  console.error(err);
  await shot('zz-fail');
  process.exitCode = 1;
} finally {
  await browser.close();
}
