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
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-recado-'));

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

async function finishQuizIfOpen() {
  const locked = await page.evaluate(() => (
    document.body.innerText.includes('Abrir a mesa')
    || document.body.innerText.includes('Começar')
    || document.body.innerText.includes('Escrever para o Sábio')
    || document.body.innerText.includes('O Sábio pergunta')
  ));
  if (!locked) return;
  if (await bodyHas('Escrever para o Sábio')) await clickLabel('Escrever para o Sábio');
  else if (await bodyHas('Abrir a mesa')) await clickLabel('Abrir a mesa');
  await sleep(700);
  if (await bodyHas('Começar')) {
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar'));
      return b && !b.disabled;
    }, { timeout: 36000 });
    await clickLabel('Começar');
    await sleep(500);
  }
  for (let i = 0; i < 20; i++) {
    if (await bodyHas('O Sábio pergunta') || await bodyHas('Entregar')) break;
    if (await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')))) {
      await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
      await sleep(280);
    }
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever/.test(el.textContent || ''));
      return !b || !b.disabled;
    }, { timeout: 16000 }).catch(() => undefined);
    if (!(await clickLabel('Escrever'))) await clickLabel('Próxima');
    await sleep(320);
  }
  await page.waitForSelector('textarea', { timeout: 8000 }).catch(() => undefined);
  const box = await page.$('textarea');
  if (!box) return;
  const tries = [
    'Na escola eu chamo o amigo para montar o grupo. No futebol a gente passa a bola e o trabalho rende no dia.',
    'Eu espero o colega chutar antes de gritar. No recreio o time ganha quando cada um faz a sua parte hoje.',
    'Em casa eu ajudo e depois jogo. Trabalhar junto no campo e na sala deixa o dia mais leve para todos.',
  ];
  for (const line of tries) {
    const area = await page.$('textarea');
    if (!area) break;
    await area.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type(line);
    await sleep(200);
    await clickLabel('Entregar');
    const closed = await page.waitForFunction(() => !document.querySelector('textarea'), { timeout: 20000 }).then(() => true).catch(() => false);
    if (closed) break;
  }
  if (await bodyHas('Voltar à Vila')) await clickLabel('Voltar à Vila');
  await sleep(800);
}

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
  await sleep(2000);
  await finishQuizIfOpen();
}

async function openMine() {
  await page.evaluate(() => {
    document.querySelector('[aria-label="Fechar"], button[aria-label="Fechar"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(200);
  const mine = await page.$('[data-testid="hotbar-mine"]');
  if (mine) await mine.click();
  else await clickLabel('Mina');
  await sleep(1800);
  for (let i = 0; i < 30; i++) {
    if (await page.$('[data-testid="contract-board"], [data-testid="recado-board"], [data-testid="english-base"]')) break;
    if (await bodyHas('Abrir a mesa') || await bodyHas('O Sábio pergunta') || await bodyHas('Começar')) {
      await finishQuizIfOpen();
      const again = await page.$('[data-testid="hotbar-mine"]');
      if (again) await again.click();
    }
    await sleep(500);
  }
}

async function openRecado() {
  if (await page.$('[data-testid="recado-board"]')) return;
  const open = await page.$('[data-testid="open-note"]');
  if (open) {
    await open.click();
    await sleep(900);
    return;
  }
  const redo = await page.$('[data-testid="redo-note"]');
  if (redo) {
    await redo.click();
    await sleep(1200);
    const again = await page.$('[data-testid="open-note"]');
    if (again) await again.click();
    await sleep(900);
  }
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

async function typeOnBoard(text) {
  const gap = await page.$('[data-testid="recado-gap-0"]');
  const area = await page.$('[data-testid="recado-text"]');
  if (gap) {
    await gap.click();
    await page.keyboard.type(text);
    return;
  }
  if (area) {
    await area.click();
    await page.keyboard.type(text);
  }
}

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await login();
  await openMine();
  await openRecado();
  await page.waitForSelector('[data-testid="recado-board"]', { timeout: 25000 });
  await sleep(400);
  await pair('01-quadro');

  const hear = await page.$('[data-testid="recado-hear"]');
  if (hear) {
    await hear.click();
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="recado-hear"]');
      return b && !/Falando|chegando/i.test(b.textContent || '');
    }, { timeout: 28000 }).catch(() => undefined);
    await sleep(300);
  }
  await typeOnBoard('I do homework');
  await sleep(200);
  await pair('02-giz');

  const send = await page.$('[data-testid="recado-submit"]');
  if (send) {
    await send.click();
    await page.waitForFunction(() => {
      const t = (document.querySelector('[data-testid="recado-balloon"]')?.textContent || '').trim();
      if (!t || t.includes('O Capataz lê')) return false;
      if (t === 'Ouve o inglês primeiro.') return false;
      return t.length > 16;
    }, { timeout: 32000 });
    await sleep(400);
  }
  const kept = await page.evaluate(() => {
    const gap = document.querySelector('[data-testid="recado-gap-0"]');
    const area = document.querySelector('[data-testid="recado-text"]');
    return (gap && 'value' in gap ? gap.value : '') || (area && 'value' in area ? area.value : '');
  });
  console.log('after-help', JSON.stringify({ kept: String(kept).slice(0, 80) }));
  await pair('03-ajuda');

  const send2 = await page.$('[data-testid="recado-submit"]');
  if (send2) {
    await send2.click();
    await page.waitForSelector('[data-testid="recado-chalk"]', { timeout: 36000 }).catch(() => undefined);
    await sleep(500);
  }
  await pair('04-julgado');

  const keep = await page.$('[data-testid="recado-keep"]');
  if (keep) {
    await keep.click();
    await page.waitForSelector('[data-testid="recado-finale"]', { timeout: 20000 }).catch(() => undefined);
    await sleep(600);
  }
  await pair('05-finale');

  const frame = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="recado-board"]');
    const r = root?.getBoundingClientRect();
    return {
      quadro: Boolean(document.querySelector('[data-testid="recado-quadro"]')),
      chalk: Boolean(document.querySelector('[data-testid="recado-chalk"]')),
      finale: Boolean(document.querySelector('[data-testid="recado-finale"]')),
      pedido: (document.querySelector('[data-testid="recado-pedido"]')?.textContent || '').slice(0, 90),
      balloon: (document.querySelector('[data-testid="recado-balloon"]')?.textContent || '').slice(0, 140),
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
