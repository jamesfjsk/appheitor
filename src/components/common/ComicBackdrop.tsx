import React, { useEffect, useRef, useState } from 'react';

const TIKTOK_ID = '7682451095804857630';
const POSTER_SRC = '/bg/hq-comic.jpg';
const PLAYER_SRC =
  `https://www.tiktok.com/player/v1/${TIKTOK_ID}` +
  '?autoplay=1&loop=1&muted=1&controls=0&progress_bar=0&play_button=0' +
  '&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0';
const EMBED_SRC = `https://www.tiktok.com/embed/v2/${TIKTOK_ID}`;

function pingPlayer(frame: Window | null | undefined) {
  if (!frame) return;
  frame.postMessage({ 'x-tiktok-player': true, type: 'mute' }, '*');
  frame.postMessage({ 'x-tiktok-player': true, type: 'play' }, '*');
}

const ComicBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => {
  const playerRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState(PLAYER_SRC);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(5);

  useEffect(() => {
    const fit = () => {
      setScale(Math.max(window.innerWidth / 325, window.innerHeight / 580) * 1.25);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    const kick = () => pingPlayer(playerRef.current?.contentWindow);
    kick();
    const interval = window.setInterval(kick, 2000);
    window.addEventListener('pointerdown', kick);

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data['x-tiktok-player'] !== true) return;
      if (data.type === 'onPlayerReady' || data.type === 'onStateChange') {
        pingPlayer(playerRef.current?.contentWindow);
        if (data.type === 'onPlayerReady' || data.value === 1) setReady(true);
      }
    };
    window.addEventListener('message', onMessage);

    const fallback = window.setTimeout(() => {
      setSrc((current) => (current === PLAYER_SRC ? EMBED_SRC : current));
    }, 2500);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(fallback);
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return (
    <div className={`hq-backdrop ${className}`} aria-hidden>
      <img
        className="hq-backdrop-art"
        src={POSTER_SRC}
        alt=""
        style={{ opacity: ready ? 0 : 1 }}
      />
      <div className="hq-tiktok-bleed">
        <iframe
          key={src}
          ref={playerRef}
          className="hq-tiktok-frame"
          src={src}
          title="Flash edit"
          allow="autoplay; encrypted-media; fullscreen; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
          onLoad={() => {
            pingPlayer(playerRef.current?.contentWindow);
            if (src === EMBED_SRC) setReady(true);
          }}
        />
      </div>
      <div className="hq-backdrop-wash" />
    </div>
  );
};

export default ComicBackdrop;
