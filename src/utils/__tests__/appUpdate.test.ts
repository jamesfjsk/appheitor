import { expect, run, test } from '../../services/english/__tests__/harness';
import { isAppBusy, setAppBusy, shouldReload } from '../../services/appUpdate';

const base = {
  running: '2026-09-22-2a0658f',
  latest: '2026-09-24-abc1234',
  moment: 'visible',
  busy: false,
  lastReloadAt: 0,
  now: 20 * 60 * 1000,
};

test('mesma versão: não recarrega', () => {
  expect(shouldReload({ ...base, latest: base.running })).toBe(false);
});

test('versão nova e a aba voltou a ficar visível: recarrega', () => {
  expect(shouldReload({ ...base, moment: 'visible' })).toBe(true);
});

test('versão nova com busy: não recarrega', () => {
  expect(shouldReload({ ...base, busy: true })).toBe(false);
});

test('versão nova com o último recarregamento há 3 minutos: não recarrega', () => {
  const now = 30 * 60 * 1000;
  expect(shouldReload({ ...base, now, lastReloadAt: now - 3 * 60 * 1000 })).toBe(false);
});

test('running igual a dev: não recarrega', () => {
  expect(shouldReload({ ...base, running: 'dev' })).toBe(false);
});

test('latest vazio: não recarrega', () => {
  expect(shouldReload({ ...base, latest: '' })).toBe(false);
});

test('setAppBusy marca e solta a chave', () => {
  setAppBusy('quiz', true);
  expect(isAppBusy()).toBe(true);
  setAppBusy('quiz', false);
  expect(isAppBusy()).toBe(false);
});

void run();
