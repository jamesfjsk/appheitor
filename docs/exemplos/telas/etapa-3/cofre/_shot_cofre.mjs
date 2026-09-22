import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5174';
const DATE = process.env.SHOT_DATE || '2026-09-20';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-cofre-'));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [`--user-data-dir=${profile}`, '--window-size=1920,1080'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.setDefaultTimeout(50000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

async function login() {
  await page.goto(`${BASE}/flash?h=14&d=${DATE}&contractsV2=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (!teste) throw new Error('sem botão da conta de teste — abortar (nunca o Heitor)');
  await teste.click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
  await sleep(1600);
  for (let i = 0; i < 10; i++) {
    await clickLabel('Mais tarde');
    await sleep(60);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 25000 });
  await sleep(1400);
}

async function shot(name, w, h) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(220);
  await page.screenshot({ path: path.join(dir, `${name}-${w}.png`) });
  console.log(`${name}-${w}`);
}
async function pair(name) {
  await shot(name, 1280, 720);
  await shot(name, 1920, 1080);
}

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await login();
  await pair('01-vila');

  const market = await page.$('[data-testid="hotbar-market"]');
  if (market) await market.click();
  else await clickLabel('Mercado');
  await sleep(900);
  await pair('02-mercado');
  if (!(await clickLabel('Cofrinho'))) await clickLabel('Banco da Vila');
  if (!(await bodyHas('Aplicar'))) await clickLabel('Banco');
  await sleep(700);
  if (await bodyHas('Aplicar') || await bodyHas('no bolso') || await bodyHas('Cofre') || await bodyHas('montinho')) {
    await pair('03-cofrinho');
  }
  await page.keyboard.press('Escape');
  await sleep(400);
  await clickLabel('Vila');
  await sleep(400);

  const pack = await page.$('[data-testid="hotbar-pack"]');
  if (pack) await pack.click();
  await sleep(700);
  if (await clickLabel('Obras')) {
    await sleep(500);
    await pair('04-obras');
  }
} catch (e) {
  console.error(e);
  await page.screenshot({ path: path.join(dir, 'fail.png') }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
