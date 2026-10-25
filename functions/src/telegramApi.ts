// Peças comuns do robô do Telegram: o token, a ligação com o pai e a chamada à API.
// Usadas pela Conversa (telegram.ts) e pelo xadrez com o pai (arena.ts).
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';

export const REGION = 'southamerica-east1';
export const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
export const LINK = 'telegramLink/main';

export type Link = { botUsername?: string; pairCode?: string; parentChatId?: string; parentName?: string; childUid?: string };

export async function tg<T = unknown>(token: string, method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(`telegram ${method}: ${data.description ?? res.status}`);
  return data.result as T;
}

export async function childName(uid: string): Promise<string> {
  const raw = (await getFirestore().doc(`users/${uid}`).get()).data()?.displayName;
  const first = typeof raw === 'string' ? raw.trim().split(/\s+/)[0] : '';
  return first || 'Heitor';
}

export async function readLink(): Promise<Link | undefined> {
  return (await getFirestore().doc(LINK).get()).data() as Link | undefined;
}
