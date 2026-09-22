import { expect, run, test } from '../../english/__tests__/harness';
import {
  BOOK_MAX_WORDS,
  buildBookJudgePrompt,
  buildVerifyPrompt,
  claimKeyForBook,
  claimKeyForBookDay,
  daysBetween,
  faltouLine,
  goldForBook,
  goldForSize,
  localCheck,
  minWordsFor,
  parseBookJudge,
  parseVerify,
  readingLineAt,
  sameBook,
  sizeForPages,
  textSimilarity,
  titleKeyOf,
  verdictOf,
} from '../books';

const kid = (n: number) => Array.from({ length: n }, (_, i) => ['o', 'menino', 'foi', 'na', 'floresta', 'e', 'achou', 'um', 'dragao', 'que', 'nao', 'sabia', 'voar'][i % 13]).join(' ');

test('titleKeyOf: sem acento, sem artigo, sem pontuação; sameBook a 2 letras', () => {
  expect(titleKeyOf('O Menino Maluquinho')).toBe('menino maluquinho');
  expect(titleKeyOf('  A Ilha Perdida! ')).toBe('ilha perdida');
  expect(titleKeyOf('Diário de um Banana 3')).toBe('diario de um banana 3');
  expect(sameBook('menino maluquinho', 'menino maluquinho')).toBe(true);
  expect(sameBook('menino maluquinho', 'menino maluquino')).toBe(true);
  expect(sameBook('diario de um banana 3', 'diario de um banana 4')).toBe(true); // volumes: cadastro do pai distingue pelas páginas/id, não pela chave
  expect(sameBook('menino maluquinho', 'ilha perdida')).toBe(false);
  expect(sameBook('', 'x')).toBe(false);
  expect(claimKeyForBook('menino maluquinho')).toBe('book:menino-maluquinho');
  expect(claimKeyForBookDay('2026-09-22')).toBe('bookday:2026-09-22');
});

test('tamanho do livro paga 8 / 15 / 25; mínimo de palavras 50 sobe para 80 depois do 5º livro', () => {
  expect(sizeForPages(20)).toBe('curto');
  expect(sizeForPages(60)).toBe('curto');
  expect(sizeForPages(61)).toBe('medio');
  expect(sizeForPages(150)).toBe('medio');
  expect(sizeForPages(151)).toBe('longo');
  expect(goldForSize('curto')).toBe(8);
  expect(goldForSize('medio')).toBe(15);
  expect(goldForSize('longo')).toBe(25);
  // o pai define o valor (complexidade conta): Pequeno Príncipe 96 p vale 25; sem valor, vale pelo tamanho
  expect(goldForBook({ size: 'medio', gold: 25 })).toBe(25);
  expect(goldForBook({ size: 'longo' })).toBe(25);
  expect(goldForBook({ size: 'longo', gold: 15 })).toBe(15);
  expect(goldForBook({ size: 'curto', gold: 0 })).toBe(8);
  expect(goldForBook({ size: 'curto', gold: 999 })).toBe(8);
  expect(minWordsFor(0)).toBe(50);
  expect(minWordsFor(4)).toBe(50);
  expect(minWordsFor(5)).toBe(80);
});

test('localCheck: colado, curto, longo, palavra repetida, texto repetido, ok', () => {
  const base = { pasted: false, booksDone: 0, previousTexts: [] as string[] };
  expect(localCheck({ ...base, text: kid(90), pasted: true }).code).toBe('colado');
  const curto = localCheck({ ...base, text: kid(30) });
  expect(curto.code).toBe('curto');
  expect(curto.say).toContain('faltam 20 palavras');
  expect(localCheck({ ...base, text: '' }).code).toBe('curto');
  expect(localCheck({ ...base, text: kid(BOOK_MAX_WORDS + 1) }).code).toBe('longo');
  expect(localCheck({ ...base, text: `${kid(50)} bom bom bom bom bom` }).code).toBe('repetido_palavras');
  const prev = kid(100);
  expect(localCheck({ ...base, text: prev, previousTexts: [prev] }).code).toBe('repetido_texto');
  // mesmo livro: completar o texto depois de "faltou" passa; mandar o texto idêntico não
  const completed = `${prev} no fim o dragao aprende a voar e leva o menino para casa e eu gostei porque foi engracado`;
  expect(localCheck({ ...base, text: completed, previousTexts: [], sameBookTexts: [prev] }).ok).toBe(true);
  expect(localCheck({ ...base, text: `${prev} `, previousTexts: [], sameBookTexts: [prev] }).code).toBe('repetido_texto');
  expect(localCheck({ ...base, text: completed, previousTexts: [prev] }).code).toBe('repetido_texto'); // outro livro com 80% igual
  const ok = localCheck({ ...base, text: kid(55) });
  expect(ok.ok).toBe(true);
  expect(ok.words).toBe(55);
  expect(ok.minWords).toBe(50);
  expect(localCheck({ ...base, text: kid(70), booksDone: 6 }).code).toBe('curto');
  expect(localCheck({ ...base, text: kid(85), booksDone: 6 }).ok).toBe(true);
});

test('textSimilarity: igual dá 1, textos diferentes ficam baixos', () => {
  expect(textSimilarity(kid(60), kid(60))).toBe(1);
  expect(textSimilarity('a menina achou um gato preto na chuva e levou para casa', 'o time ganhou o jogo de futebol no ultimo minuto')).toBeLessThanOrEqual(0.2);
});

