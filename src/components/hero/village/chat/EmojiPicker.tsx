// Painel de emojis da Conversa (25/10/2026), no jeito do Telegram: busca em português, categorias
// numa faixa, rolagem única com títulos e recentes. O catálogo (1.8 mil emojis) só carrega quando abre.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Search, X } from 'lucide-react';
import type { EmojiGroup } from '../../../../data/emojiCatalog';
import { searchEmojis } from '../../../../services/village/emojiTools';
import { CHAT_STICKERS } from '../../../../data/stickers';
import { stickerUrl } from '../../../../services/village/familyChat';

const EmojiPicker: React.FC<{
  recent: string[];
  onPick: (emoji: string) => void;
  /** com isto aparece a aba Figurinhas; a figurinha vai na hora */
  onSticker?: (id: string) => void;
}> = ({ recent, onPick, onSticker }) => {
  const [mode, setMode] = useState<'emojis' | 'figurinhas'>('emojis');
  const [catalog, setCatalog] = useState<EmojiGroup[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>(recent.length ? 'recentes' : '');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    import('../../../../data/emojiCatalog')
      .then((m) => { if (alive) setCatalog(m.EMOJI_CATALOG); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const found = useMemo(() => (catalog && query.trim() ? searchEmojis(catalog, query) : null), [catalog, query]);
  const tabs = useMemo(
    () => [
      ...(recent.length ? [{ id: 'recentes', label: 'Recentes', icon: null as string | null }] : []),
      ...(catalog ?? []).map((g) => ({ id: g.id, label: g.label, icon: g.icon as string | null })),
    ],
    [catalog, recent.length],
  );

  const goTo = (id: string) => {
    setQuery('');
    setActive(id);
    window.requestAnimationFrame(() => {
      const box = scrollRef.current;
      const sec = box?.querySelector<HTMLElement>(`[data-sec="${id}"]`);
      if (box && sec) box.scrollTo({ top: sec.offsetTop - 4, behavior: 'smooth' });
    });
  };

  const onScroll = () => {
    const box = scrollRef.current;
    if (!box || query) return;
    const secs = [...box.querySelectorAll<HTMLElement>('[data-sec]')];
    const top = box.scrollTop + 24;
    const cur = secs.filter((s) => s.offsetTop <= top).pop();
    if (cur?.dataset.sec && cur.dataset.sec !== active) setActive(cur.dataset.sec);
  };

  const grid = (list: string[]) => (
    <div className="mn-ep-grid">
      {list.map((e, i) => (
        <button key={`${e}-${i}`} type="button" className="mn-ep-btn" onClick={() => onPick(e)} aria-label={`Pôr ${e}`}>
          {e}
        </button>
      ))}
    </div>
  );

  const modes = onSticker ? (
    <div className="mn-ep-modes" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'emojis'} className={`mn-ep-mode${mode === 'emojis' ? ' is-on' : ''}`} onClick={() => setMode('emojis')}>
        Emojis
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'figurinhas'}
        className={`mn-ep-mode${mode === 'figurinhas' ? ' is-on' : ''}`}
        onClick={() => setMode('figurinhas')}
        data-testid="chat-stickers-tab"
      >
        Figurinhas
      </button>
    </div>
  ) : null;

  if (onSticker && mode === 'figurinhas') {
    return (
      <div className="mn-ep" data-testid="chat-emoji-panel">
        {modes}
        <div className="mn-ep-scroll">
          <div className="mn-ep-stickers">
            {CHAT_STICKERS.map((st) => (
              <button
                key={st.id}
                type="button"
                className="mn-ep-sticker"
                onClick={() => onSticker(st.id)}
                aria-label={`Mandar a figurinha: ${st.label}`}
                title={st.label}
                data-testid={`sticker-${st.id}`}
              >
                <img src={stickerUrl(st.id)} alt="" loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mn-ep" data-testid="chat-emoji-panel">
      {modes}
      <div className="mn-ep-search">
        <Search className="mn-ep-search-icon" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar emoji: gato, pizza, kkk..."
          aria-label="Buscar emoji"
          data-testid="chat-emoji-search"
        />
        {query && (
          <button type="button" className="mn-ep-clear" onClick={() => setQuery('')} aria-label="Limpar a busca">
            <X />
          </button>
        )}
      </div>
      <div className="mn-ep-cats" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={!query && active === t.id}
            aria-label={t.label}
            title={t.label}
            className={`mn-ep-cat${!query && active === t.id ? ' is-on' : ''}`}
            onClick={() => goTo(t.id)}
          >
            {t.icon ?? <Clock3 />}
          </button>
        ))}
      </div>
      <div className="mn-ep-scroll" ref={scrollRef} onScroll={onScroll}>
        {failed && <p className="mn-ep-empty">Não deu para abrir os emojis. Tente de novo.</p>}
        {!catalog && !failed && <p className="mn-ep-empty">Abrindo os emojis...</p>}
        {found && (found.length ? grid(found) : <p className="mn-ep-empty">Nenhum emoji com essa palavra.</p>)}
        {catalog && !found && (
          <>
            {recent.length > 0 && (
              <section data-sec="recentes" className="mn-ep-sec">
                <h4>Recentes</h4>
                {grid(recent)}
              </section>
            )}
            {catalog.map((g) => (
              <section key={g.id} data-sec={g.id} className="mn-ep-sec">
                <h4>{g.label}</h4>
                {grid(g.emojis.map((x) => x.e))}
              </section>
            ))}
            <p className="mn-ep-credit">Emojis e animações: Google Noto Emoji, licença CC BY 4.0.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;
