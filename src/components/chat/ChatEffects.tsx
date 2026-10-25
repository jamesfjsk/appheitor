// Efeitos da Conversa (25/10/2026): estouro de emojis no toque e chuva na tela inteira para
// mensagens de um emoji só (coração, festa, fogo, risada, estrela), como as interações do Telegram.
import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { effectPieces, type ChatEffect } from '../../services/village/emojiTools';

export interface EffectShot {
  id: number;
  kind: ChatEffect | 'burst';
  emoji: string;
  /** centro do estouro, em pixels da janela */
  x: number;
  y: number;
}

const DURATION_MS = 2600;

function rand(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Piece {
  emoji: string;
  style: React.CSSProperties;
}

function piecesFor(shot: EffectShot): Piece[] {
  const r = rand(shot.id * 7919 + 13);
  const pool = shot.kind === 'burst' ? [shot.emoji] : effectPieces(shot.kind, shot.emoji);
  const out: Piece[] = [];
  if (shot.kind === 'burst') {
    for (let i = 0; i < 14; i++) {
      const angle = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.6;
      const dist = 70 + r() * 110;
      out.push({
        emoji: pool[0],
        style: {
          left: shot.x,
          top: shot.y,
          fontSize: 18 + r() * 18,
          animationName: 'mn-fx-burst',
          animationDuration: `${800 + r() * 500}ms`,
          animationDelay: `${r() * 80}ms`,
          ['--dx' as string]: `${Math.cos(angle) * dist}px`,
          ['--dy' as string]: `${Math.sin(angle) * dist}px`,
          ['--rot' as string]: `${(r() - 0.5) * 120}deg`,
          ['--sc' as string]: `${0.7 + r() * 0.6}`,
        },
      });
    }
    return out;
  }
  const falls = shot.kind === 'confete';
  for (let i = 0; i < 30; i++) {
    out.push({
      emoji: pool[Math.floor(r() * pool.length)],
      style: {
        left: `${r() * 100}vw`,
        top: falls ? '-8vh' : '104vh',
        fontSize: 22 + r() * 26,
        animationName: falls ? 'mn-fx-fall' : 'mn-fx-rise',
        animationDuration: `${1500 + r() * 900}ms`,
        animationDelay: `${r() * 600}ms`,
        ['--dx' as string]: `${(r() - 0.5) * 22}vw`,
        ['--dy' as string]: falls ? `${112 + r() * 10}vh` : `${-(112 + r() * 10)}vh`,
        ['--rot' as string]: `${(r() - 0.5) * 360}deg`,
        ['--sc' as string]: `${0.8 + r() * 0.5}`,
      },
    });
  }
  return out;
}

const Shot: React.FC<{ shot: EffectShot; onDone: (id: number) => void }> = ({ shot, onDone }) => {
  const pieces = useMemo(() => piecesFor(shot), [shot]);
  useEffect(() => {
    const t = window.setTimeout(() => onDone(shot.id), DURATION_MS);
    return () => window.clearTimeout(t);
  }, [shot.id, onDone]);
  return (
    <>
      {pieces.map((p, i) => (
        <span key={i} className="mn-fx-p" style={p.style}>{p.emoji}</span>
      ))}
    </>
  );
};

const ChatEffects: React.FC<{ shots: EffectShot[]; onDone: (id: number) => void }> = ({ shots, onDone }) => {
  if (!shots.length) return null;
  return createPortal(
    <div className="mn-fx" aria-hidden>
      {shots.map((s) => <Shot key={s.id} shot={s} onDone={onDone} />)}
    </div>,
    document.body,
  );
};

export default ChatEffects;
