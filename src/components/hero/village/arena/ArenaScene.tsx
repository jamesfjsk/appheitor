// Arena da Vila (25/10/2026): o lugar dos jogos de raciocínio (MUNDO.md, roteiro Etapa 4B).
// Começa pelo xadrez: contra o computador (4 níveis), contra o pai e a Escola do Sábio.
import React, { useMemo, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import BotGame from './BotGame';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSound } from '../../../../contexts/SoundContext';
import { useVillage } from '../../../../contexts/VillageContext';
import { BOT_LEVELS, PAID_WINS_PER_DAY, levelById, type Side } from '../../../../services/arena/chessGame';
import { readSavedBotGame, writeSavedBotGame, type SavedBotGame } from '../../../../services/arena/botSave';
import { claimKey, hasClaim } from '../../../../services/village/claims';
import { getTodayBrazil } from '../../../../utils/clock';
import { MATERIAL_LABELS } from '../../../../config/englishBase';

type View = 'menu' | 'niveis' | 'jogo';

const CAPATAZ = '/assets/village/npc/olheiro-iso.png';

const ArenaScene: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { childUid } = useAuth();
  const { village } = useVillage();
  const { playClick } = useSound();
  const [saved, setSaved] = useState<SavedBotGame | null>(() => (childUid ? readSavedBotGame(childUid) : null));
  const [view, setView] = useState<View>('menu');
  const [game, setGame] = useState<{ level: number; color: Side; resume: SavedBotGame | null; n: number } | null>(null);
  const [level, setLevel] = useState(saved?.level ?? 1);
  const today = getTodayBrazil();
  const paidToday = useMemo(
    () => Array.from({ length: PAID_WINS_PER_DAY }, (_, i) => claimKey('xadrez', 'vitoria', today, i + 1)).filter((k) => hasClaim(village, k)).length,
    [village, today],
  );

  if (!childUid) return null;

  const start = (lv: number, color: Side | 'sorteio', resume: SavedBotGame | null = null) => {
    playClick();
    const side: Side = color === 'sorteio' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    if (!resume) writeSavedBotGame(childUid, null);
    setSaved(null);
    setGame({ level: lv, color: side, resume, n: Date.now() });
    setView('jogo');
  };

  const back = () => {
    playClick();
    if (view === 'jogo') {
      setSaved(readSavedBotGame(childUid));
      setView('menu');
      setGame(null);
      return;
    }
    if (view === 'niveis') {
      setView('menu');
      return;
    }
    onClose();
  };

  const title = view === 'jogo' && game ? `Xadrez contra o ${levelById(game.level).name}` : view === 'niveis' ? 'Contra o computador' : 'Arena';

  return (
    <div className="ar-scene" data-testid="arena-scene">
      <header className="ar-head">
        <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={back} aria-label={view === 'menu' ? 'Sair da Arena' : 'Voltar'}>
          {view === 'menu' ? <X /> : <ArrowLeft />}
        </button>
        <h2 className="mc-title ar-title">{title}</h2>
        <span className="ar-head-pay" title="Vitórias que pagam por dia">
          Prêmio hoje: {paidToday}/{PAID_WINS_PER_DAY}
        </span>
      </header>

      {view === 'menu' && (
        <div className="ar-menu">
          <div className="ar-host">
            <img src={CAPATAZ} alt="" className="mc-pixel" />
            <p className="ar-host-line">
              Bem-vindo à Arena! Aqui a força é a cabeça. Hoje tem xadrez: escolha o seu adversário.
            </p>
          </div>
          {saved && (
            <button type="button" className="ar-resume" onClick={() => start(saved.level, saved.color, saved)} data-testid="arena-resume">
              Continuar a partida contra o {levelById(saved.level).name}
            </button>
          )}
          <div className="ar-doors">
            <button type="button" className="ar-door" onClick={() => { playClick(); setView('niveis'); }} data-testid="arena-bot">
              <img src="/assets/arena/pieces/wn.png" alt="" className="mc-pixel" />
              <span className="ar-door-title">Contra o computador</span>
              <span className="ar-door-sub">4 adversários, do Gato ao Sábio</span>
            </button>
            <div className="ar-door is-soon" aria-disabled>
              <img src="/assets/arena/pieces/wk.png" alt="" className="mc-pixel" />
              <span className="ar-door-title">Contra o pai</span>
              <span className="ar-door-sub">Cada um joga quando pode. Chega já já.</span>
            </div>
            <div className="ar-door is-soon" aria-disabled>
              <img src="/assets/village/npc/sabio-iso.png" alt="" className="mc-pixel" />
              <span className="ar-door-title">Escola do Sábio</span>
              <span className="ar-door-sub">Aprenda cada peça e resolva desafios. Chega já já.</span>
            </div>
          </div>
        </div>
      )}

      {view === 'niveis' && (
        <div className="ar-levels">
          {BOT_LEVELS.map((lv) => (
            <button
              key={lv.id}
              type="button"
              className={`ar-level${level === lv.id ? ' is-on' : ''}`}
              onClick={() => { playClick(); setLevel(lv.id); }}
              data-testid={`arena-level-${lv.id}`}
            >
              <img src={lv.image} alt="" className="mc-pixel" />
              <span className="ar-level-name">{lv.name}</span>
              <span className="ar-level-who">{lv.who}</span>
              <span className="ar-level-line">{lv.line}</span>
              <span className="ar-level-pay">
                Vitória: +{lv.xp} XP{lv.material ? ` e 1 ${MATERIAL_LABELS[lv.material].toLowerCase()}` : ''}
              </span>
            </button>
          ))}
          <div className="ar-colors">
            <p>Você joga com:</p>
            <button type="button" className="mc-btn mc-btn-stone min-h-[48px] px-4" onClick={() => start(level, 'w')} data-testid="arena-white">
              <img src="/assets/arena/pieces/wp.png" alt="" /> Brancas (você começa)
            </button>
            <button type="button" className="mc-btn mc-btn-dark min-h-[48px] px-4" onClick={() => start(level, 'b')}>
              <img src="/assets/arena/pieces/bp.png" alt="" /> Pretas
            </button>
            <button type="button" className="mc-btn mc-btn-gold min-h-[48px] px-4" onClick={() => start(level, 'sorteio')}>
              Sorteio
            </button>
          </div>
        </div>
      )}

      {view === 'jogo' && game && (
        <BotGame
          key={game.n}
          uid={childUid}
          level={game.level}
          color={game.color}
          resume={game.resume}
          onExit={() => { setView('niveis'); setGame(null); }}
          onRematch={(c) => start(game.level, c)}
        />
      )}
    </div>
  );
};

export default ArenaScene;
