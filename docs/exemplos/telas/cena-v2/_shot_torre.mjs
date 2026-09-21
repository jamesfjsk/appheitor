import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,720'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.setDefaultTimeout(30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

async function login() {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1200);
  }
  for (let i = 0; i < 8; i++) {
    await clickLabel('Mais tarde');
    await sleep(80);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(700);
}

async function dismissTalk() {
  for (let i = 0; i < 6; i++) {
    await clickLabel('Mais tarde');
    await sleep(60);
  }
}

async function waitVila() {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas[aria-label="Vila"]');
    const boot = /Chamando o minerador/.test(document.body.innerText || '');
    return Boolean(canvas) && !boot;
  }, { timeout: 25000 });
  await sleep(600);
}

async function cropMorro(name) {
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(500);
  const canvas = await page.$('canvas[aria-label="Vila"]');
  if (!canvas) return;
  const box = await canvas.boundingBox();
  if (!box) return;
  await page.screenshot({
    path: path.join(dir, name),
    clip: {
      x: Math.max(0, box.x + box.width * 0.72),
      y: Math.max(0, box.y),
      width: box.width * 0.28,
      height: box.height * 0.52,
    },
  });
}

try {
  await page.setViewport({ width: 1280, height: 720 });
  await login();
  await page.screenshot({ path: path.join(dir, 'torre-cena-1280.png') });
  await cropMorro('torre-n0-morro.png');

  for (const n of [1, 2, 3]) {
    await page.goto(`${BASE}/flash?h=10&torre=${n}`, { waitUntil: 'domcontentloaded' });
    await dismissTalk();
    await waitVila();
    await cropMorro(`torre-n${n}-morro.png`);
    if (n === 2) await page.screenshot({ path: path.join(dir, 'torre-n2-cena-1280.png') });
  }

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/flash?h=10&torre=2`, { waitUntil: 'domcontentloaded' });
  await dismissTalk();
  await waitVila();
  await page.screenshot({ path: path.join(dir, 'torre-cena-1920.png') });

  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`${BASE}/flash?h=21&torre=2`, { waitUntil: 'domcontentloaded' });
  await dismissTalk();
  await waitVila();
  await page.screenshot({ path: path.join(dir, 'torre-noite-1280.png') });
  await cropMorro('torre-n2-noite-morro.png');
  console.log('ok', dir);
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, 'torre-fail.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
