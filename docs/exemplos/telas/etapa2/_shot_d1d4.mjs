import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../../../');
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174';

const patch = (cmd) => {
  const r = spawnSync('node', ['scripts/patch-test-d1d4.cjs', cmd], { cwd: root, encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status !== 0) throw new Error(`patch ${cmd} saiu ${r.status}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.setDefaultTimeout(40000);
page.on('pageerror', (e) => console.log('pageerror', e.message));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);
const textHas = async (needle) => page.evaluate((n) => document.body.innerText.includes(n), needle);
const shot = async (name) => {
  const dest = path.join(dir, `${name}.png`);
  await page.screenshot({ path: dest });
  console.log('shot', name);
};
const gotoFlash = async () => {
  await page.evaluate(() => { window.location.href = '/flash?h=19'; });
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => undefined);
  await sleep(1800);
};
const dismissOptionalQuiz = async () => {
  await sleep(700);
  await clickLabel('Mais tarde');
  await sleep(400);
  await clickLabel('Mais tarde');
  await sleep(400);
};
const clickScene = async (nx, ny) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + (nx / 1280) * box.w, box.y + (ny / 640) * box.h);
};
const waitText = async (needle, ms = 12000) => {
  await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout: ms }, needle);
};

try {
  await page.goto(`${BASE}/flash?h=19`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(800);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await sleep(2500);
  }
  await dismissOptionalQuiz();
  await gotoFlash();
  await dismissOptionalQuiz();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 25000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('quiz_completed_')) localStorage.removeItem(k);
    }
  });

  patch('quizlock');
  await gotoFlash();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 25000 });
  await sleep(1500);
  await shot('11-d1b-cadeado');

  await clickScene(650, 101);
  await sleep(1500);
  const quizOpen = await textHas('Prova do dia');
  console.log('quiz apos clique na mina', quizOpen);
  await shot('12-d1b-portao');

  patch('quizunlock');
  await sleep(1200);
  await clickLabel('Mais tarde');
  await sleep(600);
  await page.keyboard.press('Escape');
  await sleep(400);
  await clickScene(768, 265);
  await sleep(1200);
  console.log('mesa prova', await textHas('Prova do dia'));
  await shot('13-d1b-mesa');
  await page.keyboard.press('Escape');
  await sleep(400);

  patch('d1');
  await gotoFlash();
  await dismissOptionalQuiz();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 25000 });
  await sleep(1500);
  for (let i = 0; i < 4; i += 1) {
    const clicked = await clickLabel('Concluir');
    console.log('concluir', i, clicked);
    await sleep(1800);
    if (await textHas('Lote consertado')) break;
  }
  if (!(await textHas('Lote consertado')) && (await textHas('Conserte hoje'))) {
    await clickLabel('Conserte hoje');
    await sleep(2000);
  }
  console.log('conserto visivel', await textHas('Lote consertado') || await textHas('Conserto:'));
  await shot('14-d1-conserto');

  patch('punish-on');
  await sleep(2500);
  await page.keyboard.press('Escape');
  await sleep(400);
  await waitText('Punição', 15000).catch(() => undefined);
  await shot('15-d2-banner');
  await clickLabel('Mercado');
  await sleep(1200);
  console.log('toast mercado', await textHas('Em punição'));
  await shot('16-d2-mercado');
  await page.keyboard.press('KeyI');
  await sleep(1000);
  await shot('17-d2-mochila');
  const punishBtn = await clickLabel('Tarefas da punição');
  await sleep(1500);
  console.log('tarefas punicao', punishBtn, await textHas('Missing'), await textHas('insufficient'));
  await shot('18-d2-tarefas');
  await clickLabel('Voltar à Vila');
  await sleep(400);
  patch('punish-off');
  await sleep(1500);

  patch('agenda');
  await sleep(2500);
  await waitText('Aceite D4', 15000).catch(() => undefined);
  await shot('19-d4-alarme');
  await clickLabel('Ok');
  await sleep(8000);
  await shot('20-d4-depois-ok');

  const check = spawnSync('node', ['-e', `
    const fs = require('fs'); const os = require('os'); const path = require('path');
    const uid = 'DydxTQ0cGEbX46LLlQxxD123pQD3';
    const DOCS = 'https://firestore.googleapis.com/v1/projects/app-heitor/databases/(default)/documents';
    const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
    const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
    (async () => {
      const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
      const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }) })).json();
      const H = { Authorization: 'Bearer ' + t.access_token, 'Content-Type': 'application/json' };
      const rows = await (await fetch(DOCS + ':runQuery', { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'agenda' }], where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } } } }) })).json();
      const items = rows.filter(r => r.document).map(r => r.document.fields);
      for (const f of items) {
        console.log('agenda', f.title?.stringValue, 'remindedFor', f.remindedFor?.stringValue || '-', 'remindedAt', f.remindedAt?.stringValue || '-');
      }
      const gold = await (await fetch(DOCS + ':runQuery', { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'goldTransactions' }], where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } } } }) })).json();
      const repairs = gold.filter(r => r.document && r.document.fields.source?.stringValue === 'repair');
      console.log('repair linhas', repairs.length);
      for (const r of repairs) {
        const f = r.document.fields;
        console.log('repair', f.amount?.integerValue || f.amount?.doubleValue, f.description?.stringValue, f.metadata?.mapValue?.fields?.date?.stringValue);
      }
    })().catch(e => { console.error(e); process.exit(1); });
  `], { cwd: root, encoding: 'utf8' });
  process.stdout.write(check.stdout || '');
  process.stderr.write(check.stderr || '');
} finally {
  await browser.close();
}
