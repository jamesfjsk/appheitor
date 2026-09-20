// ========================================
// Entrega do Comerciante: porta "jogo" (MINA_CONTRATOS.md §3.1).
// Tela cheia, armazém, arrastar com curva e estalo. Recompensa só da 1ª entrega.
// ========================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '../../../../contexts/DataContext';
import { useSound } from '../../../../contexts/SoundContext';
import { FirestoreService } from '../../../../services/firestoreService';
import { completeContract } from '../../../../services/englishBaseService';
import { playText, prefetchAudio, stopAudio, TTS_SPEED_SLOW } from '../../../../services/englishTts';
import { evaluateRoom } from '../../../../services/english/merchantRoom';
import {
  DEFAULT_MERCHANT_SCENE,
  DESIGN,
  MERCHANT_ANCHORS_URL,
  MERCHANT_BACKDROP,
  MERCHANT_SPRITE,
  addPlacement,
  assignAnchors,
  buildMerchantOutcome,
  correctionLine,
  gradeLine,
  praiseLine,
  hitSlot,
  itemDrawPos,
  liveSlotsForStep,
  parseMerchantScene,
  pickStageSpots,
  remainingStock,
  sentenceBits,
  NEXT_ORDER,
  zonesFor,
  type MerchantSceneDef,
  type StageSlot,
} from '../../../../services/english/merchantPlay';
import type { BaseDoc, BuildingId, Contract, ContractOutcome, MerchantPlacement } from '../../../../types/english';
import {
  CONTRACT_LABELS,
  MATERIAL_ICONS,
  MERCHANT_ITEMS,
  MERCHANT_SPOTS,
  RELATION_EN,
} from '../../../../config/englishBase';
import { mixSeed, seedFromString, seededShuffle } from '../../../../services/english/shuffle';
import type { MineSfx } from '../mine/sfx';
import type { CompleteReward } from './ContractResult';

type MerchantC = Extract<Contract, { type: 'merchant' }>;

interface Props {
  uid: string;
  date: string;
  contract: MerchantC;
  level: number;
  base: BaseDoc;
  sfx: MineSfx;
  onDone: () => void;
  onQuit: () => void;
  onBuildNow: (id: BuildingId) => void;
}

type Phase = 'play' | 'saving' | 'finale' | 'failed';
type FlyKind = 'snap' | 'slip' | 'store' | 'back';
type Beat = 'miss' | 'ok' | 'next' | null;

interface Fly {
  itemId: string;
  kind: FlyKind;
  from: { x: number; y: number };
  to: { x: number; y: number };
  started: number;
  dur: number;
  placement?: MerchantPlacement;
}

interface Hover {
  label: string;
  x: number;
  y: number;
}

const ITEM_PX = 56;
const SPOT_IMG = (id: string): string => MERCHANT_SPOTS.find((s) => s.id === id)?.image ?? '';
const ITEM_IMG = (id: string): string => MERCHANT_ITEMS.find((i) => i.id === id)?.image ?? '';
const ITEM_NAME = (id: string): string => MERCHANT_ITEMS.find((i) => i.id === id)?.label ?? id;
const WAGON = '/assets/english/ui/cart/wagon.png';
const GENERATING_RETRIES = 12;
const GENERATING_WAIT_MS = 5_000;
const isStillGenerating = (e: unknown): boolean => e instanceof Error && /sendo gerado/.test(e.message);

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const easeInQuad = (t: number): number => t * t;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function flyPoint(fly: Fly, now: number): { x: number; y: number; done: boolean; scale: number } {
  const u = Math.min(1, (now - fly.started) / fly.dur);
  const lift = fly.kind === 'slip' ? 36 : -88;
  const cx = (fly.from.x + fly.to.x) / 2;
  const cy = (fly.from.y + fly.to.y) / 2 + lift;
  const e = fly.kind === 'snap' || fly.kind === 'store' ? easeOutBack(u) : easeInQuad(u);
  const s = 1 - u;
  return {
    x: s * s * fly.from.x + 2 * s * u * cx + u * u * fly.to.x,
    y: s * s * fly.from.y + 2 * s * u * cy + u * u * fly.to.y,
    done: u >= 1,
    scale: fly.kind === 'store' ? lerp(1, 0.35, e) : fly.kind === 'slip' ? lerp(1, 0.85, u) : 1,
  };
}

