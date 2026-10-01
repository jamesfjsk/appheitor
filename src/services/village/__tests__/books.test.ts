import { expect, run, test } from '../../english/__tests__/harness';
import {
  BOOK_MAX_WORDS,
  bookPayBlock,
  buildBookJudgePrompt,
  buildVerifyPrompt,
  claimKeyForBook,
  claimKeyForBookDay,
  daysBetween,
  faltouLine,
  faltouParentLine,
  faltouPull,
  goldForBook,
  goldForSize,
  localCheck,
  minWordsFor,
  parseBookJudge,
  parseVerify,
  PARENT_HOLD_SAY,
  isThirdDelivery,
  parentReturnFields,
  priorRefusalsOf,
  reportBlocksRetell,
  returnedSay,
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

test('tamanho do livro paga 8 / 15 / 25; mínimo de palavras 40 sobe para 80 depois do 5º livro', () => {
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
  expect(minWordsFor(0)).toBe(40);
  expect(minWordsFor(4)).toBe(40);
  expect(minWordsFor(5)).toBe(80);
});

test('localCheck: colado, curto, longo, palavra repetida, texto repetido, ok', () => {
  const base = { pasted: false, booksDone: 0, previousTexts: [] as string[] };
  expect(localCheck({ ...base, text: kid(90), pasted: true }).code).toBe('colado');
  const curto = localCheck({ ...base, text: kid(30) });
  expect(curto.code).toBe('curto');
  expect(curto.say).toContain('faltam 10 palavras');
  expect(localCheck({ ...base, text: '' }).code).toBe('curto');
  expect(localCheck({ ...base, text: kid(BOOK_MAX_WORDS + 1) }).code).toBe('longo');
  expect(localCheck({ ...base, text: `${kid(50)} bom bom bom bom bom` }).code).toBe('repetido_palavras');
  const prev = kid(100);
  expect(localCheck({ ...base, text: prev, previousTexts: [prev] }).code).toBe('repetido_texto');
  // mesmo livro: completar o texto depois de "faltou" passa; mandar o texto idêntico não
  const completed = `${prev} no fim o dragao aprende a voar e leva o menino para casa e eu gostei porque foi engracado`;
  expect(localCheck({ ...base, text: completed, previousTexts: [], sameBookTexts: [prev] }).ok).toBe(true);
  expect(localCheck({ ...base, text: `${prev} `, previousTexts: [], sameBookTexts: [prev] }).code).toBe('repetido_texto');
  expect(localCheck({ ...base, text: `${prev} legal`, previousTexts: [prev] }).code).toBe('repetido_texto'); // outro livro com 80% igual
  const ok = localCheck({ ...base, text: kid(55) });
  expect(ok.ok).toBe(true);
  expect(ok.words).toBe(55);
  expect(ok.minWords).toBe(40);
  expect(localCheck({ ...base, text: kid(70), booksDone: 6 }).code).toBe('curto');
  expect(localCheck({ ...base, text: kid(85), booksDone: 6 }).ok).toBe(true);
});

test('textSimilarity: igual dá 1, textos diferentes ficam baixos', () => {
  expect(textSimilarity(kid(60), kid(60))).toBe(1);
  expect(textSimilarity('a menina achou um gato preto na chuva e levou para casa', 'o time ganhou o jogo de futebol no ultimo minuto')).toBeLessThanOrEqual(0.2);
});

test('parseBookJudge: aceita o JSON do Sábio, recusa lixo, corta faltou inválido e a opinião', () => {
  const j = parseBookJudge({ leu: 3, motivo: 'detalhes do fim', faltou: ['fim', 'banana', 'opiniao'], suspeito: 'nenhum', comentario: 'Você lembrou do cachorro.', pergunta: 'Quem achou a chave?', respostaEsperada: 'O irmão', gancho: 'Me conta o meio, na ponte.' });
  expect(j?.leu).toBe(3);
  expect(j?.faltou).toEqual(['fim']);
  expect(j?.pergunta).toBe('Quem achou a chave?');
  expect(j?.model).toBe('gpt-4o');
  expect((j as { gancho?: string } | null)?.gancho).toBe('Me conta o meio, na ponte.');
  expect(parseBookJudge({ leu: 'muito' })).toBe(null);
  expect(parseBookJudge(null)).toBe(null);
  expect(parseBookJudge({ leu: 2, suspeito: 'sei la' })?.suspeito).toBe('nenhum');
  expect(parseBookJudge({ leu: 2, pergunta: 'x' })?.pergunta).toBe(undefined);
  expect(parseVerify({ ok: true, motivo: 'bateu' })?.ok).toBe(true);
  expect(parseVerify({ ok: 'sim' })).toBe(null);
});

test('verdictOf: aceito, falta, suspeito, fora; suspeita com leu 2 aceita e marca', () => {
  const judge = { leu: 3 as const, motivo: '', faltou: [], suspeito: 'nenhum' as const, comentario: 'Gostei da parte do dragão.', model: 'gpt-4o' };
  const ok = verdictOf({ judge, verifyOk: true, title: 'A Ilha', gold: 15 });
  expect(ok.verdict).toBe('aceito');
  expect(ok.accepted).toBe(true);
  expect(ok.needsParent).toBe(false);
  expect(ok.say).toContain('+15 gold');
  expect(ok.say).toContain('dragão');
  expect(verdictOf({ judge: { ...judge, leu: 1 }, verifyOk: null, title: 'A Ilha', gold: 15 }).verdict).toBe('falta');
  const susp = verdictOf({ judge: { ...judge, leu: 1, suspeito: 'ia' }, verifyOk: null, title: 'A Ilha', gold: 15 });
  expect(susp.verdict).toBe('suspeito');
  expect(susp.flagged).toBe(true);
  const suspOk = verdictOf({ judge: { ...judge, leu: 3, suspeito: 'ia' }, verifyOk: true, title: 'A Ilha', gold: 15 });
  expect(suspOk.verdict).toBe('aceito');
  expect(suspOk.flagged).toBe(true);
  expect(verdictOf({ judge: { ...judge, suspeito: 'fora_do_tema' }, verifyOk: null, title: 'A Ilha', gold: 15 }).verdict).toBe('fora');
  expect(verdictOf({ judge: { ...judge, leu: 0 }, verifyOk: null, title: 'A Ilha', gold: 15 }).verdict).toBe('fora');
  expect(faltouLine([])).toBe('Faltou uma parte da história.');
  expect(faltouLine(['fim'])).toBe('Faltou como termina.');
});

test('verdictOf: leu 2 com faltou aceita, opinião não recusa, fato não decide, terceira entrega vai para o pai', () => {
  const base = { leu: 2 as const, motivo: '', faltou: ['meio', 'opiniao'] as string[], suspeito: 'nenhum' as const, comentario: 'Você lembrou da escola.', model: 'gpt-4o' };
  const aceito = verdictOf({ judge: base, verifyOk: null, title: 'Matilda', gold: 15 });
  expect(aceito.verdict).toBe('aceito');
  expect(aceito.accepted).toBe(true);
  expect(aceito.needsParent).toBe(false);
  expect(aceito.say).not.toContain('meio');
  expect(aceito.say).not.toContain('opini');
  expect(faltouParentLine(['meio', 'opiniao'])).toBe('não contou o meio');
  expect(faltouParentLine(['opiniao'])).toBe('');

  const soOpiniao = verdictOf({ judge: { ...base, leu: 3, faltou: ['opiniao'] }, verifyOk: null, title: 'Matilda', gold: 15 });
  expect(soOpiniao.accepted).toBe(true);

  const fato = verdictOf({ judge: { ...base, leu: 3, faltou: [] }, verifyOk: false, title: 'Matilda', gold: 15 });
  expect(fato.accepted).toBe(true);
  expect(fato.flagged).toBe(true);
  expect(fato.say).not.toContain('não achei');

  const curto = { ...base, leu: 1 as const, faltou: ['meio'], gancho: 'Me conta uma coisa que acontece no meio, na escola da Matilda.' };
  const uma = verdictOf({ judge: curto, verifyOk: null, title: 'Matilda', gold: 15, priorRefusals: 0 });
  expect(uma.verdict).toBe('falta');
  expect(uma.needsParent).toBe(false);
  expect(uma.say).toContain('escola da Matilda');
  expect(verdictOf({ judge: curto, verifyOk: null, title: 'Matilda', gold: 15, priorRefusals: 1 }).needsParent).toBe(false);
  const terceira = verdictOf({ judge: curto, verifyOk: null, title: 'Matilda', gold: 15, priorRefusals: 2 });
  expect(terceira.needsParent).toBe(true);
  expect(terceira.accepted).toBe(false);
  expect(terceira.say).toBe(PARENT_HOLD_SAY);
  expect(isThirdDelivery({ needsParent: true, accepted: false, verdict: 'falta', parentDecision: undefined })).toBe(true);
  expect(isThirdDelivery({ needsParent: false, accepted: false, verdict: 'falta' })).toBe(false);
  expect(isThirdDelivery({ needsParent: true, accepted: false, verdict: 'aceito' })).toBe(false);
  const back = parentReturnFields('Conta de novo o meio, na escola.');
  expect(back.parentDecision).toBe('returned');
  expect(back.parentReply).toBe('Conta de novo o meio, na escola.');
  expect('claimed' in back).toBe(false);
  expect(returnedSay(back.parentReply)).toBe('Seu pai leu e disse: Conta de novo o meio, na escola.');
  expect(reportBlocksRetell({ needsParent: true, accepted: false })).toBe(true);
  expect(reportBlocksRetell({ needsParent: true, accepted: false, parentDecision: 'returned' })).toBe(false);
  const terceiraBoa = verdictOf({ judge: { ...base, faltou: ['fim'] }, verifyOk: null, title: 'Matilda', gold: 15, priorRefusals: 2 });
  expect(terceiraBoa.accepted).toBe(true);
  expect(faltouPull(['meio'], 'Matilda')).toContain('meio');
  expect(priorRefusalsOf([
    { bookId: 'm', titleKey: 'matilda', accepted: false, verdict: 'falta' },
    { bookId: 'm', titleKey: 'matilda', accepted: false, verdict: 'suspeito' },
    { bookId: 'm', titleKey: 'matilda', accepted: true, verdict: 'aceito' },
  ], { id: 'm', titleKey: 'matilda' })).toBe(2);
});

test('prompt do juiz leva título, páginas e o texto, sem os dias; dias entre datas; falas do Sábio lendo', () => {
  const p = buildBookJudgePrompt({ title: 'A Ilha', pages: 120, text: 'era uma vez', age: 10, days: 9 });
  expect(p.system).toContain('"A Ilha"');
  expect(p.system).toContain('120 páginas');
  expect(p.system).not.toContain('dia(s)'); // dias de leitura não entram no juiz nem na tela (pai, 22/09)
  expect(p.system).toContain('ESPERADOS');
  expect(p.user).toContain('era uma vez');
  expect(p.system).toContain('Nunca pergunte o nome do autor'); // caso Menino Maluquinho (22/09): o juiz esperou "Ziraldo"
  expect(p.system).toContain('gancho');
  expect(p.system).not.toContain('"opiniao"');
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

test('bookPayBlock: livro paga uma vez; o dia barra o Sábio, não o pai (Matilda, 28/09)', () => {
  const kb = claimKeyForBook('matilda');
  const kd = claimKeyForBookDay('2026-09-28');
  expect(bookPayBlock({}, kb, kd, false)).toBe(null);
  expect(bookPayBlock({ [kd]: 'x' }, kb, kd, false)).toBe('day');
  expect(bookPayBlock({ [kd]: 'x' }, kb, kd, true)).toBe(null);
  expect(bookPayBlock({ [kb]: 'x' }, kb, kd, true)).toBe('book');
  expect(bookPayBlock({ [kb]: 'x', [kd]: 'x' }, kb, kd, false)).toBe('book');
});

void run();
