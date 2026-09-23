// Conta de teste. Fotos do pacote 10c. O script sobe a Torre para 3 e o capítulo do Sábio
// só durante as fotos, e devolve os dois no fim.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const { connect } = require('../../../../../scripts/lib/firestore-rest.cjs');

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5174';
const UID = 'DydxTQ0cGEbX46LLlQxxD123pQD3';

const api = await connect();
const baseDoc = await api.get(`englishBase/${UID}`);
const villageDoc = await api.get(`village/${UID}`);
const buildings = { ...baseDoc.data.buildings };
const npcs = JSON.parse(JSON.stringify(villageDoc.data.npcs));
const sabio = { ...npcs.sabio, quest: { ...npcs.sabio.quest } };

await api.patch(`englishBase/${UID}`, { buildings: { ...buildings, torre: 3 } }, ['buildings']);
npcs.sabio = { ...sabio, tier: 4, quest: { ...sabio.quest, chapter: 3 } };
await api.patch(`village/${UID}`, { npcs }, ['npcs']);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(25000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const shot = async (name, w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(500);
  await page.screenshot({ path: path.join(root, `${name}.png`) });
  console.log('foto', name);
};

const clickScene = async (sx, sy) => {
  const canvas = await page.$('canvas[aria-label="Vila"]');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + (sx / 1280) * box.width, box.y + (sy / 640) * box.height);
};

const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  page.on('pageerror', (err) => console.log('pageerror', String(err).slice(0, 300)));
  await page.goto(`${BASE}/flash?d=2026-09-23&h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="login-teste"]') || document.querySelector('canvas[aria-label="Vila"]'),
    { timeout: 20000 },
  );
  if (await page.$('[data-testid="login-teste"]')) {
    await page.click('[data-testid="login-teste"]');
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 40000 });
  }
  await sleep(1200);

  await clickScene(768, 265);
  await page.waitForFunction(() => document.body.innerText.includes('Você conta ao Sábio os livros que termina.'), { timeout: 12000 });
  if (await bodyHas('Tema de amanhã')) throw new Error('o campo Tema de amanhã ainda está no cartão');
  if (!(await bodyHas('Ainda em obra'))) throw new Error('faltou Ainda em obra no cartão da Biblioteca');
  await shot('01-biblioteca-1280', 1280, 720);
  await shot('01-biblioteca-1920', 1920, 1080);

  await page.keyboard.press('Escape');
  await sleep(400);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return t.includes('Quadro') || t.includes('Contrato') || t.includes('Mina') || t.includes('Recado');
  }, { timeout: 20000 });
  await sleep(800);
  if (await bodyHas('história de amanhã') || await bodyHas('Tema de amanhã')) throw new Error('o tema de amanhã ainda está na Mina');
  await shot('02-mina-1280', 1280, 720);
  await shot('02-mina-1920', 1920, 1080);

  await page.keyboard.press('Escape');
  await sleep(500);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await clickScene(1109, 104);
  await page.waitForFunction(() => document.body.innerText.includes('Abrir a Torre'), { timeout: 12000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Abrir a Torre'));
    b?.click();
  });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((el) => (el.textContent || '').includes('Histórias')), { timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === 'Histórias');
    b?.click();
  });
  await sleep(400);
  const pedidos = await page.evaluate(() => document.body.innerText);
  if (!pedidos.includes('Conte um livro para o Sábio') || !pedidos.includes('Todas')) {
    console.log(pedidos.slice(0, 900));
    throw new Error('pedidos do Sábio não apareceram');
  }
  await shot('03-sabio-1280', 1280, 720);
  await shot('03-sabio-1920', 1920, 1080);
  console.log('frame lido: biblioteca, mina e pedidos do Sábio');
} finally {
  await browser.close();
  await api.patch(`englishBase/${UID}`, { buildings }, ['buildings']);
  npcs.sabio = sabio;
  await api.patch(`village/${UID}`, { npcs }, ['npcs']);
  const back = await api.get(`englishBase/${UID}`);
  const vback = await api.get(`village/${UID}`);
  console.log('devolvido torre', back.data.buildings.torre, 'sabio', vback.data.npcs.sabio.tier, vback.data.npcs.sabio.quest.chapter);
}
