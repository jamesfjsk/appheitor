import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174';

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

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name);
};

try {
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(800);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(2500);
  }
  await dismissQuiz();
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await dismissQuiz();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 20000 });
  await sleep(1500);
  await shot('01-vila');

  await clickLabel('Missões');
  await sleep(1200);
  await shot('02-casa');
  await clickLabel('Linha do dia');
  await sleep(600);
  await shot('03-casa-linha');
  await page.keyboard.press('Escape');
  await sleep(400);

  await clickLabel('Mercado');
  await sleep(1200);
  await shot('04-mercado');
  await page.keyboard.press('Escape');
  await sleep(400);

  await page.keyboard.press('KeyA');
  await sleep(1000);
  await shot('05-agenda');
  await page.keyboard.press('Escape');
  await sleep(400);

  const gold = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => el.getAttribute('title') === 'Extrato');
    if (!b) return false;
    b.click();
    return true;
  });
  await sleep(1200);
  await shot('06-banco');
  if (gold) {
    await clickLabel('Cofrinho');
    await sleep(600);
    const filled = await page.evaluate(() => {
      const input = [...document.querySelectorAll('input')].find((el) => el.getAttribute('placeholder') === 'Título');
      if (!input) return false;
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      proto.set.call(input, 'Pizza');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    if (filled) {
      await clickLabel('Criar meta');
      await sleep(1500);
      await shot('07-meta-criada');
      await clickLabel('20');
      await sleep(200);
      await clickLabel('Guardar');
      await sleep(1500);
      await shot('08-deposito');
    }
    await clickLabel('Extrato');
    await sleep(800);
    await shot('09-extrato');
  }
  await page.keyboard.press('Escape');
  await sleep(400);

  await page.goto(`${BASE}/flash?h=19`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await dismissQuiz();
  await shot('10-vila-noite');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
