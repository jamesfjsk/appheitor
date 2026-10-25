// Emoji animado da Conversa (25/10/2026), como no Telegram: animação do Noto Emoji Animation
// (Google, CC BY 4.0), tocada quando aparece na tela e de novo a cada toque. Sem animação ou sem rede,
// fica o emoji desenhado pela fonte.
import React, { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { NOTO_ANIMATED } from '../../data/notoAnimated';
import { notoKey, notoLottieUrl } from '../../services/village/emojiTools';

type LottiePlayer = (typeof import('lottie-web/build/player/lottie_light'))['default'];

let player: Promise<LottiePlayer> | null = null;
const loadPlayer = (): Promise<LottiePlayer> => {
  player ??= import('lottie-web/build/player/lottie_light').then((m) => m.default);
  return player;
};

const files = new Map<string, Promise<unknown>>();
const loadFile = (key: string): Promise<unknown> => {
  let p = files.get(key);
  if (!p) {
    p = fetch(notoLottieUrl(key)).then((r) => {
      if (!r.ok) throw new Error(`emoji ${key}: ${r.status}`);
      return r.json();
    });
    p.catch(() => files.delete(key));
    files.set(key, p);
  }
  return p;
};

const AnimatedEmoji: React.FC<{
  emoji: string;
  size: number;
  /** quantas voltas a cada vez que toca */
  loops?: number;
  /** muda o número para tocar de novo */
  replay?: number;
  className?: string;
}> = ({ emoji, size, loops = 2, replay = 0, className }) => {
  const key = notoKey(emoji, NOTO_ANIMATED);
  const boxRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!key || !el) return;
    let alive = true;
    let seen: IntersectionObserver | null = null;
    Promise.all([loadPlayer(), loadFile(key)])
      .then(([lottie, data]) => {
        if (!alive) return;
        const anim = lottie.loadAnimation({
          container: el,
          renderer: 'svg',
          loop: loops,
          autoplay: false,
          animationData: structuredClone(data),
        });
        animRef.current = anim;
        anim.addEventListener('DOMLoaded', () => { if (alive) setReady(true); });
        seen = new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) anim.goToAndPlay(0, true);
        }, { threshold: 0.5 });
        seen.observe(el);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      seen?.disconnect();
      animRef.current?.destroy();
      animRef.current = null;
      setReady(false);
    };
  }, [key, loops]);

  useEffect(() => {
    if (replay) animRef.current?.goToAndPlay(0, true);
  }, [replay]);

  return (
    <span className={`mn-anim-emoji${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} aria-label={emoji} role="img">
      {!ready && <span className="mn-anim-emoji-text" style={{ fontSize: Math.round(size * 0.8) }} aria-hidden>{emoji}</span>}
      {key && <span ref={boxRef} className="mn-anim-emoji-box" style={{ opacity: ready ? 1 : 0 }} aria-hidden />}
    </span>
  );
};

export default AnimatedEmoji;
