import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(25000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);
const dismissQuiz = async () => {
  await sleep(500);
  await clickLabel('Mais tarde');
  await sleep(250);
  await clickLabel('Mais tarde');
};
const closeModal = async () => {
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.evaluate(() => {
    [...document.querySelectorAll('button[aria-label="Fechar"]')].pop()?.click();
  });
  await sleep(200);
};
const clickScene = async (sx, sy) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + (sx / 1280) * box.w, box.y + (sy / 640) * box.h);
};

try {
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await sleep(2000);
  }
  await dismissQuiz();

  for (const size of [
    { w: 1280, h: 720, folder: '720' },
    { w: 1920, h: 1080, folder: '1080' },
  ]) {
    const dir = path.join(root, size.folder);
    await page.setViewport({ width: size.w, height: size.h });
    const shot = async (name) => {
      await page.screenshot({ path: path.join(dir, `${name}.png`) });
      console.log(`${size.folder}/${name}`);
    };
    await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
    await sleep(1600);
    await dismissQuiz();
    await page.waitForSelector('canvas[aria-label="Vila"]');
    await sleep(800);
    await shot('01-vila');
    await clickLabel('Missões');
    await sleep(800);
    await shot('03-casa-missoes');
    await closeModal();
    await clickScene(764, 459);
    await sleep(800);
    await shot('14-mercado-cartao');
    await closeModal();
    await closeModal();
    await clickLabel('Mais tarde');
    await sleep(300);
    await clickScene(640, 552);
    await sleep(800);
    await shot('18-cerca-cartao');
    await closeModal();
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
