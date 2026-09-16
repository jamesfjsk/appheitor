import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
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
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1500);
  }
  for (let i = 0; i < 12; i++) {
    await clickLabel('Mais tarde');
    await sleep(180);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(700);
  await page.screenshot({ path: path.join(dir, 'hud-vila.png') });
  console.log('hud-vila');

  await page.click('[data-testid="hotbar-missoes"]');
  await page.waitForSelector('button[aria-label="Fechar"]', { timeout: 8000 });
  await sleep(400);
  await page.screenshot({ path: path.join(dir, 'painel-casa.png') });
  console.log('painel-casa');
  await clickLabel('Plano do turno');
  await sleep(350);
  await page.screenshot({ path: path.join(dir, 'painel-plano.png') });
  console.log('painel-plano');
  await clickLabel('Fechar o dia');
  await sleep(350);
  await page.screenshot({ path: path.join(dir, 'painel-fechar.png') });
  console.log('painel-fechar');
  await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
  await page.waitForFunction(() => !document.querySelector('button[aria-label="Fechar"]'), { timeout: 5000 }).catch(() => {});
  await sleep(250);

  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * 0.155, box.y + box.h * 0.37);
  await page.waitForSelector('button[aria-label="Fechar"]', { timeout: 8000 });
  await sleep(400);
  await page.screenshot({ path: path.join(dir, 'cartao-fornalha.png') });
  console.log('cartao-fornalha');
  const oficina = await clickLabel('Oficina');
  if (!oficina) throw new Error('Oficina não achada');
  await page.waitForFunction(() => (document.body.innerText || '').includes('Ferraria'), { timeout: 8000 });
  await sleep(400);
  await page.screenshot({ path: path.join(dir, 'painel-oficina.png') });
  console.log('painel-oficina');
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, 'painel-erro.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
