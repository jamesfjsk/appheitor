// Conta de teste. Virada 24/10 → 25/10 e quadro final da prova com dilema.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5174';
const FROM = '2026-10-24';
const TO = '2026-10-25';
const ANSWERS = [
  'Ajuda a lutar contra infecções',
  'Ensina a reconhecer vírus',
  'Explico como vacinas ajudam',
  'Ocorreu em 7 de setembro',
  'Goleiro',
  'Aumenta a temperatura',
  'Combatendo uma infecção',
  '18',
];
const REFLECTION = 'No futebol, quando a febre sobe, eu entendo que o corpo está brigando com o invasor. A vacina treina esse exército antes, então no dia seguinte eu já reconheço o inimigo e volto a jogar.';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1440,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(45000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];
page.on('console', (msg) => {
  const t = msg.text();
  if (/DailyQuiz|quizBank|erro|mesa não/i.test(t)) logs.push(t.slice(0, 240));
});
page.on('pageerror', (err) => logs.push(String(err).slice(0, 240)));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label) && !el.disabled);
  if (!b) return false;
  b.click();
  return true;
}, text);

const sheet = () => page.evaluate(() => {
  const modal = document.querySelector('.mn-prova-sheet');
  return modal ? modal.innerText : '';
});

const shot = async (name, w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await sleep(500);
  await page.screenshot({ path: path.join(root, `${name}.png`) });
  console.log('foto', name);
};

const waitEnabled = async (label) => page.waitForFunction((text) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(text));
  return Boolean(b && !b.disabled);
}, { timeout: 40000 }, label);

try {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  await page.goto(`${BASE}/flash?d=${FROM}&h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    return Boolean(document.querySelector('[data-testid="login-teste"]') || document.querySelector('canvas[aria-label="Vila"]'));
  }, { timeout: 30000 });
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 30000 });
    await sleep(1500);
    await page.goto(`${BASE}/flash?d=${FROM}&h=10`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 60000 });
  await sleep(1200);
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => document.body.innerText.includes('Abrir a mesa'), { timeout: 30000 });
  await clickLabel('Abrir a mesa');
  await waitEnabled('Começar');
  await clickLabel('Começar');
  await page.waitForSelector('.mn-prova-opt', { timeout: 15000 });
  await page.evaluate(() => document.querySelector('.mn-prova-opt')?.click());
  await waitEnabled('Próxima');
  await clickLabel('Próxima');
  await page.waitForFunction(() => {
    const modal = document.querySelector('.mn-prova-sheet');
    return Boolean(modal && modal.innerText.includes('2 de'));
  }, { timeout: 15000 });
  console.log('antes da virada:\n', (await sheet()).slice(0, 400));

  await page.evaluate((next) => {
    const url = new URL(window.location.href);
    url.searchParams.set('d', next);
    history.pushState({}, '', url);
    window.dispatchEvent(new Event('clock-override'));
  }, TO);
  await page.waitForFunction((date) => {
    const q = window.__lastQuiz;
    const modal = document.querySelector('.mn-prova-sheet');
    const text = modal ? modal.innerText : '';
    return Boolean(q && q.date === date && text.includes('Abrir a mesa') && !text.includes('2 de'));
  }, { timeout: 30000 }, TO);
  console.log('depois da virada:\n', (await sheet()).slice(0, 400));
  await clickLabel('Abrir a mesa');
  await waitEnabled('Começar');
  await clickLabel('Começar');
  await page.waitForFunction(() => {
    const modal = document.querySelector('.mn-prova-sheet');
    return Boolean(modal && /\b1 de /.test(modal.innerText));
  }, { timeout: 20000 });
  console.log('pergunta 1:\n', (await sheet()).split('\n').slice(0, 4).join(' | '));

  for (let i = 0; i < ANSWERS.length; i++) {
    const picked = await page.evaluate((answer) => {
      const b = [...document.querySelectorAll('.mn-prova-opt')].find((el) => {
        const spans = el.querySelectorAll('span');
        return (spans[1]?.textContent || '') === answer;
      });
      if (!b) return false;
      b.click();
      return true;
    }, ANSWERS[i]);
    if (!picked) {
      console.log('opção sumiu', i + 1, (await sheet()).slice(0, 500));
      throw new Error(`não achei a opção ${i + 1}`);
    }
    const label = i === ANSWERS.length - 1 ? 'Escrever' : 'Próxima';
    await waitEnabled(label);
    await clickLabel(label);
    await sleep(250);
  }
  await page.waitForFunction(() => document.body.innerText.includes('Entregar'), { timeout: 15000 });
  const box = await page.$('textarea');
  if (!box) throw new Error('sem campo da reflexão');
  await box.click();
  await page.type('textarea', REFLECTION, { delay: 5 });
  await sleep(200);
  await clickLabel('Entregar');
  await page.waitForFunction(() => {
    const modal = document.querySelector('.mn-prova-sheet');
    const t = modal ? modal.innerText : '';
    return t.includes(' de ') && (t.includes('GOLD') || t.includes('A mesa não gravou') || t.includes('não está pronta') || t.includes('Ainda está curto') || t.includes('não fala da ideia') || t.includes('sua boca'));
  }, { timeout: 90000 });
  await sleep(600);
  const finalText = await sheet();
  console.log('quadro:\n', finalText);
  if (!finalText.includes('7 de 7')) throw new Error('o quadro não mostrou 7 de 7');
  await shot('c3-nota-1280', 1280, 720);
  await shot('c3-nota-1920', 1920, 1080);
  if (logs.length) console.log('console', logs.join(' | '));
} catch (error) {
  const text = await sheet().catch(() => '');
  console.log('tela:\n', text.slice(0, 800));
  await page.screenshot({ path: path.join(root, 'c3-falha.png') }).catch(() => {});
  if (logs.length) console.log('console', logs.join(' | '));
  throw error;
} finally {
  await browser.close();
}
