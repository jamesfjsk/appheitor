import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5173';
const DATE = process.env.SHOT_DATE || '2026-09-23';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(40000);
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const clickScene = async (sx, sy) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + (sx / 1280) * box.w, box.y + (sy / 640) * box.h);
};

const shot = async (name, w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(400);
  const dest = path.join(root, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name);
};

const openQuiz = async () => {
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => document.body.innerText.includes('Abrir a mesa'), { timeout: 40000 });
};

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/flash?d=${DATE}&h=10&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(600);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await sleep(2500);
  }
  await page.goto(`${BASE}/flash?d=${DATE}&h=10&quiz=lock`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 40000 });
  } catch (err) {
    await page.screenshot({ path: path.join(root, '_fail.png') });
    const body = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.error('sem vila', body);
    throw err;
  }
  await sleep(2000);

  await openQuiz();
  await shot('00-convite-1280', 1280, 720);
  await shot('00-convite-1920', 1920, 1080);
  await clickLabel('Abrir a mesa');
  await sleep(800);
  await page.waitForFunction(() => document.body.innerText.includes('Começar'), { timeout: 20000 });
  await sleep(10000);
  await shot('01-licao-anel-1280', 1280, 720);
  await shot('01-licao-anel-1920', 1920, 1080);

  await sleep(22000);
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar'));
    return b && !b.disabled;
  }, { timeout: 8000 });
  await clickLabel('Começar');
  await sleep(800);
  await page.waitForFunction(() => document.querySelector('.mn-prova-opt'), { timeout: 10000 });
  await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.mn-prova-opt')];
    (opts[opts.length - 1] || opts[0])?.click();
  });
  await sleep(1800);
  await shot('02-proxima-travada-1280', 1280, 720);
  await shot('02-proxima-travada-1920', 1920, 1080);

  const finish = async () => {
    for (let i = 0; i < 12; i++) {
      const done = await page.evaluate(() => document.body.innerText.includes('Concluir a prova'));
      if (done) return true;
      const waiting = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Ver a nota/.test(el.textContent || ''));
        return Boolean(b && b.disabled);
      });
      if (waiting) {
        await page.waitForFunction(() => {
          const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Ver a nota/.test(el.textContent || ''));
          return b && !b.disabled;
        }, { timeout: 16000 });
        if (!(await clickLabel('Ver a nota'))) await clickLabel('Próxima');
        await sleep(600);
        const onQ = await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')));
        if (onQ) {
          await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
          await sleep(500);
        }
        continue;
      }
      const onQ = await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')));
      if (onQ) {
        await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
        await sleep(400);
      }
    }
    return page.evaluate(() => document.body.innerText.includes('Concluir a prova'));
  };

  const reached = await finish();
  if (!reached) throw new Error('não chegou na reflexão');
  await page.type('textarea', 'Eu acho que o time ganha quando cada um espera a sua vez e ajuda o amigo no campo hoje.');
  await sleep(500);
  await shot('03-reflexao-1280', 1280, 720);
  await shot('03-reflexao-1920', 1920, 1080);
} finally {
  await browser.close();
}
