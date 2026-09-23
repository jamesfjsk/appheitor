// Conta de teste. SHOT_ONLY=closed só fotografa a prova já fechada.
// Sem isso, regenera o dia (chama a IA) se a prova ainda não estiver concluída.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5174';
const DATE = '2026-09-23';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];
page.on('console', (msg) => {
  const t = msg.text();
  if (/DailyQuiz|quizBank|erro/i.test(t)) logs.push(t.slice(0, 240));
});

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const shot = async (name, w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(400);
  await page.screenshot({ path: path.join(root, `${name}.png`) });
  console.log('foto', name);
};

const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

try {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  page.on('pageerror', (err) => console.log('pageerror', String(err).slice(0, 400)));
  await page.goto(`${BASE}/flash?d=${DATE}&h=10&quiz=regen`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 20000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 30000 });
    await sleep(2000);
  }
  await page.goto(`${BASE}/flash?d=${DATE}&h=10&quiz=regen`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 60000 });
  } catch (error) {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log('sem vila:\n', text);
    await page.screenshot({ path: path.join(root, 'falha-vila.png') });
    throw error;
  }
  if (process.env.SHOT_ONLY === 'closed') {
    await page.goto(`${BASE}/flash?d=${DATE}&h=10`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 60000 });
    await sleep(1500);
    await page.click('[data-testid="hotbar-mine"]');
    await page.waitForFunction(() => document.body.innerText.includes('A prova de hoje fechou') || document.body.innerText.includes('Li sua reflexão'), { timeout: 40000 });
    await shot('04-fechou-1280', 1280, 720);
    await shot('04-fechou-1920', 1920, 1080);
    const text = await page.evaluate(() => {
      const modal = document.querySelector('.mn-prova-sheet');
      return modal ? modal.innerText : document.body.innerText.slice(0, 500);
    });
    console.log('frame:\n', text);
    await browser.close();
    process.exit(0);
  }
  console.log('esperando a prova nova');
  await page.waitForFunction(() => {
    const q = window.__lastQuiz;
    return Boolean(window.__quizEpoch >= 1 && q && q.theme && q.theme.angle && q.theme.depth);
  }, { timeout: 180000 });
  const theme = await page.evaluate(() => {
    const q = window.__lastQuiz;
    return { title: q.theme.title, angle: q.theme.angle, depth: q.theme.depth, lesson: q.theme.lesson, prompt: q.reflectionPrompt };
  });
  console.log('tema', theme.title);
  console.log('angulo', theme.angle);
  console.log('profundidade', theme.depth);
  console.log('perguntas', await page.evaluate(() => (window.__lastQuiz.questions || []).length));

  await page.goto(`${BASE}/flash?d=${DATE}&h=10`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 60000 });
  } catch (error) {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log('sem vila na segunda entrada:\n', text);
    await page.screenshot({ path: path.join(root, 'falha-vila-2.png') });
    throw error;
  }
  await sleep(1500);
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => document.body.innerText.includes('Abrir a mesa') || document.body.innerText.includes('Escrever para o Sábio'), { timeout: 40000 });
  await shot('01-convite-1280', 1280, 720);
  await shot('01-convite-1920', 1920, 1080);
  await clickLabel('Abrir a mesa');
  await sleep(500);
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar'));
    return b && !b.disabled;
  }, { timeout: 40000 });
  await clickLabel('Começar');
  await page.waitForFunction(() => document.querySelector('.mn-prova-opt'), { timeout: 10000 });
  await shot('02-pergunta-1280', 1280, 720);
  await shot('02-pergunta-1920', 1920, 1080);

  for (let i = 0; i < 12; i++) {
    if (await bodyHas('O Sábio pergunta') || await bodyHas('Entregar')) break;
    if (await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')))) {
      await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
      await sleep(300);
    }
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever/.test(el.textContent || ''));
      return b && !b.disabled;
    }, { timeout: 20000 });
    if (!(await clickLabel('Escrever'))) await clickLabel('Próxima');
    await sleep(400);
  }
  if (!(await bodyHas('Entregar'))) throw new Error('não chegou na reflexão');

  const line = 'Os rios voadores trazem a chuva da Amazônia até São Paulo, então cuidar da floresta muda a água da cidade onde eu moro.';
  const box = await page.$('textarea');
  if (!box) throw new Error('sem campo da reflexão');
  await box.click();
  await page.type('textarea', line);
  await sleep(300);
  await shot('03-reflexao-1280', 1280, 720);
  await shot('03-reflexao-1920', 1920, 1080);
  await clickLabel('Entregar');
  try {
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return t.includes('O Sábio leu') || t.includes('A prova de hoje fechou') || t.includes('A mesa não gravou') || t.includes('não está pronta');
    }, { timeout: 90000 });
  } catch (error) {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 1200));
    console.log('tela na hora do erro:\n', text);
    throw error;
  }
  await sleep(800);
  await shot('04-fechou-1280', 1280, 720);
  await shot('04-fechou-1920', 1920, 1080);
  const closed = await bodyHas('A mesa não gravou');
  console.log(closed ? 'FALHOU ao gravar' : 'prova fechou');
  if (logs.length) console.log('console', logs.join(' | '));
} finally {
  await browser.close();
}
