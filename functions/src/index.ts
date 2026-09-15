import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { createHash } from 'crypto';
import { nowBrazil } from './clock';

initializeApp();
const db = getFirestore();
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const AI_MONTHLY_CALL_CAP = 800;
const REGION = 'southamerica-east1';

type Payload = {
  kind?: 'chat' | 'tts';
  model?: string;
  input?: { system?: string; user?: string; maxTokens?: number } | string;
  temperature?: number;
  withUsage?: boolean;
  voice?: string;
};

function addDays(date: string, n: number): string {
  const t = Date.parse(`${date}T12:00:00.000-03:00`) + n * 86400000;
  return nowBrazil(t).date;
}

function reminderDue(item: {
  date: string;
  time?: string;
  remindMinutesBefore?: number;
  remindedAt?: string;
}, now: { date: string; hour: number; minute: number }): boolean {
  if (item.remindedAt) return false;
  const minutes = item.remindMinutesBefore ?? 0;
  if (!item.time) {
    const prev = addDays(item.date, -1);
    return now.date > prev || (now.date === prev && now.hour >= 19);
  }
  const [h, m] = item.time.split(':').map(Number);
  const eventMin = h * 60 + m - minutes;
  const dayShift = eventMin < 0 ? -1 : 0;
  const targetDate = addDays(item.date, dayShift);
  const targetMin = ((eventMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const targetH = Math.floor(targetMin / 60);
  const targetM = targetMin % 60;
  if (now.date > targetDate) return true;
  if (now.date < targetDate) return false;
  return now.hour > targetH || (now.hour === targetH && now.minute >= targetM);
}

async function modulesOf(): Promise<{ aiGeneration: boolean; tts: boolean }> {
  const snap = await db.doc('settings/modules').get();
  const data = snap.data() || {};
  return {
    aiGeneration: data.aiGeneration !== false,
    tts: data.tts !== false,
  };
}

async function monthCalls(): Promise<number> {
  const month = nowBrazil().date.slice(0, 7);
  const snap = await db.doc(`aiUsage/${month}`).get();
  return Number(snap.data()?.calls) || 0;
}

async function bumpUsage(model: string, calls: number, inputTokens = 0, outputTokens = 0, ttsChars = 0): Promise<void> {
  const month = nowBrazil().date.slice(0, 7);
  const ref = db.doc(`aiUsage/${month}`);
  await ref.set({
    calls: FieldValue.increment(calls),
    inputTokens: FieldValue.increment(inputTokens),
    outputTokens: FieldValue.increment(outputTokens),
    ttsChars: FieldValue.increment(ttsChars),
    [`byModel.${model.replace(/\./g, '_')}`]: FieldValue.increment(calls),
  }, { merge: true });
}

async function tokensOf(uid: string): Promise<string[]> {
  const snap = await db.doc(`users/${uid}`).get();
  const raw = snap.data()?.fcmTokens;
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string' && t.length > 8);
  if (raw && typeof raw === 'object') return Object.keys(raw);
  return [];
}

async function sendPush(tokens: string[], title: string, body: string): Promise<void> {
  const unique = [...new Set(tokens)];
  if (unique.length === 0) return;
  await getMessaging().sendEachForMulticast({
    tokens: unique,
    notification: { title, body },
    webpush: { notification: { title, body } },
  });
}

export const openai = onCall({ region: REGION, secrets: [OPENAI_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre na conta para usar a IA.');
  const body = (request.data || {}) as Payload;
  const kind = body.kind === 'tts' ? 'tts' : 'chat';
  const mods = await modulesOf();
  if (kind === 'chat' && !mods.aiGeneration) {
    throw new HttpsError('failed-precondition', 'A geração por IA está desligada no painel.');
  }
  if (kind === 'tts' && !mods.tts) {
    throw new HttpsError('failed-precondition', 'A voz da Mina está desligada no painel.');
  }
  const key = OPENAI_API_KEY.value();
  if (!key) throw new HttpsError('failed-precondition', 'A chave da OpenAI ainda não foi configurada no servidor.');

  const used = await monthCalls();
  if (used >= AI_MONTHLY_CALL_CAP) {
    throw new HttpsError('resource-exhausted', 'Teto mensal de IA atingido.');
  }

  if (kind === 'chat') {
    await bumpUsage(body.model || 'gpt-4o-mini', 1);
    const input = typeof body.input === 'string' ? { system: '', user: body.input, maxTokens: 800 } : (body.input || {});
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        temperature: body.temperature ?? 0.9,
        max_tokens: input.maxTokens ?? 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: input.system || '' },
          { role: 'user', content: input.user || '' },
        ],
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new HttpsError('internal', `OpenAI ${response.status}: ${text.slice(0, 180)}`);
    }
    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new HttpsError('internal', 'Resposta vazia da IA');
    let json: unknown;
    try { json = JSON.parse(content); } catch {
      throw new HttpsError('internal', 'A IA não devolveu JSON válido');
    }
    const usage = { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 };
    await bumpUsage(body.model || 'gpt-4o-mini', 0, usage.inputTokens, usage.outputTokens);
    return body.withUsage ? { json, usage } : { json };
  }

  const text = typeof body.input === 'string' ? body.input : String((body.input as { user?: string } | undefined)?.user || '');
  if (!text.trim()) throw new HttpsError('invalid-argument', 'Texto vazio para a voz.');
  await bumpUsage(body.model || 'gpt-4o-mini-tts', 1, 0, 0, text.length);
  const speech = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: body.model || 'gpt-4o-mini-tts',
      voice: body.voice || 'nova',
      speed: 0.95,
      input: text,
      response_format: 'mp3',
    }),
  });
  if (!speech.ok) {
    const detail = await speech.text().catch(() => '');
    throw new HttpsError('internal', `OpenAI TTS ${speech.status}: ${detail.slice(0, 180)}`);
  }
  const buf = Buffer.from(await speech.arrayBuffer());
  const hash = createHash('sha256').update(`gpt-4o-mini-tts|${body.voice || 'nova'}|0.95|${text}`).digest('hex');
  const path = `english/tts/${hash}.mp3`;
  const file = getStorage().bucket().file(path);
  await file.save(buf, { contentType: 'audio/mpeg', metadata: { cacheControl: 'public, max-age=31536000, immutable' } });
  const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2490' });
  await db.doc(`englishAudio/${hash}`).set({ text, url, createdAt: new Date().toISOString() }, { merge: true });
  return { url };
});

