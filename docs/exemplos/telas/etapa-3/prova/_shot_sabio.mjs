import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';
const DATE = process.env.SHOT_DATE || '2028-06-11';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(90000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('mm_sound', '0');
});

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const shot = async (name, w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(120);
  await page.screenshot({ path: path.join(root, `${name}.png`) });
  console.log(name, Date.now());
};

const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const url = `${BASE}/flash?d=${DATE}&h=10&quiz=lock`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 20000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await sleep(2000);
  }
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 40000 });
  await sleep(1500);

  await page.click('[data-testid="hotbar-mine"]');
  try {
    await page.waitForSelector('[aria-label="Prova do dia"]', { timeout: 30000 });
  } catch (e) {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 1200));
    console.error('não abriu a prova\n', text);
    throw e;
  }
  const quizText = () => page.evaluate(() => document.querySelector('[aria-label="Prova do dia"]')?.innerText || '');
  await sleep(800);
  const opened = await quizText();
  const hud = await page.evaluate(() => document.body.innerText.match(/\d{2}\/\d{2}/)?.[0] || '');
  console.log('url', page.url(), 'hud', hud);
  console.log('prova aberta:\n', opened.slice(0, 400));
  if (opened.includes('já leu') && opened.includes('fechou')) {
    throw new Error(`prova desta data já fechou (${hud})`);
  }
  if (await bodyHas('ainda escreve') || await bodyHas('Escrevendo')) {
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return t.includes('Abrir a mesa') || t.includes('Tentar de novo') || t.includes('Escrever para o Sábio');
    }, { timeout: 90000 });
  }

  if (await bodyHas('Prova do dia') && !(await bodyHas('Abrir a mesa')) && !(await bodyHas('Escrever para o Sábio'))) {
    await clickLabel('Prova do dia');
    await sleep(600);
  }
  if (await bodyHas('Escrever para o Sábio')) await clickLabel('Escrever para o Sábio');
  else if (await bodyHas('Abrir a mesa')) await clickLabel('Abrir a mesa');
  await sleep(400);

  if (await bodyHas('Começar')) {
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar'));
      return b && !b.disabled;
    }, { timeout: 40000 });
    await clickLabel('Começar');
    await page.waitForFunction(() => document.querySelector('.mn-prova-opt'), { timeout: 15000 });
  }

  for (let i = 0; i < 24; i++) {
    if (await bodyHas('Entregar') || await bodyHas('O Sábio pergunta')) break;
    const opt = await page.$('.mn-prova-opt');
    if (opt) {
      await opt.click();
      await sleep(250);
    }
    const waiting = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever/.test(el.textContent || ''));
      return Boolean(b && b.disabled);
    });
    if (waiting) {
      await page.waitForFunction(() => {
        const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever/.test(el.textContent || ''));
        return b && !b.disabled;
      }, { timeout: 20000 });
    }
    if (!(await clickLabel('Escrever'))) await clickLabel('Próxima');
    await sleep(350);
  }

  await page.waitForSelector('textarea', { timeout: 15000 });
  const box = await page.$('textarea');
  await box.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('textarea', 'No recreio eu espero o amigo chutar antes de gritar com o juiz do jogo.');
  await sleep(300);
  const enabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === 'Entregar');
    return Boolean(b && !b.disabled);
  });
  if (!enabled) {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 800));
    throw new Error(`Entregar travado\n${text}`);
  }

  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const t0 = Date.now();
  await clickLabel('Entregar');
  await page.waitForSelector('[data-sage="0"]', { timeout: 4000 });
  await page.screenshot({ path: path.join(root, 'sabio-0-1280.png') });
  console.log('sabio-0-1280', Date.now() - t0);
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.screenshot({ path: path.join(root, 'sabio-0-1920.png') });
  console.log('sabio-0-1920', Date.now() - t0);

  const wait2 = 2000 - (Date.now() - t0);
  if (wait2 > 0) await sleep(wait2);
  const sageAt2 = await page.evaluate(() => document.querySelector('[data-sage]')?.getAttribute('data-sage'));
  await page.screenshot({ path: path.join(root, 'sabio-2-1920.png') });
  console.log('sabio-2-1920', Date.now() - t0, 'sage', sageAt2);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.screenshot({ path: path.join(root, 'sabio-2-1280.png') });
  console.log('sabio-2-1280', Date.now() - t0);

  await page.waitForSelector('[data-sage="verdict"]', { timeout: 25000 });
  await page.screenshot({ path: path.join(root, 'sabio-veredito-1280.png') });
  console.log('sabio-veredito-1280', Date.now() - t0);
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.screenshot({ path: path.join(root, 'sabio-veredito-1920.png') });
  console.log('sabio-veredito-1920', Date.now() - t0);
} finally {
  await browser.close();
}
