import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.SHOT_BASE || 'http://localhost:5175';
const SIZES = [
  { w: 1280, h: 720, folder: '720' },
  { w: 1920, h: 1080, folder: '1080' },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1920,1080'],
});
const page = await browser.newPage();
page.setDefaultTimeout(25000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

const clickTitle = async (title) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((el) => el.getAttribute('title') === t);
  if (!b) return false;
  b.click();
  return true;
}, title);

const dismissQuiz = async () => {
  await sleep(600);
  await clickLabel('Mais tarde');
  await sleep(300);
  await clickLabel('Mais tarde');
  await sleep(300);
  await clickLabel('Voltar à Vila');
  await sleep(200);
};

const closeModal = async () => {
  await page.keyboard.press('Escape');
  await sleep(350);
  await page.evaluate(() => {
    const x = [...document.querySelectorAll('button[aria-label="Fechar"]')].pop();
    x?.click();
  });
  await sleep(250);
};

const loginTeste = async () => {
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(600);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 25000 });
    await sleep(2200);
  }
};

const waitVillage = async () => {
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 25000 });
  await sleep(900);
};

const clickScene = async (sx, sy) => {
  const box = await page.$eval('canvas[aria-label="Vila"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + (sx / 1280) * box.w, box.y + (sy / 640) * box.h);
};

try {
  await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
  await loginTeste();
  await dismissQuiz();

  for (const size of SIZES) {
    const dir = path.join(root, size.folder);
    fs.mkdirSync(dir, { recursive: true });
    await page.setViewport({ width: size.w, height: size.h });
    const shot = async (name) => {
      const dest = path.join(dir, `${name}.png`);
      await page.screenshot({ path: dest });
      console.log(`${size.folder}/${name}`);
    };

    await page.goto(`${BASE}/flash?h=14`, { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    await dismissQuiz();
    await waitVillage();
    await shot('01-vila');

    await clickLabel('Hoje você tem');
    await sleep(700);
    await shot('02-placa');
    await clickLabel('Fechar');
    await sleep(400);

    await clickLabel('Missões');
    await sleep(1000);
    await shot('03-casa-missoes');
    await clickLabel('Ver a linha do dia');
    await sleep(500);
    await shot('04-casa-linha');
    await clickLabel('Fechar o dia');
    await sleep(700);
    await shot('05-casa-fechar');
    await closeModal();

    await clickLabel('Mercado');
    await sleep(1000);
    await shot('06-mercado');
    await closeModal();

    await clickLabel('Mochila');
    await sleep(1000);
    await shot('07-mochila');
    await closeModal();

    await clickLabel('Mina');
    await sleep(1400);
    await shot('08-mina');
    await closeModal();

    await clickTitle('Extrato');
    await sleep(1000);
    await shot('09-banco');
    await closeModal();

    await clickTitle('Torre');
    await sleep(1000);
    await shot('10-torre');
    await closeModal();

    await clickScene(640, 458);
    await sleep(900);
    await shot('11-agenda-cartao');
    await clickLabel('Abrir a Agenda');
    await sleep(900);
    await shot('12-agenda');
    await clickLabel('Mês');
    await sleep(700);
    await shot('13-agenda-mes');
    await closeModal();
    await closeModal();

    await clickScene(764, 459);
    await sleep(900);
    await shot('14-mercado-cartao');
    await closeModal();

    await clickScene(768, 265);
    await sleep(900);
    await shot('15-biblioteca-cartao');
    await clickLabel('Prova do dia');
    await sleep(1200);
    await shot('16-prova');
    await closeModal();
    await closeModal();

    await clickScene(198, 237);
    await sleep(900);
    await shot('17-fornalha-cartao');
    await closeModal();

    await clickScene(640, 552);
    await sleep(900);
    await shot('18-cerca-cartao');
    await closeModal();

    await clickScene(524, 462);
    await sleep(900);
    await shot('19-cofre-cartao');
    await closeModal();

    await page.goto(`${BASE}/flash?h=18`, { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    await dismissQuiz();
    await waitVillage();
    await shot('20-vila-18h');
    await clickLabel('Baú');
    await sleep(900);
    await shot('21-bau');
    await closeModal();

    await clickScene(78, 220);
    await sleep(800);
    await shot('22-npc-ferreiro');
    await closeModal();

    await page.goto(`${BASE}/flash?onboard=1`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await shot('23-onboarding-0');
    await clickLabel('Continuar');
    await sleep(600);
    await shot('24-onboarding-sabio');
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
