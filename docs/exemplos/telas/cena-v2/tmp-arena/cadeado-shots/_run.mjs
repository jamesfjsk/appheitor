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
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

try {
  await page.goto(`${BASE}/flash?h=14&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1400);
  }
  for (let i = 0; i < 8; i++) {
    await clickLabel('Mais tarde');
    await sleep(120);
  }
  await page.goto(`${BASE}/flash?h=14&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  for (let i = 0; i < 6; i++) {
    await clickLabel('Mais tarde');
    await sleep(100);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(800);
  console.log('href', page.url());
  const hot = await page.evaluate(() => {
    const mine = document.querySelector('[data-testid="hotbar-mine"]');
    const market = document.querySelector('[data-testid="hotbar-market"]');
    const pack = document.querySelector('[data-testid="hotbar-pack"]');
    return {
      mineLock: mine?.classList.contains('is-lock') || false,
      marketLock: market?.classList.contains('is-lock') || false,
      packLock: pack?.classList.contains('is-lock') || false,
      lucide: [...document.querySelectorAll('.mn-dock-nav svg')].some((svg) => /lock/i.test(svg.innerHTML + svg.className.baseVal)),
      mineTitle: mine?.getAttribute('title') || '',
      mineText: mine?.textContent || '',
    };
  });
  console.log('hotbar', JSON.stringify(hot));
  await page.screenshot({ path: path.join(dir, '01-dia.png') });
  const canvas = await page.$('canvas[aria-label="Vila"]');
  const box = await canvas.boundingBox();
  const to = (x, y) => ({ x: box.x + (x / 1280) * box.width, y: box.y + (y / 640) * box.height });
  const mine = to(650, 90);
  await page.mouse.move(mine.x, mine.y);
  await sleep(400);
  await page.screenshot({ path: path.join(dir, '02-hover-mina.png') });
  const house = to(1000, 180);
  await page.mouse.move(house.x, house.y);
  await sleep(400);
  await page.screenshot({ path: path.join(dir, '03-hover-casa.png') });
  await page.click('[data-testid="hotbar-mine"]');
  await sleep(700);
  const openedQuiz = await page.evaluate(() => /prova|Mais tarde|Começar/i.test(document.body.innerText || ''));
  console.log('click mina abre prova', openedQuiz);
  await page.screenshot({ path: path.join(dir, '05-click-mina.png') });
  await clickLabel('Mais tarde');
  await sleep(300);
  await page.goto(`${BASE}/flash?h=18&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await sleep(800);
  for (let i = 0; i < 6; i++) {
    await clickLabel('Mais tarde');
    await sleep(100);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 15000 });
  await sleep(800);
  await page.screenshot({ path: path.join(dir, '04-noite.png') });
  console.log('ok', dir);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
