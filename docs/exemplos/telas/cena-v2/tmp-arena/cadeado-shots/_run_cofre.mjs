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
  args: ['--window-size=1920,1080'],
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
const readCard = async () => page.evaluate(() => {
  const body = (document.body.innerText || '').replace(/\s+/g, ' ');
  return {
    title: document.querySelector('h2')?.textContent || '',
    metas: /2 metas|metas abertas/.test(body),
    montinho: /montinho/i.test(body),
    lines: [...document.querySelectorAll('p')].map((p) => (p.textContent || '').trim()).filter((t) => /montinho|rende \+|10 gold/i.test(t)),
    snippet: body.slice(Math.max(0, body.search(/Cofre|Cofrinho|Paciência|Banco/)), Math.max(0, body.search(/Cofre|Cofrinho|Paciência|Banco/)) + 420),
  };
});
const clickScene = async (sx, sy) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const fit = Math.min(box.w / 1280, box.h / 640);
  const dw = 1280 * fit;
  const dh = 640 * fit;
  const ox = box.x + (box.w - dw) / 2;
  const oy = box.y + (box.h - dh) / 2;
  await page.mouse.click(ox + sx * fit, oy + sy * fit);
};

const login = async () => {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1400);
  }
  for (let i = 0; i < 8; i++) {
    await clickLabel('Mais tarde');
    await sleep(80);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(500);
  const uid = await page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('firebaseLocalStorageDb');
    req.onerror = () => resolve('');
    req.onsuccess = () => {
      try {
        const db = req.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          resolve('');
          return;
        }
        const tx = db.transaction('firebaseLocalStorage', 'readonly');
        const getAll = tx.objectStore('firebaseLocalStorage').getAll();
        getAll.onerror = () => resolve('');
        getAll.onsuccess = () => {
          const row = (getAll.result || []).find((r) => r && r.value && r.value.uid);
          resolve((row && row.value && row.value.uid) || '');
        };
      } catch {
        resolve('');
      }
    };
  }));
  console.log('auth', JSON.stringify({ uid }));
  if (uid) {
    await page.evaluate((id) => {
      localStorage.setItem(`quiz_completed_${id}_2026-09-19`, '1');
    }, uid);
    await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
    await sleep(800);
    for (let i = 0; i < 6; i++) {
      await clickLabel('Mais tarde');
      await sleep(80);
    }
    await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
    await sleep(400);
  }
};

const openPaciencia = async () => {
  const gold = await page.$('button[title="Extrato"]');
  if (gold) await gold.click();
  await sleep(400);
  await clickLabel('Paciência');
  await sleep(300);
  return readCard();
};

const openCofreLot = async () => {
  await page.keyboard.press('Escape');
  await sleep(200);
  await clickScene(524, 462);
  await page.waitForFunction(() => {
    const h = document.querySelector('h2');
    return Boolean(h && /Cofre/.test(h.textContent || ''));
  }, { timeout: 20000 }).catch(() => undefined);
  await sleep(300);
  return readCard();
};

try {
  await page.setViewport({ width: 1280, height: 720 });
  await login();
  const p1280 = await openPaciencia();
  console.log('paciencia-1280', JSON.stringify(p1280));
  await page.screenshot({ path: path.join(dir, 'cofre-01-paciencia-1280.png') });
  const c1280 = await openCofreLot();
  console.log('card-1280', JSON.stringify(c1280));
  await page.screenshot({ path: path.join(dir, 'cofre-02-card-1280.png') });
  await page.keyboard.press('Escape');
  await sleep(200);

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await sleep(700);
  for (let i = 0; i < 6; i++) {
    await clickLabel('Mais tarde');
    await sleep(80);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(400);
  const p1920 = await openPaciencia();
  console.log('paciencia-1920', JSON.stringify(p1920));
  await page.screenshot({ path: path.join(dir, 'cofre-03-paciencia-1920.png') });
  const c1920 = await openCofreLot();
  console.log('card-1920', JSON.stringify(c1920));
  await page.screenshot({ path: path.join(dir, 'cofre-04-card-1920.png') });
} finally {
  await browser.close();
}
