// Conversa do pai com o Heitor no Firestore.
// familyChat/{childUid}: childReadAt e parentReadAt (cada lado só grava o seu).
// familyChat/{childUid}/messages/{id}: from, text, image?, createdAt, via.
// A foto vai para o Storage em chat/{childUid}/{id}.jpg, comprimida no aparelho.
// A ponte com o Telegram é feita pelas Cloud Functions (functions/src/telegram.ts).

import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, functions, storage } from '../config/firebase';
import { compressProofPhoto } from './assignmentsService';
import { CHAT_PAGE, cleanChatText, type ChatMessage, type ChatSide, type ChatVia } from './village/familyChat';

export interface ChatMeta {
  childReadAt?: string;
  parentReadAt?: string;
}

const iso = (v: unknown): string => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === 'string' ? v : '');

function fromMessage(id: string, raw: Record<string, unknown>): ChatMessage | null {
  const from = raw.from === 'pai' || raw.from === 'filho' ? raw.from : null;
  if (!from) return null;
  const img = raw.image as { path?: unknown; url?: unknown } | undefined;
  const via: ChatVia = raw.via === 'telegram' || raw.via === 'painel' ? raw.via : 'app';
  return {
    id,
    from,
    text: typeof raw.text === 'string' ? raw.text : '',
    ...(img && typeof img.path === 'string' && typeof img.url === 'string' ? { image: { path: img.path, url: img.url } } : {}),
    at: iso(raw.createdAt),
    via,
  };
}

/** As últimas mensagens, da mais antiga para a mais nova. */
export function subscribeChat(childUid: string, onChange: (rows: ChatMessage[]) => void): () => void {
  const q = query(collection(db, 'familyChat', childUid, 'messages'), orderBy('createdAt', 'desc'), limit(CHAT_PAGE));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => fromMessage(d.id, d.data({ serverTimestamps: 'estimate' })))
        .filter((m): m is ChatMessage => Boolean(m))
        .reverse();
      onChange(rows);
    },
    (e) => {
      console.warn('conversa: leitura', e);
      onChange([]);
    },
  );
}

export function subscribeChatMeta(childUid: string, onChange: (meta: ChatMeta) => void): () => void {
  return onSnapshot(
    doc(db, 'familyChat', childUid),
    (snap) => {
      const data = snap.data() ?? {};
      onChange({ childReadAt: iso(data.childReadAt) || undefined, parentReadAt: iso(data.parentReadAt) || undefined });
    },
    () => onChange({}),
  );
}

/** Quem está olhando marca a conversa como lida. */
export async function markChatRead(childUid: string, side: ChatSide): Promise<void> {
  const field = side === 'filho' ? 'childReadAt' : 'parentReadAt';
  await setDoc(doc(db, 'familyChat', childUid), { userId: childUid, [field]: serverTimestamp() }, { merge: true });
}

export interface TelegramLink {
  botUsername?: string;
  parentChatId?: string;
  parentName?: string;
  /** link de uso único para ligar o Telegram do pai */
  pairLink?: string;
}

/** Ligação com o Telegram (telegramLink/main): só o pai lê; quem grava é a Cloud Function. */
export function subscribeTelegramLink(onChange: (link: TelegramLink | null) => void): () => void {
  return onSnapshot(
    doc(db, 'telegramLink', 'main'),
    (snap) => {
      const d = snap.data();
      if (!d) return onChange(null);
      const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
      onChange({
        botUsername: str(d.botUsername),
        parentChatId: str(d.parentChatId),
        parentName: str(d.parentName),
        pairLink: d.botUsername && d.pairCode ? `https://t.me/${d.botUsername}?start=${d.pairCode}` : undefined,
      });
    },
    () => onChange(null),
  );
}

/** link: liga o robô e cria o link de uso único; unlink: desliga; test: manda uma mensagem de teste. */
export async function telegramSetup(action: 'link' | 'unlink' | 'test'): Promise<void> {
  const call = httpsCallable<{ action: string }, { ok: boolean }>(functions, 'telegramSetup');
  await call({ action });
}

export async function sendChatMessage(
  childUid: string,
  from: ChatSide,
  text: string,
  photo: File | null,
  via: ChatVia,
): Promise<void> {
  const body = cleanChatText(text);
  if (!body && !photo) return;
  const msgRef = doc(collection(db, 'familyChat', childUid, 'messages'));
  let image: { path: string; url: string } | undefined;
  if (photo) {
    if (!photo.type.startsWith('image/')) throw new Error('Só dá para mandar imagem.');
    const blob = await compressProofPhoto(photo);
    if (blob.size > 5 * 1024 * 1024) throw new Error('A foto ficou grande demais.');
    const path = `chat/${childUid}/${msgRef.id}.jpg`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
    image = { path, url: await getDownloadURL(fileRef) };
  }
  await setDoc(msgRef, {
    from,
    text: body,
    ...(image ? { image } : {}),
    createdAt: serverTimestamp(),
    via,
  });
}
