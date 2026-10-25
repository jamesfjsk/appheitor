// Conversa com o pai (pedido do pai, 13/10/2026). O pai responde pelo painel ou pelo Telegram.
// As mensagens chegam do VillageHome, que também conta as não lidas para o selo no topo.
// 25/10: emojis, reações, balões agrupados e "visto" com dois tiques.
// 25/10 (noite): painel de emojis do tamanho do Telegram, emoji animado, efeitos na tela e fundo à escolha.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Check, CheckCheck, ImagePlus, Palette, SendHorizontal, Smile, SmilePlus, X } from 'lucide-react';
import ChildSheet from './ChildSheet';
import EmojiPicker from './chat/EmojiPicker';
import WallpaperPicker from './chat/WallpaperPicker';
import AnimatedEmoji from '../../chat/AnimatedEmoji';
import ChatEffects, { type EffectShot } from '../../chat/ChatEffects';
import { useSound } from '../../../contexts/SoundContext';
import { setAppBusy } from '../../../services/appUpdate';
import { compressProofPhoto } from '../../../services/assignmentsService';
import { markChatRead, sendChatMessage, setChatReaction, type ChatMeta } from '../../../services/familyChatService';
import {
  CHAT_MAX_CHARS,
  CHAT_REACTIONS,
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
import { chatEffectFor, splitEmojis, wallpaperById, type ChatEffect } from '../../../services/village/emojiTools';

const NOTE = '/assets/english/ui/base/c_note.webp';
const RECENT_KEY = 'mm_chat_recent_emojis';
const RECENT_MAX = 24;
const wallKey = (uid: string) => `mm_chat_wall_${uid}`;
const photoKey = (uid: string) => `mm_chat_wall_photo_${uid}`;

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readRecent(): string[] {
  try {
    const raw = JSON.parse(readStore(RECENT_KEY) || '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((e): e is string => typeof e === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

const motionOk = (): boolean => {
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

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
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [wallId, setWallId] = useState<string>(() => readStore(wallKey(childUid)) || 'pedra');
  const [wallPhoto, setWallPhoto] = useState<string | null>(() => readStore(photoKey(childUid)));
  const [wallOpen, setWallOpen] = useState(false);
  const [shots, setShots] = useState<EffectShot[]>([]);
  const [replays, setReplays] = useState<Record<string, number>>({});
  const shotId = useRef(1);
  const lastSeenMsg = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
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

  const fire = useCallback((kind: ChatEffect | 'burst', emoji: string, rect?: DOMRect) => {
    if (!motionOk()) return;
    const id = shotId.current++;
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    setShots((list) => [...list.slice(-3), { id, kind, emoji, x, y }]);
  }, []);
  const doneShot = useCallback((id: number) => setShots((list) => list.filter((s) => s.id !== id)), []);

  // Mensagem nova de um emoji só (dele ou do pai) enche a tela, como no Telegram
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
    const before = lastSeenMsg.current;
    lastSeenMsg.current = lastId || null;
    if (!before || !lastId || before === lastId) return;
    const list = messagesRef.current;
    const m = list[list.length - 1];
    const fx = m && !m.image ? chatEffectFor(m.text) : null;
    if (fx) fire(fx.kind, fx.emoji);
  }, [lastId, fire]);

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
    writeStore(RECENT_KEY, JSON.stringify(list));
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

  const react = (m: ChatMessage, emoji: string, rect?: DOMRect) => {
    playClick();
    setReactingTo(null);
    if (m.reaction !== emoji) fire('burst', emoji, rect);
    void setChatReaction(childUid, m.id, m.reaction === emoji ? null : emoji).catch(() => {
      playError();
      toast('Não deu para reagir. Tente de novo.');
    });
  };

  const tapBig = (m: ChatMessage, el: HTMLElement) => {
    playClick();
    setReplays((r) => ({ ...r, [m.id]: (r[m.id] ?? 0) + 1 }));
    const list = splitEmojis(m.text);
    fire('burst', list[0] ?? m.text, el.getBoundingClientRect());
    const fx = chatEffectFor(m.text);
    if (fx) fire(fx.kind, fx.emoji);
  };

  const chooseWall = (id: string) => {
    playClick();
    setWallId(id);
    writeStore(wallKey(childUid), id);
  };

  const wallFromPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      playError();
      toast('Escolha uma foto ou imagem.');
      return;
    }
    try {
      const data = await blobToDataUrl(await compressProofPhoto(file));
      if (!writeStore(photoKey(childUid), data)) throw new Error('cheio');
      setWallPhoto(data);
      chooseWall('foto');
    } catch {
      playError();
      toast('Essa foto não coube. Tente outra.');
    }
  };

  const seen = seenByOther(messages, 'filho', meta.parentReadAt);
  const nowIso = new Date().toISOString();
  const wall = wallpaperById(wallId === 'foto' && !wallPhoto ? 'pedra' : wallId);
  const wallImage = wall.id === 'foto' ? wallPhoto : wall.image;

  const header = (
    <div className="mn-wood-head mn-chat-head">
      <span className="mn-chat-avatar" aria-hidden>P</span>
      <div className="min-w-0 flex-1">
        <h2 className="mc-title text-sm truncate">Conversa com o pai</h2>
        <p className="mn-chat-status" data-testid="chat-status">{lastSeenLine(meta.parentReadAt, nowIso)}</p>
      </div>
      <button
        type="button"
        className={`mc-btn mc-btn-dark w-11 h-11 p-0 shrink-0${wallOpen ? ' is-on' : ''}`}
        onClick={() => { playClick(); setWallOpen((v) => !v); }}
        aria-label="Fundo da conversa"
        title="Fundo da conversa"
        data-testid="chat-wall"
      >
        <Palette />
      </button>
      <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0 shrink-0" onClick={onClose} aria-label="Fechar">
        <X />
      </button>
    </div>
  );

  const footer = (
    <div className="mn-chat-compose">
      {emojiOpen && <EmojiPicker recent={recent} onPick={putEmoji} />}
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
    <ChildSheet
      onClose={onClose}
      header={header}
      footer={footer}
      wide="md"
      className={`mn-chat-sheet wall-${wall.id}${wallImage ? ' has-wall-image' : ''}`}
      style={wallImage ? ({ '--chat-wall': `url("${wallImage}")` } as React.CSSProperties) : undefined}
    >
      {wallOpen && (
        <WallpaperPicker
          current={wall.id}
          photo={wallPhoto}
          onPick={chooseWall}
          onPhoto={(f) => void wallFromPhoto(f)}
          onClose={() => setWallOpen(false)}
        />
      )}
      <div className="mn-chat-list" data-testid="chat-list" onClick={() => { setReactingTo(null); setWallOpen(false); }}>
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
          const bigList = big ? splitEmojis(m.text) : [];
          const bigSize = bigList.length === 1 ? 112 : bigList.length === 2 ? 84 : 64;
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
                    e.stopPropagation();
                    if (big) {
                      tapBig(m, e.currentTarget);
                      return;
                    }
                    if (!mine) setReactingTo((v) => (v === m.id ? null : m.id));
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
                  {big ? (
                    <span className="mn-chat-big" data-testid="chat-big-emoji">
                      {bigList.map((e, k) => (
                        <AnimatedEmoji key={`${e}-${k}`} emoji={e} size={bigSize} replay={replays[m.id] ?? 0} />
                      ))}
                    </span>
                  ) : (
                    m.text && <span className="mn-chat-text">{m.text}</span>
                  )}
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
                        onClick={(e) => react(m, r, e.currentTarget.getBoundingClientRect())}
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
      <ChatEffects shots={shots} onDone={doneShot} />
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
