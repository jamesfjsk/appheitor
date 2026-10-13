// Ponte da Conversa (familyChat) com o Telegram do pai (13/10/2026).
// Só um Telegram fica ligado: o link de uso único criado pelo painel (telegramSetup) grava o chat id
// de quem tocar em "Começar"; mensagens de qualquer outro chat são ignoradas.
// O pai escreve no Telegram -> mensagem 'pai' na Conversa; o filho escreve na Vila -> chega no Telegram.
// Reações no Telegram: pomba quando a mensagem chegou na Vila, olhos quando ele abriu a Conversa.
import { createHash, randomBytes } from 'crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getDownloadURL, getStorage } from 'firebase-admin/storage';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { sendPush, tokensOf } from './push';

const REGION = 'southamerica-east1';
const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const LINK = 'telegramLink/main';
const MAX_TEXT = 1000;
const MAX_PHOTO = 5 * 1024 * 1024;
const DELIVERED = '🕊';
const SEEN = '👀';

type Link = { botUsername?: string; pairCode?: string; parentChatId?: string; parentName?: string; childUid?: string };
type TgMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { first_name?: string };
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; file_size?: number }>;
  document?: { file_id: string; mime_type?: string; file_size?: number };
};

const hookSecret = (token: string) => createHash('sha256').update(`mm-conversa:${token}`).digest('hex').slice(0, 48);
const clean = (raw: string) => raw.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT);

function projectId(): string {
  try {
    const cfg = JSON.parse(process.env.FIREBASE_CONFIG || '{}') as { projectId?: string };
    if (cfg.projectId) return cfg.projectId;
  } catch { /* sem FIREBASE_CONFIG */ }
  return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
}

async function tg<T = unknown>(token: string, method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(`telegram ${method}: ${data.description ?? res.status}`);
  return data.result as T;
}

async function react(token: string, chatId: string, messageId: number, emoji: string): Promise<void> {
  try {
    await tg(token, 'setMessageReaction', { chat_id: chatId, message_id: messageId, reaction: [{ type: 'emoji', emoji }] });
  } catch (e) {
    console.warn('telegram: reação', e);
  }
}

async function childName(uid: string): Promise<string> {
  const raw = (await getFirestore().doc(`users/${uid}`).get()).data()?.displayName;
  const first = typeof raw === 'string' ? raw.trim().split(/\s+/)[0] : '';
  return first || 'Heitor';
}

async function savePhoto(token: string, fileId: string, path: string, contentType: string): Promise<{ path: string; url: string } | null> {
  const file = await tg<{ file_path?: string; file_size?: number }>(token, 'getFile', { file_id: fileId });
  if (!file.file_path || (file.file_size ?? 0) > MAX_PHOTO) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!res.ok) throw new Error(`telegram: download ${res.status}`);
  const out = getStorage().bucket().file(path);
  await out.save(Buffer.from(await res.arrayBuffer()), { contentType, resumable: false });
  return { path, url: await getDownloadURL(out) };
}

