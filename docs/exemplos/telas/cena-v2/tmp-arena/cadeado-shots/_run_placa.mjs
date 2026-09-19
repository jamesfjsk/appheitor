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
await page.setViewport({ width: 1280, height: 720 });
page.setDefaultTimeout(30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

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
  for (let i = 0; i < 8; i++) {
    await clickLabel('Mais tarde');
    await sleep(100);
  }
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  for (let i = 0; i < 6; i++) {
    await clickLabel('Mais tarde');
    await sleep(80);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(700);
  const closed = await page.evaluate(() => {
    const chip = document.querySelector('[data-testid="placa-chip"]');
    const peek = document.querySelector('[data-testid="placa-peek"]');
    const img = chip?.querySelector('img');
    return {
      chip: Boolean(chip),
      letter: Boolean(img?.src?.includes('c_letter')),
      badge: chip?.querySelector('.mn-placa-badge')?.textContent || '',
      label: chip?.getAttribute('aria-label') || '',
      peek: peek?.textContent?.replace(/\s+/g, ' ').trim() || '',
      peekToast: Boolean(peek?.classList.contains('mn-mail-toast')),
      panel: Boolean(document.querySelector('[data-testid="placa-panel"]')),
      inActions: Boolean(chip?.closest('.mn-hud')?.querySelector('[title="Sair"]') && chip?.parentElement?.querySelector('[title="Sair"]')),
    };
  });
  console.log('closed', JSON.stringify(closed));
  await page.screenshot({ path: path.join(dir, 'placa-01-fechada.png') });
  await page.click('[data-testid="placa-chip"]');
  await sleep(400);
  const open = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="placa-panel"]');
    const text = panel?.textContent || '';
    return {
      panel: Boolean(panel),
      titlePlaca: /Placa/.test(text),
      titleAvisos: /Avisos/.test(text),
      hasFechar: /\bFechar\b/.test(text),
      notes: panel?.querySelectorAll('.mn-mail-note').length || 0,
      paper: Boolean(panel?.querySelector('.mc-paper')),
      frame: Boolean(panel?.classList.contains('mc-modal')),
      empty: text.includes('A placa está limpa hoje'),
      peekGone: !document.querySelector('[data-testid="placa-peek"]'),
    };
  });
  console.log('open', JSON.stringify(open));
  await page.screenshot({ path: path.join(dir, 'placa-02-aberta.png') });
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.setViewport({ width: 390, height: 844 });
  await sleep(400);
  await page.screenshot({ path: path.join(dir, 'placa-03-estreita.png') });
  await page.click('[data-testid="placa-chip"]');
  await sleep(400);
  await page.screenshot({ path: path.join(dir, 'placa-04-estreita-aberta.png') });
  console.log('ok', dir);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
