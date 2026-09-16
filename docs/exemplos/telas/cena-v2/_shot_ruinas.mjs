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
  await page.goto(`${BASE}/login?dev=minerar&crack=fornalha&h=14`, { waitUntil: 'domcontentloaded' });
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
  if (canvas) await canvas.screenshot({ path: path.join(dir, 'vila-ruinas.png') });

  const crop = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[aria-label="Vila"]');
    if (!canvas) return '';
    const out = document.createElement('canvas');
    out.width = 300;
    out.height = 240;
    const ctx = out.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 100, 140, 300, 240, 0, 0, 300, 240);
    return out.toDataURL('image/png');
  });
  if (crop.startsWith('data:')) {
    fs.writeFileSync(path.join(dir, 'vila-ruinas-fornalha.png'), Buffer.from(crop.split(',')[1], 'base64'));
  }

  const hover = await canvasPoint(198, 237);
  if (hover) {
    await page.mouse.move(hover.cx, hover.cy);
    await new Promise((r) => setTimeout(r, 400));
    if (canvas) await canvas.screenshot({ path: path.join(dir, 'vila-ruinas-hover.png') });
    await page.mouse.click(hover.cx, hover.cy);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(dir, 'obra-ruinas.png') });
  }

  const body = await page.evaluate(() => document.body.innerText);
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].map((el) => ({
    text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    disabled: el.disabled,
  })));
  const card = {
    arrumarAgora: buttons.some((b) => b.text.includes('Arrumar agora') && !b.disabled),
    arrumarMissoes: buttons.some((b) => b.text.includes('Arrumar com as missões')),
    missaoOff: buttons.some((b) => b.text.includes('Arrumar com as missões') && b.disabled),
    mina: /Ir para a Mina/.test(body),
    fundir: /Fundir/.test(body),
    ruinas: /Em ruínas/.test(body),
    beneficio: /benefício/.test(body),
    material: /Madeira|Pedra/.test(body),
  };

  const clicked = await clickLabel('Arrumar agora');
  await new Promise((r) => setTimeout(r, 900));
  const after = await page.evaluate(() => document.body.innerText);
  const afterCard = /Em ruínas/.test(after) && /Arrumar agora/.test(after);
  await page.screenshot({ path: path.join(dir, 'obra-arrumar.png') });
  if (afterCard) {
    await page.evaluate(() => document.querySelector('button[aria-label="Fechar"]')?.click());
    await new Promise((r) => setTimeout(r, 400));
  }
  const mine = await canvasPoint(650, 101);
  let mineOpen = false;
  if (mine) {
    await page.mouse.click(mine.cx, mine.cy);
    await new Promise((r) => setTimeout(r, 800));
    mineOpen = await page.evaluate(() => /Quadro de contratos|A Base|Mina/.test(document.body.innerText));
  }
  console.log(JSON.stringify({
    ruinas: /ruínas|caiu|Em ruínas/.test(body),
    rachada: /rachad/i.test(body),
    card,
    clicked,
    afterCard,
    toast: /Arrumou|Lote consertado/.test(after),
    mineOpen,
    snippet: body.split('\n').filter((l) => /ruín|caiu|Ferraria|Em ruínas|Arrumar|Mina|benefício|missão/i.test(l)).slice(0, 20),
  }, null, 2));
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
