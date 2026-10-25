// Figurinha na Conversa (25/10/2026). A do jogo é a arte com balão de fala e um movimento próprio
// (mexe ao aparecer e a cada toque). A do Telegram, que o pai manda de lá, vem como imagem,
// animação (lottie) ou vídeo curto.
import React, { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { CHAT_STICKERS } from '../../data/stickers';
import { stickerUrl, type TgSticker } from '../../services/village/familyChat';
import { loadAnimationFile, loadPlayer } from './lottiePlayer';

const BY_ID = new Map(CHAT_STICKERS.map((s) => [s.id, s]));
/** Enfeite que sobe da figurinha */
const EXTRA: Record<string, string> = {
  'minerador-saudade': '💕',
  'minerador-te-amo': '❤️',
  'minerador-boa-noite': '💤',
  'sabio-durma-bem': '💤',
  'minerador-consegui': '✨',
  'sabio-orgulho': '⭐',
  'sabio-muito-bem': '✨',
  presente: '🎉',
};

const TgLottie: React.FC<{ url: string; size: number }> = ({ url, size }) => {
  const boxRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let alive = true;
    let anim: AnimationItem | null = null;
    Promise.all([loadPlayer(), loadAnimationFile(url)])
      .then(([lottie, data]) => {
        if (!alive) return;
        anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, animationData: structuredClone(data) });
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => {
      alive = false;
      anim?.destroy();
    };
  }, [url]);
  if (failed) return <span className="mn-sticker-missing" style={{ width: size, height: size }}>figurinha</span>;
  return <span ref={boxRef} className="mn-sticker-lottie" style={{ width: size, height: size }} />;
};

const StickerView: React.FC<{ sticker?: string; tg?: TgSticker; size: number; replay?: number }> = ({ sticker, tg, size, replay = 0 }) => {
  if (sticker) {
    const def = BY_ID.get(sticker);
    const extra = EXTRA[sticker];
    return (
      <span key={replay} className={`mn-sticker anim-${def?.anim ?? 'bounce'}`} style={{ width: size, height: size }}>
        <img src={stickerUrl(sticker)} alt={def ? `Figurinha: ${def.label}` : 'Figurinha'} draggable={false} />
        {extra && (
          <span className="mn-sticker-extra" aria-hidden>
            <span>{extra}</span>
            <span>{extra}</span>
            <span>{extra}</span>
          </span>
        )}
      </span>
    );
  }
  if (!tg) return null;
  if (tg.kind === 'video') {
    return <video className="mn-sticker-video" src={tg.url} style={{ width: size, height: size }} autoPlay loop muted playsInline aria-label="Figurinha" />;
  }
  if (tg.kind === 'lottie') return <TgLottie url={tg.url} size={size} />;
  return <img className="mn-sticker-img" src={tg.url} alt={tg.emoji ? `Figurinha ${tg.emoji}` : 'Figurinha'} style={{ width: size, height: size }} draggable={false} />;
};

export default StickerView;