async function onTelegramMessage(token: string, msg: TgMessage | undefined): Promise<void> {
  if (!msg?.chat || msg.chat.type !== 'private') return;
  const chatId = String(msg.chat.id);
  const db = getFirestore();
  const ref = db.doc(LINK);
  const link = (await ref.get()).data() as Link | undefined;
  if (!link?.childUid) return;
  const uid = link.childUid;
  const name = await childName(uid);
  const say = (text: string) => tg(token, 'sendMessage', { chat_id: chatId, text });

  const start = /^\/start(?:\s+([A-Za-z0-9_-]+))?/.exec(msg.text ?? '');
  if (start?.[1] && link.pairCode && start[1] === link.pairCode) {
    await ref.set({
      parentChatId: chatId,
      parentName: msg.from?.first_name ?? '',
      pairCode: FieldValue.delete(),
      linkedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await say(`Pronto, ligado. O que o ${name} escrever na Conversa da Vila chega aqui. O que você responder aqui aparece para ele na Vila, foto também.\n\n${DELIVERED} quer dizer que chegou na Vila. ${SEEN} quer dizer que ele abriu a Conversa.`);
    return;
  }
  if (chatId !== link.parentChatId) {
    if (start) await say('Este robô é de uma família só.');
    return;
  }
  if (msg.text?.startsWith('/')) {
    await say(`Escreva ou mande uma foto, e chega para o ${name} na Vila.`);
    return;
  }

  const isImageDoc = Boolean(msg.document?.mime_type?.startsWith('image/'));
  const fileId = msg.photo?.length ? msg.photo[msg.photo.length - 1].file_id : isImageDoc ? msg.document!.file_id : null;
  const text = clean(msg.text ?? msg.caption ?? '');
  if (!text && !fileId) {
    await say('Por enquanto a Conversa leva texto e foto.');
    return;
  }

  const msgRef = db.collection(`familyChat/${uid}/messages`).doc();
  let image: { path: string; url: string } | null = null;
  if (fileId) {
    const type = isImageDoc && !msg.photo?.length ? msg.document!.mime_type! : 'image/jpeg';
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/gif' ? 'gif' : 'jpg';
    image = await savePhoto(token, fileId, `chat/${uid}/${msgRef.id}.${ext}`, type);
    if (!image) {
      await say('A foto é grande demais. Mande como foto, não como arquivo.');
      if (!text) return;
    }
  }
  await msgRef.set({
    from: 'pai',
    text,
    ...(image ? { image } : {}),
    createdAt: FieldValue.serverTimestamp(),
    via: 'telegram',
    tgMessageId: msg.message_id,
    tgSeen: false,
  });
  // Quem responde leu: a Conversa dele mostra "O pai viu"
  await db.doc(`familyChat/${uid}`).set({ userId: uid, parentReadAt: FieldValue.serverTimestamp() }, { merge: true });
  await react(token, chatId, msg.message_id, DELIVERED);
}

/** Telegram chama aqui a cada mensagem enviada ao robô. */
export const telegramWebhook = onRequest(
  { region: REGION, secrets: [TELEGRAM_BOT_TOKEN], invoker: 'public', maxInstances: 2 },
  async (req, res) => {
    const token = TELEGRAM_BOT_TOKEN.value();
    if (req.method !== 'POST' || !token || req.get('x-telegram-bot-api-secret-token') !== hookSecret(token)) {
      res.status(403).send('não');
      return;
    }
    try {
      await onTelegramMessage(token, (req.body as { message?: TgMessage } | undefined)?.message);
    } catch (e) {
      console.error('telegram: mensagem', e);
    }
    res.status(200).send('ok');
  },
);

/** Painel do pai: link (liga o robô e cria o link de uso único), unlink, test. */
export const telegramSetup = onCall({ region: REGION, secrets: [TELEGRAM_BOT_TOKEN] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre como o pai.');
  const db = getFirestore();
  const me = (await db.doc(`users/${request.auth.uid}`).get()).data();
  if (me?.role !== 'admin') throw new HttpsError('permission-denied', 'Só o pai liga o Telegram.');
  const token = TELEGRAM_BOT_TOKEN.value();
  if (!token) throw new HttpsError('failed-precondition', 'TELEGRAM_BOT_TOKEN vazio.');
  const action = (request.data as { action?: string } | undefined)?.action;
  const ref = db.doc(LINK);

  if (action === 'unlink') {
    await ref.set({ parentChatId: FieldValue.delete(), parentName: FieldValue.delete(), pairCode: FieldValue.delete() }, { merge: true });
    return { ok: true };
  }
  if (action === 'test') {
    const link = (await ref.get()).data() as Link | undefined;
    if (!link?.parentChatId) throw new HttpsError('failed-precondition', 'O Telegram ainda não está ligado.');
    await tg(token, 'sendMessage', { chat_id: link.parentChatId, text: 'Teste da Conversa: está ligado.' });
    return { ok: true };
  }
  if (action !== 'link') throw new HttpsError('invalid-argument', 'Ação desconhecida.');

  const childUid = typeof me.managedChildId === 'string' ? me.managedChildId : '';
  if (!childUid) throw new HttpsError('failed-precondition', 'Sem criança ligada a esta conta.');
  const bot = await tg<{ username: string }>(token, 'getMe', {});
  await tg(token, 'setWebhook', {
    url: `https://${REGION}-${projectId()}.cloudfunctions.net/telegramWebhook`,
    secret_token: hookSecret(token),
    allowed_updates: ['message'],
  });
  await ref.set({
    botUsername: bot.username,
    pairCode: randomBytes(12).toString('base64url'),
    childUid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
});

/** Mensagem nova: a do filho vai para o Telegram do pai; a do pai vira aviso no aparelho do filho. */
export const chatRelay = onDocumentCreated(
  { document: 'familyChat/{uid}/messages/{msgId}', region: REGION, secrets: [TELEGRAM_BOT_TOKEN] },
  async (event) => {
    const m = event.data?.data();
    if (!m) return;
    const uid = event.params.uid;
    const text = typeof m.text === 'string' ? m.text : '';
    const imageUrl = typeof m.image?.url === 'string' ? m.image.url : '';

    if (m.from === 'pai') {
      await sendPush(await tokensOf(uid), 'Mensagem do pai', text || 'O pai mandou uma foto.');
      return;
    }
    if (m.from !== 'filho') return;

    const db = getFirestore();
    const link = (await db.doc(LINK).get()).data() as Link | undefined;
    // Só a conversa da criança ligada sai do app (a conta de teste não chega no celular do pai)
    if (link?.childUid && link.childUid !== uid) return;
    const name = await childName(uid);
    const token = TELEGRAM_BOT_TOKEN.value();
    if (link?.parentChatId && token) {
      try {
        if (imageUrl) {
          await tg(token, 'sendPhoto', {
            chat_id: link.parentChatId,
            photo: imageUrl,
            caption: (text ? `${name}: ${text}` : `${name} mandou uma foto`).slice(0, 1024),
          });
        } else {
          await tg(token, 'sendMessage', { chat_id: link.parentChatId, text: `${name}: ${text}` });
        }
        return;
      } catch (e) {
        console.error('telegram: envio', e);
      }
    }
    // Sem Telegram ligado (ou se falhou): aviso no celular do pai
    const admins = await db.collection('users').where('role', '==', 'admin').get();
    const tokens = (await Promise.all(admins.docs.map((a) => tokensOf(a.id)))).flat();
    await sendPush(tokens, `Mensagem do ${name}`, text || `${name} mandou uma foto.`);
  },
);

/** Ele abriu a Conversa: as mensagens do pai vindas do Telegram ganham os olhos. */
export const chatSeen = onDocumentWritten(
  { document: 'familyChat/{uid}', region: REGION, secrets: [TELEGRAM_BOT_TOKEN] },
  async (event) => {
    const before = event.data?.before.data()?.childReadAt;
    const after = event.data?.after.data()?.childReadAt;
    if (!(after instanceof Timestamp) || (before instanceof Timestamp && before.isEqual(after))) return;
    const db = getFirestore();
    const link = (await db.doc(LINK).get()).data() as Link | undefined;
    const token = TELEGRAM_BOT_TOKEN.value();
    if (!link?.parentChatId || !token) return;
    const snap = await db.collection(`familyChat/${event.params.uid}/messages`).where('tgSeen', '==', false).limit(20).get();
    for (const d of snap.docs) {
      const id = d.get('tgMessageId');
      if (typeof id === 'number') await react(token, link.parentChatId, id, SEEN);
      await d.ref.update({ tgSeen: true });
    }
  },
);
