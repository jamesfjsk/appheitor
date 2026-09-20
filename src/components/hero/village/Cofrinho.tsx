import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { GoalDoc } from '../../../types/village';
import { useClock } from '../../../contexts/ClockContext';
import { createGoal, depositGoal, redeemGoal, subscribeGoals } from '../../../services/goalsService';
import { patienceForecast, vaultGoalCap, minGoldForBonus, vaultInterestPct, canRedeemPile, saqueLine } from '../../../services/village/bank';
import { isBroken, ruinUseError } from '../../../services/village/repair';
import { crackedSentence } from '../../../config/village';
import ChildSheet from './ChildSheet';
import Extrato from './Extrato';

const GOLD = '/assets/english/ui/gold.webp';
const CHEST = '/assets/english/ui/chest.webp';
const AMOUNTS = [10, 20, 30, 40, 50];
const WEEKS = [1, 2, 4] as const;
const WEEK_LABEL: Record<(typeof WEEKS)[number], string> = {
  1: 'Uma semana',
  2: 'Duas semanas',
  4: 'Quatro semanas',
};
type BankTab = 'cofrinho' | 'extrato' | 'paciencia';

function plusOf(gold: number, w: number, ratePct: number) {
  return patienceForecast(gold, w, ratePct);
}

function chipPlus(gold: number, w: number, ratePct: number) {
  const now = plusOf(gold, w, ratePct);
  if (now > 0) return `+${now}`;
  const minGold = minGoldForBonus(ratePct);
  if (minGold <= 0) return '+0';
  return `+${plusOf(minGold, w, ratePct)} com ${minGold}`;
}

function WeekPick({
  weeks,
  gold,
  ratePct,
  onPick,
}: {
  weeks: (typeof WEEKS)[number];
  gold: number;
  ratePct: number;
  onPick: (n: (typeof WEEKS)[number]) => void;
}) {
  return (
    <div className="mc-hotbar">
      {WEEKS.map((n) => (
        <button
          key={n}
          type="button"
          className={`mc-slot rounded px-3 min-h-[44px] flex-col gap-0 ${weeks === n ? 'mc-slot-selected' : ''}`}
          onClick={() => onPick(n)}
        >
          <span>{WEEK_LABEL[n]}</span>
          <span className="mc-num" style={{ fontSize: 11 }}>{chipPlus(gold, n, ratePct)}</span>
        </button>
      ))}
    </div>
  );
}

function yieldLine(gold: number, weeks: (typeof WEEKS)[number], plus: number, minGold: number, atMin: number): string {
  const when = WEEK_LABEL[weeks].toLowerCase();
  if (plus <= 0) {
    if (minGold <= 0) return `${gold} gold ainda não rendem. O Cofre precisa estar de pé.`;
    return `${gold} gold ainda não pagam 1. Com ${minGold}, ${when} rendem +${atMin}.`;
  }
  return `${gold} gold em ${when}: +${plus}. O de hoje entra na conta na semana que vem.`;
}

function vaultTalk(level: number, applied: number, ready: boolean, earning: boolean, minGold: number): { level: string; status: string } {
  const head = `Cofre nível ${level}`;
  if (applied <= 0) return { level: head, status: 'ainda vazio' };
  if (ready) return { level: head, status: 'pode resgatar' };
  if (earning) return { level: head, status: 'está rendendo' };
  return { level: head, status: `começa com ${minGold}` };
}

function patienceRule(level: number): string {
  if (level < 1) return 'Constrói o Cofre. Aí o gold aplicado começa a render.';
  if (level >= 3) return 'O mesmo 10 gold rende +3 na semana.';
  if (level >= 2) return 'O mesmo 10 gold rende +2 na semana.';
  return '10 gold esperando viram +1 na semana. Melhora o Cofre, o mesmo 10 vira +2.';
}

function weekYield(gold: number, ratePct: number): number {
  return plusOf(gold, 1, ratePct);
}

