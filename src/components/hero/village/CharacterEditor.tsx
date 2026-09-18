import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  COSMETICS,
  COSMETIC_ICON,
  FREE_COSMETIC_IDS,
  GEAR,
  GEAR_SPRITE,
  cosmeticHasSprite,
  cosmeticSwatchHex,
  pickaxeInfo,
} from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import { useData } from '../../../contexts/DataContext';
import { calculateLevelSystem } from '../../../utils/levelSystem';
import type { PickaxeLevel, VillageCharacter, VillageGear } from '../../../types/village';
import CharacterPreview from './CharacterPreview';
import GarmentIcon from './GarmentIcon';
import { lookKey } from './drawCharacter';

export type DollSlot =
  | 'hat'
  | 'cape'
  | 'shirt'
  | 'pants'
  | 'pet'
  | 'pickaxe'
  | 'boots'
  | 'lamp';

const DOLL_SLOTS: DollSlot[] = ['hat', 'cape', 'shirt', 'pants', 'pet', 'pickaxe', 'boots', 'lamp'];
const COSMETIC_SLOTS: Array<keyof VillageCharacter> = ['shirt', 'pants', 'hat', 'cape', 'pet'];
const OPTIONAL: Array<keyof VillageCharacter> = ['hat', 'cape', 'pet'];
const PICK_WOOD = '/assets/village/items/pickaxe-madeira.png';
const BOOTS = '/assets/village/items/boots.png';
const INV_CELLS = 12;

const SHORT: Record<DollSlot, string> = {
  hat: 'Capacete',
  cape: 'Capa',
  shirt: 'Camisa',
  pants: 'Calça',
  pet: 'Pet',
  pickaxe: 'Arma',
  boots: 'Botas',
  lamp: 'Luz',
};

const GHOST: Partial<Record<DollSlot, string>> = {
  hat: '/assets/village/items/cap.png',
  cape: '/assets/village/items/cape.png',
  pet: '/assets/village/pets/lobo.png',
  pickaxe: PICK_WOOD,
  boots: BOOTS,
  lamp: '/assets/village/items/lantern.png',
};

const HINT: Record<DollSlot, string> = {
  shirt: 'A camisa do minerador.',
  pants: 'A calça.',
  hat: 'O que vai na cabeça. Sem nada, fica o capacete da mina.',
  cape: 'O pano das costas. O cachecol fica no pescoço.',
  pet: 'O bicho que anda com você.',
  pickaxe: 'A picareta da mão. Quanto melhor, mais material e mais força na Mina.',
  boots: 'As botas. A Ferraria faz as novas.',
  lamp: 'A lanterna ainda não abriu.',
};

function ownedOf(id: string, free: boolean | undefined, owned: string[]): boolean {
  return Boolean(free) || FREE_COSMETIC_IDS.includes(id) || owned.includes(id);
}

function slotThumb(id: string, slot: DollSlot): React.ReactNode {
  if (slot === 'shirt' || slot === 'pants') {
    return <GarmentIcon kind={slot} hex={cosmeticSwatchHex(id) || undefined} />;
  }
  if (slot === 'cape') {
    return <GarmentIcon kind={id === 'cape_vila' ? 'scarf' : 'cape'} hex={cosmeticSwatchHex(id) || '#B33A2B'} />;
  }
  if (COSMETIC_ICON[id]) {
    return <img src={COSMETIC_ICON[id]} alt="" className="mn-eq-img mc-pixel" draggable={false} />;
  }
  return null;
}

function slotGhost(slot: DollSlot): React.ReactNode {
  if (slot === 'shirt' || slot === 'pants') {
    return <GarmentIcon kind={slot} ghost />;
  }
  if (slot === 'cape') {
    return <GarmentIcon kind="cape" ghost />;
  }
  if (GHOST[slot]) {
    return <img src={GHOST[slot]} alt="" className="mn-eq-ghost mc-pixel" draggable={false} />;
  }
  return null;
}

