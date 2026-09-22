import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5173';
const DATE = process.env.SHOT_DATE || '2026-10-06';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(50000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const shot = async (name, w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(350);
  await page.screenshot({ path: path.join(root, `${name}.png`) });
  console.log(name);
};

const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

try {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/flash?d=${DATE}&h=10&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(500);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await sleep(2500);
  }
  await page.goto(`${BASE}/flash?d=${DATE}&h=10&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 40000 });
  await sleep(2000);

  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => document.body.innerText.includes('Abrir a mesa') || document.body.innerText.includes('Escrever para o Sábio'), { timeout: 40000 });
  await shot('00-convite-1280', 1280, 720);
  await shot('00-convite-1920', 1920, 1080);

  if (await bodyHas('Escrever para o Sábio')) {
    await clickLabel('Escrever para o Sábio');
  } else {
    await clickLabel('Abrir a mesa');
  }
  await sleep(700);

  if (await bodyHas('Começar')) {
    await shot('01-licao-anel-0-1280', 1280, 720);
    await sleep(2200);
    await shot('01-licao-anel-25-1280', 1280, 720);
    await shot('01-licao-anel-25-1920', 1920, 1080);
    await sleep(2200);
    await shot('01-licao-anel-50-1280', 1280, 720);
    await sleep(2200);
    await shot('01-licao-anel-75-1280', 1280, 720);
    await shot('01-licao-anel-75-1920', 1920, 1080);
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar'));
      return b && !b.disabled;
    }, { timeout: 36000 });
    await shot('01-licao-pronto-1280', 1280, 720);
    await shot('01-licao-pronto-1920', 1920, 1080);
    await clickLabel('Começar');
    await page.waitForFunction(() => document.querySelector('.mn-prova-opt'), { timeout: 10000 });
  }

  const finish = async () => {
    for (let i = 0; i < 20; i++) {
      if (await bodyHas('O Sábio pergunta') || await bodyHas('Entregar')) return true;
      const waiting = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever/.test(el.textContent || ''));
        return Boolean(b && b.disabled);
      });
      if (waiting) {
        await page.waitForFunction(() => {
          const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever/.test(el.textContent || ''));
          return b && !b.disabled;
        }, { timeout: 16000 });
        if (!(await clickLabel('Escrever'))) await clickLabel('Próxima');
        await sleep(500);
        if (await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')))) {
          await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
          await sleep(400);
        }
        continue;
      }
      if (await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')))) {
        await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
        await sleep(400);
      }
    }
    return bodyHas('Entregar');
  };

  if (await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')))) {
    await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
    await sleep(400);
  }
  const reached = await finish();
  if (!reached) throw new Error('não chegou na reflexão');
  const box = await page.$('textarea');
  if (box) {
    await box.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('textarea', 'No recreio eu espero o amigo chutar antes de gritar com o juiz do jogo.');
  }
  await sleep(400);
  await shot('02-reflexao-voltar-1280', 1280, 720);
  await shot('02-reflexao-voltar-1920', 1920, 1080);

  await clickLabel('Voltar à Vila');
  await sleep(1200);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 40000 });
  await sleep(2000);
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => (
    document.body.innerText.includes('Escrever para o Sábio')
    || document.body.innerText.includes('As oito respostas')
    || document.body.innerText.includes('O Sábio pergunta')
    || document.body.innerText.includes('Entregar')
  ), { timeout: 40000 });
  if (await bodyHas('Escrever para o Sábio')) await clickLabel('Escrever para o Sábio');
  await sleep(700);
  await shot('03-reflexao-restaurada-1280', 1280, 720);
  await shot('03-reflexao-restaurada-1920', 1920, 1080);
} finally {
  await browser.close();
}
