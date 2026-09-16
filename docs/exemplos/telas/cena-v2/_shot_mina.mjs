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
page.on('pageerror', (err) => console.error('pageerror', err.message));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

try {
  await page.goto(`${BASE}/login?dev=minerar`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2500));
  const loginBtn = (await page.$('[data-testid="login-teste"]'))
    || (await page.$('[data-testid="login-heitor"]'));
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-heitor"]'), { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  for (let i = 0; i < 4; i += 1) {
    await new Promise((r) => setTimeout(r, 400));
    await clickLabel('Mais tarde');
  }

  const clickedMina = await page.click('[data-testid="hotbar-mine"]');
  console.log('hotbar-mina', Boolean(clickedMina));
  await page.waitForSelector('[data-testid="english-base"]', { timeout: 20000 });
  await page.waitForFunction(() => /Jogos de hoje/.test(document.body.innerText), { timeout: 25000 });
  await new Promise((r) => setTimeout(r, 800));

  const probe = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      titleMina: /Mina/.test(t),
      jogos: /Jogos de hoje/.test(t),
      contratos: /Contratos/.test(t),
      baseNivel: /Base nível/.test(t),
      quadroCta: /Quadro de contratos/.test(t),
      construirGrid: /Custo do nível/.test(t),
      abrir: /Abrir/.test(t),
    };
  });
  console.log('probe', JSON.stringify(probe));
  await page.screenshot({ path: path.join(dir, 'mina-jogos.png') });
  console.log('mina-jogos');

  await page.click('button[aria-label="Fechar"]');
  await new Promise((r) => setTimeout(r, 500));

  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + (196 / 1280) * rect.width, y: rect.top + (250 / 640) * rect.height };
  });
  await page.mouse.click(box.x, box.y);
  await page.waitForFunction(() => /Fornalha|Melhorar|Construir/.test(document.body.innerText), { timeout: 8000 });
  const lot = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      melhorar: /Melhorar/.test(t),
      construir: /\bCONSTRUIR\b/.test(t) || /\bConstruir\b/.test(t),
    };
  });
  console.log('lote', JSON.stringify(lot));
  await page.screenshot({ path: path.join(dir, 'mina-lote-fornalha.png') });
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
