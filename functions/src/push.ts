import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export async function tokensOf(uid: string): Promise<string[]> {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  const raw = snap.data()?.fcmTokens;
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string' && t.length > 8);
  if (raw && typeof raw === 'object') return Object.keys(raw);
  return [];
}

export async function sendPush(tokens: string[], title: string, body: string): Promise<void> {
  const unique = [...new Set(tokens)];
  if (unique.length === 0) return;
  await getMessaging().sendEachForMulticast({
    tokens: unique,
    notification: { title, body },
    webpush: { notification: { title, body } },
  });
}
