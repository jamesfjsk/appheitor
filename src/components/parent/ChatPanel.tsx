// Painel do pai: Conversa com o filho (13/10/2026). Tailwind branco e azul.
// O que o pai manda aqui aparece na pena do topo da Vila; o Telegram é opcional.
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  markChatRead,
  sendChatMessage,
  subscribeChat,
  subscribeChatMeta,
  subscribeTelegramLink,
  telegramSetup,
  type ChatMeta,
  type TelegramLink,
} from '../../services/familyChatService';
import { CHAT_MAX_CHARS, canSend, chatClock, chatDay, chatDayLabel, seenByOther, unreadFor, type ChatMessage } from '../../services/village/familyChat';

const TelegramCard: React.FC = () => {
  const [link, setLink] = useState<TelegramLink | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribeTelegramLink(setLink), []);

  const run = (action: 'link' | 'unlink' | 'test', ok: string) => {
    setBusy(action);
    void telegramSetup(action)
      .then(() => toast.success(ok))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : '';
        toast.error(msg.includes('TELEGRAM_BOT_TOKEN') || msg.includes('not-found') || msg.includes('internal')
          ? 'O robô do Telegram ainda não foi instalado no servidor.'
          : msg || 'Não deu certo.');
      })
      .finally(() => setBusy(null));
  };

  const linked = Boolean(link?.parentChatId);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
      <h3 className="text-lg font-bold text-gray-900">Telegram</h3>
      {link === undefined && <p className="text-sm text-gray-500">Carregando…</p>}
      {link !== undefined && linked && (
        <>
          <p className="text-sm text-gray-600">
            Ligado ao Telegram{link?.parentName ? ` de ${link.parentName}` : ''}
            {link?.botUsername ? ` pelo robô @${link.botUsername}` : ''}. O que ele escrever chega lá, com foto, e o que você responder lá
            aparece para ele na Vila.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('test', 'Mensagem de teste enviada ao seu Telegram.')}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Mandar um teste
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('unlink', 'Telegram desligado.')}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Desligar
            </button>
          </div>
        </>
      )}
      {link !== undefined && !linked && (
        <>
          <p className="text-sm text-gray-600">
            Para conversar com ele pelo Telegram: toque em "Ligar o Telegram", abra o link no celular e toque em "Começar". O link vale uma
            vez e só o seu Telegram fica ligado.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('link', 'Link criado. Abra no celular.')}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {link?.pairLink ? 'Criar outro link' : 'Ligar o Telegram'}
            </button>
            {link?.pairLink && (
              <a href={link.pairLink} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                Abrir no Telegram
              </a>
            )}
          </div>
          {link?.pairLink && <p className="break-all text-xs text-gray-400">{link.pairLink}</p>}
        </>
      )}
    </div>
  );
};

const ChatPanel: React.FC = () => {
  const { childUid } = useAuth();
  const [rows, setRows] = useState<ChatMessage[] | null>(null);
  const [meta, setMeta] = useState<ChatMeta>({});
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!childUid) return;
    const a = subscribeChat(childUid, setRows);
    const b = subscribeChatMeta(childUid, setMeta);
    return () => { a(); b(); };
  }, [childUid]);

  const unread = rows ? unreadFor(rows, 'pai', meta.parentReadAt) : 0;
  const lastId = rows?.length ? rows[rows.length - 1].id : '';

  useEffect(() => {
    if (childUid && rows && (unread > 0 || !meta.parentReadAt)) void markChatRead(childUid, 'pai').catch(() => undefined);
  }, [childUid, rows, unread, meta.parentReadAt]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  if (!childUid) return <p className="text-sm text-gray-500">Sem criança ligada a este painel.</p>;

  const dropPhoto = () => {
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const send = async () => {
    if (sending || !canSend(text, Boolean(photo))) return;
    setSending(true);
    try {
      await sendChatMessage(childUid, 'pai', text, photo, 'painel');
      setText('');
      dropPhoto();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Não deu para enviar.');
    } finally {
      setSending(false);
    }
  };

  const nowIso = new Date().toISOString();
  const seen = rows ? seenByOther(rows, 'pai', meta.childReadAt) : false;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 flex flex-col" style={{ height: 'min(70vh, 640px)' }}>
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">Conversa com ele</h3>
          <p className="text-sm text-gray-500">Ele vê na pena do topo da Vila, com aviso e som quando chega mensagem.</p>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 space-y-2" data-testid="parent-chat-list">
          {rows === null && <p className="text-sm text-gray-500">Carregando…</p>}
          {rows?.length === 0 && <p className="text-sm text-gray-500">Nenhuma mensagem ainda. Mande a primeira.</p>}
          {rows?.map((m, i) => {
            const day = chatDay(m.at);
            const newDay = i === 0 || (day && day !== chatDay(rows[i - 1].at));
            const mine = m.from === 'pai';
            const lastMine = mine && !rows.slice(i + 1).some((x) => x.from === 'pai');
            return (
              <React.Fragment key={m.id}>
                {newDay && (
                  <p className="text-center text-xs font-semibold text-gray-400 pt-2">{chatDayLabel(m.at, nowIso)}</p>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                    {m.image && (
                      <a href={m.image.url} target="_blank" rel="noreferrer" className="block mb-1">
                        <img
                          src={m.image.url}
                          alt="Foto"
                          className="max-h-64 max-w-full rounded-lg"
                          onLoad={() => { const el = listRef.current; if (el && i >= rows.length - 3) el.scrollTop = el.scrollHeight; }}
                        />
                      </a>
                    )}
                    {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                    <p className={`mt-1 text-right text-[11px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                      {m.via === 'telegram' ? 'pelo Telegram · ' : ''}{chatClock(m.at)}
                    </p>
                  </div>
                </div>
                {lastMine && seen && <p className="text-right text-xs text-gray-400">Ele viu</p>}
              </React.Fragment>
            );
          })}
        </div>
        <div className="border-t border-gray-100 p-3 space-y-2">
          {photo && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="truncate">Foto: {photo.name}</span>
              <button type="button" onClick={dropPhoto} disabled={sending} className="text-red-600 hover:underline">tirar</button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Foto
            </button>
            <textarea
              value={text}
              maxLength={CHAT_MAX_CHARS}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Escreva para ele…"
              className="min-w-0 flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !canSend(text, Boolean(photo))}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
      <TelegramCard />
    </div>
  );
};

export default ChatPanel;
