// Fundo da Conversa (25/10/2026): cenas do jogo, fundos desenhados e a foto dele.
// A escolha fica no aparelho (localStorage); a foto também, comprimida.
import React, { useRef } from 'react';
import { Check, ImagePlus, X } from 'lucide-react';
import { CHAT_WALLPAPERS } from '../../../../services/village/emojiTools';

const WallpaperPicker: React.FC<{
  current: string;
  photo: string | null;
  onPick: (id: string) => void;
  onPhoto: (file: File) => void;
  onClose: () => void;
}> = ({ current, photo, onPick, onPhoto, onClose }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mn-wall-pop" role="dialog" aria-label="Fundo da conversa" data-testid="chat-wall-panel" onClick={(e) => e.stopPropagation()}>
      <div className="mn-wall-pop-head">
        <span className="font-bold">Fundo da conversa</span>
        <button type="button" className="mn-chat-icon is-dark" onClick={onClose} aria-label="Fechar">
          <X />
        </button>
      </div>
      <div className="mn-wall-grid">
        {CHAT_WALLPAPERS.map((w) => {
          const isFoto = w.id === 'foto';
          const image = isFoto ? photo : w.image;
          return (
            <button
              key={w.id}
              type="button"
              className={`mn-wall-tile wall-${w.id}${image ? ' has-image' : ''}${current === w.id ? ' is-on' : ''}`}
              style={image ? ({ '--chat-wall': `url("${image}")` } as React.CSSProperties) : undefined}
              onClick={() => (isFoto && !photo ? fileRef.current?.click() : onPick(w.id))}
              data-testid={`chat-wall-${w.id}`}
            >
              {isFoto && !photo && <ImagePlus className="mn-wall-plus" aria-hidden />}
              {current === w.id && <Check className="mn-wall-check" aria-hidden />}
              <span className="mn-wall-label">{w.label}</span>
            </button>
          );
        })}
      </div>
      {photo && (
        <button type="button" className="mn-wall-change" onClick={() => fileRef.current?.click()}>
          Trocar a minha foto
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default WallpaperPicker;
