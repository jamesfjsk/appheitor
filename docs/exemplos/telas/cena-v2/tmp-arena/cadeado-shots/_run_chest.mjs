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
    await sleep(80);
  }
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  for (let i = 0; i < 6; i++) {
    await clickLabel('Mais tarde');
    await sleep(80);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(900);
  await page.screenshot({ path: path.join(dir, 'chest-01-mapa.png') });
  await page.keyboard.press('b');
  await page.waitForSelector('[data-testid="chest-place"]', { timeout: 8000 });
  await sleep(400);
  const modal = await page.evaluate(() => {
    const place = document.querySelector('[data-testid="chest-place"]');
    const text = (place?.closest('.mc-modal')?.textContent || place?.parentElement?.textContent || '').replace(/\s+/g, ' ');
    const mouth = place?.querySelector('.mn-chest-mouth');
    const btns = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean);
    return {
      text,
      lock: Boolean(mouth?.classList.contains('is-lock')),
      lockEl: Boolean(place?.querySelector('.mn-chest-lock')),
      nivel: /N[ií]vel\s*[23]/i.test(text),
      missao: /se \d+ miss/.test(text),
      hora: /Às \d+h o baú abre/.test(text),
      abrirMudo: btns.includes('Abrir o Baú do Dia'),
      btns: btns.slice(0, 8),
    };
  });
  console.log('modal', JSON.stringify(modal));
  await page.screenshot({ path: path.join(dir, 'chest-02-modal.png') });
  if (!modal.lock || !modal.lockEl) throw new Error('cadeado ausente no modal');
  if (modal.nivel) throw new Error('ainda mostra nivel do bau');
  if (!modal.missao) throw new Error('modal nao fala as missoes');
  if (!modal.hora) throw new Error('modal nao fala a hora');
  if (modal.abrirMudo) throw new Error('botao mudo Abrir o Bau do Dia');
  if (!/\bBloqueado\b/.test(modal.text)) throw new Error('botao nao diz Bloqueado');
  if (/Melhorar o Armaz/.test(modal.text)) throw new Error('ainda tem Melhorar o Armazem');
  await page.setViewport({ width: 390, height: 844 });
  await sleep(500);
  await page.screenshot({ path: path.join(dir, 'chest-03-estreito.png') });
  console.log('ok', dir);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
