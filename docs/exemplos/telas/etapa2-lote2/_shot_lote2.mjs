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
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(30000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  await sleep(800);
  await clickLabel('Mais tarde');
  await sleep(400);
  await clickLabel('Mais tarde');
  await sleep(400);
};

const loginTeste = async () => {
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(800);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(2500);
  }
};

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name);
};

const clickCanvas = async (nx, ny) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * nx, box.y + box.h * ny);
};

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await loginTeste();
  await dismissQuiz();
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await dismissQuiz();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 20000 });
  await sleep(1200);
  await shot('01-vila-manha');

  await clickLabel('Missões');
  await sleep(1200);
  await shot('02-casa-missoes');
  await clickLabel('Plano do turno');
  await sleep(800);
  await shot('03-plano-turno');
  await clickLabel('Começar o turno');
  await sleep(1200);
  await shot('04-plano-gravado');
  await page.keyboard.press('Escape');
  await sleep(400);

  await clickLabel('Missões');
  await sleep(800);
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('input')].find((el) => (el.getAttribute('placeholder') || '').includes('título'));
    if (!input) return false;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    proto.set.call(input, 'Ler dez páginas');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  const enviar = await page.$('[data-testid="enviar-missao-propria"]');
  if (enviar) await enviar.click();
  else await clickLabel('Enviar');
  await sleep(1800);
  await shot('05-missao-propria');
  await page.keyboard.press('Escape');
  await sleep(400);

  await page.goto(`${BASE}/flash?h=21`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await dismissQuiz();
  await shot('06-dia-fechado-noite');
  await clickLabel('Missões');
  await sleep(800);
  await clickLabel('Fechar o dia');
  await sleep(800);
  await shot('07-fechar-o-dia');
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('input')].find((el) => (el.getAttribute('placeholder') || '').includes('três palavras'));
    if (!input) return false;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    proto.set.call(input, 'estudar prova de matemática');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  const fechar = await page.$('[data-testid="fechar-dia-btn"]');
  if (fechar) await fechar.click();
  await sleep(1800);
  await shot('08-dia-fechado-checkin');
  await page.keyboard.press('Escape');
  await sleep(400);

  const torre = await page.$('button[title="Torre"]');
  if (torre) await torre.click();
  else await clickCanvas(0.86, 0.16);
  await sleep(1200);
  await shot('09-torre-conquistas');
  await clickLabel('Recordes');
  await sleep(400);
  await shot('10-torre-recordes');
  await clickLabel('Troféus');
  await sleep(400);
  await shot('11-torre-trofeus');
  await clickLabel('Mapa');
  await sleep(400);
  await shot('12-torre-mapa');
  await clickLabel('Histórias');
  await sleep(400);
  await shot('13-torre-historias');
  await page.keyboard.press('Escape');
  await sleep(400);

  // Sábio à noite: npcSpots.sabio.night 1020,250; clique no peito do sprite
  await clickCanvas(0.80, 0.33);
  await sleep(900);
  await shot('14-fala-npc');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