function PileView({
  goal,
  today,
  ratePct,
  prize,
  busy,
  vaultUp,
  onRedeem,
}: {
  goal: GoalDoc;
  today: string;
  ratePct: number;
  prize: boolean;
  busy: boolean;
  vaultUp: boolean;
  onRedeem?: (id: string) => void;
}) {
  const plus = weekYield(goal.savedGold, ratePct);
  const ready = canRedeemPile(goal, today);
  return (
    <div className="mc-card w-full p-3 space-y-1">
      {prize ? <p className="text-sm font-bold truncate">{goal.title}</p> : null}
      <p className="text-sm">
        <span className="mc-num" style={{ fontSize: 14 }}>{goal.savedGold}</span>
        {' '}gold
        {vaultUp
          ? (plus > 0 ? <> · rende +{plus} por semana</> : <> · ainda não rende</>)
          : <> · o Cofre no chão segura o bônus</>}
      </p>
      <p className="text-sm">{saqueLine(goal.unlockOn, today)}</p>
      {prize && goal.targetGold > 0 ? (
        <div className="mc-bar mt-1">
          <div
            className="mc-bar-fill is-gold"
            style={{ width: `${Math.min(100, Math.round((goal.savedGold / goal.targetGold) * 100))}%` }}
          />
        </div>
      ) : null}
      {goal.status === 'cancel_requested' ? <p className="text-sm mc-warn mt-1">O pai ainda decide.</p> : null}
      {prize && goal.targetGold > 0 && goal.savedGold >= goal.targetGold ? (
        <p className="text-sm mc-good mt-1">Chegou. O pai fecha quando virar o prêmio.</p>
      ) : null}
      {ready && onRedeem ? (
        <button
          type="button"
          disabled={busy}
          className="mc-btn mc-btn-gold w-full min-h-[44px] font-bold mt-2"
          onClick={() => onRedeem(goal.id)}
        >
          Resgatar {goal.savedGold} gold
        </button>
      ) : null}
    </div>
  );
}

function speakErr(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (/insuficiente/i.test(m)) return 'Esse gold ainda não está no bolso.';
  if (/caiu/i.test(m)) return m;
  if (/desligado/i.test(m)) return 'O Cofre ainda está sendo cavado.';
  if (/montinho/i.test(m)) return m;
  if (/cheio/i.test(m)) return m;
  if (/Ainda rendendo/i.test(m)) return 'Ainda rendendo. Espera o dia de voltar.';
  return m || 'Não deu para guardar.';
}

