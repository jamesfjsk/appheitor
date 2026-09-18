// ========================================
// A Base: contrato do Comerciante. Ouvir por passo (sem texto), montar a sala por
// clique (item -> lugar -> relação + quantidade), avaliar pelo estado final.
// A partir da 2ª escuta de um passo aparece a frase com lacunas; o texto completo
// só depois da 1ª entrega com erro (1 nova entrega, teto 2 materiais).
// ========================================

import React, { useEffect, useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { MerchantPlacement, MerchantSpot, Relation } from '../../../../types/english';
import { MERCHANT_ITEMS, RELATION_EN, RELATION_PT, type MerchantItemDef } from '../../../../config/englishBase';
import { merchantMaterial } from '../../../../config/englishRewards';
import { evaluateRoom } from '../../../../services/english/merchantRoom';
import { playText, prefetchAudio, stopAudio } from '../../../../services/englishTts';
import type { ContractScreenProps } from './ContractShell';
import toast from 'react-hot-toast';

type Placement = MerchantPlacement & { key: number };
type Speaking = { step: number; stage: 'loading' | 'playing' } | null;

const itemDef = (id: string): MerchantItemDef | undefined => MERCHANT_ITEMS.find((it) => it.id === id);
const itemLabel = (id: string, qty: number): string => {
  const def = itemDef(id);
  if (!def) return id;
  return qty >= 2 ? def.plural : def.label;
};

const MerchantContract: React.FC<ContractScreenProps<'merchant'>> = ({ contract, sfx, onFinish }) => {
  const { content } = contract;
  const steps = content.steps;
  const [listens, setListens] = useState<number[]>(() => steps.map(() => 0));
  const [speaking, setSpeaking] = useState<Speaking>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ spot: MerchantSpot; relation: Relation; qty: number } | null>(null);
  const [textShown, setTextShown] = useState(false);
  const [perStep, setPerStep] = useState<boolean[] | null>(null);
  const [deliveries, setDeliveries] = useState(0);
  const [firstHits, setFirstHits] = useState<number | null>(null); // recompensa só pela primeira entrega (18/09)
  const [nextKey, setNextKey] = useState(1);
  const [confirmWrong, setConfirmWrong] = useState(false);

  useEffect(() => {
    prefetchAudio(content.sentences);
    return () => stopAudio();
  }, [content.sentences]);

  /** Estoque restante por item (bandeja menos o que já está na sala) */
  const remaining = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of content.items) map.set(it.id, it.stock);
    for (const p of placements) map.set(p.item, (map.get(p.item) ?? 0) - p.qty);
    return map;
  }, [content.items, placements]);

  const listen = async (i: number) => {
    if (speaking) return;
    setSpeaking({ step: i, stage: 'loading' });
    setListens((prev) => prev.map((n, k) => (k === i ? n + 1 : n)));
    // "carregando a voz" até o áudio começar (estimado); depois "tocando"
    const t = window.setTimeout(() => setSpeaking((s) => (s && s.step === i ? { step: i, stage: 'playing' } : s)), 700);
    await playText(content.sentences[i]);
    window.clearTimeout(t);
    setSpeaking(null);
  };

  const pickItem = (id: string) => {
    if ((remaining.get(id) ?? 0) <= 0) return;
    setMenu(null);
    setSelectedItem((cur) => (cur === id ? null : id));
  };

  const pickSpot = (spot: MerchantSpot) => {
    if (!selectedItem) return;
    if ((remaining.get(selectedItem) ?? 0) <= 0) return;
    setMenu({ spot, relation: spot.relations[0], qty: 1 });
  };

  const confirmMenu = () => {
    if (!menu || !selectedItem) return;
    setPlacements((prev) => [...prev, { key: nextKey, item: selectedItem, qty: menu.qty, relation: menu.relation, spot: menu.spot.id }]);
    setNextKey((k) => k + 1);
    setMenu(null);
    setSelectedItem(null);
    setConfirmWrong(false);
    sfx.hit(0);
  };

  const removePlacement = (key: number) => {
    setPlacements((prev) => prev.filter((p) => p.key !== key));
    setMenu(null);
    setConfirmWrong(false);
  };

  const deliver = () => {
    const ev = evaluateRoom(steps, placements);
    if (ev.hits !== steps.length && !confirmWrong) {
      setConfirmWrong(true);
      toast('Tem certeza? Ouça de novo', { id: 'child-notice' });
      return;
    }
    const n = deliveries + 1;
    setDeliveries(n);
    const plain = placements.map(({ item, qty, relation, spot }) => ({ item, qty, relation, spot }));
    const summary = plain.map((p) => `${p.qty} ${itemLabel(p.item, p.qty)} ${RELATION_EN[p.relation]} the ${p.spot}`).join('; ');
    if (ev.hits === steps.length || textShown) {
      if (ev.hits === steps.length) sfx.checkpoint();
      else sfx.miss();
      // o que paga é a primeira entrega; a segunda serve para ver e corrigir (decisão do pai em 18/09)
      const paidHits = firstHits === null ? ev.hits : firstHits;
      onFinish({
        score: paidHits,
        max: steps.length,
        materialEarned: merchantMaterial(paidHits, steps.length, textShown),
        answer: summary,
        details: { listens, textShown, deliveries: n, perStep: ev.perStep, placements: plain, firstHits: paidHits, finalHits: ev.hits },
      });
      return;
    }
    // 1ª entrega com erro: mostra o texto completo e libera uma nova entrega (só treino)
    sfx.miss();
    setFirstHits(ev.hits);
    setPerStep(ev.perStep);
    setTextShown(true);
    setMenu(null);
    setSelectedItem(null);
    setConfirmWrong(false);
  };

  const maxQty = menu && selectedItem ? Math.min(3, remaining.get(selectedItem) ?? 0) : 0;

  return (
    <div data-testid="merchant-contract">
      {/* Pedidos: um botão de ouvir por passo; lacunas a partir da 2ª escuta; texto completo depois do erro */}
      <p className="mc-font text-[9px] sm:text-[10px] mc-muted uppercase mb-2">Pedidos do comerciante</p>
      <div className="grid gap-2 mb-4">
        {steps.map((_, i) => {
          const isSpeaking = speaking?.step === i;
          const mark = perStep ? (perStep[i] ? 'mc-slot-good' : 'mc-slot-bad') : '';
          return (
            <div key={i} className={`mc-slot p-2 flex items-center gap-3 ${mark}`}>
              <button
                onClick={() => void listen(i)}
                disabled={speaking !== null}
                className={`mc-btn ${isSpeaking ? 'mc-btn-gold' : 'mc-btn-stone'} px-3 py-2 text-sm font-bold shrink-0 min-w-[7.5rem]`}
                data-testid={`listen-${i}`}
              >
                <Volume2 className="w-4 h-4" />
                {isSpeaking ? (speaking.stage === 'loading' ? 'Carregando a voz...' : 'Tocando...') : `Ouvir ${i + 1}`}
              </button>
              <div className="min-w-0 flex-1 text-sm text-white/90 leading-snug">
                {textShown ? (
                  <span className="font-bold">{content.sentences[i]}</span>
                ) : listens[i] >= 2 ? (
                  <span className="font-mono tracking-wide">{content.gapped[i]}</span>
                ) : (
                  <span className="mc-muted text-xs">{listens[i] === 0 ? 'Ouça o pedido' : 'Ouça de novo para ver a frase com lacunas'}</span>
                )}
                {perStep && <span className={`block text-[11px] mt-0.5 ${perStep[i] ? 'mc-good' : 'mc-bad'}`}>{perStep[i] ? 'Certo' : 'Confira este'}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sala: lugares com o que já foi colocado */}
      <p className="mc-font text-[9px] sm:text-[10px] mc-muted uppercase mb-2">
        Sala {selectedItem ? `(clique no lugar para colocar: ${itemLabel(selectedItem, 1)})` : ''}
      </p>
      <div className={`grid gap-2 mb-4 ${content.spots.length > 4 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {content.spots.map((spot) => {
          const here = placements.filter((p) => p.spot === spot.id);
          const active = menu?.spot.id === spot.id;
          return (
            <div
              key={spot.id}
              role={selectedItem ? 'button' : undefined}
              className={`mc-card p-2 flex flex-col items-center ${selectedItem ? 'mc-card-hover cursor-pointer' : ''} ${active ? 'mc-slot-selected' : ''}`}
              onClick={() => pickSpot(spot)}
              data-testid={`spot-${spot.id}`}
            >
              <img src={spot.image} alt="" className="w-14 h-14 sm:w-16 sm:h-16 mc-pixel" draggable={false} />
              <span className="mc-font text-[9px] text-white mt-1">{spot.label}</span>
              <div className="flex flex-wrap justify-center gap-1 mt-1 min-h-[1.5rem]">
                {here.map((p) => (
                  <button
                    key={p.key}
                    onClick={(e) => { e.stopPropagation(); removePlacement(p.key); }}
                    title="Tirar daqui"
                    className="mc-slot flex items-center gap-1 px-1 py-0.5 text-[10px] text-white"
                  >
                    <img src={itemDef(p.item)?.image} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                    {p.qty} {RELATION_EN[p.relation]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Menu: todas as relações permitidas do lugar e a quantidade */}
      {menu && selectedItem && (
        <div className="mc-paper rounded p-3 mb-4 text-gray-900" data-testid="placement-menu">
          <p className="text-sm font-bold mb-2">
            {menu.qty} {itemLabel(selectedItem, menu.qty)} ... the {menu.spot.label}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {menu.spot.relations.map((r) => (
              <button key={r} onClick={() => setMenu({ ...menu, relation: r })} className={`mc-btn ${menu.relation === r ? 'mc-btn-green' : 'mc-btn-stone'} px-3 py-1.5 text-sm font-bold`}>
                {RELATION_EN[r]} <span className="text-[10px] opacity-80">({RELATION_PT[r]})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-700 mr-1">Quantos?</span>
            {Array.from({ length: maxQty }, (_, k) => k + 1).map((q) => (
              <button key={q} onClick={() => setMenu({ ...menu, qty: q })} className={`mc-btn ${menu.qty === q ? 'mc-btn-green' : 'mc-btn-stone'} w-10 h-10 p-0 mc-font text-xs`}>{q}</button>
            ))}
            <button onClick={confirmMenu} className="mc-btn mc-btn-gold px-4 py-2 text-sm font-bold ml-auto" data-testid="placement-confirm">Colocar</button>
            <button onClick={() => setMenu(null)} className="mc-btn mc-btn-dark px-3 py-2 text-sm font-bold">Cancelar</button>
          </div>
        </div>
      )}

      {/* Bandeja com estoque */}
      <p className="mc-font text-[9px] sm:text-[10px] mc-muted uppercase mb-2">Bandeja</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {content.items.map((it) => {
          const def = itemDef(it.id);
          const left = remaining.get(it.id) ?? 0;
          const on = selectedItem === it.id;
          return (
            <button
              key={it.id}
              onClick={() => pickItem(it.id)}
              disabled={left <= 0}
              className={`mc-slot flex flex-col items-center p-2 w-20 ${on ? 'mc-slot-selected' : ''} ${left <= 0 ? 'opacity-40' : ''}`}
              data-testid={`item-${it.id}`}
            >
              <img src={def?.image} alt="" className="w-10 h-10 mc-pixel" draggable={false} />
              <span className="mc-font text-[10px] text-white mt-1">x{left}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button onClick={deliver} disabled={placements.length === 0} className="mc-btn mc-btn-green px-6 py-3 text-base font-bold uppercase" data-testid="deliver">
          {textShown ? 'Entregar de novo' : 'Entregar'}
        </button>
      </div>
    </div>
  );
};

export default MerchantContract;
