/**
 * Foto F9: um item no chão, encostado na parede, embaixo da janela (baseY 440).
 * Só com ?f9=floor (DEV): a sala real continua sem under na janela (F12).
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';
const DATE = process.env.SHOT_DATE || '2026-09-20';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-f9-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [`--user-data-dir=${profile}`, '--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(50000);

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

async function finishQuizIfOpen() {
  const locked = await page.evaluate(() => (
    document.body.innerText.includes('Abrir a mesa')
    || document.body.innerText.includes('Começar')
    || document.body.innerText.includes('Escrever para o Sábio')
    || document.body.innerText.includes('O Sábio pergunta')
  ));
  if (!locked) return;
  for (let i = 0; i < 16; i++) {
    const open = await page.evaluate(() => (
      document.body.innerText.includes('Começar')
      || document.body.innerText.includes('Próxima')
      || document.body.innerText.includes('Escrever')
      || Boolean(document.querySelector('.mn-prova-opt, .mn-quiz'))
    ));
    if (!open && !await page.evaluate(() => document.body.innerText.includes('Abrir a mesa'))) return;
    await page.evaluate(() => {
      const start = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar'));
      if (start) { start.click(); return; }
      document.querySelector('.mn-prova-opt')?.click();
      const next = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever|Fechar|Entendi/.test(el.textContent || ''));
      next?.click();
    });
    await sleep(700);
  }
}

async function login() {
  const url = `${BASE}/flash?h=14&d=${DATE}&contractsV2=1&f9=floor`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (!teste) throw new Error('sem botão da conta de teste — abortar (nunca o Heitor)');
  await teste.click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
  await sleep(1200);
  const href = page.url();
  if (!href.includes('f9=floor')) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(1200);
  }
  for (let i = 0; i < 10; i++) {
    await clickLabel('Mais tarde');
    await sleep(60);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 25000 });
  await sleep(1500);
  await finishQuizIfOpen();
}

async function shot(w) {
  await page.setViewport({ width: w, height: w === 1280 ? 720 : 1080, deviceScaleFactor: 1 });
  await sleep(400);
  const file = path.join(dir, `f9-chao-${w}.png`);
  await page.screenshot({ path: file });
  console.log('shot', file);
}

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await login();
  await page.evaluate(() => {
    document.querySelector('[aria-label="Fechar"], button[aria-label="Fechar"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(200);
  const mine = await page.$('[data-testid="hotbar-mine"]');
  if (mine) await mine.click();
  else await clickLabel('Mina');
  await sleep(1800);
  await page.waitForSelector('[data-testid="open-merchant"], [data-testid="merchant-delivery"]', { timeout: 20000 });
  const open = await page.$('[data-testid="open-merchant"]');
  if (open) await open.click();
  await page.waitForSelector('[data-testid="merchant-delivery"]', { timeout: 25000 });
  const listen = await page.$('[data-testid^="listen-"]:not([disabled])');
  if (listen) {
    await listen.click();
    await page.waitForSelector('[data-testid="merchant-sentence"]', { timeout: 25000 });
    await page.waitForSelector('.md-pocket', { timeout: 8000 });
  }
  const said = await page.$eval('[data-testid="merchant-sentence"]', (el) => el.textContent || '');
  if (!/under the window/i.test(said)) throw new Error(`frase sem under the window: ${said}`);
  const item = await page.$('[data-testid^="item-"]:not(.is-empty):not([disabled])');
  const pocket = await page.$('.md-pocket[data-relation="under"][data-spot="window"]');
  if (!item || !pocket) throw new Error('bandeja ou bolso under/window sumiu');
  const a = await item.boundingBox();
  const b = await pocket.boundingBox();
  if (!a || !b) throw new Error('sem caixa');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
  await page.mouse.up();
  await sleep(900);
  const placed = await page.evaluate(() => document.querySelectorAll('[data-testid="merchant-delivery"] .md-placed, .md-spot-img').length);
  console.log('placed-ish', placed, 'sentence', said);
  await shot(1280);
  await shot(1920);
} catch (err) {
  console.error('F9 FAIL', err);
  await page.screenshot({ path: path.join(dir, 'f9-fail.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
