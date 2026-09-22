import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5173';
const DATE = process.env.SHOT_DATE || '2026-09-20';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-shot-'));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [`--user-data-dir=${profile}`, '--window-size=1920,1080'],
});
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('pageerror', err.message));
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error' || /concluir|MerchantDelivery|FirebaseError/.test(t)) console.log('browser', t.slice(0, 400));
});
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
    const say = await page.evaluate(() => document.querySelector('.mn-papiro-explain')?.textContent || '');
    console.log('juiz', say.slice(0, 160));
  }
  if (await page.$('textarea')) throw new Error('prova não fechou: o Sábio recusou a reflexão');
  if (await bodyHas('Voltar à Vila')) await clickLabel('Voltar à Vila');
  await sleep(1000);
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
    if (await page.$('[data-testid="contract-board"], [data-testid="merchant-delivery"], [data-testid="english-base"]')) break;
    if (await bodyHas('Abrir a mesa') || await bodyHas('O Sábio pergunta') || await bodyHas('Começar')) {
      await finishQuizIfOpen();
      const again = await page.$('[data-testid="hotbar-mine"]');
      if (again) await again.click();
    }
    await sleep(500);
  }
}

async function openMerchant() {
  const open = await page.$('[data-testid="open-merchant"]');
  if (open) {
    await open.click();
    await sleep(900);
    return;
  }
  const redo = await page.$('[data-testid="redo-merchant"]');
  if (redo) {
    await redo.click();
    await sleep(1200);
    const again = await page.$('[data-testid="open-merchant"]');
    if (again) await again.click();
    await sleep(900);
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
      labels: [...document.querySelectorAll('.md-pocket b')].map((el) => el.textContent),
      finale: Boolean(document.querySelector('[data-testid="merchant-finale"]')),
    };
  });
}

async function waitListenReady() {
  for (let i = 0; i < 50; i++) {
    const ready = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid^="listen-"]');
      return Boolean(btn && !btn.disabled && !/Falando|chegando/i.test(btn.textContent || ''));
    });
    if (ready) return true;
    await sleep(400);
  }
  return false;
}

