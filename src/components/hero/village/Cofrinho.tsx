import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { GoalDoc } from '../../../types/village';
import { createGoal, depositGoal, requestCancel, subscribeGoals } from '../../../services/goalsService';
import { vaultGoalCap } from '../../../services/village/bank';
import Extrato from './Extrato';

const AMOUNTS = [5, 10, 20, 50];
type BankTab = 'cofrinho' | 'extrato' | 'paciencia';

const Cofrinho: React.FC<{
  onClose: () => void;
  preset?: { title: string; targetGold: number; rewardId?: string };
  initialTab?: BankTab;
}> = ({ onClose, preset, initialTab = 'cofrinho' }) => {
  const { childUid } = useAuth();
  const { progress } = useData();
  const { modules, buildings, economy } = useVillage();
  const { playClick } = useSound();
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [title, setTitle] = useState(preset?.title || '');
  const [target, setTarget] = useState(preset?.targetGold || 20);
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<BankTab>(initialTab);

  useEffect(() => {
    if (!childUid) return;
    return subscribeGoals(childUid, setGoals);
  }, [childUid]);

  const open = useMemo(() => goals.filter((g) => g.status === 'open' || g.status === 'cancel_requested'), [goals]);
  const gold = progress.availableGold || 0;
  const vaultLv = buildings.cofre || 0;
  const goalCap = Math.min(economy.maxOpenGoals ?? 2, vaultGoalCap(vaultLv));
  const ratePct = economy.interestRatePct ?? 5;
  const bankOn = modules.bank !== false;
  const interestOn = modules.interest !== false && vaultLv >= 2;

  const saveNew = async () => {
    if (!childUid) return;
    playClick();
    setBusy(true);
    try {
      await createGoal(childUid, { title, targetGold: target, rewardId: preset?.rewardId });
      toast.success('Meta criada');
      setTitle('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    } finally {
      setBusy(false);
    }
  };

  const deposit = async (id: string) => {
    if (!childUid) return;
    playClick();
    setBusy(true);
    try {
      await depositGoal(childUid, id, amount);
      toast.success(`Guardou ${amount} gold`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (!childUid) return;
    playClick();
    setBusy(true);
    try {
      await requestCancel(childUid, id, reason);
      toast.success('Pedido enviado ao seu pai');
      setReason('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 mn-veil" onClick={onClose}>
      <div className="mc-modal mc-pop mn-child-sheet rounded-lg w-full max-w-lg text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-wood-head flex justify-between items-center shrink-0">
          <h2 className="mc-title text-sm">Banco da Vila</h2>
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="mc-hotbar px-4 pt-3 shrink-0">
          {([
            ['cofrinho', 'Cofrinho'],
            ['extrato', 'Extrato'],
            ['paciencia', 'Paciência'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`mc-slot rounded px-3 min-h-[44px] ${tab === id ? 'mc-slot-selected' : ''}`}
              onClick={() => {
                playClick();
                setTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mn-child-body p-4 space-y-4">
          {tab === 'extrato' && <Extrato embedded monthly={vaultLv >= 3} />}
          {tab === 'paciencia' && (
            <div className="space-y-3 text-sm">
              <p>O gold que já estava guardado rende {ratePct}% por semana, com teto de {economy.interestCapGold ?? 20} gold somando as metas. O Cofre nível 2 libera o bônus; o nível 3 abre a faixa da temporada e o Extrato mensal.</p>
              {vaultLv >= 3 && <p>Cofre nível 3: prêmios da temporada e o Extrato mensal estão liberados.</p>}
              <p className="mc-muted">Na poupança de verdade, 100 reais rendem menos de 1 real por mês; aqui o bônus é maior de propósito, para você treinar.</p>
            </div>
          )}
          {tab === 'cofrinho' && (
            <>
              {!bankOn ? (
                <p className="text-sm">O Cofre ainda está sendo cavado. Em breve você guarda gold aqui.</p>
              ) : vaultLv < 1 ? (
                <div className="space-y-2">
                  <p className="text-sm">Construa o Cofre no lote da Vila para abrir a primeira meta.</p>
                  {preset && <p className="text-sm">Meta pronta: {preset.title} ({preset.targetGold} gold). Constrói o Cofre e eu abro o formulário.</p>}
                </div>
              ) : (
                <>
                  <p className="text-sm mc-muted">Gold livre: <span className="mc-num text-white" style={{ fontSize: 12 }}>{gold}</span></p>
                  <p className="text-sm">
                    {interestOn
                      ? `${ratePct}% por semana do que já estava guardado, até ${economy.interestCapGold ?? 20} gold.`
                      : vaultLv < 2
                        ? 'O bônus de paciência abre no Cofre nível 2.'
                        : 'O bônus de paciência está desligado.'}
                  </p>
                  {open.map((g) => {
                    const pct = g.targetGold > 0 ? Math.min(100, Math.round((g.savedGold / g.targetGold) * 100)) : 0;
                    const hit = g.savedGold >= g.targetGold;
                    return (
                      <div key={g.id} className="mc-card p-3 space-y-2">
                        <p className="font-bold">{g.title}</p>
                        <div className="mc-bar h-3 rounded overflow-hidden bg-black/40">
                          <div className="h-full bg-[#e8b923]" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-sm"><span className="mc-num" style={{ fontSize: 12 }}>{g.savedGold}</span> / {g.targetGold} gold</p>
                        {hit && <p className="text-sm mc-good">Avise seu pai: a meta bateu.</p>}
                        {g.status === 'cancel_requested' && <p className="text-sm mc-warn">Pedido de cancelamento enviado.</p>}
                        <div className="flex flex-wrap gap-1">
                          {AMOUNTS.map((n) => (
                            <button key={n} type="button" className={`mc-btn min-h-[44px] px-3 ${amount === n ? 'mc-btn-gold' : 'mc-btn-stone'}`} onClick={() => setAmount(n)}>{n}</button>
                          ))}
                          <input className="mc-input w-16 text-black px-2" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
                        </div>
                        <button type="button" disabled={busy || hit} className="mc-btn mc-btn-gold min-h-[44px] px-4" onClick={() => void deposit(g.id)}>Guardar</button>
                        {g.status === 'open' && (
                          <div className="flex gap-2 items-center">
                            <input className="mc-input flex-1 text-black px-2 py-1" placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
                            <button type="button" disabled={busy} className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => void cancel(g.id)}>Pedir para cancelar</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {open.length < goalCap ? (
                    <div className="mc-card p-3 space-y-2">
                      <p className="font-bold">Nova meta</p>
                      <input className="mc-input w-full text-black px-2 py-2" maxLength={40} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
                      <input className="mc-input w-full text-black px-2 py-2" type="number" min={20} value={target} onChange={(e) => setTarget(Number(e.target.value) || 20)} />
                      <button type="button" disabled={busy} className="mc-btn mc-btn-green min-h-[44px] px-4" onClick={() => void saveNew()}>Criar meta</button>
                    </div>
                  ) : (
                    <p className="text-sm mc-muted">
                      {goalCap === 1 ? 'O Cofre nível 1 guarda 1 meta. Melhore o Cofre para a segunda.' : 'Já tem 2 metas abertas.'}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cofrinho;
