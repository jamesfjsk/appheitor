// Conta de teste no preview. Não grava senha: lê TEST_PASSWORD do ambiente.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../../../../..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4173';
const EMAIL = 'teste@flash.com';
const PASSWORD = process.env.TEST_PASSWORD || '';
const versionPath = path.join(repo, 'dist', 'version.json');
const original = fs.readFileSync(versionPath, 'utf8');
const published = JSON.parse(original).version;

const appJs = fs.readdirSync(path.join(repo, 'dist', 'assets')).find((f) => f.startsWith('App-') && f.endsWith('.js'));
const bundle = fs.readFileSync(path.join(repo, 'dist', 'assets', appJs), 'utf8');
const apiKey = bundle.match(/AIza[0-9A-Za-z_-]{20,}/)?.[0];
if (!apiKey) throw new Error('sem api key no bundle');
if (!PASSWORD) throw new Error('sem TEST_PASSWORD');

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
  if (/app-update|AUTH|erro/i.test(t)) logs.push(t.slice(0, 200));
});

const setVis = (visible) => page.evaluate((vis) => {
  const state = vis ? 'visible' : 'hidden';
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => state });
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => !vis });
  document.dispatchEvent(new Event('visibilitychange'));
  return document.visibilityState;
}, visible);

const stamp = () => page.evaluate(() => {
  window.__boot = window.__boot || Math.random();
  return window.__boot;
});

try {
  const sign = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  const auth = await sign.json();
  if (!auth.idToken) throw new Error('login da conta de teste falhou');
  const fbaseKey = `firebase:authUser:${apiKey}:[DEFAULT]`;
  const value = {
    uid: auth.localId,
    email: auth.email,
    emailVerified: false,
    displayName: auth.displayName || '',
    isAnonymous: false,
    photoURL: null,
    phoneNumber: null,
    providerData: [{ providerId: 'password', uid: auth.email, displayName: auth.displayName || null, email: auth.email, phoneNumber: null, photoURL: null }],
    stsTokenManager: {
      refreshToken: auth.refreshToken,
      accessToken: auth.idToken,
      expirationTime: Date.now() + Number(auth.expiresIn) * 1000,
    },
    apiKey,
    appName: '[DEFAULT]',
  };

  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  await page.evaluate(async (payload) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('firebaseLocalStorageDb');
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('firebaseLocalStorage', 'readwrite');
        tx.objectStore('firebaseLocalStorage').put(payload);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, { fbase_key: fbaseKey, value });
  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return t.includes('Entrar como') || Boolean(document.querySelector('canvas[aria-label="Vila"]'));
  }, { timeout: 30000 });
  const entered = await page.evaluate(() => Boolean(document.querySelector('canvas[aria-label="Vila"]')));
  console.log('entrou na vila', entered, 'uid', auth.localId);
  if (!entered) {
    console.log((await page.evaluate(() => document.body.innerText.slice(0, 400))));
    throw new Error('não entrou na vila');
  }
  await sleep(1500);
  fs.writeFileSync(versionPath, JSON.stringify({ version: '2026-09-24-nova' }) + '\n');
  await page.evaluate(() => {
    try { sessionStorage.removeItem('mm_app_reload_at'); } catch { /* */ }
  });
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="hotbar-mine"]');
    return Boolean(b && b.className.includes('is-lock'));
  }, { timeout: 30000 });
  await page.click('[data-testid="hotbar-mine"]');
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return t.includes('Abrir a mesa') || t.includes('Escrever para o Sábio');
  }, { timeout: 30000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => {
      const t = el.textContent || '';
      return t.includes('Abrir a mesa') || t.includes('Escrever para o Sábio');
    });
    b?.click();
  });
  await sleep(800);
  const needsLesson = await page.evaluate(() => document.body.innerText.includes('Começar') || document.body.innerText.includes('Ideia do dia'));
  if (needsLesson) {
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar'));
      return b && !b.disabled;
    }, { timeout: 40000 });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Começar') && !el.disabled);
      b?.click();
    });
    await page.waitForSelector('.mn-prova-opt', { timeout: 15000 });
  }
  const bootQ = await stamp();
  await setVis(false);
  await sleep(200);
  await setVis(true);
  await sleep(3500);
  const bootQ2 = await page.evaluate(() => window.__boot);
  const stillOpen = await page.evaluate(() => Boolean(document.querySelector('.mn-prova-sheet')));
  console.log('mesa aberta não recarregou', bootQ2 === bootQ, 'folha aberta', stillOpen);
  if (bootQ2 !== bootQ || !stillOpen) throw new Error('recarregou com a mesa aberta');

  if (await page.evaluate(() => Boolean(document.querySelector('.mn-prova-opt')))) {
    for (let i = 0; i < 8; i++) {
      const picked = await page.evaluate(() => {
        const b = document.querySelector('.mn-prova-opt');
        if (!b) return false;
        b.click();
        return true;
      });
      if (!picked) break;
      const handle = await page.waitForFunction(() => {
        const b = [...document.querySelectorAll('button')].find((el) => /Próxima|Escrever/.test(el.textContent || '') && !el.disabled);
        return b ? (b.textContent || '') : false;
      }, { timeout: 20000 });
      const which = String(await handle.jsonValue());
      await page.evaluate((text) => {
        const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes(text) && !el.disabled);
        b?.click();
      }, which.includes('Escrever') ? 'Escrever' : 'Próxima');
      if (which.includes('Escrever')) break;
      await sleep(200);
    }
  }
  console.log('botoes', await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 8).join(' | ')));
  await page.waitForFunction(() => document.body.innerText.includes('Voltar à Vila'), { timeout: 20000 });
  const bootClose = await stamp();
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').includes('Voltar à Vila'));
    b?.click();
  });
  await page.waitForFunction((prev) => window.__boot !== prev, { timeout: 15000 }, bootClose).catch(() => null);
  await sleep(600);
  const bootAfter = await page.evaluate(() => window.__boot || null);
  console.log('ao fechar a mesa recarregou', bootAfter !== bootClose);
  if (bootAfter === bootClose) {
    console.log('logs', logs.join(' | '));
    throw new Error('fechar a mesa não recarregou');
  }
  console.log('logs', logs.join(' | '));
  console.log('versao no ar do build', published);
} finally {
  fs.writeFileSync(versionPath, original);
  await browser.close();
}