const Cofrinho: React.FC<{
  onClose: () => void;
  preset?: { title: string; targetGold: number; rewardId?: string };
  initialTab?: BankTab;
}> = ({ onClose, preset, initialTab = 'cofrinho' }) => {
  const { childUid } = useAuth();
  const { progress } = useData();
  const { modules, buildings, village } = useVillage();
  const { today } = useClock();
  const { playClick, playError } = useSound();
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [amount, setAmount] = useState(10);
  const [weeks, setWeeks] = useState<(typeof WEEKS)[number]>(2);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<BankTab>(initialTab);

  useEffect(() => {
    if (!childUid) return;
    return subscribeGoals(childUid, setGoals);
  }, [childUid]);

  const open = useMemo(() => {
    const list = goals.filter((g) => g.status === 'open' || g.status === 'cancel_requested');
    return list.sort((a, b) => {
      const ra = canRedeemPile(a, today) ? 0 : 1;
      const rb = canRedeemPile(b, today) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return (a.unlockOn || '9999').localeCompare(b.unlockOn || '9999');
    });
  }, [goals, today]);
  const piles = useMemo(() => open.filter((g) => (g.savedGold || 0) > 0), [open]);
  const gold = progress.availableGold || 0;
  const vaultLv = buildings.cofre || 0;
  const ruined = isBroken(village.cracks, 'cofre');
  const goalCap = vaultGoalCap(vaultLv);
  const ratePct = modules.interest !== false && !ruined ? vaultInterestPct(vaultLv) : 0;
  const bankOn = modules.bank !== false;
  const applied = piles.reduce((s, g) => s + (g.savedGold || 0), 0);
  const stake = AMOUNTS.includes(amount) && amount <= gold ? amount : (AMOUNTS.filter((n) => n <= gold).pop() || 0);
  const demo = AMOUNTS.includes(amount) ? amount : 10;
  const minGold = minGoldForBonus(ratePct);
  const forecast = plusOf(stake, weeks, ratePct);
  const vaultIcon = `/assets/village/buildings/cofre-${Math.min(3, Math.max(1, vaultLv))}.png`;
  const anyReady = piles.some((g) => canRedeemPile(g, today));
  const earning = piles.some((g) => weekYield(g.savedGold, ratePct) > 0);
  const vaultLine = vaultTalk(vaultLv, applied, anyReady, earning, minGold);
  const stay = 'Cada aplicar vira um montinho. Quando o dia chega, Resgatar traz de volta.';
  const room = open.length < goalCap;

  const putGold = async () => {
    if (!childUid || busy) return;
    if (ruined) {
      playError();
      toast(ruinUseError('cofre').message, { id: 'vault' });
      return;
    }
    if (stake < 10 || stake > gold) {
      playError();
      toast(stake < 10 ? 'O Cofre pega de 10 em 10.' : 'Esse gold ainda não está no bolso.', { id: 'vault' });
      return;
    }
    playClick();
    setBusy(true);
    try {
      const prizeGoal = preset
        ? open.find((g) => g.rewardId === preset.rewardId || g.title === preset.title)
        : undefined;
      let id = prizeGoal?.id;
      if (!id) {
        const title = (preset?.title || 'No cofre').slice(0, 40);
        const targetGold = Math.max(20, preset?.targetGold || stake);
        id = await createGoal(childUid, { title, targetGold, rewardId: preset?.rewardId });
      }
      await depositGoal(childUid, id, stake, weeks, today);
      toast.success(`${stake} gold aplicados.`);
    } catch (e) {
      playError();
      toast.error(speakErr(e));
    } finally {
      setBusy(false);
    }
  };

  const takeGold = async (goalId: string) => {
    if (!childUid || busy) return;
    if (ruined) {
      playError();
      toast(ruinUseError('cofre').message, { id: 'vault' });
      return;
    }
    playClick();
    setBusy(true);
    try {
      const n = await redeemGoal(childUid, goalId, today);
      toast.success(n > 0 ? `${n} gold voltaram pro bolso.` : 'O Cofre ficou vazio.');
    } catch (e) {
      playError();
      toast.error(speakErr(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChildSheet
      onClose={onClose}
      wide="md"
      title={(
        <span className="flex items-center gap-2 min-w-0">
          <img src={CHEST} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
          Banco da Vila
        </span>
      )}
      tabs={(
        <div className="mc-hotbar px-3 py-2">
          {([
            ['cofrinho', 'Cofrinho'],
            ['extrato', 'Extrato'],
            ['paciencia', 'Paciência'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`mc-slot rounded px-3 min-h-[44px] ${tab === id ? 'mc-slot-selected' : ''}`}
              onClick={() => { playClick(); setTab(id); }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    >
      <div className="p-3 space-y-3">
        {tab === 'extrato' && <Extrato embedded monthly={vaultLv >= 3} />}
        {tab === 'paciencia' && (
          <div className="space-y-3">
            <div className="mc-inv p-2 space-y-2">
              <p className="text-sm">O gold do bolso não rende. O aplicado, sim — toda semana que ele passar aqui.</p>
              <p className="text-sm">
                {ruined
                  ? `${crackedSentence('cofre')} Sem bônus até consertar.`
                  : modules.interest === false
                    ? 'O bônus de paciência está desligado.'
                    : patienceRule(vaultLv)}
              </p>
              <p className="text-sm">Cada aplicar é um montinho. Dias diferentes, prazos diferentes. O de hoje só começa a render na semana que vem. No Cofrinho, quando o dia chega, Resgatar traz o gold de volta.</p>
            </div>
            {piles.map((g) => (
              <PileView
                key={g.id}
                goal={g}
                today={today}
                ratePct={ratePct}
                prize={Boolean(g.rewardId) || Boolean(preset && g.title === preset.title)}
                busy={busy}
                vaultUp={vaultLv >= 1 && !ruined}
              />
            ))}
            <div className="mc-card p-3 space-y-2">
              <p className="mc-lbl">Se aplicar</p>
              <div className="mc-hotbar">
                {AMOUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`mc-slot rounded px-3 min-h-[44px] ${demo === n ? 'mc-slot-selected' : ''}`}
                    onClick={() => { playClick(); setAmount(n); }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {ratePct > 0 ? (
                <>
                  <WeekPick
                    weeks={weeks}
                    gold={demo}
                    ratePct={ratePct}
                    onPick={(n) => { playClick(); setWeeks(n); }}
                  />
                  <p className="text-sm">{yieldLine(demo, weeks, plusOf(demo, weeks, ratePct), minGold, plusOf(minGold, weeks, ratePct))}</p>
                </>
              ) : (
                <p className="text-sm">Quando o Cofre estiver de pé, 10 gold rendem +1 por semana.</p>
              )}
            </div>
            <p className="text-sm mc-muted">Na vida real, 100 reais rendem menos de 1 por mês. Aqui o bônus é maior para treinar.</p>
          </div>
        )}
        {tab === 'cofrinho' && (
          <>
            {!bankOn ? (
              <p className="text-sm">O Cofre ainda está sendo cavado. Em breve você guarda gold aqui.</p>
            ) : vaultLv < 1 ? (
              <>
                <p className="text-sm">Constrói o Cofre no lote. Aí o gold pode ficar aplicado.</p>
                {piles.map((g) => (
                  <PileView
                    key={g.id}
                    goal={g}
                    today={today}
                    ratePct={ratePct}
                    prize={Boolean(g.rewardId) || Boolean(preset && g.title === preset.title)}
                    busy={busy}
                    vaultUp={false}
                    onRedeem={(id) => void takeGold(id)}
                  />
                ))}
              </>
            ) : ruined ? (
              <p className="text-sm">{ruinUseError('cofre').message}</p>
            ) : (
              <>
                <p className="text-sm">{stay}</p>
                <div className="flex flex-wrap gap-2">
                  <div className="mc-chip">
                    <img src={GOLD} alt="" className="mc-pixel" draggable={false} />
                    <span>
                      <span className="mc-num" style={{ fontSize: 14 }}>{gold}</span>
                      <span className="mc-chip-l">no bolso</span>
                    </span>
                  </div>
                  <div className="mc-chip">
                    <img src={CHEST} alt="" className="mc-pixel" draggable={false} />
                    <span>
                      <span className="mc-num" style={{ fontSize: 14 }}>{applied}</span>
                      <span className="mc-chip-l">aplicado</span>
                    </span>
                  </div>
                  <div className="mc-chip">
                    <img src={vaultIcon} alt="" className="mc-pixel" draggable={false} />
                    <span>
                      <span className="text-sm">{vaultLine.level}</span>
                      <span className="mc-chip-l">{vaultLine.status}</span>
                    </span>
                  </div>
                </div>
                {piles.map((g) => (
                  <PileView
                    key={g.id}
                    goal={g}
                    today={today}
                    ratePct={ratePct}
                    prize={Boolean(g.rewardId) || Boolean(preset && g.title === preset.title)}
                    busy={busy}
                    vaultUp={vaultLv >= 1 && !ruined}
                    onRedeem={(id) => void takeGold(id)}
                  />
                ))}
                {room ? (
                  <div className="mc-card p-3 space-y-2">
                    <p className="mc-lbl">Aplicar</p>
                    <div className="mc-hotbar">
                      {AMOUNTS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={n > gold}
                          className={`mc-slot rounded px-3 min-h-[44px] ${stake === n ? 'mc-slot-selected' : ''} ${n > gold ? 'is-lock' : ''}`}
                          onClick={() => { playClick(); setAmount(n); }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="mc-lbl">Deixar aplicado</p>
                    <WeekPick
                      weeks={weeks}
                      gold={stake || demo}
                      ratePct={ratePct}
                      onPick={(n) => { playClick(); setWeeks(n); }}
                    />
                    <p className="text-sm">{yieldLine(stake || demo, weeks, stake ? forecast : plusOf(demo, weeks, ratePct), minGold, plusOf(minGold, weeks, ratePct))}</p>
                    <p className="text-sm mc-muted">Esse valor vira um montinho novo. O de hoje só começa a render na semana que vem.</p>
                    <button
                      type="button"
                      disabled={busy || stake < 10 || stake > gold}
                      className="mc-btn mc-btn-gold w-full min-h-[44px] font-bold"
                      onClick={() => void putGold()}
                    >
                      {stake < 10 || stake > gold ? 'Precisa de 10 no bolso' : `Aplicar ${stake} gold`}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm">O Cofre está cheio. Espera um montinho voltar.</p>
                )}
                {preset && open.length < goalCap && !open.some((g) => g.rewardId === preset.rewardId || g.title === preset.title) && (
                  <p className="text-sm mc-muted">Isso aqui é para {preset.title}. {preset.targetGold} gold.</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ChildSheet>
  );
};

export default Cofrinho;