test('parseBookJudge: aceita o JSON do Sábio, recusa lixo, corta faltou inválido', () => {
  const j = parseBookJudge({ leu: 3, motivo: 'detalhes do fim', faltou: ['fim', 'banana'], suspeito: 'nenhum', comentario: 'Você lembrou do cachorro.', pergunta: 'Quem achou a chave?', respostaEsperada: 'O irmão' });
  expect(j?.leu).toBe(3);
  expect(j?.faltou).toEqual(['fim']);
  expect(j?.pergunta).toBe('Quem achou a chave?');
  expect(j?.model).toBe('gpt-4o');
  expect(parseBookJudge({ leu: 'muito' })).toBe(null);
  expect(parseBookJudge(null)).toBe(null);
  expect(parseBookJudge({ leu: 2, suspeito: 'sei la' })?.suspeito).toBe('nenhum');
  expect(parseBookJudge({ leu: 2, pergunta: 'x' })?.pergunta).toBe(undefined);
  expect(parseVerify({ ok: true, motivo: 'bateu' })?.ok).toBe(true);
  expect(parseVerify({ ok: 'sim' })).toBe(null);
});

test('verdictOf: aceito, falta, suspeito, fora, pergunta errada; suspeita com leu 2 aceita e marca', () => {
  const judge = { leu: 3 as const, motivo: '', faltou: [], suspeito: 'nenhum' as const, comentario: 'Gostei da parte do dragão.', model: 'gpt-4o' };
  const ok = verdictOf({ judge, verifyOk: true, title: 'A Ilha', gold: 15 });
  expect(ok.verdict).toBe('aceito');
  expect(ok.accepted).toBe(true);
  expect(ok.say).toContain('+15 gold');
  expect(ok.say).toContain('dragão');
  const falta = verdictOf({ judge: { ...judge, leu: 2, faltou: ['fim', 'opiniao'] }, verifyOk: null, title: 'A Ilha', gold: 15 });
  expect(falta.verdict).toBe('falta');
  expect(falta.say).toContain('como termina');
  expect(falta.say).toContain('o que você achou');
  expect(verdictOf({ judge: { ...judge, leu: 1 }, verifyOk: null, title: 'A Ilha', gold: 15 }).verdict).toBe('falta');
  const susp = verdictOf({ judge: { ...judge, leu: 1, suspeito: 'ia' }, verifyOk: null, title: 'A Ilha', gold: 15 });
  expect(susp.verdict).toBe('suspeito');
  expect(susp.flagged).toBe(true);
  const suspOk = verdictOf({ judge: { ...judge, leu: 3, suspeito: 'ia' }, verifyOk: true, title: 'A Ilha', gold: 15 });
  expect(suspOk.verdict).toBe('aceito');
  expect(suspOk.flagged).toBe(true);
  expect(verdictOf({ judge: { ...judge, suspeito: 'fora_do_tema' }, verifyOk: null, title: 'A Ilha', gold: 15 }).verdict).toBe('fora');
  expect(verdictOf({ judge: { ...judge, leu: 0 }, verifyOk: null, title: 'A Ilha', gold: 15 }).verdict).toBe('fora');
  expect(verdictOf({ judge, verifyOk: false, title: 'A Ilha', gold: 15 }).verdict).toBe('falta');
  expect(faltouLine([])).toBe('Faltou uma parte da história.');
  expect(faltouLine(['fim'])).toBe('Faltou como termina.');
});

test('prompt do juiz leva título, páginas e o texto, sem os dias; dias entre datas; falas do Sábio lendo', () => {
  const p = buildBookJudgePrompt({ title: 'A Ilha', pages: 120, text: 'era uma vez', age: 10, days: 9 });
  expect(p.system).toContain('"A Ilha"');
  expect(p.system).toContain('120 páginas');
  expect(p.system).not.toContain('dia(s)'); // dias de leitura não entram no juiz nem na tela (pai, 22/09)
  expect(p.system).toContain('ESPERADOS');
  expect(p.user).toContain('era uma vez');
  expect(p.system).toContain('Nunca pergunte o nome do autor'); // caso Menino Maluquinho (22/09): o juiz esperou "Ziraldo"
  const v = buildVerifyPrompt({ title: 'A Ilha', question: 'Quem achou a chave?', expected: 'O irmão', answer: 'o irmao dele', text: 'era uma vez' });
  expect(v.system).toContain('PODE ESTAR ERRADA');
  expect(v.system).toContain('Na dúvida, true');
  expect(v.user).toContain('Relato dele sobre o livro');
  expect(buildVerifyPrompt({ title: 'A Ilha', question: 'q', expected: 'e', answer: 'a' }).user).not.toContain('Relato dele');
  expect(daysBetween('2026-09-10', '2026-09-22')).toBe(12);
  expect(daysBetween('2026-09-22', '2026-09-22')).toBe(0);
  expect(readingLineAt(0)).toBe('Deixa eu ler com calma…');
  expect(readingLineAt(1700)).toBe('Hum. Lendo de novo a sua frase…');
  expect(readingLineAt(9000)).toBe('Quase lá.');
});

void run();
