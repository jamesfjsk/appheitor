import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174';

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

try {
  await page.goto(`${BASE}/login?dev=minerar`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]', { timeout: 40000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await clickLabel('Mais tarde');
  await new Promise((r) => setTimeout(r, 400));
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));
  const canvas = await page.$('canvas[aria-label="Vila"]');
  if (canvas) {
    await canvas.screenshot({ path: path.join(dir, 'vila-mapa.png') });
    console.log('vila-mapa');
    const hoverAt = await page.$eval('canvas[aria-label="Vila"]', (el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + (196 / 1280) * rect.width, y: rect.top + (250 / 640) * rect.height };
    });
    await page.mouse.move(hoverAt.x, hoverAt.y);
    await new Promise((r) => setTimeout(r, 1100));
    await canvas.screenshot({ path: path.join(dir, 'vila-mapa-hover.png') });
    console.log('hover');
  }
  await page.screenshot({ path: path.join(dir, 'vila-mapa-pagina.png') });
  console.log('pagina');

  const clickCanvas = async (px, py) => {
    const box = await page.$eval('canvas[aria-label="Vila"]', (el, x, y) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + (x / 1280) * rect.width, y: rect.top + (y / 640) * rect.height };
    }, px, py);
    await page.mouse.click(box.x, box.y);
  };

  await clickCanvas(196, 250);
  await new Promise((r) => setTimeout(r, 700));
  const ferraria = await page.evaluate(() => /Ferraria|Fornalha|Construir/.test(document.body.innerText));
  console.log('click-fornalha', ferraria);
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 300));

  await clickCanvas(512, 260);
  await new Promise((r) => setTimeout(r, 700));
  const cerca = await page.evaluate(() => /Cerca/.test(document.body.innerText));
  console.log('click-cerca', cerca);
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 300));

  await clickCanvas(764, 460);
  await new Promise((r) => setTimeout(r, 700));
  const mercado = await page.evaluate(() => /Mercado/.test(document.body.innerText));
  console.log('click-mercado', mercado);
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await new Promise((r) => setTimeout(r, 300));

  await clickCanvas(980, 155);
  await new Promise((r) => setTimeout(r, 700));
  const casa = await page.evaluate(() => /Casa do Minerador/.test(document.body.innerText));
  console.log('click-casa', casa);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
