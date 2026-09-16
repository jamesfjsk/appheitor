import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5175';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(25000);
await page.setViewport({ width: 1280, height: 1000 });
page.on('pageerror', (err) => console.error('pageerror', err.message));

const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

try {
  await page.goto(`${BASE}/login?dev=minerar`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2500));
  const atLogin = await page.evaluate(() => ({
    url: location.href,
    text: document.body.innerText.slice(0, 240),
    teste: Boolean(document.querySelector('[data-testid="login-teste"]')),
    heitor: Boolean(document.querySelector('[data-testid="login-heitor"]')),
  }));
  console.log('after-goto', JSON.stringify(atLogin));
  const loginBtn = (await page.$('[data-testid="login-teste"]'))
    || (await page.$('[data-testid="login-heitor"]'));
  console.log('login-btn', Boolean(loginBtn));
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-heitor"]'), { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await page.waitForFunction(() => {
    const boot = document.getElementById('mm-boot-root');
    const off = !boot || boot.classList.contains('is-off');
    return off && document.querySelector('canvas[aria-label="Vila"]');
  }, { timeout: 30000 });
  for (let i = 0; i < 4; i += 1) {
    await new Promise((r) => setTimeout(r, 400));
    await clickLabel('Mais tarde');
  }

  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForSelector('[data-testid="english-base"]', { timeout: 20000 });
  await page.waitForSelector('[data-testid="tab-redstone"]', { timeout: 25000 });
  await page.click('[data-testid="tab-redstone"]');
  await page.waitForSelector('[data-testid="redstone-play"]', { timeout: 12000 });
  await page.waitForSelector('[data-testid="redstone-canvas"]', { timeout: 12000 });
  await new Promise((r) => setTimeout(r, 1200));

  const hud = await page.evaluate(() => {
    const t = document.body.innerText;
    const how = document.querySelector('[data-testid="redstone-how"]')?.textContent || '';
    const goal = document.querySelector('[data-testid="redstone-goal"]')?.textContent || '';
    const coach = document.querySelector('[data-testid="redstone-coach"]')?.textContent || '';
    return {
      locked: Boolean(document.querySelector('[data-testid="redstone-locked"]')),
      done: Boolean(document.querySelector('[data-testid="redstone-done"]')),
      goNote: Boolean(document.querySelector('[data-testid="redstone-go-note"]')),
      pronto: Boolean(document.querySelector('[data-testid="redstone-ready"]')),
      how,
      goal,
      coach,
      etapa: /Etapa 1 de 3/.test(t),
      chips: /Alavanca/.test(how) && /Tocha/.test(how) && /Pistão/.test(how),
      ban: /anel|marcada|puxa as duas|desliga a/i.test(t),
    };
  });
  console.log('hud', JSON.stringify(hud));
  await page.screenshot({ path: path.join(dir, 'mina-redstone.png') });
  console.log('mina-redstone');

  const cellPoint = (box, c, r) => {
    const side = 48;
    const topPad = 12;
    const trayH = 36;
    const CELL_MAX = 80;
    const maxBoardW = box.w - side * 2;
    const maxBoardH = box.h - trayH - topPad;
    const cell = Math.max(36, Math.min(CELL_MAX, Math.floor(maxBoardW / 8), Math.floor(maxBoardH / 5)));
    const boardW = 8 * cell;
    const boardH = 5 * cell;
    const ox = Math.floor((box.w - boardW) / 2);
    const blockH = boardH + trayH;
    const oy = Math.max(topPad, Math.floor((box.h - blockH) / 2) + 6);
    return { x: box.x + ox + c * cell + cell / 2, y: box.y + oy + r * cell + cell / 2 };
  };

  const canvasBox = async () => page.$eval('[data-testid="redstone-canvas"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });

  const clickCells = async (cells) => {
    const box = await canvasBox();
    for (const { c, r } of cells) {
      const p = cellPoint(box, c, r);
      await page.mouse.click(p.x, p.y);
      await new Promise((res) => setTimeout(res, 280));
    }
  };

  const readPlay = async () => page.evaluate(() => ({
    done: Boolean(document.querySelector('[data-testid="redstone-done"]')),
    hint: document.querySelector('.rs-play-hint')?.textContent || '',
    coach: document.querySelector('[data-testid="redstone-coach"]')?.textContent || '',
    goal: document.querySelector('[data-testid="redstone-goal"]')?.textContent || '',
    text: document.body.innerText.slice(0, 400),
  }));

  if (hud.goNote) {
    await page.click('[data-testid="redstone-go-note"]');
    await page.waitForSelector('[data-testid="contract-shell"]', { timeout: 10000 });
    console.log('abriu-recado', true);
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(dir, 'mina-redstone-recado.png') });
    await clickLabel('Sair');
    await page.waitForSelector('[data-testid="redstone-play"]', { timeout: 8000 });
  } else if (!hud.locked && !hud.done) {
    await page.click('[data-testid="redstone-ready"]');
    await new Promise((r) => setTimeout(r, 700));
    const afterEmpty = await readPlay();
    console.log('pronto-vazio', JSON.stringify(afterEmpty));
    await page.screenshot({ path: path.join(dir, 'mina-redstone-recado.png') });

    await clickCells([{ c: 0, r: 0 }, { c: 0, r: 2 }]);
    await page.screenshot({ path: path.join(dir, 'mina-redstone-click.png') });
    await page.click('[data-testid="redstone-ready"]');
    await page.waitForFunction(() => (document.querySelector('[data-testid="redstone-goal"]')?.textContent || '').includes('pistão fechado'), { timeout: 8000 });
    console.log('etapa2', JSON.stringify(await readPlay()));
    await page.screenshot({ path: path.join(dir, 'mina-redstone-etapa2.png') });

    await clickCells([{ c: 0, r: 2 }, { c: 0, r: 4 }]);
    await page.click('[data-testid="redstone-ready"]');
    await new Promise((r) => setTimeout(r, 700));
    console.log('etapa2-mash', JSON.stringify(await readPlay()));

    await clickCells([{ c: 0, r: 4 }]);
    await page.click('[data-testid="redstone-ready"]');
    await page.waitForFunction(() => (document.querySelector('[data-testid="redstone-goal"]')?.textContent || '').includes('Pistão aberto'), { timeout: 8000 });
    console.log('etapa3', JSON.stringify(await readPlay()));
    await page.screenshot({ path: path.join(dir, 'mina-redstone-etapa3.png') });

    await clickCells([{ c: 0, r: 0 }, { c: 0, r: 2 }, { c: 0, r: 4 }]);
    await page.click('[data-testid="redstone-ready"]');
    await page.waitForSelector('[data-testid="redstone-done"]', { timeout: 12000 });
    console.log('fim', JSON.stringify(await readPlay()));
    await page.screenshot({ path: path.join(dir, 'mina-redstone-fim.png') });
  }

  await page.click('[data-testid="redstone-quit"]');
  await page.waitForSelector('[data-testid="english-base"]', { timeout: 8000 });
  await page.waitForSelector('[data-testid="contract-board"]', { timeout: 5000 });
  const back = await page.evaluate(() => Boolean(document.querySelector('[data-testid="contract-board"]')));
  console.log('back-contratos', back);
} catch (err) {
  console.error(err);
  const html = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    boot: document.getElementById('mm-boot-root')?.className ?? null,
    text: document.body.innerText.slice(0, 500),
    login: Boolean(document.querySelector('[data-testid="login-teste"]')),
    village: Boolean(document.querySelector('canvas[aria-label="Vila"]')),
  }));
  console.error('debug', JSON.stringify(html));
  await page.screenshot({ path: path.join(dir, 'mina-redstone-fail.png') });
  process.exitCode = 1;
} finally {
  await browser.close();
}
