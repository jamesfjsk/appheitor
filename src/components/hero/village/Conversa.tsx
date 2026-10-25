// Conversa com o pai (pedido do pai, 13/10/2026). O pai responde pelo painel ou pelo Telegram.
// As mensagens chegam do VillageHome, que também conta as não lidas para o selo no topo.
// 25/10: emojis, reações nas mensagens do pai, balões agrupados e "visto" com dois tiques.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Check, CheckCheck, ImagePlus, SendHorizontal, Smile, SmilePlus, X } from 'lucide-react';
import ChildSheet from './ChildSheet';
import { useSound } from '../../../contexts/SoundContext';
import { setAppBusy } from '../../../services/appUpdate';
import { markChatRead, sendChatMessage, setChatReaction, type ChatMeta } from '../../../services/familyChatService';
import {
  CHAT_MAX_CHARS,
  CHAT_REACTIONS,
  EMOJI_GROUPS,
  canSend,
  chatClock,
  chatDay,
  chatDayLabel,
  chatGroup,
  insertAtCaret,
  isEmojiOnly,
  lastSeenLine,
  seenByOther,
  unreadFor,
  type ChatMessage,
} from '../../../services/village/familyChat';

const NOTE = '/assets/english/ui/base/c_note.webp';
const RECENT_KEY = 'mm_chat_recent_emojis';
const RECENT_MAX = 16;

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((e): e is string => typeof e === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch { /* aba privada */ }
}

