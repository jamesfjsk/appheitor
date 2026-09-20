import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,720'],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.setDefaultTimeout(30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const clickSheet = async (text) => page.evaluate((label) => {
  const sheet = document.querySelector('.mn-child-sheet');
  const b = [...(sheet?.querySelectorAll('button') || [])].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

async function closeSheet() {
  await page.evaluate(() => {
    const sheet = document.querySelector('.mn-child-sheet');
    const x = [...(sheet?.querySelectorAll('button') || [])].find((el) => {
      const t = (el.textContent || '').trim();
      return t === 'X' || t === '×' || el.getAttribute('aria-label') === 'Fechar';
    });
    x?.click();
  });
  await sleep(300);
}

async function login() {
  await page.goto(`${BASE}/flash?h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1200);
  }
  for (let i = 0; i < 8; i++) {
    await clickLabel('Mais tarde');
    await sleep(80);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(600);
}

async function openBanco() {
  const gold = await page.$('button[title="Extrato"]');
  if (!gold) throw new Error('sem chip Extrato');
  await gold.click();
  await sleep(500);
  const ruined = await page.evaluate(() => /Em ruínas/.test(document.querySelector('.mn-child-sheet')?.textContent || ''));
  if (ruined) {
    const ok = await clickSheet('Arrumar agora');
    if (!ok) throw new Error('cofre em ruinas sem Arrumar agora');
    await sleep(1200);
    const still = await page.evaluate(() => /Em ruínas/.test(document.querySelector('.mn-child-sheet')?.textContent || ''));
    if (still) throw new Error('cofre continua em ruinas');
    await closeSheet();
    await sleep(300);
    const gold2 = await page.$('button[title="Extrato"]');
    await gold2.click();
    await sleep(500);
  }
  const banco = await page.evaluate(() => /Banco da Vila/.test(document.querySelector('.mn-child-sheet')?.textContent || ''));
  if (!banco) throw new Error('nao abriu Banco da Vila');
}

function infoOf() {
  return page.evaluate(() => {
    const sheet = document.querySelector('.mn-child-sheet');
    const text = (sheet?.textContent || '').replace(/\s+/g, ' ');
    const tabs = [...(sheet?.querySelectorAll('.mc-hotbar')[0]?.querySelectorAll('button') || [])].map((b) => (b.textContent || '').trim());
    return {
      child: Boolean(sheet),
      tabs,
      novaMeta: /Nova meta/.test(text),
      titulo: /\bTítulo\b/.test(text),
      criar: /Criar meta/.test(text),
      cancel: /Pedir para cancelar/.test(text),
      alvoPct: /alvo \d+%/.test(text),
      aplicado: /aplicado|Aplicar/.test(text),
      goldLivre: /Gold livre/.test(text),
      head: text.slice(0, 240),
    };
  });
}

try {
  await page.setViewport({ width: 1280, height: 720 });
  await login();
  await openBanco();
  await sleep(2500);
  await clickSheet('Cofrinho');
  await sleep(300);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mn-child-sheet .mc-card button, .mn-child-sheet .mc-hotbar button')].find((el) => (el.textContent || '').trim() === '10');
    b?.click();
  });
  await sleep(80);
  await clickSheet('Quatro semanas');
  await sleep(200);
  const cofre = await infoOf();
  console.log('cofrinho', JSON.stringify(cofre));
  await page.screenshot({ path: path.join(dir, 'banco-01-cofrinho-1280.png') });
  if (!cofre.child) throw new Error('nao abriu ChildSheet');
  if (cofre.novaMeta || cofre.criar || cofre.titulo) throw new Error('formulario de meta ainda na tela');
  if (cofre.cancel) throw new Error('pedir cancelar na crianca');
  if (cofre.goldLivre) throw new Error('copy Gold livre');
  const locked = /Constrói o Cofre/.test(cofre.head || '');
  const more = await page.evaluate(() => {
    const sheet = document.querySelector('.mn-child-sheet');
    const text = (sheet?.textContent || '').replace(/\s+/g, ' ');
    const apply = [...(sheet?.querySelectorAll('button') || [])].find((el) => /^Aplicar/.test((el.textContent || '').trim()));
    const r = apply?.getBoundingClientRect();
    const nums = [...(sheet?.querySelectorAll('button') || [])].map((el) => (el.textContent || '').trim());
    return {
      nivel: /Cofre nível \d/.test(text) && /(está rendendo|pode resgatar|ainda vazio|começa com)/.test(text),
      plus: /\+\d/.test(text),
      drip: /todo dia|semana que vem/.test(text),
      teto: /teto|até \d+/.test(text),
      resgate: /Resgatar \d+ gold/.test(text),
      applyInView: Boolean(r && r.height > 20 && r.bottom <= window.innerHeight - 8),
      valores: [10, 20, 30, 40, 50].every((n) => nums.includes(String(n))),
      cinco: nums.includes('5'),
      pile: /rende \+\d+ por semana/.test(text),
      saque: /Saque |Já pode resgatar/.test(text),
    };
  });
  console.log('cofrinhoMore', JSON.stringify({ ...more, locked }));
  if (more.teto) throw new Error('teto ainda na boca da crianca');
  if (more.cinco) throw new Error('chip 5 ainda na aplicacao');
  if (locked) {
    await clickSheet('Paciência');
    await sleep(300);
    const pacLock = await page.evaluate(() => {
      const sheet = document.querySelector('.mn-child-sheet');
      const nums = [...(sheet?.querySelectorAll('button') || [])].map((el) => (el.textContent || '').trim());
      return {
        valores: [10, 20, 30, 40, 50].every((n) => nums.includes(String(n))),
        cinco: nums.includes('5'),
      };
    });
    console.log('pacienciaLock', JSON.stringify(pacLock));
    if (!pacLock.valores) throw new Error('Paciencia sem 10 20 30 40 50');
    if (pacLock.cinco) throw new Error('chip 5 na Paciencia');
    await page.screenshot({ path: path.join(dir, 'banco-03-paciencia-1280.png') });
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(300);
    await page.screenshot({ path: path.join(dir, 'banco-06-paciencia-1920.png') });
    console.log('ok-sem-cofre', dir);
  } else {
    if (!more.nivel) throw new Error('sem Cofre nivel falado');
    if (!more.plus) throw new Error('sem rendimento na escolha');
    if (!more.drip) throw new Error('sem frase do pouco todo dia');
    if (!more.valores) throw new Error('faltam chips 10 20 30 40 50');
    if (!more.applyInView) throw new Error('Aplicar fora da tela em 1280');
    if (more.pile && !more.saque) throw new Error('montinho sem dia de saque');
    await clickSheet('Aplicar');
    await sleep(900);
    await page.screenshot({ path: path.join(dir, 'banco-01-cofrinho-1280.png') });
    if (more.resgate) {
      await clickSheet('Resgatar');
      await sleep(800);
      await page.screenshot({ path: path.join(dir, 'banco-07-resgate-1280.png') });
    }
    await clickSheet('Extrato');
    await sleep(300);
    const extrato = await infoOf();
    console.log('extrato', JSON.stringify(extrato));
    if (extrato.alvoPct) throw new Error('alvo % de dashboard');
    await page.screenshot({ path: path.join(dir, 'banco-02-extrato-1280.png') });
    await clickSheet('Paciência');
    await sleep(300);
    const pac = await infoOf();
    console.log('paciencia', JSON.stringify(pac));
    await page.screenshot({ path: path.join(dir, 'banco-03-paciencia-1280.png') });
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(300);
    await page.screenshot({ path: path.join(dir, 'banco-06-paciencia-1920.png') });
    await clickSheet('Cofrinho');
    await sleep(250);
    await page.screenshot({ path: path.join(dir, 'banco-04-cofrinho-1920.png') });
    await clickSheet('Extrato');
    await sleep(250);
    await page.screenshot({ path: path.join(dir, 'banco-05-extrato-1920.png') });
    console.log('ok', dir);
  }
} catch (err) {
  console.error(err);
  await page.screenshot({ path: path.join(dir, 'banco-fail.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
