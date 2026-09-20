import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5177';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-recado-'));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [`--user-data-dir=${profile}`, '--window-size=1920,1080'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.setDefaultTimeout(40000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

async function login() {
  await page.goto(`${BASE}/flash?h=14&d=2026-09-19&contractsV2=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (!teste) throw new Error('sem botão da conta de teste — abortar (nunca o Heitor)');
  await teste.click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
  await sleep(1400);
  for (let i = 0; i < 10; i++) {
    await clickLabel('Mais tarde');
    await clickLabel('Voltar à Vila');
    await sleep(60);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 25000 });
  await sleep(700);
  await page.keyboard.press('Escape');
  await sleep(200);
  await clickLabel('Voltar à Vila');
  await page.evaluate(() => {
    const close = document.querySelector('[aria-label="Fechar"]');
    close?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(300);
}

async function openMine() {
  await page.evaluate(() => {
    const x = document.querySelector('[aria-label="Fechar"], button[aria-label="Fechar"]');
    x?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(200);
  const mine = await page.$('[data-testid="hotbar-mine"]');
  if (mine) await mine.click();
  else {
    const byHotbar = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === 'Mina');
      if (!b) return false;
      b.click();
      return true;
    });
    if (!byHotbar) await page.keyboard.press('Digit3');
  }
  await sleep(1800);
  for (let i = 0; i < 24; i++) {
    if (await page.$('[data-testid="contract-board"], [data-testid="recado-board"], [data-testid="english-base"]')) break;
    await sleep(500);
  }
}

async function openRecado() {
  const open = await page.$('[data-testid="open-note"]');
  if (open) {
    await open.click();
    await sleep(800);
    return;
  }
  const redo = await page.$('[data-testid="redo-note"]');
  if (redo) {
    await redo.click();
    await sleep(1200);
    const again = await page.$('[data-testid="open-note"]');
    if (again) await again.click();
    await sleep(800);
  }
}

async function shot(name, w, h) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(220);
  const dest = path.join(dir, `${name}-${w}.png`);
  await page.screenshot({ path: dest });
  console.log(path.basename(dest));
}

async function pair(name) {
  await shot(name, 1280, 720);
  await shot(name, 1920, 1080);
}

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await login();
  await openMine();
  await openRecado();
  const seen = await page.evaluate(() => ({
    recado: Boolean(document.querySelector('[data-testid="recado-board"]')),
    board: Boolean(document.querySelector('[data-testid="contract-board"]')),
    noteOld: Boolean(document.querySelector('[data-testid="note-contract"]')),
    open: Boolean(document.querySelector('[data-testid="open-note"]')),
    redo: Boolean(document.querySelector('[data-testid="redo-note"]')),
    text: document.body.innerText.slice(0, 280),
  }));
  console.log('after-open', JSON.stringify(seen));
  await page.waitForSelector('[data-testid="recado-board"]', { timeout: 20000 });
  await sleep(400);
  await pair('01-quadro');

  const hear = await page.$('[data-testid="recado-hear"]');
  if (hear) {
    await hear.click();
    await sleep(900);
  }
  const gap = await page.$('[data-testid="recado-gap-0"]');
  const area = await page.$('[data-testid="recado-text"]');
  if (gap) {
    await gap.click();
    await page.keyboard.type('do my homework');
    await sleep(200);
  } else if (area) {
    await area.click();
    await page.keyboard.type('I do my homework first');
    await sleep(200);
  }
  await pair('02-giz');

  const send = await page.$('[data-testid="recado-submit"]');
  if (send) {
    await send.click();
    await page.waitForFunction(() => {
      const t = (document.querySelector('[data-testid="recado-balloon"]')?.textContent || '').trim();
      if (!t) return false;
      if (t.includes('O Capataz lê')) return false;
      if (t === 'Ouve o inglês primeiro.') return false;
      return t.length > 20;
    }, { timeout: 28000 });
    await sleep(400);
  }
  await pair('03-erro');

  const frame = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="recado-board"]');
    const r = root?.getBoundingClientRect();
    return {
      hasBoard: Boolean(root),
      hasQuadro: Boolean(document.querySelector('[data-testid="recado-quadro"]')),
      hasBalloon: Boolean(document.querySelector('[data-testid="recado-balloon"]')),
      pegs: document.querySelectorAll('[data-testid^="recado-peg-"]').length,
      pegsOn: document.querySelectorAll('.nb-peg.is-on').length,
      chips: document.querySelectorAll('[data-testid^="bank-"]').length,
      balloon: (document.querySelector('[data-testid="recado-balloon"]')?.textContent || '').slice(0, 160),
      w: r?.width ?? 0,
      h: r?.height ?? 0,
    };
  });
  console.log(JSON.stringify(frame));
} catch (e) {
  console.error(e);
  await page.screenshot({ path: path.join(dir, 'fail.png') }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
