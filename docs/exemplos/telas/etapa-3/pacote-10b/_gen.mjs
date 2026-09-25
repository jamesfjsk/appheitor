import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5174';
const DATES = ['2026-12-10', '2026-12-11', '2026-12-12'];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1440,900'],
});
const page = await browser.newPage();
page.setDefaultTimeout(180000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
page.on('console', (msg) => {
  const t = msg.text();
  if (/DailyQuiz|quiz|erro|falhou/i.test(t)) console.log('console', t.slice(0, 220));
});

try {
  await page.goto(`${BASE}/flash`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('mm_sound', '0'));
  await page.goto(`${BASE}/flash?d=${DATES[0]}&h=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="login-teste"]', { timeout: 20000 });
  await page.click('[data-testid="login-teste"]');
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Vila"]'), { timeout: 60000 });
  await sleep(1500);

  for (const date of DATES) {
    await page.goto(`${BASE}/flash?d=${date}&h=10&quiz=regen`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (window.__quizEpoch || 0) >= 1 && window.__lastQuiz && (window.__lastQuiz.questions || []).length > 0, { timeout: 180000 });
    const summary = await page.evaluate(() => {
      const q = window.__lastQuiz;
      return {
        n: (q.questions || []).length,
        dilemma: (q.questions || []).filter((x) => x.kind === 'dilemma').length,
        sanitize: q.sanitize,
        title: q.theme && q.theme.title,
        questions: (q.questions || []).map((x) => ({
          id: x.id || '',
          kind: x.kind,
          skill: x.skill,
          subject: x.subject,
          question: x.question,
          options: x.options,
          answer: x.answer,
          why: x.why,
          trap: x.trap,
        })),
      };
    });
    console.log('DATA', date, JSON.stringify(summary));
  }
} finally {
  await browser.close();
}
