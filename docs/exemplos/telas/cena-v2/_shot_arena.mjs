import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(25000);
await page.setViewport({ width: 1280, height: 900 });

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const canvasPoint = async (px, py) => page.evaluate((x, y) => {
  const canvas = document.querySelector('canvas[aria-label="Vila"]');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    cx: rect.left + (x / 1280) * rect.width,
    cy: rect.top + (y / 640) * rect.height,
  };
}, px, py);

try {
  await page.goto(`${BASE}/login?dev=minerar&h=14`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]', { timeout: 40000 });
  await page.click('[data-testid="login-teste"]');
  await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
  await new Promise((r) => setTimeout(r, 1800));
  for (let i = 0; i < 12; i++) {
    await clickLabel('Mais tarde');
    await new Promise((r) => setTimeout(r, 280));
  }
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));

  const canvas = await page.$('canvas[aria-label="Vila"]');
  if (canvas) await canvas.screenshot({ path: path.join(dir, 'vila-muro.png') });

  const cercaHover = await canvasPoint(620, 555);
  if (cercaHover && canvas) {
    await page.mouse.move(cercaHover.cx, cercaHover.cy);
    await new Promise((r) => setTimeout(r, 400));
    await canvas.screenshot({ path: path.join(dir, 'vila-cerca.png') });
  }

  const reservaHover = await canvasPoint(513, 265);
  if (reservaHover && canvas) {
    await page.mouse.move(reservaHover.cx, reservaHover.cy);
    await new Promise((r) => setTimeout(r, 400));
    await canvas.screenshot({ path: path.join(dir, 'vila-reserva.png') });
  }

  const hover = await canvasPoint(1026, 398);
  if (hover) {
    await page.mouse.move(hover.cx, hover.cy);
    await new Promise((r) => setTimeout(r, 400));
    if (canvas) await canvas.screenshot({ path: path.join(dir, 'vila-arena-hover.png') });
    await page.mouse.click(hover.cx, hover.cy);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(dir, 'obra-arena.png') });
  }

  const houseSword = await canvasPoint(1018, 68);
  if (houseSword) {
    await page.mouse.move(houseSword.cx, houseSword.cy);
    await new Promise((r) => setTimeout(r, 250));
  }

  const body = await page.evaluate(() => document.body.innerText);
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()));
  console.log(JSON.stringify({
    title: /Arena/.test(body),
    breve: /Etapa 4B|ainda não abriu|coliseu/i.test(body),
    jogar: buttons.some((t) => /^Jogar/.test(t)),
    swordLabel: /Espada/.test(body),
    snippet: body.split('\n').filter((l) => /Arena|coliseu|xadrez|Etapa|Olheiro|Jogar|Espada/i.test(l)).slice(0, 16),
  }, null, 2));
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
