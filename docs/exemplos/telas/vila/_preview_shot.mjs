import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.VILA_SHOT_URL || 'http://localhost:5174';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.setDefaultTimeout(25000);

const shot = async (name) => {
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
  console.log('foto', name);
};

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const dismissQuiz = async () => {
  await new Promise((r) => setTimeout(r, 800));
  await clickLabel('Mais tarde');
  try {
    await page.waitForFunction(
      () => !document.body.innerText.includes('A prova de hoje está pronta'),
      { timeout: 8000 },
    );
  } catch {
    await clickLabel('Mais tarde');
    await new Promise((r) => setTimeout(r, 600));
  }
};

const login = async () => {
  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2500));
  }
};

try {
  await login();
  await dismissQuiz();

  await page.goto(`${BASE}/flash?onboard=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('Crie seu minerador'), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));
  await shot('primeiro-acesso');

  await page.goto(`${BASE}/flash?h=11`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('Bom dia') || document.body.innerText.includes('Boa'), { timeout: 15000 });
  await dismissQuiz();
  await new Promise((r) => setTimeout(r, 500));
  await shot('vila-dia');

  await page.goto(`${BASE}/flash?h=22`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('Dica do turno') || document.body.innerText.includes('Bom') || document.body.innerText.includes('Boa'), { timeout: 15000 });
  await dismissQuiz();
  await shot('vila-noite');

  await page.goto(`${BASE}/flash?h=11&quiz=lock`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));
  await dismissQuiz();
  await shot('portao-prova');

  await page.goto(`${BASE}/flash?h=11`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));
  await dismissQuiz();
  await clickLabel('Baú do Dia');
  await new Promise((r) => setTimeout(r, 600));
  await shot('bau-fechado');
  await clickLabel('Fechar');

  await clickLabel('Oficina');
  await page.waitForFunction(() => document.body.innerText.includes('Fornalha'), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 400));
  await shot('oficina');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === 'Fechar');
    b?.click();
  });

  await clickLabel('Mercado');
  await page.waitForFunction(() => document.body.innerText.includes('Loja da Vila'), { timeout: 8000 });
  await clickLabel('Loja da Vila');
  await new Promise((r) => setTimeout(r, 500));
  await shot('mercado');
} catch (err) {
  console.error(err);
  await shot('revisao-erro');
  process.exitCode = 1;
} finally {
  await browser.close();
}
