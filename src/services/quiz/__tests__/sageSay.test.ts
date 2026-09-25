import { expect, run, test } from '../../english/__tests__/harness';
import { SAGE_LOCAL_OK, parseSageSay } from '../sageSay';

test('aceite sem say cai na fala local', () => {
  expect(parseSageSay({ ok: true })).toEqual({ ok: true, say: SAGE_LOCAL_OK });
  expect(parseSageSay({ ok: true, say: '   ' })).toEqual({ ok: true, say: SAGE_LOCAL_OK });
  const said = parseSageSay({ ok: true, say: 'Esperar para juntar mais: foi isso mesmo. Que brinquedo você esperaria uma semana?' });
  expect(said !== null && said.say.startsWith('Esperar')).toBe(true);
  expect(parseSageSay({ ok: false })).toEqual({ ok: false, say: '' });
  expect(parseSageSay(null)).toBe(null);
  expect(parseSageSay({ say: 'oi' })).toBe(null);
});

void run();
