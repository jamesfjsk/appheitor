import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { connect } from '../../../../../scripts/lib/firestore-rest.cjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'docs/exemplos/telas/etapa-3/pacote-11';
const uid = 'DydxTQ0cGEbX46LLlQxxD123pQD3';
mkdirSync(OUT, { recursive: true });

const db = await connect();
const quiz = await db.get(`dailyQuizzes/${uid}_2026-12-10`);
const questions = quiz.data.questions;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1440,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(120000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name, w, h) {
  await page.setViewport({ width: w, height: h });
  await sleep(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}

try {
  await page.goto('http://localhost:5174/flash', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  await page.goto('http://localhost:5174/flash?d=2026-12-10&h=10', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]');
  await page.click('[data-testid="login-teste"]');
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'));
  await sleep(1200);
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Abrir a mesa|Começar|Escrever/.test(b.textContent || '')));
  const open = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Abrir a mesa/.test(x.textContent || ''));
    if (b) { b.click(); return 'mesa'; }
    return 'ja';
  });
  console.log('open', open);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Começar') && !b.disabled), { timeout: 40000 });
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Começar'))?.click());
  await page.waitForSelector('.mn-prova-opt');

  const math = questions.findIndex((q) => q.skill === 'MAT.OP2');
  const fact = questions.findIndex((q) => q.skill === 'HIS.FATO' || q.skill === 'LIC.IDEIA');
  console.log('math', math, 'fact', fact, questions.map((q) => q.skill).join(','));

  const answerOne = async (index, wrong) => {
    while (true) {
      const step = await page.$eval('.mn-papiro-title, h3.mn-papiro-title', (el) => el.textContent || '').catch(() => '');
      const n = await page.evaluate(() => {
        const k = document.body.innerText.match(/(\d+) de \d+/);
        return k ? Number(k[1]) - 1 : 0;
      });
      if (n === index) break;
      const q = questions[n];
      const pick = q.options[q.answer === q.options[0] ? 1 : 0];
      await page.evaluate((text) => {
        const b = [...document.querySelectorAll('.mn-prova-opt')].find((el) => el.textContent?.includes(text));
        b?.click();
      }, q.options[q.answer]);
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Próxima|Escrever/.test(b.textContent || '') && !b.disabled), { timeout: 20000 });
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Próxima|Escrever/.test(b.textContent || ''))?.click());
      await sleep(400);
      if (n > index) break;
    }
  };

  // walk until the math question, answering correctly and quickly after the gate
  for (let n = 0; n < math; n++) {
    const q = questions[n];
    await page.waitForSelector('.mn-prova-opt:not([disabled])', { timeout: 20000 });
    await page.evaluate((text) => {
      const b = [...document.querySelectorAll('.mn-prova-opt')].find((el) => (el.textContent || '').includes(text));
      if (b && !b.disabled) b.click();
    }, q.options.find((o) => o === q.answer) || q.answer);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Próxima/.test(b.textContent || '') && !b.disabled), { timeout: 25000 });
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Próxima/.test(b.textContent || ''))?.click());
    await sleep(500);
  }

  const q = questions[math];
  const wrong = q.options.find((o) => o !== q.answer);
  await page.waitForSelector('.mn-prova-opt:not([disabled])');
  await page.evaluate((text) => {
    [...document.querySelectorAll('.mn-prova-opt')].find((el) => (el.textContent || '').includes(text))?.click();
  }, wrong);
  await page.waitForSelector('[data-testid="quiz-nudge"]');
  await shot('aviso-1280', 1280, 720);
  await shot('aviso-1920', 1920, 1080);
  await page.waitForFunction(() => [...document.querySelectorAll('.mn-prova-opt')].some((el) => !el.disabled && !(el.textContent || '').includes(arguments[0])), { timeout: 20000 }, wrong);
  await page.evaluate((text) => {
    [...document.querySelectorAll('.mn-prova-opt')].find((el) => (el.textContent || '').includes(text) && !el.disabled)?.click();
  }, q.answer);
  await page.waitForSelector('[data-testid="quiz-explain"]');
  await shot('segunda-1280', 1280, 720);
  await shot('segunda-1920', 1920, 1080);
  console.log('math done');
} catch (e) {
  console.error('FALHOU', e.message);
  await page.screenshot({ path: `${OUT}/erro.png` }).catch(() => {});
} finally {
  await browser.close();
}
