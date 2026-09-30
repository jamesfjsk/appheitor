import { expect, run, test } from '../../english/__tests__/harness';
import { TEST_QUIZ_UID, mayGenerateNow } from '../../generationGuard';

const running = '2026-09-29-abc1234';

test('versão igual gera', () => {
  expect(mayGenerateNow({ running, latest: running, dev: false, uid: 'outra-conta' })).toBe(true);
});

test('versão diferente não gera', () => {
  expect(mayGenerateNow({ running, latest: '2026-09-29-velha', dev: false, uid: TEST_QUIZ_UID })).toBe(false);
});

test('latest vazio gera', () => {
  expect(mayGenerateNow({ running, latest: '', dev: false, uid: 'outra-conta' })).toBe(true);
});

test('em dev só a conta de teste gera', () => {
  expect(mayGenerateNow({ running, latest: running, dev: true, uid: TEST_QUIZ_UID })).toBe(true);
  expect(mayGenerateNow({ running, latest: '', dev: true, uid: TEST_QUIZ_UID })).toBe(true);
  expect(mayGenerateNow({ running, latest: running, dev: true, uid: 'xZkTTR2tlIYXIpAelxEqXugNjqo2' })).toBe(false);
  expect(mayGenerateNow({ running, latest: '', dev: true, uid: 'outra-conta' })).toBe(false);
});

void run();
