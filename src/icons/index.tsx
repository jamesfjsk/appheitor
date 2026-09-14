import { CartoonIcon } from './cartoon';
import { emojiSrc } from './emoji';

export const ICON_KEYS = [
  'bolt',
  'spark',
  'star',
  'trophy',
  'crown',
  'gem',
  'medal',
  'award',
  'target',
  'check',
  'lock',
  'gift',
  'gold',
  'fire',
  'rocket',
  'muscle',
  'brain',
  'runner',
  'hero',
  'shield',
  'heart',
  'calendar',
  'clock',
  'sun',
  'sunset',
  'moon',
  'water',
  'wind',
  'smile',
  'folder',
  'warning',
  'gamepad',
  'movie',
  'tv',
  'phone',
  'headphones',
  'ice-cream',
  'cookie',
  'pizza',
  'sandwich',
  'candy',
  'park',
  'swim',
  'home',
  'beach',
  'plane',
  'car',
  'bike',
  'teddy',
  'book',
  'art',
  'soccer',
  'music',
  'mic',
  'theater',
  'circus',
  'dice',
  'lego',
  'shirt',
  'sneaker',
  'party',
  'paint',
  'science',
  'city',
  'glove',
  'bell',
  'settings',
  'notes',
  'chart',
  'wrench',
  'history',
  'cake',
  'volume',
  'mute',
  'play',
  'xp',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export type IconGroup = 'badges' | 'rewards' | 'treats' | 'world' | 'hero';

const CRIMSON = '#C8102E';
const GOLD = '#E2B000';
const INK = '#1A1214';
const MUTED = '#6B6158';

type IconMeta = {
  label: string;
  group: IconGroup;
  ink: string;
};

const crimson = (label: string, group: IconGroup): IconMeta => ({ label, group, ink: CRIMSON });
const gold = (label: string, group: IconGroup): IconMeta => ({ label, group, ink: GOLD });
const ink = (label: string, group: IconGroup): IconMeta => ({ label, group, ink: INK });
const mute = (label: string, group: IconGroup): IconMeta => ({ label, group, ink: MUTED });

export const ICON_META: Record<IconKey, IconMeta> = {
  bolt: crimson('Raio', 'hero'),
  spark: gold('Fagulha', 'badges'),
  star: gold('Estrela', 'badges'),
  trophy: gold('Troféu', 'badges'),
  crown: gold('Coroa', 'badges'),
  gem: crimson('Gema', 'badges'),
  medal: gold('Medalha', 'badges'),
  award: gold('Prêmio', 'badges'),
  target: crimson('Alvo', 'hero'),
  check: crimson('Feito', 'badges'),
  lock: mute('Bloqueado', 'badges'),
  gift: crimson('Presente', 'rewards'),
  gold: gold('Gold', 'rewards'),
  fire: crimson('Chama', 'hero'),
  rocket: crimson('Foguete', 'hero'),
  muscle: crimson('Força', 'hero'),
  brain: crimson('Mente', 'hero'),
  runner: crimson('Corrida', 'hero'),
  hero: crimson('Herói', 'hero'),
  shield: crimson('Escudo', 'hero'),
  heart: crimson('Coração', 'hero'),
  calendar: ink('Calendário', 'hero'),
  clock: ink('Timer', 'hero'),
  sun: gold('Manhã', 'world'),
  sunset: crimson('Tarde', 'world'),
  moon: ink('Noite', 'world'),
  water: crimson('Água', 'world'),
  wind: ink('Vento', 'world'),
  smile: gold('Sorriso', 'hero'),
  folder: ink('Pasta', 'rewards'),
  warning: gold('Alerta', 'badges'),
  gamepad: crimson('Game', 'rewards'),
  movie: ink('Filme', 'rewards'),
  tv: ink('TV', 'rewards'),
  phone: ink('Tablet', 'rewards'),
  headphones: crimson('Fone', 'rewards'),
  'ice-cream': crimson('Sorvete', 'treats'),
  cookie: gold('Biscoito', 'treats'),
  pizza: crimson('Pizza', 'treats'),
  sandwich: gold('Lanche', 'treats'),
  candy: crimson('Doce', 'treats'),
  park: crimson('Parque', 'world'),
  swim: crimson('Piscina', 'world'),
  home: crimson('Casa', 'world'),
  beach: gold('Praia', 'world'),
  plane: ink('Viagem', 'world'),
  car: crimson('Carrinho', 'rewards'),
  bike: crimson('Bike', 'rewards'),
  teddy: gold('Brinquedo', 'rewards'),
  book: crimson('Livro', 'rewards'),
  art: crimson('Arte', 'rewards'),
  soccer: crimson('Esporte', 'rewards'),
  music: crimson('Música', 'rewards'),
  mic: ink('Microfone', 'rewards'),
  theater: crimson('Cinema', 'rewards'),
  circus: crimson('Circo', 'world'),
  dice: ink('Jogo', 'rewards'),
  lego: gold('Blocos', 'rewards'),
  shirt: crimson('Camiseta', 'rewards'),
  sneaker: crimson('Tênis', 'hero'),
  party: gold('Festa', 'treats'),
  paint: crimson('Pincel', 'rewards'),
  science: crimson('Ciência', 'hero'),
  city: ink('Cidade', 'world'),
  glove: crimson('Luva', 'hero'),
  bell: gold('Sino', 'hero'),
  settings: ink('Ajustes', 'badges'),
  notes: gold('Notas', 'rewards'),
  chart: crimson('Painel', 'badges'),
  wrench: ink('Ferramenta', 'badges'),
  history: ink('Histórico', 'badges'),
  cake: crimson('Bolo', 'treats'),
  volume: crimson('Som', 'hero'),
  mute: mute('Mudo', 'hero'),
  play: crimson('Play', 'hero'),
  xp: gold('XP', 'hero'),
};

const KEY_SET = new Set<string>(ICON_KEYS);

export function isIconKey(value: string): value is IconKey {
  return KEY_SET.has(value);
}

const EMOJI_TO_KEY: Record<string, IconKey> = {
  '⚡': 'bolt',
  '🛍️': 'gift',
  '🏪': 'home',
  '🏆': 'trophy',
  '🎮': 'gamepad',
  '🍦': 'ice-cream',
  '🍕': 'pizza',
  '🎬': 'movie',
  '📱': 'phone',
  '🎨': 'art',
  '⚽': 'soccer',
  '🎵': 'music',
  '🚗': 'car',
  '🧸': 'teddy',
  '📚': 'book',
  '🍭': 'candy',
  '🎪': 'circus',
  '🎯': 'target',
  '🎲': 'dice',
  '🎸': 'music',
  '🎤': 'mic',
  '🎭': 'theater',
  '🔥': 'fire',
  '💪': 'muscle',
  '🚀': 'rocket',
  '🌟': 'spark',
  '💎': 'gem',
  '👑': 'crown',
  '🥇': 'medal',
  '🥈': 'medal',
  '🥉': 'medal',
  '🏃': 'runner',
  '🧠': 'brain',
  '⭐': 'star',
  '🌅': 'sun',
  '☀️': 'sun',
  '🌙': 'moon',
  '🪙': 'gold',
  '🔒': 'lock',
  '✅': 'check',
  '📊': 'chart',
  '📝': 'notes',
  '🎂': 'cake',
  '🔔': 'bell',
  '📈': 'history',
  '💰': 'gold',
  '🔧': 'wrench',
  '💧': 'water',
  '🦸': 'hero',
  '🌬️': 'wind',
  '😊': 'smile',
  '🗂️': 'folder',
  '🧘': 'wind',
  '🧪': 'science',
  '🔬': 'science',
  '🧤': 'glove',
  '🌀': 'spark',
  '🌌': 'spark',
  '🏙️': 'city',
  '🔺': 'bolt',
  '👟': 'sneaker',
  '🏅': 'medal',
  '🎖️': 'award',
  '🏵️': 'award',
  '🎗️': 'award',
  '🎀': 'gift',
  '📺': 'tv',
  '🎧': 'headphones',
  '✈️': 'plane',
  '🏖️': 'beach',
  '🎉': 'party',
  '🧱': 'lego',
  '🚲': 'bike',
  '👕': 'shirt',
  '🏞️': 'park',
  '🍪': 'cookie',
  '🥪': 'sandwich',
  '🏊': 'swim',
  '🏠': 'home',
  '🎊': 'party',
  '⏰': 'clock',
  '🌈': 'spark',
  '🔊': 'volume',
  '🔇': 'mute',
  '⚡👑': 'crown',
  '🟥⚡': 'bolt',
  '🟡🌀': 'spark',
};

export function resolveIconKey(value?: string | null): IconKey {
  if (!value) return 'bolt';
  if (isIconKey(value)) return value;
  return EMOJI_TO_KEY[value] || EMOJI_TO_KEY[value.trim()] || 'star';
}

type IconProps = {
  name?: string | null;
  className?: string;
};

function EmojiGlyph({ name, className = 'w-5 h-5' }: { name: IconKey; className?: string }) {
  return (
    <img
      src={emojiSrc(name)}
      alt=""
      draggable={false}
      className={`emoji-glyph ${className}`}
    />
  );
}

export function CheckMark({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none">
      <path
        d="M3 8.2 6.4 11.5 13 4.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlashIcon({ name, className = 'w-5 h-5' }: IconProps) {
  if (name === 'logout') {
    return <CartoonIcon name="logout" className={className} />;
  }
  return <EmojiGlyph name={resolveIconKey(name)} className={className} />;
}

type BadgeProps = {
  name?: string | null;
  size?: number;
  className?: string;
  muted?: boolean;
};

export function IconBadge({ name, size = 44, className = '', muted = false }: BadgeProps) {
  const key = resolveIconKey(name);
  const meta = ICON_META[key];
  const glyph = Math.round(size * 0.62);
  const thick = size >= 48 ? 3 : 2;

  return (
    <span
      className={`icon-sticker ${muted ? 'icon-sticker-muted' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderWidth: thick,
        borderRadius: Math.max(10, Math.round(size * 0.28)),
        boxShadow: `${thick}px ${thick}px 0 #1A1214`,
        color: meta.ink,
      }}
      title={meta.label}
    >
      <span style={{ width: glyph, height: glyph }} className="relative z-[1] block">
        <EmojiGlyph name={key} className="h-full w-full" />
      </span>
    </span>
  );
}


export const PICKER_KEYS: IconKey[] = [
  'bolt', 'star', 'trophy', 'crown', 'gem', 'medal', 'target', 'fire', 'rocket', 'hero',
  'gift', 'gold', 'gamepad', 'movie', 'tv', 'phone', 'headphones',
  'ice-cream', 'cookie', 'pizza', 'sandwich', 'candy', 'cake',
  'park', 'swim', 'home', 'beach', 'plane', 'car', 'bike', 'teddy', 'book', 'art',
  'soccer', 'music', 'dice', 'lego', 'shirt', 'sneaker', 'party',
  'sun', 'sunset', 'moon', 'water', 'wind', 'smile', 'brain', 'muscle', 'runner', 'clock',
];

type PickerProps = {
  value: string;
  onChange: (key: IconKey) => void;
  error?: string;
};

export function IconPicker({ value, onChange, error }: PickerProps) {
  const selected = resolveIconKey(value);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <IconBadge name={selected} size={56} />
        <div>
          <p className="text-sm font-semibold text-gray-800">{ICON_META[selected].label}</p>
          <p className="text-xs text-gray-500">Símbolo oficial do Flash Missions</p>
        </div>
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 max-h-56 overflow-y-auto p-1 pr-2">
        {PICKER_KEYS.map((key) => {
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              title={ICON_META[key].label}
              className={`rounded-2xl p-1 transition-all ${
                active
                  ? 'ring-2 ring-red-600 ring-offset-2 scale-105'
                  : 'hover:scale-105 hover:ring-1 hover:ring-amber-400'
              }`}
            >
              <IconBadge name={key} size={36} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BrandMark({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#8B0D24" />
      <circle cx="32" cy="32" r="22" fill="#C8102E" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#FFD700" strokeWidth="3" />
      <path
        d="M35.2 10.5 18.4 33.8c-.6.8 0 1.9 1 1.9h11.2l-3.1 16.4c-.3 1.4 1.4 2.3 2.3 1.2L48.6 29c.7-.8.1-2.1-.9-2.1H36.2l2.8-14.8c.3-1.4-1.5-2.3-2.3-1.2z"
        fill="#FFD700"
      />
    </svg>
  );
}

export function SpeedScene({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 speed-scene-base" />
      <div className="absolute inset-0 speed-scene-halftone" />
      <div className="absolute -left-1/3 top-[18%] h-16 w-[160%] rotate-[-11deg] bg-gradient-to-r from-transparent via-yellow-300/25 to-transparent blur-[2px]" />
      <div className="absolute -left-1/4 top-[58%] h-10 w-[150%] rotate-[-8deg] bg-gradient-to-r from-transparent via-black/20 to-transparent" />
      <div className="absolute right-[-10%] top-[-8%] h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
    </div>
  );
}

export function categoryIcon(category: string): IconKey {
  switch (category) {
    case 'treat':
      return 'candy';
    case 'toy':
      return 'teddy';
    case 'activity':
      return 'gamepad';
    case 'privilege':
      return 'crown';
    default:
      return 'gift';
  }
}