const Conversa: React.FC<{
  childUid: string;
  messages: ChatMessage[];
  meta: ChatMeta;
  onClose: () => void;
}> = ({ childUid, messages, meta, onClose }) => {
  const { playClick, playQuill, playError } = useSound();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [emojiTab, setEmojiTab] = useState<string>(() => (readRecent().length ? 'recentes' : EMOJI_GROUPS[0].id));
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const unread = unreadFor(messages, 'filho', meta.childReadAt);
  const lastId = messages.length ? messages[messages.length - 1].id : '';

  // Rascunho ou foto subindo: a versão nova do app espera
  useEffect(() => {
    setAppBusy('chat', Boolean(text.trim() || photo || sending));
    return () => setAppBusy('chat', false);
  }, [text, photo, sending]);

  useEffect(() => {
    if (unread > 0 || !meta.childReadAt) void markChatRead(childUid, 'filho').catch(() => undefined);
  }, [childUid, unread, meta.childReadAt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      playError();
      toast('Só dá para mandar foto ou imagem.');
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const dropPhoto = () => {
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const putEmoji = (emoji: string) => {
    playClick();
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = insertAtCaret(text, start, end, emoji);
    setText(next.text);
    const list = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, RECENT_MAX);
    setRecent(list);
    saveRecent(list);
    window.requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  };

  const send = async () => {
    if (sending || !canSend(text, Boolean(photo))) return;
    const body = text;
    const pic = photo;
    playQuill();
    setSending(true);
    setText('');
    setEmojiOpen(false);
    if (!pic) setSending(false);
    try {
      await sendChatMessage(childUid, 'filho', body, pic, 'app');
      if (pic) dropPhoto();
    } catch (e) {
      playError();
      setText(body);
      toast(e instanceof Error && e.message ? e.message : 'Não deu para enviar. Tente de novo.');
    } finally {
      if (pic) setSending(false);
    }
  };

  const react = (m: ChatMessage, emoji: string) => {
    playClick();
    setReactingTo(null);
    void setChatReaction(childUid, m.id, m.reaction === emoji ? null : emoji).catch(() => {
      playError();
      toast('Não deu para reagir. Tente de novo.');
    });
  };

  const seen = seenByOther(messages, 'filho', meta.parentReadAt);
  const nowIso = new Date().toISOString();
  const tabs = recent.length ? [{ id: 'recentes', label: 'Recentes', emojis: recent }, ...EMOJI_GROUPS] : EMOJI_GROUPS;
  const shownTab = tabs.find((t) => t.id === emojiTab) ?? tabs[0];

  const header = (
    <div className="mn-wood-head mn-chat-head">
      <span className="mn-chat-avatar" aria-hidden>P</span>
      <div className="min-w-0 flex-1">
        <h2 className="mc-title text-sm truncate">Conversa com o pai</h2>
        <p className="mn-chat-status" data-testid="chat-status">{lastSeenLine(meta.parentReadAt, nowIso)}</p>
      </div>
      <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0 shrink-0" onClick={onClose} aria-label="Fechar">
        <X />
      </button>
    </div>
  );

  const footer = (
    <div className="mn-chat-compose">
      {emojiOpen && (
        <div className="mn-chat-emoji" data-testid="chat-emoji-panel">
          <div className="mn-chat-emoji-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={shownTab.id === t.id}
                className={`mn-chat-emoji-tab${shownTab.id === t.id ? ' is-on' : ''}`}
                onClick={() => { playClick(); setEmojiTab(t.id); }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mn-chat-emoji-grid">
            {shownTab.emojis.map((e) => (
              <button key={e} type="button" className="mn-chat-emoji-btn" onClick={() => putEmoji(e)} aria-label={`Pôr ${e}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
      {preview && (
        <div className="mn-chat-preview">
          <img src={preview} alt="Foto escolhida" />
          <button type="button" className="mc-btn mc-btn-dark w-8 h-8 p-0" onClick={dropPhoto} aria-label="Tirar a foto" disabled={sending}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="mn-chat-compose-row">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
        <div className="mn-chat-field">
          <button
            type="button"
            className={`mn-chat-icon${emojiOpen ? ' is-on' : ''}`}
            data-testid="chat-emoji"
            onClick={() => { playClick(); setEmojiOpen((v) => !v); }}
            aria-label="Emojis"
            aria-expanded={emojiOpen}
            title="Emojis"
          >
            <Smile />
          </button>
          <textarea
            ref={inputRef}
            className="mn-chat-input"
            data-testid="chat-input"
            value={text}
            maxLength={CHAT_MAX_CHARS}
            rows={1}
            placeholder="Escreva para o seu pai..."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            className="mn-chat-icon"
            data-testid="chat-photo"
            onClick={() => { playClick(); fileRef.current?.click(); }}
            disabled={sending}
            aria-label="Mandar foto"
            title="Mandar foto"
          >
            <ImagePlus />
          </button>
        </div>
        <button
          type="button"
          className="mn-chat-send"
          data-testid="chat-send"
          onClick={() => void send()}
          disabled={sending || !canSend(text, Boolean(photo))}
          aria-label={sending ? 'Enviando' : 'Enviar'}
          title="Enviar"
        >
          {sending ? <span className="mn-chat-spin" aria-hidden /> : <SendHorizontal />}
        </button>
      </div>
    </div>
  );

  return (
    <ChildSheet onClose={onClose} header={header} footer={footer} wide="md" className="mn-chat-sheet">
      <div className="mn-chat-list" data-testid="chat-list" onClick={() => setReactingTo(null)}>
        {messages.length === 0 && (
          <div className="mn-chat-empty">
            <img src={NOTE} alt="" className="mc-pixel" draggable={false} />
            <p className="font-bold">Escreva para o seu pai.</p>
            <p className="mc-muted text-sm">Ele lê e responde por aqui. Dá para mandar foto e emoji também.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const day = chatDay(m.at);
          const newDay = i === 0 || (day && day !== chatDay(messages[i - 1].at));
          const mine = m.from === 'filho';
          const { first, last } = chatGroup(messages, i);
          const big = !m.image && isEmojiOnly(m.text);
          const lastMine = mine && !messages.slice(i + 1).some((x) => x.from === 'filho');
          const read = mine && Boolean(m.at && meta.parentReadAt && meta.parentReadAt >= m.at);
          const rowClass = [
            'mn-chat-row',
            mine ? 'is-filho' : 'is-pai',
            first || newDay ? 'is-first' : '',
            last ? 'is-last' : '',
            m.reaction ? 'has-react' : '',
          ].filter(Boolean).join(' ');
          return (
            <React.Fragment key={m.id}>
              {newDay && <div className="mn-chat-day">{chatDayLabel(m.at, nowIso)}</div>}
              <div className={rowClass} data-testid={mine ? 'chat-msg-filho' : 'chat-msg-pai'}>
                <div
                  className={`mn-chat-bubble${big ? ' is-big' : ''}`}
                  onClick={(e) => {
                    if (mine) return;
                    e.stopPropagation();
                    setReactingTo((v) => (v === m.id ? null : m.id));
                  }}
                >
                  {!mine && (first || newDay) && !big && <span className="mn-chat-who">Pai</span>}
                  {m.image && (
                    <button
                      type="button"
                      className="mn-chat-img-btn"
                      onClick={(e) => { e.stopPropagation(); playClick(); setZoom(m.image!.url); }}
                      aria-label="Ver a foto grande"
                    >
                      <img
                        src={m.image.url}
                        alt="Foto"
                        className="mn-chat-img"
                        onLoad={() => { if (i >= messages.length - 3) endRef.current?.scrollIntoView({ block: 'end' }); }}
                      />
                    </button>
                  )}
                  {m.text && <span className={big ? 'mn-chat-big' : 'mn-chat-text'}>{m.text}</span>}
                  <span className="mn-chat-meta">
                    {chatClock(m.at)}
                    {mine && m.at && (read
                      ? <CheckCheck className="mn-chat-tick is-read" aria-label="O pai viu" />
                      : <Check className="mn-chat-tick" aria-label="Enviada" />)}
                  </span>
                  {m.reaction && <span className="mn-chat-react-badge" data-testid="chat-reaction">{m.reaction}</span>}
                </div>
                {!mine && (
                  <button
                    type="button"
                    className="mn-chat-react-btn"
                    data-testid="chat-react-open"
                    onClick={(e) => { e.stopPropagation(); playClick(); setReactingTo((v) => (v === m.id ? null : m.id)); }}
                    aria-label="Reagir"
                    title="Reagir"
                  >
                    <SmilePlus />
                  </button>
                )}
                {reactingTo === m.id && (
                  <div className="mn-chat-react-bar" role="menu" onClick={(e) => e.stopPropagation()}>
                    {CHAT_REACTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="menuitem"
                        className={`mn-chat-react-pick${m.reaction === r ? ' is-on' : ''}`}
                        onClick={() => react(m, r)}
                        aria-label={m.reaction === r ? `Tirar ${r}` : `Reagir com ${r}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {lastMine && seen && <div className="mn-chat-seen">O pai viu</div>}
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>
      {zoom && createPortal(
        <div className="mn-chat-zoom" role="dialog" aria-label="Foto" onClick={(e) => { e.stopPropagation(); setZoom(null); }}>
          <img src={zoom} alt="Foto" />
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0 mn-chat-zoom-x" aria-label="Fechar a foto" onClick={(e) => { e.stopPropagation(); setZoom(null); }}>
            <X />
          </button>
        </div>,
        document.body,
      )}
    </ChildSheet>
  );
};

export default Conversa;
