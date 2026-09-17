import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-arena', 'pick-shots');
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(30000);
page.on('pageerror', (err) => console.error('pageerror', err.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === label || (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  for (let i = 0; i < 12; i++) {
    await clickLabel('Mais tarde');
    await sleep(180);
  }
};

const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log(name, dest);
};

const editorOpen = async () => page.evaluate(() => /Salvar visual|Salvo/.test(document.body.innerText || ''));

try {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1400);
  }
  await dismissQuiz();
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(800);

  await page.click('[data-testid="hotbar-pack"]').catch(() => {});
  await sleep(600);
  if (!(await editorOpen())) throw new Error('mochila nao abriu');
  await shot('00-ficha');

  await page.click('[aria-label="Picareta"]');
  await sleep(280);
  await shot('01-picareta-madeira');

  for (const [label, name] of [
    ['Picareta de pedra', '01b-pedra'],
    ['Picareta de ferro', '01c-ferro'],
    ['Picareta de ouro', '01d-ouro'],
    ['Picareta de diamante', '02-previa-diamante'],
  ]) {
    await page.click(`[aria-label="${label}"]`);
    await sleep(450);
    await shot(name);
  }

  const forge = await clickLabel('Ferraria');
  console.log('ferraria', forge);
  await sleep(700);
  await page.waitForFunction(() => /Forjar|Faltam|Nível/.test(document.body.innerText || ''), { timeout: 10000 });
  await shot('03-ferraria');

  const gold = await page.$('[aria-label="Picareta de ouro"]');
  if (gold) {
    await gold.click();
    await sleep(350);
    await shot('04-ferraria-ouro');
  }

  await page.keyboard.press('Escape');
  await sleep(300);
  await page.click('[data-testid="hotbar-mine"]').catch(() => {});
  await sleep(800);
  const mina = await page.$('[data-testid="english-base"]');
  if (mina) {
    await shot('05-mina');
  } else {
    console.log('mina nao abriu');
  }

  await page.keyboard.press('Escape');
  await sleep(250);
  await page.click('[data-testid="hotbar-missoes"]').catch(() => {});
  await sleep(500);
  await clickLabel('Iniciar missões');
  await sleep(500);
  await shot('06-missoes');
} catch (err) {
  console.error(err);
  await shot('zz-fail');
  process.exitCode = 1;
} finally {
  await browser.close();
}