function EqSlot({
  label,
  area,
  selected,
  onClick,
  children,
}: {
  label: string;
  area: DollSlot;
  selected: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  const empty = !children;
  return (
    <div className={`mn-eq-cell mn-eq-${area}`}>
      <button
        type="button"
        className={`mn-eq mc-slot ${selected ? 'is-on' : ''} ${empty ? 'is-empty' : ''}`}
        aria-label={label}
        title={label}
        onClick={onClick}
      >
        {children || slotGhost(area)}
      </button>
      <span className="mn-eq-lab">{SHORT[area]}</span>
    </div>
  );
}

const CharacterEditor: React.FC<{
  onClose: () => void;
  onBuy: () => void;
  onForge?: () => void;
  embedded?: boolean;
  startSlot?: DollSlot;
}> = ({ onClose, onBuy, onForge, embedded, startSlot = 'shirt' }) => {
  const { village, saveCharacter } = useVillage();
  const { progress } = useData();
  const { playClick } = useSound();
  const levelSys = calculateLevelSystem(progress.totalXP || 0);
  const level = levelSys.currentLevel;
  const [tab, setTab] = useState<DollSlot>(DOLL_SLOTS.includes(startSlot) ? startSlot : 'shirt');
  const [draft, setDraft] = useState<VillageCharacter>(village.character);
  const [lookGear, setLookGear] = useState<VillageGear>(village.gear);
  const dirty = lookKey(draft) !== lookKey(village.character);

  useEffect(() => {
    setLookGear((prev) => ({
      ...village.gear,
      pickaxe: prev.pickaxe > village.gear.pickaxe ? prev.pickaxe : village.gear.pickaxe,
    }));
  }, [village.gear.pickaxe, village.gear.boots, village.gear.helmet, village.gear.lamp, village.gear.cape]);

  const cosmetics = useMemo(
    () => COSMETICS.filter((c) => c.slot === tab && cosmeticHasSprite(c.id)),
    [tab]
  );
  const gearItems = useMemo(
    () => (tab === 'pickaxe' || tab === 'boots' || tab === 'lamp' ? GEAR.filter((g) => g.slot === tab) : []),
    [tab]
  );

  const lockedOnTab = cosmetics.some((c) => !ownedOf(c.id, c.free, village.owned));
  const currentName = (() => {
    if (tab === 'pickaxe') return pickaxeInfo(lookGear.pickaxe).label;
    if (tab === 'boots') return village.gear.boots >= 1 ? 'Botas' : 'Botas de couro';
    if (tab === 'lamp') return village.gear.lamp >= 1 ? 'Lanterna' : 'Vazio';
    const id = draft[tab as keyof VillageCharacter];
    if (!id) return 'Vazio';
    return COSMETICS.find((c) => c.id === id)?.label || String(id);
  })();
  const previewLocked = (() => {
    if (tab === 'pickaxe') return lookGear.pickaxe > village.gear.pickaxe;
    if (tab === 'boots' || tab === 'lamp') return false;
    const id = draft[tab as keyof VillageCharacter];
    if (!id) return false;
    const item = COSMETICS.find((c) => c.id === id);
    return Boolean(item) && !ownedOf(id, item?.free, village.owned);
  })();

  const pickCosmetic = (id: string | null, owned: boolean, minLevel?: number, price?: number) => {
    playClick();
    setDraft({ ...draft, [tab]: id });
    if (!id || owned) return;
    if (minLevel && level < minLevel) toast(`Libera no nível ${minLevel}`);
    else toast(price ? `Ainda não é seu · ${price}g na loja` : 'Ainda não é seu');
  };

  const pickGear = (id: string, owned: boolean, on: boolean, minLevel?: number) => {
    playClick();
    if (id === 'pickaxe_wood') {
      setLookGear({ ...village.gear, pickaxe: 0 });
      toast(village.gear.pickaxe === 0 ? 'Já está na mão' : 'Prévia da de madeira');
      return;
    }
    const gearDef = GEAR.find((x) => x.id === id);
    if (gearDef?.slot === 'pickaxe') {
      setLookGear({ ...village.gear, pickaxe: gearDef.level as PickaxeLevel });
      if (owned && village.gear.pickaxe === gearDef.level) {
        toast('Já está na mão');
        return;
      }
      if (owned) {
        toast('Já está com você');
        return;
      }
      toast(minLevel && level < minLevel ? `Prévia · libera no nível ${minLevel}` : 'Prévia · forja na Ferraria');
      return;
    }
    if (id === 'boots_leather') {
      toast(village.gear.boots === 0 ? 'Já está equipado' : 'As de couro são as iniciais');
      return;
    }
    if (id === 'lamp' && !owned) {
      toast('A lanterna ainda não abriu');
      return;
    }
    if (on) {
      toast('Já está equipado');
      return;
    }
    if (owned) {
      toast('Já está com você');
      return;
    }
    if (minLevel && level < minLevel) {
      toast(`Libera no nível ${minLevel}`);
      return;
    }
    toast('Isso se forja na Ferraria');
    onForge?.();
  };

  const ownedDraft = (): VillageCharacter => {
    const next = { ...draft };
    COSMETIC_SLOTS.forEach((slot) => {
      const id = next[slot];
      if (!id) return;
      const item = COSMETICS.find((c) => c.id === id);
      if (!item || ownedOf(id, item.free, village.owned)) return;
      if (slot === 'hat' || slot === 'cape' || slot === 'pet') {
        next[slot] = null;
        return;
      }
      const fallback = village.character[slot];
      if (fallback) next[slot] = fallback;
    });
    return next;
  };

  const save = () => {
    playClick();
    if (!dirty) return;
    const next = ownedDraft();
    if (lookKey(next) === lookKey(village.character)) {
      if (lookKey(next) !== lookKey(draft)) toast('Só o que você já tem foi salvo');
      if (!embedded) onClose();
      return;
    }
    if (lookKey(next) !== lookKey(draft)) toast('Só o que você já tem foi salvo');
    void saveCharacter(next);
    if (!embedded) onClose();
  };

  const go = (slot: DollSlot) => {
    playClick();
    setTab(slot);
  };

  const pickaxeSprite = pickaxeInfo(lookGear.pickaxe).sprite;

  const invCount = (tab === 'pickaxe' || tab === 'boots' ? 1 : 0)
    + (OPTIONAL.includes(tab as keyof VillageCharacter) ? 1 : 0)
    + cosmetics.length
    + gearItems.length;
  const pad = Math.max(0, INV_CELLS - invCount);

  const inner = (
    <div className="mn-ficha">
      <div className="mn-doll-wrap">
        <div className="mn-ficha-head">
          <p className="mn-panel-k">Equipado</p>
          <p className="mn-ficha-item">{village.characterName || 'Heitor'}</p>
        </div>
        <div className="mn-doll">
          <EqSlot area="cape" label="Capa" selected={tab === 'cape'} onClick={() => go('cape')}>
            {draft.cape ? slotThumb(draft.cape, 'cape') : null}
          </EqSlot>
          <EqSlot area="hat" label="Chapéu" selected={tab === 'hat'} onClick={() => go('hat')}>
            {draft.hat ? slotThumb(draft.hat, 'hat') : null}
          </EqSlot>
          <EqSlot area="pickaxe" label="Picareta" selected={tab === 'pickaxe'} onClick={() => go('pickaxe')}>
            <img src={pickaxeSprite} alt="" className="mn-eq-img mc-pixel" draggable={false} />
          </EqSlot>
          <EqSlot area="shirt" label="Camisa" selected={tab === 'shirt'} onClick={() => go('shirt')}>
            {slotThumb(draft.shirt, 'shirt')}
          </EqSlot>
          <div className={`mn-doll-body mn-look-stage ${previewLocked ? 'is-prev' : ''}`}>
            <CharacterPreview character={draft} gear={lookGear} size={176} />
            {previewLocked ? <span className="mn-look-prev">Prévia</span> : null}
          </div>
          <EqSlot area="lamp" label="Lanterna" selected={tab === 'lamp'} onClick={() => go('lamp')}>
            {village.gear.lamp >= 1 ? <img src={GEAR_SPRITE.lamp} alt="" className="mn-eq-img mc-pixel" draggable={false} /> : null}
          </EqSlot>
          <EqSlot area="pants" label="Calça" selected={tab === 'pants'} onClick={() => go('pants')}>
            {slotThumb(draft.pants, 'pants')}
          </EqSlot>
          <EqSlot area="boots" label="Botas" selected={tab === 'boots'} onClick={() => go('boots')}>
            <img src={BOOTS} alt="" className="mn-eq-img mc-pixel" draggable={false} />
          </EqSlot>
          <EqSlot area="pet" label="Pet" selected={tab === 'pet'} onClick={() => go('pet')}>
            {draft.pet ? slotThumb(draft.pet, 'pet') : null}
          </EqSlot>
        </div>
        <div className="mn-doll-plate">
          <p className="mn-doll-rank">Nv. {level} · {levelSys.levelTitle}</p>
          <span className="mn-doll-xp" aria-hidden="true">
            <span style={{ width: `${Math.round(levelSys.progressPercentage)}%` }} />
          </span>
        </div>
      </div>

      <div className="mn-ficha-inv">
        <div className="mn-ficha-head">
          <p className="mn-panel-k">{SHORT[tab]}</p>
          <p className="mn-ficha-item">{previewLocked ? `Prévia · ${currentName}` : currentName}</p>
        </div>
        <p className="mn-look-hint">
          {previewLocked
            ? (tab === 'pickaxe'
              ? (GEAR.find((g) => g.slot === 'pickaxe' && g.level === lookGear.pickaxe)?.effect || 'Prévia. Forja na Ferraria.')
              : 'Ainda não é seu. Pode ver, mas o salvar não grava.')
            : HINT[tab]}
        </p>
        <div className="mn-inv">
          {tab === 'pickaxe' && (
            <button
              type="button"
              className={`mn-inv-slot mc-slot ${lookGear.pickaxe === 0 ? 'is-on' : ''}`}
              title="Picareta de madeira"
              aria-label="Picareta de madeira"
              onClick={() => pickGear('pickaxe_wood', true, village.gear.pickaxe === 0)}
            >
              <img src={pickaxeInfo(0).sprite} alt="" className="mn-eq-img mc-pixel" draggable={false} />
            </button>
          )}
          {tab === 'boots' && (
            <button
              type="button"
              className={`mn-inv-slot mc-slot ${village.gear.boots === 0 ? 'is-on' : ''}`}
              title="Botas de couro"
              aria-label="Botas de couro"
              onClick={() => pickGear('boots_leather', true, village.gear.boots === 0)}
            >
              <img src={BOOTS} alt="" className="mn-eq-img mc-pixel" draggable={false} />
            </button>
          )}
          {OPTIONAL.includes(tab as keyof VillageCharacter) && (
            <button
              type="button"
              className={`mn-inv-slot mc-slot ${draft[tab as keyof VillageCharacter] == null ? 'is-on' : 'is-empty'}`}
              title="Nenhum"
              aria-label="Nenhum"
              onClick={() => pickCosmetic(null, true)}
            >
              {slotGhost(tab)}
            </button>
          )}
          {cosmetics.map((c) => {
            const owned = ownedOf(c.id, c.free, village.owned);
            const selected = draft[tab as keyof VillageCharacter] === c.id;
            const tooSoon = Boolean(c.minLevel && level < c.minLevel && !owned);
            const marco = !c.free && !(c.basePrice > 0);
            const tag = tooSoon ? `Nv.${c.minLevel}` : marco ? 'marco' : `${c.basePrice}g`;
            return (
              <button
                key={c.id}
                type="button"
                className={`mn-inv-slot mc-slot ${selected ? 'is-on' : ''} ${owned ? '' : 'is-lock'}`}
                title={owned ? c.label : tooSoon ? `Nível ${c.minLevel}` : marco ? 'Peça de marco' : `${c.basePrice}g na loja`}
                aria-label={c.label}
                onClick={() => pickCosmetic(c.id, owned, c.minLevel, c.basePrice)}
              >
                {slotThumb(c.id, tab)}
                {!owned && <span className="mn-inv-tag">{tag}</span>}
              </button>
            );
          })}
          {gearItems.map((g) => {
            const equipped = g.slot === 'pickaxe' ? village.gear.pickaxe : village.gear[g.slot];
            const owned = g.slot === 'pickaxe' ? equipped >= g.level : equipped >= 1;
            const on = g.slot === 'pickaxe' ? lookGear.pickaxe === g.level : owned;
            const tooSoon = Boolean(g.minLevel && level < g.minLevel && !owned);
            return (
              <button
                key={g.id}
                type="button"
                className={`mn-inv-slot mc-slot ${on ? 'is-on' : ''} ${owned ? '' : 'is-lock'}`}
                title={g.effect}
                aria-label={g.label}
                onClick={() => pickGear(g.id, owned, on, g.minLevel)}
              >
                <img src={GEAR_SPRITE[g.id]} alt="" className="mn-eq-img mc-pixel" draggable={false} />
                {!owned && <span className="mn-inv-tag">{tooSoon ? `Nv.${g.minLevel}` : g.id === 'lamp' ? '…' : 'forja'}</span>}
              </button>
            );
          })}
          {Array.from({ length: pad }, (_, i) => (
            <div key={`pad-${i}`} className="mn-inv-slot mc-slot is-empty" />
          ))}
        </div>
        <div className="mn-look-foot">
          {!embedded && (
            <button type="button" className="mc-btn mc-btn-stone h-12 px-4 font-bold" onClick={() => { playClick(); onClose(); }}>
              Fechar
            </button>
          )}
          <button
            type="button"
            data-testid="look-save"
            disabled={!dirty}
            className={`mc-btn flex-1 h-12 font-bold ${dirty ? 'mc-btn-gold' : 'mc-btn-stone'}`}
            onClick={save}
          >
            {dirty ? 'Salvar visual' : 'Salvo'}
          </button>
          {lockedOnTab && (
            <button type="button" className="mc-btn mc-btn-dark h-12 px-3 font-bold" onClick={() => { playClick(); onBuy(); }}>
              Loja
            </button>
          )}
          {(tab === 'pickaxe' || tab === 'boots' || tab === 'lamp') && onForge && (
            <button type="button" className="mc-btn mc-btn-stone h-12 px-3 font-bold" onClick={() => { playClick(); onForge(); }}>
              Ferraria
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) return inner;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mn-veil" onClick={onClose}>
      <div className="mc-modal mc-pop mn-child-sheet rounded-lg max-w-3xl w-full text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center shrink-0">
          <h2 className="mc-title text-sm">Personagem</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mn-child-body p-4">{inner}</div>
      </div>
    </div>
  );
};

export default CharacterEditor;
