// ========================================
// Recado do dia: porta "jogo" (MINA_CONTRATOS.md §3.2).
// Quadro do Capataz, giz, três pregos. Recompensa só da 1ª leitura.
// ========================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '../../../../contexts/DataContext';
import { useSound } from '../../../../contexts/SoundContext';
import { FirestoreService } from '../../../../services/firestoreService';
import { completeContract } from '../../../../services/englishBaseService';
import { explainNoteMiss, judgeNote, precheckNote } from '../../../../services/englishJudge';
import { playText, prefetchAudio, stopAudio, TTS_SPEED_SLOW } from '../../../../services/englishTts';
import { DESIGN } from '../../../../services/english/merchantPlay';
import {
  allPegsOn,
  explainJudge,
  fillTemplate,
  gapCount,
  gapWidthCh,
  isLazyNote,
  moldFromModel,
  moldFromTemplates,
  pegLit,
  pegReview,
  recadoGrade,
  splitTemplate,
  trayWords,
} from '../../../../services/english/notePlay';
import { seedFromString, seededShuffle } from '../../../../services/english/shuffle';
import { noteMaterial } from '../../../../config/englishRewards';
import { CONTRACT_LABELS, MATERIAL_ICONS } from '../../../../config/englishBase';
import type { BaseDoc, BuildingId, Contract, ContractOutcome, NoteInfo, NoteJudgement } from '../../../../types/english';
import type { MineSfx } from '../mine/sfx';
import type { CompleteReward } from './ContractResult';

type NoteC = Extract<Contract, { type: 'note' }>;

interface Props {
  uid: string;
  date: string;
  contract: NoteC;
  level: number;
  base: BaseDoc;
  sfx: MineSfx;
  onDone: () => void;
  onQuit: () => void;
  onBuildNow: (id: BuildingId) => void;
}

type Phase = 'write' | 'judging' | 'judged' | 'saving' | 'finale' | 'failed';
type Beat = 'miss' | 'ok' | null;

const WAGON = '/assets/english/ui/cart/wagon.png';
const GOLD_ICON = '/assets/english/ui/gold.webp';
const XP_ICON = '/assets/english/ui/star.webp';
const BACKDROP = '/assets/village/scenes/comerciante/backdrop.png';
const CAPATAZ = '/assets/village/npc/olheiro-iso.png';
const PCT = (n: number, total: number): string => `${(n / total) * 100}%`;
const GENERATING_RETRIES = 12;
const GENERATING_WAIT_MS = 5_000;
const isStillGenerating = (e: unknown): boolean => e instanceof Error && /sendo gerado/.test(e.message);
const words = (s: string): string[] => s.split(/\s+/).filter(Boolean);

