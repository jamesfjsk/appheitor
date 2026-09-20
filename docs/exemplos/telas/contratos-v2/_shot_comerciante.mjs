import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5176';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-shot-'));

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
  await page.goto(`${BASE}/flash?h=14&d=2026-09-18&contractsV2=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (!teste) throw new Error('sem botão da conta de teste — abortar (nunca o Heitor)');
  await teste.click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
  await sleep(1400);
  for (let i = 0; i < 10; i++) {
    await clickLabel('Mais tarde');
    await sleep(60);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 25000 });
  await sleep(700);
}

async function openMine() {
  await page.evaluate(() => {
    const x = document.querySelector('[aria-label="Fechar"], button[aria-label="Fechar"]');
    x?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(200);
  const byHotbar = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === 'Mina');
    if (!b) return false;
    b.click();
    return true;
  });
  if (!byHotbar) await page.keyboard.press('Digit3');
  await sleep(1800);
  for (let i = 0; i < 24; i++) {
    if (await page.$('[data-testid="contract-board"], [data-testid="merchant-delivery"], [data-testid="english-base"]')) break;
    await sleep(500);
  }
}

async function openMerchant() {
  const open = await page.$('[data-testid="open-merchant"]');
  if (open) {
    await open.click();
    await sleep(800);
    return;
  }
  const redo = await page.$('[data-testid="redo-merchant"]');
  if (redo) {
    await redo.click();
    await sleep(1200);
    const again = await page.$('[data-testid="open-merchant"]');
    if (again) await again.click();
    await sleep(800);
  }
}

async function roomInfo() {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="merchant-delivery"]');
    return {
      step: root?.getAttribute('data-step'),
      live: root?.getAttribute('data-live'),
      spots: document.querySelectorAll('[data-testid^="spot-"]').length,
      pads: document.querySelectorAll('.md-pocket').length,
      ask: document.querySelectorAll('.md-pocket.is-ask').length,
      finale: Boolean(document.querySelector('[data-testid="merchant-finale"]')),
    };
  });
}

async function dropOnAsk() {
  const listenBtn = await page.$('[data-testid^="listen-"]:not([disabled])');
  if (listenBtn) {
    await listenBtn.click();
    await sleep(700);
  }
  const item = await page.$('[data-testid^="item-"]:not(.is-empty)');
  const pocket = await page.$('.md-pocket.is-ask');
  const spot = await page.$('[data-testid^="spot-"]');
  const target = pocket || spot;
  if (!item || !target) return false;
  const a = await item.boundingBox();
  const b = await target.boundingBox();
  if (!a || !b) return false;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await sleep(420);
  const d = await page.$('[data-testid="deliver"]:not([disabled])');
  if (d) {
    await d.click();
    await sleep(900);
  }
  return true;
}

async function shot(name, w, h) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(200);
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
  await openMerchant();
  await page.waitForSelector('[data-testid="merchant-delivery"]', { timeout: 20000 });
  await sleep(400);
  await pair('01-balao');

  const listen = await page.$('[data-testid^="listen-"]');
  if (listen) {
    await listen.click();
    await sleep(900);
  }
  console.log('step0', JSON.stringify(await roomInfo()));
  await pair('02-ouvir');

  const item = await page.$('[data-testid^="item-"]');
  const stage = await page.$('[data-testid="merchant-stage"]');
  if (item && stage) {
    const a = await item.boundingBox();
    const b = await stage.boundingBox();
    if (a && b) {
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width * 0.42, b.y + b.height * 0.62, { steps: 12 });
      await pair('03-arrastar');
      await page.mouse.up();
      await sleep(450);
      await pair('04-encaixe');
    }
  }

  const deliver = await page.$('[data-testid="deliver"]');
  if (deliver) {
    const disabled = await page.evaluate((el) => el.disabled, deliver);
    if (!disabled) {
      await deliver.click();
      await sleep(700);
      await pair('05-erro-devolvido');
    }
  }

  const item2 = await page.$('[data-testid^="item-"]:not(.is-empty)');
  const stage2 = await page.$('[data-testid="merchant-stage"]');
  if (item2 && stage2) {
    const a = await item2.boundingBox();
    const b = await stage2.boundingBox();
    if (a && b) {
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width * 0.28, b.y + b.height * 0.58, { steps: 10 });
      await page.mouse.up();
      await sleep(400);
    }
  }
  const deliver2 = await page.$('[data-testid="deliver"]');
  if (deliver2) {
    const disabled = await page.evaluate((el) => el.disabled, deliver2);
    if (!disabled) {
      await deliver2.click();
      await sleep(800);
      await pair('06-entrega');
    }
  }

  const points = [
    [0.42, 0.62],
    [0.28, 0.58],
    [0.55, 0.55],
    [0.72, 0.48],
    [0.38, 0.32],
  ];
  const listenThenDrop = async (i) => {
    const listenBtn = await page.$('[data-testid^="listen-"]:not([disabled])');
    if (listenBtn) {
      await listenBtn.click();
      await sleep(220);
    }
    const it = await page.$('[data-testid^="item-"]');
    const st = await page.$('[data-testid="merchant-stage"]');
    if (!it || !st) return;
    const a = await it.boundingBox();
    const b = await st.boundingBox();
    if (!a || !b) return;
    const [px, py] = points[i % points.length];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * px, b.y + b.height * py, { steps: 6 });
    await page.mouse.up();
    await sleep(420);
    const d = await page.$('[data-testid="deliver"]:not([disabled])');
    if (d) {
      await d.click();
      await sleep(850);
    }
  };
  for (let i = 0; i < 16; i++) {
    const info = await page.evaluate(() => ({
      finale: Boolean(document.querySelector('[data-testid="merchant-finale"]')),
      saving: Boolean(document.querySelector('.md-saving')),
      deliverOn: Boolean(document.querySelector('[data-testid="deliver"]:not([disabled])')),
      balloon: (document.querySelector('[data-testid="merchant-balloon"]')?.textContent || '').slice(0, 80),
    }));
    const room = await roomInfo();
    console.log(`loop ${i}`, JSON.stringify({ ...info, ...room }));
    if (info.finale || info.saving) break;
    if (room.ask > 0) await dropOnAsk();
    else await listenThenDrop(i);
  }
  await page.waitForSelector('[data-testid="merchant-finale"]', { timeout: 12000 }).catch(() => {});
  if (await page.$('[data-testid="merchant-finale"]')) {
    await sleep(500);
    await pair('07-final');
  }

  const frame = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="merchant-delivery"]');
    const r = root?.getBoundingClientRect();
    return {
      hasDelivery: Boolean(root),
      hasBalloon: Boolean(document.querySelector('[data-testid="merchant-balloon"]')),
      hasFinale: Boolean(document.querySelector('[data-testid="merchant-finale"]')),
      saving: Boolean(document.querySelector('.md-saving')),
      failed: Boolean(document.querySelector('.md-confirm-card')),
      view: document.body.innerText.slice(0, 240),
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