export const agendaReminders = onSchedule({ region: REGION, schedule: 'every 5 minutes', timeZone: 'America/Sao_Paulo' }, async () => {
  const now = nowBrazil();
  const today = now.date;
  const tomorrow = addDays(today, 1);
  const [dated, weekly] = await Promise.all([
    db.collection('agenda').where('date', 'in', [today, tomorrow]).get(),
    db.collection('agenda').where('repeat', '==', 'weekly').limit(200).get(),
  ]);
  const seen = new Set<string>();
  const docs = [...dated.docs, ...weekly.docs].filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
  const admins = await db.collection('users').where('role', '==', 'admin').get();
  const adminTokens: string[] = [];
  for (const a of admins.docs) adminTokens.push(...await tokensOf(a.id));

  for (const snap of docs) {
    const data = snap.data() as {
      userId?: string;
      title?: string;
      kind?: string;
      date: string;
      time?: string;
      remindMinutesBefore?: number;
      remindedAt?: string;
      repeat?: string;
    };
    const item = {
      date: data.repeat === 'weekly' && data.date < today ? today : data.date,
      time: data.time,
      remindMinutesBefore: data.remindMinutesBefore,
      remindedAt: data.remindedAt,
    };
    if (!reminderDue(item, now)) continue;
    const title = String(data.title || 'Compromisso');
    const when = data.time ? `${data.date === tomorrow ? 'Amanhã' : 'Hoje'} ${data.time}` : (data.date === tomorrow ? 'Amanhã' : 'Hoje');
    const body = `${when}: ${title}. Já revisou?`;
    const childTokens = data.userId ? await tokensOf(data.userId) : [];
    await sendPush(childTokens, 'Agenda da Vila', body);
    if (data.kind === 'prova' || data.kind === 'compromisso') {
      await sendPush(adminTokens, 'Agenda da Vila', body);
    }
    await snap.ref.update({ remindedAt: `${now.date}T${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}` });
  }
});
