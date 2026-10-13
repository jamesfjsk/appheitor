// Conversa com o pai (pedido do pai, 13/10/2026). O pai responde pelo painel ou pelo Telegram.
// As mensagens chegam do VillageHome, que também conta as não lidas para o selo no topo.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import ChildSheet from './ChildSheet';
import { useSound } from '../../../contexts/SoundContext';
import { setAppBusy } from '../../../services/appUpdate';
import { markChatRead, sendChatMessage, type ChatMeta } from '../../../services/familyChatService';
import { CHAT_MAX_CHARS, canSend, chatClock, chatDay, chatDayLabel, seenByOther, unreadFor, type ChatMessage } from '../../../services/village/familyChat';

const NOTE = '/assets/english/ui/base/c_note.webp';

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
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const send = async () => {
    if (sending || !canSend(text, Boolean(photo))) return;
    const body = text;
    const pic = photo;
    playQuill();
    setSending(true);
    setText('');
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

  const seen = seenByOther(messages, 'filho', meta.parentReadAt);
  const nowIso = new Date().toISOString();

  const footer = (
    <div className="mn-chat-compose">
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
        <button
          type="button"
          className="mc-btn mc-btn-dark min-h-[44px] px-3 shrink-0"
          data-testid="chat-photo"
          onClick={() => { playClick(); fileRef.current?.click(); }}
          disabled={sending}
        >
          Foto
        </button>
        <textarea
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
          className="mc-btn mc-btn-green min-h-[44px] px-4 shrink-0"
          data-testid="chat-send"
          onClick={() => void send()}
          disabled={sending || !canSend(text, Boolean(photo))}
        >
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );

  return (
    <ChildSheet onClose={onClose} title="Conversa com o pai" footer={footer} wide="md" className="mn-chat-sheet">
      <div className="mn-chat-list" data-testid="chat-list">
        {messages.length === 0 && (
          <div className="mn-chat-empty">
            <img src={NOTE} alt="" className="mc-pixel" draggable={false} />
            <p className="font-bold">Escreva para o seu pai.</p>
            <p className="mc-muted text-sm">Ele lê e responde por aqui. Dá para mandar foto também.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const day = chatDay(m.at);
          const newDay = i === 0 || (day && day !== chatDay(messages[i - 1].at));
          const lastMine = m.from === 'filho' && !messages.slice(i + 1).some((x) => x.from === 'filho');
          return (
            <React.Fragment key={m.id}>
              {newDay && <div className="mn-chat-day">{chatDayLabel(m.at, nowIso)}</div>}
              <div className={`mn-chat-row ${m.from === 'pai' ? 'is-pai' : 'is-filho'}`}>
                <div className="mn-chat-bubble">
                  {m.from === 'pai' && <span className="mn-chat-who">Pai</span>}
                  {m.image && (
                    <button type="button" className="mn-chat-img-btn" onClick={() => { playClick(); setZoom(m.image!.url); }} aria-label="Ver a foto grande">
                      <img
                        src={m.image.url}
                        alt="Foto"
                        className="mn-chat-img"
                        onLoad={() => { if (i >= messages.length - 3) endRef.current?.scrollIntoView({ block: 'end' }); }}
                      />
                    </button>
                  )}
                  {m.text && <span className="mn-chat-text">{m.text}</span>}
                  <span className="mn-chat-meta">{chatClock(m.at)}</span>
                </div>
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
