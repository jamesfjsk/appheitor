// Xadrez com o pai (25/10/2026): avisos da vez e o pai jogando pelo Telegram.
// A partida fica em arenaMatches/{childUid}. O pai manda "lance e4", "lance Cf3" (letras em português ou em
// inglês) ou "lance g1f3"; "xadrez" mostra a posição; "novoxadrez" (ou "novoxadrez pretas") começa outra.
import { Chess, type Move } from 'chess.js';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { sendPush, tokensOf } from './push';
import { REGION, TELEGRAM_BOT_TOKEN, childName, readLink, tg } from './telegramApi';

type Side = 'w' | 'b';
type Match = {
  childUid: string;
  n: number;
  childColor: Side;
  pgn: string;
  fen: string;
  turn: Side;
  status: 'playing' | 'over';
  result?: 'win' | 'loss' | 'draw';
  resultLine?: string;
  lastMove?: { from: string; to: string; line: string; by: 'filho' | 'pai' };
  moves: number;
  createdBy: 'filho' | 'pai';
};

const NAME: Record<string, string> = { p: 'peão', n: 'cavalo', b: 'bispo', r: 'torre', q: 'dama', k: 'rei' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** O mesmo texto do app (src/services/arena/chessGame.ts, moveLine). */
export function moveLine(m: Pick<Move, 'piece' | 'to' | 'captured' | 'san' | 'flags' | 'promotion'>): string {
  let base: string;
  if (m.flags.includes('k')) base = 'Roque pequeno';
  else if (m.flags.includes('q')) base = 'Roque grande';
  else if (m.captured) base = `${cap(NAME[m.piece])} pega ${m.captured === 'q' || m.captured === 'r' ? 'a' : 'o'} ${NAME[m.captured]} em ${m.to}`;
  else base = `${cap(NAME[m.piece])} para ${m.to}`;
  if (m.promotion) base += ` e vira ${NAME[m.promotion]}`;
  if (m.san.includes('#')) return `${base}. Xeque-mate!`;
  if (m.san.includes('+')) return `${base}. Xeque!`;
  return base;
}

/** Fim de partida do ponto de vista do filho; o mesmo texto do app (outcomeFor). */
function outcome(c: Chess, childColor: Side): { result: 'win' | 'loss' | 'draw'; line: string } | null {
  if (c.isCheckmate()) {
    return c.turn() === childColor
      ? { result: 'loss', line: 'Xeque-mate. Dessa vez ele ganhou. Bora a revanche?' }
      : { result: 'win', line: 'Xeque-mate! Você venceu!' };
  }
  if (c.isStalemate()) return { result: 'draw', line: 'Afogado: quem joga não tem lance e não está em xeque. Empate.' };
  if (c.isThreefoldRepetition()) return { result: 'draw', line: 'A mesma posição três vezes. Empate.' };
  if (c.isInsufficientMaterial()) return { result: 'draw', line: 'Não sobrou peça para dar mate. Empate.' };
  if (c.isDraw()) return { result: 'draw', line: 'Empate pela regra dos 50 lances.' };
  return null;
}

/** Lance escrito pelo pai: coordenadas (g1f3), SAN em inglês (Nf3) ou em português (Cf3, Td1, De7, Re2). */
export function parseMove(c: Chess, raw: string): Move | null {
  const t = raw.trim().replace(/[!?]+$/, '');
  const co = /^([a-h][1-8])\s*-?\s*([a-h][1-8])\s*=?([qrbndtc])?$/i.exec(t);
  if (co) {
    const promo: Record<string, string> = { q: 'q', r: 'r', b: 'b', n: 'n', d: 'q', t: 'r', c: 'n' };
    try {
      return c.move({ from: co[1].toLowerCase(), to: co[2].toLowerCase(), promotion: promo[(co[3] ?? 'q').toLowerCase()] });
    } catch { /* não vale */ }
  }
  try {
    return c.move(t);
  } catch { /* tenta em português */ }
  const pt: Record<string, string> = { C: 'N', B: 'B', T: 'R', D: 'Q', R: 'K' };
  const en = t.replace(/^([CBTDR])/, (ch) => pt[ch] ?? ch).replace(/=([CBTD])$/i, (_m, ch: string) => `=${pt[ch.toUpperCase()]}`);
  if (en !== t) {
    try {
      return c.move(en);
    } catch { /* não vale */ }
  }
  if (/^roque( pequeno)?$/i.test(t)) {
    try {
      return c.move('O-O');
    } catch { /* não vale */ }
  }
  if (/^roque grande$/i.test(t)) {
    try {
      return c.move('O-O-O');
    } catch { /* não vale */ }
  }
  return null;
}

/** SAN com as letras em português, para o pai ler no Telegram. */
const ptSan = (san: string) => san.replace(/[NRQK]/g, (ch) => ({ N: 'C', R: 'T', Q: 'D', K: 'R' })[ch] ?? ch);

const boardUrl = (fen: string, side: Side) =>
  `https://lichess.org/analysis/standard/${fen.replace(/ /g, '_')}?color=${side === 'w' ? 'white' : 'black'}`;

function loadMatch(data: FirebaseFirestore.DocumentData | undefined): Match | null {
  if (!data || typeof data.childUid !== 'string') return null;
  return data as Match;
}

/** Comandos de xadrez que o pai manda no Telegram. */
export async function onChessCommand(token: string, chatId: string, childUid: string, cmd: 'xadrez' | 'novoxadrez' | 'lance', arg: string): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`arenaMatches/${childUid}`);
  const name = await childName(childUid);
  const say = (text: string) => tg(token, 'sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
  const m = loadMatch((await ref.get()).data());
  const fatherSide: Side | null = m ? (m.childColor === 'w' ? 'b' : 'w') : null;

  if (cmd === 'xadrez') {
    if (!m || m.status !== 'playing' || !fatherSide) {
      await say(`Não tem partida agora.${m?.resultLine ? ` A última: ${m.resultLine}` : ''}\nPara começar: novoxadrez (você de brancas) ou novoxadrez pretas.`);
      return;
    }
    const c = new Chess(m.fen);
    const yourTurn = m.turn === fatherSide;
    const sample = yourTurn ? c.moves().slice(0, 12).map(ptSan).join(', ') : '';
    await say(
      `Xadrez com ${name}. Você joga de ${fatherSide === 'w' ? 'brancas' : 'pretas'}.\n` +
        (m.lastMove ? `Último lance (${m.lastMove.by === 'pai' ? 'seu' : name}): ${m.lastMove.line}\n` : '') +
        (yourTurn ? `Sua vez! Lances possíveis: ${sample}${c.moves().length > 12 ? '...' : ''}\nMande: lance e4` : `Vez dele. Ele recebe o aviso na Vila.`) +
        `\nTabuleiro: ${boardUrl(m.fen, fatherSide)}`,
    );
    return;
  }

  if (cmd === 'novoxadrez') {
    if (m && m.status === 'playing') {
      await say('Já tem uma partida em andamento. Mande xadrez para ver a posição.');
      return;
    }
    const childColor: Side = arg === 'pretas' ? 'w' : 'b';
    const fresh = new Chess();
    await ref.set({
      childUid,
      n: Date.now(),
      childColor,
      pgn: '',
      fen: fresh.fen(),
      turn: 'w',
      status: 'playing',
      moves: 0,
      createdBy: 'pai',
      updatedAt: FieldValue.serverTimestamp(),
    });
    await say(childColor === 'b'
      ? `Partida criada! Você joga de brancas e começa. Mande: lance e4\nTabuleiro: ${boardUrl(fresh.fen(), 'w')}`
      : `Partida criada! ${name} joga de brancas e começa. Eu aviso quando for a sua vez.`);
    return;
  }

  // lance
  if (!m || m.status !== 'playing' || !fatherSide) {
    await say('Não tem partida em andamento. Para começar: novoxadrez');
    return;
  }
  let reply = '';
  await db.runTransaction(async (tx) => {
    const cur = loadMatch((await tx.get(ref)).data());
    if (!cur || cur.status !== 'playing') {
      reply = 'A partida já acabou.';
      return;
    }
    if (cur.turn !== fatherSide) {
      reply = `Ainda é a vez do ${name}. Eu aviso quando ele jogar.`;
      return;
    }
    const c = new Chess();
    if (cur.pgn) c.loadPgn(cur.pgn);
    const done = parseMove(c, arg);
    if (!done) {
      reply = `Esse lance não vale nesta posição. Alguns que valem: ${c.moves().slice(0, 12).map(ptSan).join(', ')}.\nTabuleiro: ${boardUrl(c.fen(), fatherSide)}`;
      return;
    }
    const out = outcome(c, cur.childColor);
    const line = moveLine(done);
    tx.update(ref, {
      pgn: c.pgn(),
      fen: c.fen(),
      turn: c.turn(),
      moves: c.history().length,
      lastMove: { from: done.from, to: done.to, line, by: 'pai' },
      ...(out ? { status: 'over', result: out.result, resultLine: out.line } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    reply = out
      ? `Feito: ${line}\n${out.result === 'loss' ? 'Você venceu a partida!' : out.result === 'win' ? `${name} venceu.` : 'Empate.'}`
      : `Feito: ${line}. Agora é a vez do ${name}; ele recebe o aviso.`;
  });
  if (reply) await say(reply);
}

/** Avisa cada um da sua vez: o pai no Telegram, o filho no aparelho (e na Vila, pelo app). */
export const arenaTurn = onDocumentWritten(
  { document: 'arenaMatches/{uid}', region: REGION, secrets: [TELEGRAM_BOT_TOKEN] },
  async (event) => {
    const before = loadMatch(event.data?.before.data());
    const after = loadMatch(event.data?.after.data());
    if (!after) return;
    const uid = event.params.uid;
    const link = await readLink();
    const token = TELEGRAM_BOT_TOKEN.value();
    const toFather = link?.parentChatId && link.childUid === uid && token
      ? (text: string) => tg(token, 'sendMessage', { chat_id: link.parentChatId, text, disable_web_page_preview: true }).catch((e) => console.error('xadrez: telegram', e))
      : null;
    const toChild = async (body: string) => sendPush(await tokensOf(uid), 'Xadrez com o pai', body).catch((e) => console.error('xadrez: push', e));
    const name = await childName(uid);
    const fatherSide: Side = after.childColor === 'w' ? 'b' : 'w';

    // Partida nova
    if (!before || before.n !== after.n) {
      if (after.createdBy === 'filho') {
        await toFather?.(
          `${name} te desafiou no xadrez! ` +
            (fatherSide === 'w' ? 'Você joga de brancas e começa.' : 'Ele joga de brancas e começa; eu aviso a sua vez.') +
            `\nPara jogar: mande "lance e4" ou "lance Cf3" aqui, ou use o painel, aba Arena.` +
            (fatherSide === 'w' ? `\nTabuleiro: ${boardUrl(after.fen, fatherSide)}` : ''),
        );
      } else {
        await toChild('O pai te chamou para uma partida de xadrez! Abra a Arena.');
      }
      return;
    }

    // Fim
    if (after.status === 'over' && before.status !== 'over') {
      const forFather = after.result === 'win' ? `${name} venceu a partida!` : after.result === 'loss' ? 'Você venceu a partida.' : 'A partida empatou.';
      if (after.lastMove?.by !== 'pai' || after.resultLine?.includes('desistiu')) await toFather?.(`Fim do xadrez: ${forFather} ${after.resultLine ?? ''}`.trim());
      if (after.lastMove?.by === 'pai' || after.resultLine?.includes('O pai desistiu')) await toChild(after.resultLine ?? 'A partida acabou.');
      return;
    }

    // Lance novo
    const moved = after.moves !== before.moves && after.lastMove;
    if (!moved || after.status !== 'playing') return;
    if (after.lastMove!.by === 'filho') {
      await toFather?.(`${name} jogou: ${after.lastMove!.line}\nSua vez! Mande: lance <seu lance>\nTabuleiro: ${boardUrl(after.fen, fatherSide)}`);
    } else {
      await toChild(`O pai jogou: ${after.lastMove!.line}. Sua vez!`);
    }
  },
);
