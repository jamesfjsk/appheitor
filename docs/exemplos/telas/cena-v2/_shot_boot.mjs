import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';

const out = path.join(os.tmpdir(), 'mn-boot.png');
const outMobile = path.join(os.tmpdir(), 'mn-boot-390.png');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174/?boot=1';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);
try {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.mn-boot');
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: out });
  console.log(out);

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.mn-boot');
  await new Promise((r) => setTimeout(r, 1600));
  await page.screenshot({ path: outMobile });
  console.log(outMobile);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
