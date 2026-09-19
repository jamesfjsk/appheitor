import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,720'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickLabel = async (text) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(label));
  if (!b) return false;
  b.click();
  return true;
}, text);

try {
  await page.goto('http://localhost:5175/flash?h=10', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await sleep(400);
  const teste = await page.$('[data-testid="login-teste"]');
  if (teste) {
    await teste.click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="login-teste"]'), { timeout: 20000 });
    await sleep(1000);
  }
  for (let i = 0; i < 6; i++) {
    await clickLabel('Mais tarde');
    await sleep(60);
  }
  await page.waitForSelector('canvas[aria-label="Vila"]', { timeout: 20000 });
  await sleep(800);
  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[aria-label="Vila"]');
    const r = canvas.getBoundingClientRect();
    const fit = Math.min(r.width / 1280, r.height / 640);
    const ox = r.left + (r.width - 1280 * fit) / 2;
    const oy = r.top + (r.height - 640 * fit) / 2;
    return {
      left: r.left, top: r.top, w: r.width, h: r.height, fit, ox, oy,
      cx: ox + (512 + 36) * fit,
      cy: oy + (300 + 22) * fit,
    };
  });
  console.log('map', JSON.stringify(info));
  await page.mouse.move(info.cx, info.cy);
  await sleep(500);
  const clipX = Math.max(0, info.cx - 90);
  const clipY = Math.max(0, info.cy - 90);
  await page.screenshot({
    path: 'docs/exemplos/telas/cena-v2/tmp-arena/cadeado-shots/chest-01-hover.png',
    clip: { x: clipX, y: clipY, width: 220, height: 220 },
  });
} finally {
  await browser.close();
}