const RecadoBoard: React.FC<Props> = ({ uid, date, contract, level, base, sfx, onDone, onQuit }) => {
  const { adjustUserXP, adjustUserGold } = useData();
  const { playClick, playTaskComplete } = useSound();
  const { content } = contract;
  const scaffold = base.scaffoldStage;
  const molded = useMemo(() => {
    if (scaffold !== 0) return { mold: null as string | null, slots: [] as string[] };
    const framed = moldFromTemplates(content.model, content.templates);
    if (framed && gapCount(framed.mold) >= 1) return framed;
    const made = moldFromModel(content.model, content.mustInclude);
    if (gapCount(made.mold) >= 1) return { mold: made.mold, slots: made.slots };
    if (content.templates.length === 0) return { mold: null, slots: [] };
    return {
      mold: content.templates[seedFromString(`${contract.id}|${contract.theme}`) % content.templates.length],
      slots: [],
    };
  }, [scaffold, content.model, content.mustInclude, content.templates, contract.id, contract.theme]);
  const templateUsed = molded.mold;
  const slots = molded.slots;
  const gapsN = templateUsed ? gapCount(templateUsed) : 0;
  const guide = content.model;
  const bank = useMemo(
    () =>
      seededShuffle(
        trayWords(content.model, content.wordBank, content.mustInclude.flatMap((i) => i.en.slice(0, 1))),
        seedFromString(`${date}|${contract.id}|bank`)
      ),
    [content.model, content.wordBank, content.mustInclude, date, contract.id]
  );

  const [phase, setPhase] = useState<Phase>('write');
  const [fills, setFills] = useState<string[]>(() => Array.from({ length: Math.max(1, gapsN) }, () => ''));
  const [freeText, setFreeText] = useState('');
  const [focusGap, setFocusGap] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [freeAttemptUsed, setFreeAttemptUsed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [redoUsed, setRedoUsed] = useState(false);
  const [missing, setMissing] = useState<ReturnType<typeof precheckNote>>([]);
  const [judgement, setJudgement] = useState<NoteJudgement | null>(null);
  const [firstJudge, setFirstJudge] = useState<NoteJudgement | null>(null);
  const [answer, setAnswer] = useState('');
  const [balloon, setBalloon] = useState(content.brief);
  const [beat, setBeat] = useState<Beat>(null);
  const [speaking, setSpeaking] = useState<'load' | 'play' | null>(null);
  const [listens, setListens] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [failMsg, setFailMsg] = useState('');
  const [reward, setReward] = useState<CompleteReward | null>(null);
  const [outcome, setOutcome] = useState<ContractOutcome | null>(null);
  const [wagonsIn, setWagonsIn] = useState(false);
  const [box, setBox] = useState({ w: DESIGN.w, h: DESIGN.h });
  const wrapRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(Date.now());
  const finishing = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const written = templateUsed ? fillTemplate(templateUsed, fills) : freeText;
  const pegs = pegLit(written.replace(/___/g, ''), content.mustInclude);
  const bankOn = scaffold < 2 || hintUsed;
  const canHint = scaffold === 2 && !hintUsed && base.materials.ferro >= 1;
  const dirty = attempts > 0 || listens > 0 || words(written.replace(/___/g, ' ')).length > 0;
  const listened = listens > 0;

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

  useEffect(() => {
    const bitsEn = content.mustInclude.map((i) => i.en[0]).filter(Boolean);
    prefetchAudio([guide, ...bitsEn]);
    prefetchAudio([guide], { speed: TTS_SPEED_SLOW });
    return () => stopAudio();
  }, [guide, content.mustInclude]);

  const pulse = (kind: Beat) => {
    setBeat(kind);
    window.setTimeout(() => setBeat(null), 420);
  };

  const playGuide = async (text: string, slow = false, fromClick = false) => {
    const say = text.trim();
    if (speaking || !say) return;
    if (fromClick) playClick();
    setSpeaking('load');
    setListens((n) => n + 1);
    const t = window.setTimeout(() => setSpeaking((s) => (s === 'load' ? 'play' : s)), 500);
    await playText(say, slow ? { speed: TTS_SPEED_SLOW } : undefined);
    window.clearTimeout(t);
    setSpeaking(null);
  };

  const listenGuide = async (slow = false) => {
    await playGuide(guide, slow, true);
  };

  const putWord = (w: string, gap = focusGap) => {
    if (!listened) {
      setBalloon('Ouve o inglês primeiro.');
      return;
    }
    playClick();
    if (templateUsed) {
      setFills((prev) => {
        const next = [...prev];
        const cur = (next[gap] ?? '').trim();
        next[gap] = cur ? `${cur} ${w}` : w;
        return next;
      });
      return;
    }
    const el = areaRef.current;
    const start = el?.selectionStart ?? freeText.length;
    const end = el?.selectionEnd ?? start;
    const before = freeText.slice(0, start);
    const after = freeText.slice(end);
    const ins = `${before.length > 0 && !/\s$/.test(before) ? ' ' : ''}${w}${after.length > 0 && !/^\s/.test(after) ? ' ' : ''}`;
    setFreeText(before + ins + after);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + ins.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const speakLine = async (line: string) => {
    const t = line.trim();
    if (!t) return;
    stopAudio();
    setSpeaking('play');
    await playText(t);
    setSpeaking(null);
  };

  const submit = async () => {
    const t = written.replace(/___/g, ' ').replace(/\s+/g, ' ').trim();
    if (phase !== 'write' || words(t).length < 2) return;
    playClick();
    setAttempts((a) => a + 1);
    const miss = precheckNote(t, content);
    if (miss.length > 0 && !freeAttemptUsed) {
      stopAudio();
      setSpeaking(null);
      setMissing(miss);
      setFreeAttemptUsed(true);
      setPhase('judging');
      setBalloon('O Capataz lê o quadro...');
      const tip = await explainNoteMiss({
        text: t,
        content,
        missing: miss,
        level,
        template: templateUsed,
      });
      setPhase('write');
      setBalloon(tip.say);
      setFills((prev) => prev.map(() => ''));
      setFreeText('');
      sfx.fail();
      pulse('miss');
      void speakLine(tip.say);
      return;
    }
    setMissing([]);
    setPhase('judging');
    setBalloon('O Capataz lê o quadro...');
    const j = await judgeNote({
      text: t,
      content,
      level,
      scaffoldStage: scaffold,
      templateUsed,
    });
    setAnswer(t);
    setJudgement(j);
    if (!firstJudge) setFirstJudge(j);
    setPhase('judged');
    const tip = explainJudge(j, content.mustInclude, content.brief, t);
    setBalloon(tip.say);
    if (j.score === 3) {
      sfx.checkpoint();
      pulse('ok');
    } else {
      sfx.fail();
      pulse('miss');
    }
    void speakLine(tip.say);
  };

  const redo = () => {
    if (redoUsed || !judgement || judgement.score >= 3) return;
    playClick();
    sfx.next();
    setRedoUsed(true);
    setJudgement(null);
    setMissing([]);
    setPhase('write');
    setBalloon(content.brief);
  };

  const finishRound = async () => {
    const paid = firstJudge ?? judgement;
    if (!paid || finishing.current) return;
    finishing.current = true;
    stopAudio();
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    setPhase('saving');
    const out: ContractOutcome = {
      score: paid.score,
      max: 3,
      materialEarned: noteMaterial(paid.score),
      answer,
      correction: paid,
      details: {
        hintUsed,
        templateUsed,
        attempts,
        listens,
        textShown: false,
        scaffoldStage: scaffold,
        precheckMissing: freeAttemptUsed,
        redoUsed,
        pegsOn: allPegsOn(answer, content.mustInclude),
      },
    };
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
      console.error('RecadoBoard: erro ao concluir', e);
      setFailMsg('Não deu para guardar este recado. O contrato continua no quadro.');
      setPhase('failed');
      finishing.current = false;
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
          `Mina: ${CONTRACT_LABELS.note} (${contract.title})`,
          {
            relatedId: contract.id,
            relatedTitle: contract.title,
            metadata: { date, contractId: contract.id, type: 'note', material: got.materialEarned, score: out.score, max: out.max, durationSec },
          }
        );
      }
    } catch (e) {
      console.error('RecadoBoard: XP/gold', e);
      toast.error('O recado foi salvo, mas o XP/gold não entrou. Avise o papai.');
    }
  };

  const askQuit = () => {
    playClick();
    if (dirty && phase !== 'finale') setConfirmQuit(true);
    else {
      stopAudio();
      onQuit();
    }
  };

  const bits = templateUsed ? splitTemplate(templateUsed) : [];
  const showBank = phase === 'write' && bankOn;

  return (
    <div className={`md-play${beat === 'miss' ? ' is-miss' : ''}`} data-testid="recado-board">
      {phase !== 'finale' && (
        <header className="md-bar">
          <button type="button" className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold" onClick={askQuit} data-testid="recado-quit">
            Voltar à Mina
          </button>
          <div className="md-dots" aria-label="os três pregos do pedido">
            {content.mustInclude.map((_, i) => (
              <i key={i} className={pegs[i] ? 'is-done' : i === pegs.findIndex((p) => !p) ? 'is-now' : ''} />
            ))}
          </div>
          <span className="md-bar-note">{contract.title}</span>
        </header>
      )}

      <div className="md-stage-wrap" ref={wrapRef}>
        <div className="md-stage" style={{ width: box.w, height: box.h }} data-testid="recado-stage">
          <img src={BACKDROP} alt="" className="md-backdrop mc-pixel" draggable={false} />

          <div
            className="md-merchant"
            style={{ left: PCT(36, DESIGN.w), top: PCT(318, DESIGN.h), width: PCT(210, DESIGN.w), height: PCT(292, DESIGN.h) }}
            data-testid="recado-npc"
          >
            <img src={CAPATAZ} alt="" className="md-merchant-body mc-pixel" draggable={false} />
          </div>

          {phase !== 'finale' && (
            <div className="md-speech">
              <div className={`md-balloon${beat === 'miss' || missing.length > 0 ? ' is-fix' : ''}${beat === 'ok' ? ' is-ok' : ''}`} data-testid="recado-balloon">
                <p className="md-balloon-pt">{balloon}</p>
              </div>
              {phase === 'write' && (
                <div className="md-listen">
                  <button
                    type="button"
                    className={`mc-btn ${speaking ? 'mc-btn-gold' : 'mc-btn-stone'} px-3 py-2 text-sm font-bold${!listened && !speaking ? ' is-wait' : ''}`}
                    onClick={() => void listenGuide(false)}
                    disabled={speaking !== null}
                    data-testid="recado-hear"
                  >
                    {speaking === 'load' ? 'A voz está chegando...' : speaking === 'play' ? 'Falando...' : listened ? 'Ouvir de novo' : 'Ouvir'}
                  </button>
                  <button
                    type="button"
                    className="mc-btn mc-btn-wood px-3 py-2 text-sm font-bold"
                    onClick={() => void listenGuide(true)}
                    disabled={speaking !== null}
                    data-testid="recado-hear-slow"
                  >
                    Ouvir devagar
                  </button>
                </div>
              )}
              {phase === 'judged' && judgement && (
                <div className="md-listen">
                  <button
                    type="button"
                    className={`mc-btn ${speaking ? 'mc-btn-gold' : 'mc-btn-stone'} px-3 py-2 text-sm font-bold`}
                    onClick={() => void listenGuide(false)}
                    disabled={speaking !== null}
                    data-testid="recado-hear"
                  >
                    {speaking === 'load' ? 'A voz está chegando...' : speaking === 'play' ? 'Falando...' : 'Ouvir'}
                  </button>
                  <button
                    type="button"
                    className="mc-btn mc-btn-wood px-3 py-2 text-sm font-bold"
                    onClick={() => void listenGuide(true)}
                    disabled={speaking !== null}
                    data-testid="recado-hear-slow"
                  >
                    Ouvir devagar
                  </button>
                  {judgement.score < 3 && !redoUsed && (
                    <button type="button" className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold" onClick={redo} data-testid="recado-redo">
                      De novo
                    </button>
                  )}
                  <button type="button" className="mc-btn mc-btn-green px-4 py-2 text-sm font-bold" onClick={() => void finishRound()} data-testid="recado-keep">
                    Guardar
                  </button>
                </div>
              )}
            </div>
          )}

          {phase !== 'finale' && (
            <div className="nb-board" data-testid="recado-quadro">
              {phase === 'judged' && judgement ? (
                <div className="nb-chalk" data-testid="recado-chalk">
                  <p className="nb-line">{answer}</p>
                  {judgement.score < 3 && (judgement.corrected || guide) && (
                    <p className="nb-line nb-fix-line">{judgement.corrected || guide}</p>
                  )}
                </div>
              ) : templateUsed ? (
                <p className="nb-template" data-testid="recado-template">
                  {bits.map((bit, i) =>
                    bit.kind === 'text' ? (
                      words(bit.text).map((w, wi) => (
                        <span key={`${i}-${wi}`} className="md-tok">{w}</span>
                      ))
                    ) : (
                      <input
                        key={`g-${bit.index}`}
                        value={fills[bit.index] ?? ''}
                        style={{ ['--nb-ch' as string]: gapWidthCh(slots[bit.index] ?? '', fills[bit.index] ?? '') }}
                        size={gapWidthCh(slots[bit.index] ?? '', fills[bit.index] ?? '')}
                        onChange={(e) => {
                          if (!listened) {
                            setBalloon('Ouve o inglês primeiro.');
                            return;
                          }
                          const v = e.target.value;
                          setFills((prev) => {
                            const next = [...prev];
                            next[bit.index] = v;
                            return next;
                          });
                        }}
                        onFocus={() => setFocusGap(bit.index)}
                        onDrop={(e) => {
                          e.preventDefault();
                          const w = e.dataTransfer.getData('text/plain');
                          if (w) putWord(w, bit.index);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        disabled={phase !== 'write'}
                        spellCheck={false}
                        autoComplete="off"
                        className={`nb-gap${focusGap === bit.index ? ' is-focus' : ''}`}
                        data-testid={`recado-gap-${bit.index}`}
                        aria-label={`lacuna ${bit.index + 1}`}
                      />
                    )
                  )}
                </p>
              ) : (
                <textarea
                  ref={areaRef}
                  value={freeText}
                  onChange={(e) => {
                    if (!listened) {
                      setBalloon('Ouve o inglês primeiro.');
                      return;
                    }
                    setFreeText(e.target.value);
                  }}
                  disabled={phase !== 'write'}
                  rows={3}
                  maxLength={300}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoComplete="off"
                  className="nb-write"
                  data-testid="recado-text"
                  aria-label="Escreva o recado em inglês"
                />
              )}
            </div>
          )}

          {showBank && (
            <div className="md-tray nb-tray" data-testid="recado-bank">
              {bank.map((w) => (
                <button
                  key={w}
                  type="button"
                  className="nb-chip"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', w)}
                  onClick={() => putWord(w)}
                  data-testid={`bank-${w}`}
                >
                  {w}
                </button>
              ))}
            </div>
          )}

          {phase === 'write' && scaffold === 2 && !hintUsed && (
            <button
              type="button"
              className="mc-btn mc-btn-stone md-undo"
              onClick={() => {
                playClick();
                if (!canHint) {
                  setBalloon('Sem ferro para a dica. Escreve do jeito que lembra.');
                  return;
                }
                setHintUsed(true);
                setBalloon(content.brief);
              }}
              data-testid="recado-hint"
            >
              Dica
            </button>
          )}

          {phase === 'write' && (
            <button
              type="button"
              className="mc-btn mc-btn-green md-deliver text-base font-bold"
              onClick={() => void submit()}
              disabled={words(written.replace(/___/g, ' ')).length < 2}
              data-testid="recado-submit"
            >
              Enviar
            </button>
          )}

          {phase === 'finale' && outcome && reward && firstJudge && (
            <Finale
              judgement={firstJudge}
              answer={answer}
              brief={content.brief}
              model={guide}
              infos={content.mustInclude}
              reward={reward}
              wagonsIn={wagonsIn}
              onNext={onDone}
            />
          )}
        </div>
      </div>

      {confirmQuit && (
        <div className="md-confirm" data-testid="recado-quit-confirm">
          <div className="md-balloon mc-pop md-confirm-card">
            <p>Sai agora? O recado fica para depois.</p>
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

      {phase === 'saving' && <p className="md-saving">O Capataz guarda o quadro...</p>}

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

      {phase === 'judging' && <p className="md-saving">O Capataz lê o quadro...</p>}
    </div>
  );
};

const Finale: React.FC<{
  judgement: NoteJudgement;
  answer: string;
  brief: string;
  model: string;
  infos: NoteInfo[];
  reward: CompleteReward;
  wagonsIn: boolean;
  onNext: () => void;
}> = ({ judgement, answer, model, infos, reward, wagonsIn, onNext }) => {
  const { playClick } = useSound();
  const count = Math.max(0, reward.materialEarned);
  const allIn = judgement.score >= 3;
  const rows = pegReview(answer, infos);
  const heard = (judgement.corrected || model).trim() || model;
  const [voice, setVoice] = useState<'load' | 'play' | null>(null);
  const missed = rows.filter((r) => !r.ok);
  const grade = judgement.note && !isLazyNote(judgement.note) ? judgement.note : recadoGrade(judgement.score);

  const say = async (text: string, slow = false) => {
    const t = text.trim();
    if (!t || voice) return;
    playClick();
    setVoice('load');
    const wait = window.setTimeout(() => setVoice((s) => (s === 'load' ? 'play' : s)), 400);
    await playText(t, slow ? { speed: TTS_SPEED_SLOW } : undefined);
    window.clearTimeout(wait);
    setVoice(null);
  };

  return (
    <div className="md-finale-layer">
      <div className="md-speech" data-testid="recado-finale">
        <div className={`md-balloon mc-pop${allIn ? ' is-ok' : ' is-fix'}`}>
          <p className="md-balloon-pt" data-testid="recado-grade">{grade}</p>
          {missed.map((p) => (
            <p key={p.pt} className="md-sentence md-finale-miss">{p.en}</p>
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
            className={`mc-btn ${voice ? 'mc-btn-gold' : 'mc-btn-wood'} px-3 py-2 text-sm font-bold`}
            onClick={() => void say(heard)}
            disabled={voice !== null}
            data-testid="recado-finale-hear"
          >
            {voice ? 'Falando...' : 'Ouvir o recado'}
          </button>
          <button
            type="button"
            className="mc-btn mc-btn-stone px-3 py-2 text-sm font-bold"
            onClick={() => void say(heard, true)}
            disabled={voice !== null}
            data-testid="recado-finale-slow"
          >
            Ouvir devagar
          </button>
          <button
            type="button"
            className="mc-btn mc-btn-green px-4 py-2 text-sm font-bold"
            onClick={() => { playClick(); onNext(); }}
            data-testid="recado-home"
          >
            Voltar à Mina
          </button>
        </div>
      </div>
      <div className={`md-rail${wagonsIn ? ' is-in' : ''}`} data-testid="recado-wagons">
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

export default RecadoBoard;