async function dropOnPocket(relationHint) {
  await waitListenReady();
  const listenBtn = await page.$('[data-testid^="listen-"]:not([disabled])');
  if (listenBtn) {
    await listenBtn.click();
    await page.waitForSelector('[data-testid="merchant-sentence"]', { timeout: 25000 }).catch(() => undefined);
    await page.waitForSelector('.md-pocket', { timeout: 8000 }).catch(() => undefined);
    await sleep(400);
  }
  const said = await page.$eval('[data-testid="merchant-sentence"]', (el) => el.textContent || '').catch(() => '');
  const relation = /\bon\b/i.test(said) ? 'on'
    : /\bin\b/i.test(said) ? 'in'
    : /\bunder\b/i.test(said) ? 'under'
    : relationHint || 'next_to';
  const named = await page.evaluate((text) => {
    const ids = [...document.querySelectorAll('[data-testid^="item-"]')].map((el) => el.getAttribute('data-testid').replace('item-', ''));
    return ids.find((id) => new RegExp(`\\b${id}`, 'i').test(text)) || null;
  }, said);
  const spotId = await page.evaluate((text) => {
    const ids = [...document.querySelectorAll('[data-testid^="spot-"]')].map((el) => el.getAttribute('data-testid').replace('spot-', ''));
    return ids.find((id) => new RegExp(`\\b${id}\\b`, 'i').test(text)) || null;
  }, said);
  const item = named
    ? await page.$(`[data-testid="item-${named}"]:not(.is-empty):not([disabled])`)
    : await page.$('[data-testid^="item-"]:not(.is-empty):not([disabled])');
  const pocket = (spotId && relation
    ? await page.$(`.md-pocket[data-relation="${relation}"][data-spot="${spotId}"]`)
    : null)
    || (relation ? await page.$(`.md-pocket[data-relation="${relation}"]`) : null)
    || await page.$('.md-pocket');
  if (!item || !pocket) return false;
  const a = await item.boundingBox();
  const b = await pocket.boundingBox();
  if (!a || !b) return false;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await sleep(450);
  const d = await page.$('[data-testid="deliver"]:not([disabled])');
  if (d) {
    await d.click();
    await sleep(1000);
  }
  return true;
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
  await openMine();
  await openMerchant();
  await page.waitForSelector('[data-testid="merchant-delivery"]', { timeout: 25000 });
  await sleep(400);
  await pair('01-balao');

  const listen = await page.$('[data-testid^="listen-"]');
  if (listen) {
    await listen.click();
    await page.waitForSelector('[data-testid="merchant-sentence"]', { timeout: 25000 });
    await page.waitForSelector('.md-pocket', { timeout: 8000 }).catch(() => undefined);
    await sleep(400);
  }
  console.log('step0', JSON.stringify(await roomInfo()));
  await pair('02-ouvir');

  const sentence = await page.$eval('[data-testid="merchant-sentence"]', (el) => el.textContent || '').catch(() => '');
  const want = /\bon\b/i.test(sentence) ? 'on'
    : /\bin\b/i.test(sentence) ? 'in'
    : /\bunder\b/i.test(sentence) ? 'under'
    : 'next_to';
  const wrong = want === 'next_to' ? 'under' : 'next_to';

  const item = await page.$('[data-testid^="item-"]:not(.is-empty)');
  const wrongPad = await page.$(`.md-pocket[data-relation="${wrong}"]`) || await page.$('.md-pocket');
  if (item && wrongPad) {
    const a = await item.boundingBox();
    const b = await wrongPad.boundingBox();
    if (a && b) {
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
      await pair('03-arrastar');
      await page.mouse.up();
      await sleep(450);
      await pair('04-encaixe');
    }
  }

  const deliver = await page.$('[data-testid="deliver"]:not([disabled])');
  if (deliver) {
    await deliver.click();
    await sleep(900);
    await pair('05-erro-devolvido');
  }

  await dropOnPocket(want);
  await sleep(700);
  await pair('06-entrega');

  const stageState = () => page.evaluate(() => ({
    finale: Boolean(document.querySelector('[data-testid="merchant-finale"]')),
    spots: document.querySelectorAll('[data-testid^="spot-"]').length,
    step: document.querySelector('[data-testid="merchant-delivery"]')?.getAttribute('data-step') || '',
    fix: Boolean(document.querySelector('[data-testid="merchant-fix"]')),
    saving: (document.body.innerText || '').includes('confere o armazém'),
  }));

  const deliverAndWait = async (before) => {
    const d = await page.waitForSelector('[data-testid="deliver"]:not([disabled])', { timeout: 8000 }).catch(() => null);
    if (!d) return 'none';
    await d.click();
    const result = await page.waitForFunction((prev) => {
      if (document.querySelector('[data-testid="merchant-finale"]')) return 'finale';
      if ((document.body.innerText || '').includes('confere o armazém')) return 'saving';
      const now = document.querySelector('[data-testid="merchant-delivery"]')?.getAttribute('data-step');
      if (now && now !== prev) return 'next';
      if (document.querySelector('[data-testid="merchant-fix"]')) return 'miss';
      if (!document.querySelector('[data-testid^="spot-"]')) return 'gone';
      return false;
    }, { timeout: 90000 }, before).catch(() => 'timeout');
    return typeof result === 'string' ? result : await result.jsonValue();
  };

  for (let i = 0; i < 4; i++) {
    const state = await stageState();
    console.log('passo', i, JSON.stringify(state));
    if (state.finale || state.saving || state.spots === 0) break;
    await waitListenReady();
    if (!(await page.$('.md-pocket'))) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid^="listen-"]')].find((el) => !el.getAttribute('data-testid').includes('slow') && !el.disabled);
        btn?.click();
      });
      await page.waitForFunction(() => document.querySelectorAll('.md-pocket').length > 0, { timeout: 75000 }).catch(() => undefined);
      await sleep(400);
    }
    const said = await page.$eval('[data-testid="merchant-sentence"]', (el) => el.textContent || '').catch(() => '');
    const relation = /\bon\b/i.test(said) ? 'on' : /\bin\b/i.test(said) ? 'in' : /\bunder\b/i.test(said) ? 'under' : 'next_to';
    const named = await page.evaluate((text) => {
      const ids = [...document.querySelectorAll('[data-testid^="item-"]')].map((el) => el.getAttribute('data-testid').replace('item-', ''));
      return ids.find((id) => new RegExp(`\\b${id}`, 'i').test(text)) || null;
    }, said);
    const itemSel = named
      ? `[data-testid="item-${named}"]:not(.is-empty):not([disabled])`
      : '[data-testid^="item-"]:not(.is-empty):not([disabled])';
    const pockets = await page.$$(`.md-pocket[data-relation="${relation}"]`);
    const fallback = pockets.length ? pockets : await page.$$('.md-pocket');
    let moved = 'none';
    for (const pocket of fallback) {
      const item = await page.$(itemSel);
      if (!item) break;
      const a = await item.boundingBox();
      const b = await pocket.boundingBox();
      if (!a || !b) continue;
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
      await page.mouse.up();
      const before = await page.evaluate(() => document.querySelector('[data-testid="merchant-delivery"]')?.getAttribute('data-step') || '');
      moved = await deliverAndWait(before);
      console.log('entrega', moved);
      if (moved === 'next' || moved === 'finale' || moved === 'saving' || moved === 'gone') break;
      await waitListenReady();
    }
    if (moved === 'saving' || moved === 'gone') {
      await shot('07-salvando', 1280, 720);
      break;
    }
    if (moved === 'finale') break;
  }
  await page.waitForSelector('[data-testid="merchant-finale"]', { timeout: 90000 }).catch(() => {});
  if (await page.$('[data-testid="merchant-finale"]')) {
    await sleep(500);
    await pair('07-final');
  } else {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 700)).catch(() => '');
    console.log('sem-final', text);
    await shot('07-estado', 1280, 720);
  }
  console.log('end', JSON.stringify(await roomInfo()));
} catch (e) {
  console.error(e);
  const dump = await page.evaluate(() => document.body.innerText.slice(0, 600)).catch(() => '');
  console.error('dump', dump);
  await page.screenshot({ path: path.join(dir, 'fail.png') }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
