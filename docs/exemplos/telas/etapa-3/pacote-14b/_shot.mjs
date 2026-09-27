import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { connect } from '../../../../../scripts/lib/firestore-rest.cjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174';
const OUT = 'docs/exemplos/telas/etapa-3/pacote-14b';
const uid = 'DydxTQ0cGEbX46LLlQxxD123pQD3';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1440,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(180000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name, w, h) {
  await page.setViewport({ width: w, height: h });
  await sleep(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name, w, h);
}

try {
  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  await page.goto(`${BASE}/flash?d=2026-12-20&h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]', { timeout: 20000 });
  await page.click('[data-testid="login-teste"]');
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 60000 });
  await sleep(1500);
  await page.waitForSelector('[data-testid="hotbar-mine"]', { timeout: 30000 });
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForSelector('[data-testid="open-letter"]', { timeout: 180000 });
  const db = await connect();
  const plan = await db.get(`englishPlans/${uid}_2026-12-20`);
  const letter = Object.values(plan.data.contracts).find((c) => c.type === 'letter');
  const forge = Object.values(plan.data.contracts).find((c) => c.type === 'forge');
  console.log('letter', letter && letter.content && letter.content.title, 'qs', letter.content.questions.map((q) => q.kind).join(','));
  console.log('forge', forge && forge.content && forge.content.target);

  await page.click('[data-testid="open-forge"]');
  await page.waitForSelector('[data-testid="accept-contract"]');
  await page.click('[data-testid="accept-contract"]');
  await page.waitForSelector('[data-testid="forge-item-closed"]', { timeout: 5000 });
  await shot('ferraria-fechada-1280', 1280, 720);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sair')?.click());
  await sleep(200);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sair')?.click());
  await page.setViewport({ width: 1920, height: 1080 });
  await page.click('[data-testid="open-forge"]');
  await page.waitForSelector('[data-testid="accept-contract"]');
  await page.click('[data-testid="accept-contract"]');
  await page.waitForSelector('[data-testid="forge-item-closed"]', { timeout: 5000 });
  await shot('ferraria-fechada-1920', 1920, 1080);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sair')?.click());
  await sleep(200);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sair')?.click());

  await page.setViewport({ width: 1280, height: 720 });
  await page.click('[data-testid="open-letter"]');
  await page.waitForSelector('[data-testid="accept-contract"]');
  await page.click('[data-testid="accept-contract"]');
  await page.waitForSelector('[data-testid="letter-gate"]');
  await shot('carta-portao-1280', 1280, 720);
  await shot('carta-portao-1920', 1920, 1080);

  const started = Date.now();
  await page.waitForSelector('[data-testid="ask-sentence"], [data-testid="option-0"]', { timeout: 120000 });
  console.log('perguntas abriram em', Date.now() - started, 'ms');

  const questions = letter.content.questions;
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    if (q.kind === 'comprehension') {
      await page.waitForSelector('[data-testid="ask-sentence"]');
      if (qi === questions.findIndex((x) => x.kind === 'comprehension')) {
        await shot('carta-frase-1280', 1280, 720);
        await shot('carta-frase-1920', 1920, 1080);
      }
      const ev = String(q.evidence || '').toLowerCase();
      const ids = await page.$$eval('[data-testid^="sentence-"]', (nodes) => nodes.map((n) => ({
        id: n.getAttribute('data-testid'),
        text: n.textContent || '',
      })));
      const wrong = ids.find((s) => !s.text.toLowerCase().includes(ev.slice(0, 18)));
      if (wrong) await page.click(`[data-testid="${wrong.id}"]`);
      await page.waitForSelector('[data-testid="sentence-miss"]', { timeout: 5000 }).catch(() => null);
      if (qi === questions.findIndex((x) => x.kind === 'comprehension')) {
        await shot('carta-errada-1280', 1280, 720);
        await shot('carta-errada-1920', 1920, 1080);
      }
      const right = ids.find((s) => s.text.toLowerCase().includes(ev.slice(0, 12))) || ids[0];
      await page.click(`[data-testid="${right.id}"]`);
      await page.waitForSelector('[data-testid="option-0"]');
    }
    await page.click(`[data-testid="option-${q.answer}"]`);
    if (q.kind === 'decision') {
      await page.waitForSelector('[data-testid="ask-evidence"]');
      const ev = String(q.evidence || '').toLowerCase();
      const ids = await page.$$eval('[data-testid^="sentence-"]', (nodes) => nodes.map((n) => ({
        id: n.getAttribute('data-testid'),
        text: (n.textContent || '').toLowerCase(),
      })));
      const right = ids.find((s) => ev && s.text.includes(ev.slice(0, 16))) || ids[0];
      await page.click(`[data-testid="${right.id}"]`);
    }
    const next = await page.waitForSelector('[data-testid="next-question"]');
    await next.click();
    await sleep(300);
  }
  await page.waitForSelector('[data-testid="letter-deliver"]');
  await page.click('[data-testid="letter-deliver"]');
  await page.waitForSelector('[data-testid="contract-board"]', { timeout: 30000 });
  await sleep(1500);
  const after = await db.get(`englishPlans/${uid}_2026-12-20`);
  const done = Object.values(after.data.contracts).find((c) => c.type === 'letter');
  console.log('RESULT', JSON.stringify({
    score: done.result && done.result.score,
    max: done.result && done.result.max,
    durationSec: done.result && done.result.durationSec,
    details: done.result && done.result.details,
  }));
} finally {
  await browser.close();
}
