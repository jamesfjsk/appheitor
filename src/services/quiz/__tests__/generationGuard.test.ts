import { expect, run, test } from '../../english/__tests__/harness';
import { DEV_ACCOUNT_PANEL, TEST_QUIZ_UID, VERSION_PANEL, generationBlock, mayGenerateNow } from '../../generationGuard';

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

test('localhost e 127.0.0.1 com build de produção contam como dev', () => {
  const heitor = 'xZkTTR2tlIYXIpAelxEqXugNjqo2';
  expect(generationBlock({ running, latest: running, dev: false, uid: heitor, hostname: 'localhost' })).toBe('dev-account');
  expect(generationBlock({ running, latest: running, dev: false, uid: heitor, hostname: '127.0.0.1' })).toBe('dev-account');
  expect(mayGenerateNow({ running, latest: running, dev: false, uid: TEST_QUIZ_UID, hostname: 'localhost' })).toBe(true);
  expect(generationBlock({ running, latest: 'outra', dev: false, uid: TEST_QUIZ_UID, hostname: 'localhost' })).toBe('version');
  expect(generationBlock({ running, latest: running, dev: false, uid: heitor, hostname: 'miner.flash' })).toBe(null);
});

test('frase do painel: versão nova, e em dev o motivo real', () => {
  expect(generationBlock({ running, latest: '2026-09-30-nova', dev: false, uid: TEST_QUIZ_UID })).toBe('version');
  expect(VERSION_PANEL).toBe('A prova espera a versão nova. Recarregue a página.');
  expect(generationBlock({ running, latest: running, dev: true, uid: 'outra-conta' })).toBe('dev-account');
  expect(DEV_ACCOUNT_PANEL).toBe('Em desenvolvimento só a conta de teste gera a prova.');
});

void run();