const pct = (n: number, total: number): string => `${(n / total) * 100}%`;

const MerchantDelivery: React.FC<Props> = ({ uid, date, contract, sfx, onDone, onQuit }) => {
  const { adjustUserXP, adjustUserGold } = useData();
  const { playClick, playTaskComplete } = useSound();
  const { content } = contract;
  const steps = content.steps;
  const [scene, setScene] = useState<MerchantSceneDef>(DEFAULT_MERCHANT_SCENE);
  const [phase, setPhase] = useState<Phase>('play');
  const [stepIndex, setStepIndex] = useState(0);
  const [listens, setListens] = useState(() => steps.map(() => 0));
  const [attempts, setAttempts] = useState(() => steps.map(() => 0));
  const [firstOk, setFirstOk] = useState<(boolean | null)[]>(() => steps.map(() => null));
  const [lastOk, setLastOk] = useState<boolean[]>(() => steps.map(() => false));
  const [kept, setKept] = useState<(MerchantPlacement | null)[]>(() => steps.map(() => null));
  const [placements, setPlacements] = useState<MerchantPlacement[]>([]);
  const [speaking, setSpeaking] = useState<'load' | 'play' | null>(null);
  const [textOpen, setTextOpen] = useState(() => steps.map(() => false));
  const [correction, setCorrection] = useState<string | null>(null);
  const [saidFix, setSaidFix] = useState(() => steps.map(() => false));
  const [balloon, setBalloon] = useState('Ouve o pedido e coloca no lugar.');
  const [look, setLook] = useState({ x: DESIGN.w * 0.55, y: DESIGN.h * 0.5 });
  const [hover, setHover] = useState<Hover | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [fly, setFly] = useState<Fly | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [failMsg, setFailMsg] = useState('');
  const [reward, setReward] = useState<CompleteReward | null>(null);
  const [outcome, setOutcome] = useState<ContractOutcome | null>(null);
  const [wagonsIn, setWagonsIn] = useState(false);
  const [deliveries, setDeliveries] = useState(0);
  const [textShown, setTextShown] = useState(false);
  const [glossary, setGlossary] = useState<string[]>([]);
  const [flyPos, setFlyPos] = useState<{ x: number; y: number; scale: number } | null>(null);
  const [beat, setBeat] = useState<Beat>(null);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(Date.now());
  const finishing = useRef(false);
  const resolving = useRef(false);
  const [box, setBox] = useState({ w: DESIGN.w, h: DESIGN.h });

  const layoutSeed = useMemo(
    () => seedFromString(`${date}|${contract.id}|${steps.map((s) => `${s.item}:${s.spot}:${s.relation}`).join('|')}`),
    [date, contract.id, steps]
  );
  const baseSlots = useMemo(
    () => assignAnchors(pickStageSpots(content), scene.spots),
    [content, scene.spots]
  );
  const liveSpots = useMemo(
    () => liveSlotsForStep(baseSlots, steps[stepIndex], stepIndex).map((s) => s.spot),
    [baseSlots, steps, stepIndex]
  );
  const live = useMemo(
    () => assignAnchors(liveSpots, scene.spots, mixSeed(layoutSeed, stepIndex)),
    [liveSpots, scene.spots, layoutSeed, stepIndex]
  );
  const trayItems = useMemo(
    () => seededShuffle(content.items, mixSeed(layoutSeed, `tray-${stepIndex}`)),
    [content.items, layoutSeed, stepIndex]
  );
  const stock = useMemo(() => remainingStock(content.items, placements), [content.items, placements]);
  const listened = (listens[stepIndex] ?? 0) > 0;
  const progress = firstOk.map((v) => v === true);

  useEffect(() => {
    let live = true;
    void fetch(MERCHANT_ANCHORS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        const parsed = parseMerchantScene(raw);
        if (live && parsed) setScene(parsed);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const words = [
      ...content.sentences,
      ...content.steps.flatMap((s) => [s.item, s.spot, ITEM_NAME(s.item)]),
      ...content.spots.map((s) => s.label),
    ];
    prefetchAudio(words);
    prefetchAudio(content.sentences, { speed: TTS_SPEED_SLOW });
    return () => stopAudio();
  }, [content]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const scale = Math.min(r.width / DESIGN.w, r.height / DESIGN.h);
      setBox({ w: DESIGN.w * scale, h: DESIGN.h * scale });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!fly) {
      setFlyPos(null);
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      const p = flyPoint(fly, now);
      setFlyPos({ x: p.x, y: p.y, scale: p.scale });
      if (p.done) {
        const done = fly;
        setFly(null);
        setFlyPos(null);
        if (done.kind === 'snap' && done.placement) {
          setPlacements((prev) => addPlacement(prev, done.placement as MerchantPlacement));
          sfx.hit(2);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fly, sfx]);

  useEffect(() => {
    if (!beat) return;
    const ms = beat === 'miss' ? 720 : 640;
    const t = window.setTimeout(() => setBeat(null), ms);
    return () => window.clearTimeout(t);
  }, [beat]);

  const toStage = (cx: number, cy: number): { x: number; y: number } => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((cx - r.left) / r.width) * DESIGN.w,
      y: ((cy - r.top) / r.height) * DESIGN.h,
    };
  };

  const markHover = (label: string, x: number, y: number) => {
    setHover({ label, x, y });
    setGlossary((g) => (g.includes(label) ? g : [...g, label]));
  };

  const speakSentence = async (index: number, slow = false) => {
    if (speaking) return;
    setSpeaking('load');
    setListens((prev) => prev.map((n, i) => (i === index ? n + 1 : n)));
    const t = window.setTimeout(() => setSpeaking((s) => (s === 'load' ? 'play' : s)), 500);
    await playText(content.sentences[index], slow ? { speed: TTS_SPEED_SLOW } : undefined);
    window.clearTimeout(t);
    setSpeaking(null);
    setTextOpen((prev) => prev.map((v, i) => (i === index ? true : v)));
    setBalloon(content.translation[index] || 'Coloca o que pedi no lugar.');
    prefetchAudio([
      correctionLine(steps[index], null),
      praiseLine(steps[index], index),
      content.translation[index] || '',
    ]);
  };

  const listen = async (slow = false) => {
    if (speaking || resolving.current) return;
    playClick();
    await speakSentence(stepIndex, slow);
  };

  const startDrag = (id: string, ev: React.PointerEvent) => {
    if ((stock.get(id) ?? 0) <= 0 || fly || phase !== 'play' || busy) return;
    if (!listened) {
      setBalloon('Ouve o pedido primeiro.');
      return;
    }
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const p = toStage(ev.clientX, ev.clientY);
    setDrag({ id, x: p.x, y: p.y });
    setLook(p);
    playClick();
  };

  const moveDrag = (ev: React.PointerEvent) => {
    if (!drag) return;
    const p = toStage(ev.clientX, ev.clientY);
    setDrag({ ...drag, x: p.x, y: p.y });
    setLook(p);
  };

  const endDrag = (ev: React.PointerEvent) => {
    if (!drag) return;
    const p = toStage(ev.clientX, ev.clientY);
    const hit = hitSlot(p.x, p.y, live);
    const from = { x: drag.x, y: drag.y };
    const itemId = drag.id;
    setDrag(null);
    if (!hit) {
      sfx.miss();
      setFly({
        itemId,
        kind: 'slip',
        from,
        to: { x: p.x, y: Math.min(DESIGN.h - 80, p.y + 90) },
        started: performance.now(),
        dur: 420,
      });
      return;
    }
    const pos = itemDrawPos(hit.slot.anchor, hit.relation, 0, hit.slot.nextSide);
    setFly({
      itemId,
      kind: 'snap',
      from,
      to: { x: pos.x, y: pos.y },
      started: performance.now(),
      dur: 320,
      placement: { item: itemId, qty: 1, relation: hit.relation, spot: hit.slot.spot.id },
    });
  };

  const returnPlaced = (key: number) => {
    playClick();
    setPlacements((prev) => prev.filter((_, i) => i !== key));
    setCorrection(null);
  };

  const advance = (
    n: number,
    shown: boolean,
    first: (boolean | null)[],
    last: boolean[],
    keptNext: (MerchantPlacement | null)[],
    listenArr: number[],
    attemptArr: number[],
    deliveryCount: number,
    gloss: string[]
  ) => {
    if (n < steps.length - 1) {
      setStepIndex(n + 1);
      setPlacements([]);
      setCorrection(null);
      setBeat('next');
      setBalloon(NEXT_ORDER);
      sfx.next();
      return;
    }
    void finishRound(first, last, keptNext, shown, listenArr, attemptArr, deliveryCount, gloss);
  };

  const deliver = () => {
    if (placements.length === 0 || fly || phase !== 'play' || resolving.current) return;
    playClick();
    const step = steps[stepIndex];
    const ev = evaluateRoom([step], placements);
    const ok = ev.perStep[0] === true;
    const n = deliveries + 1;
    setDeliveries(n);
    const tries = (attempts[stepIndex] ?? 0) + 1;
    const nextAttempts = attempts.map((a, i) => (i === stepIndex ? tries : a));
    setAttempts(nextAttempts);
    const wasFirst = firstOk[stepIndex] === null;
    const nextFirst = firstOk.map((v, i) => (i === stepIndex && wasFirst ? ok : v));
    setFirstOk(nextFirst);
    const nextLast = lastOk.map((v, i) => (i === stepIndex ? ok : v));
    setLastOk(nextLast);
    const nextKept = kept.map((v, i) => (i === stepIndex ? (ok ? placements[0] : v) : v));
    setKept(nextKept);
    let shown = textShown;
    resolving.current = true;
    setBusy(true);
    const doneResolve = () => {
      resolving.current = false;
      setBusy(false);
    };
    if (ok) {
      sfx.ok();
      setBeat('ok');
      setCorrection(null);
      const praise = praiseLine(step, stepIndex);
      setBalloon(praise);
      const keep = live.find((s) => s.spot.id === placements[0].spot);
      const pos = itemDrawPos(
        keep?.anchor ?? scene.spots[0],
        placements[0].relation,
        0,
        keep?.nextSide ?? 'right'
      );
      setFly({
        itemId: placements[0].item,
        kind: 'store',
        from: { x: pos.x, y: pos.y },
        to: { x: scene.merchant.x + scene.merchant.w * 0.5, y: scene.merchant.y + 40 },
        started: performance.now(),
        dur: 520,
      });
      void (async () => {
        setSpeaking('play');
        await playText(praise);
        setSpeaking(null);
        setPlacements([]);
        advance(stepIndex, shown, nextFirst, nextLast, nextKept, listens, nextAttempts, n, glossary);
        doneResolve();
      })();
      return;
    }
    sfx.fail();
    shown = true;
    setTextShown(true);
    setBeat('miss');
    const phrase = correctionLine(step, placements[0] ?? null);
    setCorrection(phrase);
    if (!saidFix[stepIndex]) {
      setSaidFix((prev) => prev.map((v, i) => (i === stepIndex ? true : v)));
    }
    setBalloon(phrase);
    const slot = live.find((s) => s.spot.id === step.spot);
    if (slot) setLook({ x: slot.anchor.x + slot.anchor.w / 2, y: slot.anchor.y + slot.anchor.h / 2 });
    const returning = [...placements];
    setPlacements([]);
    if (returning[0]) {
      const back = live.find((s) => s.spot.id === returning[0].spot);
      const pos = itemDrawPos(
        back?.anchor ?? scene.spots[0],
        returning[0].relation,
        0,
        back?.nextSide ?? 'right'
      );
      setFly({
        itemId: returning[0].item,
        kind: 'back',
        from: { x: pos.x, y: pos.y },
        to: { x: scene.tray.x + scene.tray.w / 2, y: scene.tray.y + 20 },
        started: performance.now(),
        dur: 380,
      });
    }
    void (async () => {
      setSpeaking('play');
      await playText(phrase);
      setSpeaking(null);
      if (tries >= 2) {
        advance(stepIndex, shown, nextFirst, nextLast, nextKept, listens, nextAttempts, n, glossary);
      }
      doneResolve();
    })();
  };

  const finishRound = async (
    first: (boolean | null)[],
    last: boolean[],
    keptNext: (MerchantPlacement | null)[],
    shown: boolean,
    listenArr: number[],
    attemptArr: number[],
    deliveryCount: number,
    gloss: string[]
  ) => {
    if (finishing.current) return;
    finishing.current = true;
    stopAudio();
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    setPhase('saving');
    const firstBool = first.map((v) => v === true);
    const placementsOut = keptNext.filter((p): p is MerchantPlacement => p !== null);
    const out = buildMerchantOutcome({
      steps,
      firstOk: firstBool,
      lastOk: last,
      placements: placementsOut,
      listens: listenArr,
      attempts: attemptArr,
      deliveries: deliveryCount,
      textShown: shown,
      glossaryHovers: gloss,
    });
    setOutcome(out);
    let got: CompleteReward;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          got = await completeContract(uid, date, contract.id, contract.version, out, durationSec);
          break;
        } catch (e) {
          if (!isStillGenerating(e) || attempt >= GENERATING_RETRIES) throw e;
          await new Promise((r) => window.setTimeout(r, GENERATING_WAIT_MS));
        }
      }
    } catch (e) {
      console.error('MerchantDelivery: erro ao concluir', e);
      setFailMsg('Não deu para guardar esta entrega. O contrato continua no quadro.');
      setPhase('failed');
      return;
    }
    if (got.materialEarned > 0) sfx.checkpoint();
    playTaskComplete();
    toast.dismiss();
    setReward(got);
    setPhase('finale');
    window.setTimeout(() => setWagonsIn(true), 80);
    try {
      if (got.xp > 0) await adjustUserXP(got.xp, { silent: true });
      if (got.gold > 0) {
        await adjustUserGold(got.gold, { silent: true });
        await FirestoreService.createGoldTransaction(
          uid,
          got.gold,
          'earned',
          'english_game',
          `Mina: ${CONTRACT_LABELS.merchant} (${contract.title})`,
          {
            relatedId: contract.id,
            relatedTitle: contract.title,
            metadata: { date, contractId: contract.id, type: 'merchant', material: got.materialEarned, score: out.score, max: out.max, durationSec },
          }
        );
      }
    } catch (e) {
      console.error('MerchantDelivery: XP/gold', e);
      toast.error('A entrega foi salva, mas o XP/gold não entrou. Avise o papai.');
    }
  };

  const askQuit = () => {
    playClick();
    const dirty = listens.some((n) => n > 0) || placements.length > 0 || firstOk.some((v) => v !== null);
    if (dirty) setConfirmQuit(true);
    else {
      stopAudio();
      onQuit();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (confirmQuit) setConfirmQuit(false);
      else if (phase === 'finale' || phase === 'failed') onDone();
      else askQuit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmQuit, phase]);

  const lookLeft = look.x < scene.merchant.x + scene.merchant.w * 0.45;
  const askSlot = live.find((s) => s.spot.id === steps[stepIndex]?.spot) ?? null;
  const padMode: 'teach' | 'faint' | 'hint' =
    correction ? 'hint' : stepIndex === 0 ? 'teach' : 'faint';
  const padSlots = !listened && !correction ? [] : padMode === 'faint' ? live : askSlot ? [askSlot] : [];
  const sentence = content.sentences[stepIndex] ?? '';

  const onWord = (w: string) => {
    playClick();
    setGlossary((g) => (g.includes(w) ? g : [...g, w]));
    void playText(w);
  };

  return (
    <div className={`md-play${beat === 'miss' ? ' is-miss' : ''}${beat === 'ok' ? ' is-ok' : ''}`} data-testid="merchant-delivery" data-step={stepIndex} data-live={live.length} onPointerDownCapture={() => undefined}>
      {phase === 'play' && (
      <header className="md-bar">
        <button
          type="button"
          className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold"
          onClick={askQuit}
          data-testid="merchant-quit"
        >
          Voltar à Mina
        </button>
        <div className="md-dots" aria-label={`pedido ${stepIndex + 1} de ${steps.length}`}>
          {steps.map((_, i) => (
            <i key={i} className={progress[i] ? 'is-done' : i === stepIndex ? `is-now${beat === 'next' ? ' is-pop' : ''}` : ''} />
          ))}
        </div>
        <span className="md-bar-note">{contract.title}</span>
      </header>
      )}

      <div className="md-stage-wrap" ref={wrapRef}>
        <div
          className="md-stage"
          ref={stageRef}
          style={{ width: box.w, height: box.h }}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          data-testid="merchant-stage"
        >
          <img src={MERCHANT_BACKDROP} alt="" className="md-backdrop mc-pixel" draggable={false} />

          {phase === 'play' && live.map((slot) => {
            const here = placements.filter((p) => p.spot === slot.spot.id);
            const under = here.filter((p) => p.relation === 'under');
            const rest = here.filter((p) => p.relation !== 'under');
            return (
              <div
                key={slot.spot.id}
                className={`md-spot${(padMode === 'teach' || padMode === 'hint') && askSlot?.spot.id === slot.spot.id ? ' is-hint' : ''}${stepIndex > 0 ? ' mc-pop' : ''}`}
                style={{
                  left: pct(slot.anchor.x, DESIGN.w),
                  top: pct(slot.anchor.y, DESIGN.h),
                  width: pct(slot.anchor.w, DESIGN.w),
                  height: pct(slot.anchor.h, DESIGN.h),
                }}
                data-testid={`spot-${slot.spot.id}`}
                onMouseEnter={() => markHover(slot.spot.label, slot.anchor.x + slot.anchor.w / 2, slot.anchor.y)}
                onMouseLeave={() => setHover((h) => (h?.label === slot.spot.label ? null : h))}
                onClick={() => markHover(slot.spot.label, slot.anchor.x + slot.anchor.w / 2, slot.anchor.y)}
              >
                {under.map((p, i) => (
                  <PlacedItem key={`u-${p.item}-${i}`} placement={p} slot={slot} stack={i} under />
                ))}
                <img
                  src={SPOT_IMG(slot.spot.id)}
                  alt=""
                  className={`md-spot-img mc-pixel${slot.anchor.role === 'wall' ? ' is-wall' : ''}`}
                  draggable={false}
                />
                {rest.map((p, i) => (
                  <PlacedItem key={`r-${p.item}-${i}`} placement={p} slot={slot} stack={i} />
                ))}
              </div>
            );
          })}

          {phase === 'play' && padSlots.length > 0 && (
            <div className="md-pockets" aria-hidden>
              {padSlots.flatMap((slot) =>
                zonesFor(slot.anchor, slot.spot.relations, slot.nextSide)
                  .filter((z) => {
                    if (placements.some((p) => p.spot === slot.spot.id && p.relation === z.relation)) return false;
                    if (padMode === 'hint') return z.relation === steps[stepIndex]?.relation;
                    return true;
                  })
                  .map((z) => {
                    const ask = padMode === 'teach' && z.relation === steps[stepIndex]?.relation;
                    const hint = padMode === 'hint' && z.relation === steps[stepIndex]?.relation;
                    const hot = Boolean(drag && hitSlot(drag.x, drag.y, [slot])?.relation === z.relation);
                    return (
                      <div
                        key={`${slot.spot.id}-${z.relation}`}
                        className={`md-pocket${padMode === 'faint' ? ' is-faint' : ''}${ask || hint ? ' is-ask' : ''}${hot ? ' is-hot' : ''}`}
                        style={{
                          left: pct(z.rect.x, DESIGN.w),
                          top: pct(z.rect.y, DESIGN.h),
                          width: pct(z.rect.w, DESIGN.w),
                          height: pct(z.rect.h, DESIGN.h),
                        }}
                      >
                        <b>{RELATION_EN[z.relation]}</b>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          <div
            className="md-merchant"
            style={{
              left: pct(scene.merchant.x, DESIGN.w),
              top: pct(scene.merchant.y, DESIGN.h),
              width: pct(scene.merchant.w, DESIGN.w),
              height: pct(scene.merchant.h, DESIGN.h),
            }}
            data-testid="merchant-npc"
          >
            <img
              src={MERCHANT_SPRITE}
              alt=""
              className="md-merchant-body mc-pixel"
              draggable={false}
              style={{ transform: lookLeft ? 'scaleX(-1)' : undefined }}
            />
          </div>

          {phase === 'play' && (
          <div className="md-speech">
            <div className={`md-balloon${beat === 'miss' || correction ? ' is-fix' : ''}${beat === 'ok' ? ' is-ok' : ''}${beat === 'next' ? ' is-next' : ''}`} data-testid="merchant-balloon">
              <p className="md-balloon-pt" data-testid={correction ? 'merchant-fix' : undefined}>{balloon}</p>
              {phase === 'play' && textOpen[stepIndex] && (
                <p className="md-sentence" data-testid="merchant-sentence">
                  {sentenceBits(sentence).map((bit, i) =>
                    bit.word ? (
                      <button key={i} type="button" className="md-word" onClick={() => onWord(bit.text)}>
                        {bit.text}
                      </button>
                    ) : (
                      <span key={i}>{bit.text}</span>
                    )
                  )}
                </p>
              )}
            </div>
            {phase === 'play' && (
              <div className="md-listen">
                <button
                  type="button"
                    className={`mc-btn ${speaking ? 'mc-btn-gold' : 'mc-btn-stone'} px-3 py-2 text-sm font-bold${!listened && !speaking ? ' is-wait' : ''}`}
                  onClick={() => void listen(false)}
                  disabled={speaking !== null}
                  data-testid={`listen-${stepIndex}`}
                >
                  {speaking === 'load' ? 'A voz está chegando...' : speaking === 'play' ? 'Falando...' : listened ? 'Ouvir de novo' : 'Ouvir'}
                </button>
                <button
                  type="button"
                  className="mc-btn mc-btn-wood px-3 py-2 text-sm font-bold"
                  onClick={() => void listen(true)}
                  disabled={speaking !== null}
                  data-testid={`listen-slow-${stepIndex}`}
                >
                  Ouvir devagar
                </button>
              </div>
            )}
          </div>
          )}

          {phase === 'play' && (
          <div
            className="md-tray"
            style={{
              left: pct(scene.tray.x, DESIGN.w),
              top: pct(scene.tray.y, DESIGN.h),
              width: pct(scene.tray.w, DESIGN.w),
              height: pct(scene.tray.h, DESIGN.h),
            }}
            data-testid="merchant-tray"
          >
            {trayItems.map((it) => {
              const left = stock.get(it.id) ?? 0;
              const dragging = drag?.id === it.id;
              const vis = dragging ? left - 1 : left;
              return (
                <button
                  key={it.id}
                  type="button"
                  className={`md-tray-item${vis <= 0 ? ' is-empty' : ''}`}
                  disabled={left <= 0 || phase !== 'play'}
                  onPointerDown={(e) => startDrag(it.id, e)}
                  onMouseEnter={() => markHover(ITEM_NAME(it.id), scene.tray.x + 40, scene.tray.y)}
                  onMouseLeave={() => setHover((h) => (h?.label === ITEM_NAME(it.id) ? null : h))}
                  data-testid={`item-${it.id}`}
                >
                  <img src={ITEM_IMG(it.id)} alt="" className="mc-pixel" draggable={false} />
                  <span className="md-tray-n">{vis > 0 ? vis : ''}</span>
                </button>
              );
            })}
          </div>
          )}

          {drag && (
            <img
              src={ITEM_IMG(drag.id)}
              alt=""
              className="md-fly mc-pixel"
              draggable={false}
              style={{ left: pct(drag.x - ITEM_PX / 2, DESIGN.w), top: pct(drag.y - ITEM_PX / 2, DESIGN.h), width: pct(ITEM_PX, DESIGN.w) }}
            />
          )}
          {fly && flyPos && (
            <img
              src={ITEM_IMG(fly.itemId)}
              alt=""
              className="md-fly mc-pixel"
              draggable={false}
              style={{
                left: pct(flyPos.x - ITEM_PX / 2, DESIGN.w),
                top: pct(flyPos.y - ITEM_PX / 2, DESIGN.h),
                width: pct(ITEM_PX, DESIGN.w),
                transform: `scale(${flyPos.scale})`,
              }}
            />
          )}

          {phase === 'play' && hover && !drag && (
            <div className="md-tip" style={{ left: pct(hover.x, DESIGN.w), top: pct(hover.y - 18, DESIGN.h) }} data-testid="merchant-tip">
              {hover.label}
            </div>
          )}

          {phase === 'play' && (
            <button
              type="button"
              className="mc-btn mc-btn-green md-deliver text-base font-bold"
              onClick={deliver}
              disabled={placements.length === 0 || Boolean(fly) || busy}
              data-testid="deliver"
            >
              Entregar
            </button>
          )}

          {placements.length > 0 && phase === 'play' && (
            <button type="button" className="md-undo" onClick={() => returnPlaced(placements.length - 1)} data-testid="merchant-undo">
              Devolver
            </button>
          )}

          {phase === 'finale' && outcome && reward && (
            <Finale
              contract={contract}
              outcome={outcome}
              reward={reward}
              wagonsIn={wagonsIn}
              firstOk={firstOk.map((v) => v === true)}
              onNext={onDone}
            />
          )}
        </div>
      </div>

      {confirmQuit && (
        <div className="md-confirm" data-testid="merchant-quit-confirm">
          <div className="md-balloon mc-pop md-confirm-card">
            <p>Sai agora? O pedido fica para depois.</p>
            <div className="md-confirm-row">
              <button type="button" className="mc-btn mc-btn-red px-4 py-2 font-bold" onClick={() => { stopAudio(); onQuit(); }}>
                Sair
              </button>
              <button type="button" className="mc-btn mc-btn-green px-4 py-2 font-bold" onClick={() => setConfirmQuit(false)}>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'saving' && <p className="md-saving">O Comerciante confere o armazém...</p>}

      {phase === 'failed' && (
        <div className="md-confirm">
          <div className="md-balloon mc-pop md-confirm-card">
            <p>{failMsg}</p>
            <button type="button" className="mc-btn mc-btn-stone px-5 py-2 font-bold mt-3" onClick={onDone}>
              Voltar à Mina
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

const GOLD_ICON = '/assets/english/ui/gold.webp';
const XP_ICON = '/assets/english/ui/star.webp';

const PlacedItem: React.FC<{ placement: MerchantPlacement; slot: StageSlot; stack: number; under?: boolean }> = ({
  placement,
  slot,
  stack,
  under,
}) => {
  const pos = itemDrawPos(slot.anchor, placement.relation, stack, slot.nextSide);
  return (
    <span
      className={`md-placed${pos.clip ? ' is-in' : ''}${under ? ' is-under' : ''}`}
      style={{
        left: `${((pos.x - slot.anchor.x - ITEM_PX / 2) / slot.anchor.w) * 100}%`,
        top: `${((pos.y - slot.anchor.y - ITEM_PX / 2) / slot.anchor.h) * 100}%`,
      }}
    >
      <img src={ITEM_IMG(placement.item)} alt="" className="mc-pixel" draggable={false} />
      {placement.qty > 1 && <b>{placement.qty}</b>}
    </span>
  );
};

const Finale: React.FC<{
  contract: MerchantC;
  outcome: ContractOutcome;
  reward: CompleteReward;
  wagonsIn: boolean;
  firstOk: boolean[];
  onNext: () => void;
}> = ({ contract, outcome, reward, wagonsIn, firstOk, onNext }) => {
  const { playClick } = useSound();
  const steps = contract.content.steps;
  const note = gradeLine(outcome.score, steps, firstOk);
  const count = Math.max(0, reward.materialEarned);
  const missed = steps
    .map((_, i) => i)
    .filter((i) => !firstOk[i]);
  const allIn = missed.length === 0;
  return (
    <div className="md-finale-layer">
      <div className="md-speech" data-testid="merchant-finale">
        <div className={`md-balloon mc-pop${allIn ? ' is-ok' : ' is-fix'}`}>
          <p className="md-balloon-pt" data-testid="merchant-grade">{note}</p>
          {missed.map((i) => (
            <p key={i} className="md-sentence md-finale-miss">
              {contract.content.sentences[i]}
            </p>
          ))}
          {(reward.xp > 0 || reward.gold > 0 || count > 0) && (
            <div className="md-finale-pay">
              {reward.xp > 0 && (
                <span className="mc-chip">
                  <img src={XP_ICON} alt="" className="mc-pixel" draggable={false} />
                  <b className="mc-num">{reward.xp}</b>
                  XP
                </span>
              )}
              {reward.gold > 0 && (
                <span className="mc-chip">
                  <img src={GOLD_ICON} alt="" className="mc-pixel" draggable={false} />
                  <b className="mc-num">{reward.gold}</b>
                  gold
                </span>
              )}
              {count > 0 && (
                <span className="mc-chip">
                  <img src={MATERIAL_ICONS[reward.material]} alt="" className="mc-pixel md-finale-mat" draggable={false} />
                  <b className="mc-num">{count}</b>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="md-listen">
          <button
            type="button"
            className="mc-btn mc-btn-green px-4 py-2 text-sm font-bold"
            onClick={() => { playClick(); onNext(); }}
            data-testid="merchant-home"
          >
            Voltar à Mina
          </button>
        </div>
      </div>
      <div className={`md-rail${wagonsIn ? ' is-in' : ''}`} data-testid="merchant-wagons">
        {Array.from({ length: Math.max(1, count) }).map((_, i) => (
          <span key={i} className="md-wagon" style={{ animationDelay: `${i * 0.16}s` }}>
            <img src={WAGON} alt="" className="mc-pixel" draggable={false} />
            {i < count && <img src={MATERIAL_ICONS[reward.material]} alt="" className="md-wagon-load mc-pixel" draggable={false} />}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MerchantDelivery;
