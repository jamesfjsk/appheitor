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
  await sleep(600);
}

try {
  await page.setViewport({ width: 1280, height: 720 });
  await login();
  const opened = await page.evaluate(() => {
    const b = document.querySelector('button[title="Torre"]');
    if (!b) return false;
    b.click();
    return true;
  });
  if (!opened) throw new Error('sem chip Torre');
  await sleep(500);
  const info = await page.evaluate(() => {
    const sheet = document.querySelector('.mn-child-sheet');
    const text = (sheet?.textContent || '').replace(/\s+/g, ' ');
    const tabs = [...(sheet?.querySelectorAll('.mc-hotbar')[0]?.querySelectorAll('button') || [])].map((b) => (b.textContent || '').trim());
    const cats = [...(sheet?.querySelectorAll('.mc-hotbar')[1]?.querySelectorAll('button') || [])].map((b) => (b.textContent || '').trim());
    const lucide = Boolean(sheet?.querySelector('svg.lucide-lock, .lucide-lock'));
    const rows = sheet?.querySelectorAll('.mc-inv .mc-row').length || 0;
    return {
      child: Boolean(sheet),
      textHead: text.slice(0, 220),
      tabs,
      cats,
      lucide,
      rows,
      construa: /Construa a Torre/.test(text),
      goldNote: /paga gold/.test(text),
      bauLower: /\bbau \d/.test(text),
      rotina: cats.some((c) => c.startsWith('Rotina')),
    };
  });
  console.log('torre', JSON.stringify(info));
  await page.screenshot({ path: path.join(dir, 'torre-01-1280.png') });
  if (!info.child) throw new Error('nao abriu ChildSheet');
  if (info.lucide) throw new Error('lucide lock na torre');
  if (info.construa) throw new Error('copy Construa a Torre');
  if (info.goldNote) throw new Error('nota de gold na crianca');
  if (!info.rotina) throw new Error('categoria sem Rotina');
  await clickLabel('Recordes');
  await sleep(400);
  const lockToast = await page.evaluate(() => {
    const t = [...document.querySelectorAll('div, span')].find((el) => /Torre ainda n[aã]o subiu|Mapa e hist[oó]rias|Recordes e Trof/.test(el.textContent || ''));
    return (t?.textContent || '').trim().slice(0, 80);
  });
  console.log('lockToast', lockToast);
  await page.screenshot({ path: path.join(dir, 'torre-03-lock.png') });
  await clickLabel('Mina ');
  await sleep(300);
  await page.screenshot({ path: path.join(dir, 'torre-04-mina.png') });
  await page.setViewport({ width: 1920, height: 1080 });
  await sleep(400);
  await page.screenshot({ path: path.join(dir, 'torre-02-1920.png') });
  console.log('ok', dir);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
