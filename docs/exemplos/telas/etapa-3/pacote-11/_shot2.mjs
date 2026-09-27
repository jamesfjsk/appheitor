import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { connect } from '../../../../../scripts/lib/firestore-rest.cjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'docs/exemplos/telas/etapa-3/pacote-11';
const uid = 'DydxTQ0cGEbX46LLlQxxD123pQD3';
mkdirSync(OUT, { recursive: true });
const db = await connect();
const quiz = await db.get(`dailyQuizzes/${uid}_2026-12-10`);
await db.patch(`dailyQuizzes/${uid}_2026-12-10`, { awaitingReflection: false });
const questions = quiz.data.questions;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
page.setDefaultTimeout(90000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}
async function clickText(re) {
  await page.evaluate((source) => {
    const b = [...document.querySelectorAll('button')].find((el) => new RegExp(source).test(el.textContent || '') && !el.disabled);
    b?.click();
  }, re);
}
async function clickOption(text) {
  await page.waitForFunction((t) => [...document.querySelectorAll('.mn-prova-opt')].some((el) => (el.textContent || '').includes(t) && !el.disabled), { timeout: 25000 }, text);
  await page.evaluate((t) => {
    [...document.querySelectorAll('.mn-prova-opt')].find((el) => (el.textContent || '').includes(t) && !el.disabled)?.click();
  }, text);
}

try {
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5174/flash', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  await page.goto('http://localhost:5174/flash?d=2026-12-10&h=10', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]');
  await page.click('[data-testid="login-teste"]');
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'));
  await sleep(1000);
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Abrir a mesa|Começar/.test(b.textContent || '')));
  await clickText('Abrir a mesa');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Começar') && !b.disabled), { timeout: 40000 });
  await clickText('Começar');
  await page.waitForSelector('.mn-prova-opt');

  for (let n = 0; n < questions.length; n++) {
    const q = questions[n];
    const fact = q.skill === 'HIS.FATO' || q.skill === 'GEO.FATO' || q.skill === 'LIC.IDEIA';
    const pick = fact && n === questions.length - 1 ? q.options.find((o) => o !== q.answer) : q.answer;
    await clickOption(pick);
    if (fact && n === questions.length - 1) {
      await page.waitForSelector('[data-testid="quiz-explain"]');
      await sleep(600);
      const line = await page.$eval('[data-testid="quiz-result-line"]', (el) => el.textContent);
      const trapVisible = await page.$eval('[data-testid="quiz-explain"]', (el) => {
        const last = el.lastElementChild;
        if (!last) return false;
        const r = last.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight && r.height > 8;
      });
      console.log('fato', line, 'trapVisible', trapVisible);
      await shot('fato-1280');
      await page.setViewport({ width: 1920, height: 1080 });
      await shot('fato-1920');
      await page.setViewport({ width: 1280, height: 720 });
    }
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Próxima|Escrever/.test(b.textContent || '') && !b.disabled), { timeout: 20000 });
    await clickText('Próxima|Escrever');
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="reflect-mold"]');
  await page.click('[data-testid="reflect-mold"]');
  await page.type('textarea', ' hoje eu');
  await shot('reflexao-1280');
  await page.setViewport({ width: 1920, height: 1080 });
  await shot('reflexao-1920');
  const count = await page.$eval('[data-testid="reflect-count"]', (el) => el.textContent);
  console.log('count', count);
} catch (e) {
  console.error('FALHOU', e.message);
  await page.screenshot({ path: `${OUT}/erro2.png` }).catch(() => {});
} finally {
  await browser.close();
}
