import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(root, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';
const DATES = (process.env.SHOT_DATES || '').split(',').map((d) => d.trim()).filter(Boolean);
if (DATES.length === 0 || DATES.length > 3) {
  console.error('SHOT_DATES precisa ter 1 a 3 datas do aceite. Nada de lote.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 420000,
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(180000);
page.on('console', (msg) => {
  const t = msg.text();
  if (/aiDailyQuiz|DailyQuiz|OpenAI|revisor|offline|FirebaseError/.test(t)) console.log('page:', t.slice(0, 300));
});
page.on('pageerror', (err) => console.log('pageerror:', String(err).slice(0, 300)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/flash?d=${DATES[0]}&h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await sleep(2000);
  }

  const dumps = [];
  for (const date of DATES) {
    console.log('gerar', date);
    await page.evaluate(() => { window.__lastQuiz = null; window.__quizEpoch = 0; });
    await page.goto(`${BASE}/flash?d=${date}&h=10&quiz=regen`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 40000 });
    await page.waitForFunction((expected) => {
      const q = window.__lastQuiz;
      return Boolean(window.__quizEpoch > 0 && q && q.date === expected && q.sanitize);
    }, { timeout: 300000 }, date);
    const quiz = await page.evaluate(() => window.__lastQuiz);
    dumps.push(quiz);
    writeFileSync(path.join(root, `${date}.json`), JSON.stringify(quiz, null, 2));
    console.log(date, quiz.source, quiz.theme?.title, 'sanitize', JSON.stringify(quiz.sanitize));

    await page.click('[data-testid="hotbar-mine"]');
    await page.waitForFunction(
      () => document.body.innerText.includes('Abrir a mesa') || document.body.innerText.includes('Escrever para o Sábio') || document.body.innerText.includes('Começar'),
      { timeout: 40000 },
    );
    if (await page.evaluate(() => document.body.innerText.includes('Escrever para o Sábio'))) {
      await clickLabel('Escrever para o Sábio');
    } else if (await page.evaluate(() => document.body.innerText.includes('Abrir a mesa'))) {
      await clickLabel('Abrir a mesa');
    }
    await sleep(800);
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await sleep(300);
    await page.screenshot({ path: path.join(root, `${date}-1280.png`) });
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await sleep(300);
    await page.screenshot({ path: path.join(root, `${date}-1920.png`) });
    await page.keyboard.press('Escape');
    await sleep(400);
  }
  writeFileSync(path.join(root, process.env.SHOT_BUNDLE || 'tres-provas.json'), JSON.stringify(dumps, null, 2));
  console.log('ok', dumps.length);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
