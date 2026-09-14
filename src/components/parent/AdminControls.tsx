import React, { useState, useEffect } from 'react';
import { AlertTriangle, Coins, Zap, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';
import { calculateLevelSystem } from '../../utils/levelSystem';
import { PunishmentMode } from '../../types';

/**
 * Aba Ajustes: só o que um responsável usa de verdade.
 *   1. Dar ou tirar XP e gold, sempre com motivo (aparece no histórico)
 *   2. Modo punição, com o estado atual visível
 * Modo férias e fechamento do dia são cards próprios, renderizados pelo ParentPanel.
 */
const AdminControls: React.FC = () => {
  const { progress, checkAchievements } = useData();
  const { user, childUid } = useAuth();
  const { playClick, playError } = useSound();

  const level = calculateLevelSystem(progress.totalXP || 0);

  // ---------- Ajuste manual ----------
  const [currency, setCurrency] = useState<'gold' | 'xp'>('gold');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [applying, setApplying] = useState(false);

  const applyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childUid || !user) return;
    const value = parseInt(amount, 10);
    if (!Number.isFinite(value) || value === 0) {
      toast.error('Informe um valor diferente de zero (use - para tirar).');
      return;
    }
    if (reason.trim().length < 3) {
      toast.error('Escreva o motivo do ajuste.');
      return;
    }
    setApplying(true);
    playClick();
    try {
      const label = (delta: number, unit: string) => `${delta > 0 ? '+' : ''}${delta} ${unit} para o Heitor (${reason.trim()})`;
      if (currency === 'gold') {
        const r = await FirestoreService.adjustGoldManually(childUid, value, reason.trim(), user.userId);
        const applied = r.after - r.before;
        toast.success(applied === 0 ? `Nada aplicado: o Heitor tem ${r.before} gold.` : label(applied, 'gold'));
      } else {
        const r = await FirestoreService.adjustXPManually(childUid, value, reason.trim(), user.userId);
        toast.success(label(r.after - r.before, 'XP'));
        void checkAchievements();
      }
      setAmount('');
      setReason('');
    } catch (error) {
      console.error('AdminControls: erro no ajuste manual', error);
      playError();
      toast.error('Não foi possível aplicar o ajuste.');
    } finally {
      setApplying(false);
    }
  };

  // ---------- Modo punição ----------
  const [punishment, setPunishment] = useState<PunishmentMode | null>(null);
  const [punishReason, setPunishReason] = useState('');
  const [punishBusy, setPunishBusy] = useState(false);

  useEffect(() => {
    if (!childUid) return;
    return FirestoreService.subscribeToActivePunishment(childUid, setPunishment);
  }, [childUid]);

  const activatePunishment = async () => {
    if (!childUid || !user) return;
    if (punishReason.trim().length < 3) {
      toast.error('Escreva o motivo da punição.');
      return;
    }
    const ok = window.confirm(`O app do Heitor fica bloqueado até ele fazer 30 tarefas (uma a cada 30 minutos) ou passarem 7 dias.\n\nMotivo: ${punishReason.trim()}\n\nAtivar?`);
    if (!ok) return;
    setPunishBusy(true);
    try {
      await FirestoreService.activatePunishmentMode(childUid, user.userId, punishReason.trim());
      toast.success('Punição ativada. O app do Heitor está bloqueado.');
      setPunishReason('');
    } catch (error) {
      const err = error as { code?: string; message?: string } | null;
      console.error('AdminControls: erro ao ativar punição', error);
      toast.error(err?.code === 'permission-denied' ? 'Sem permissão para ativar a punição.' : 'Não foi possível ativar a punição.');
    } finally {
      setPunishBusy(false);
    }
  };

  const endPunishment = async () => {
    if (!punishment) return;
    if (!window.confirm('Encerrar a punição agora? O Heitor volta a usar o app na hora.')) return;
    setPunishBusy(true);
    try {
      await FirestoreService.deactivatePunishmentMode(punishment.id, 'admin_override');
      toast.success('Punição encerrada. O Heitor já pode usar o app.');
    } catch (error) {
      console.error('AdminControls: erro ao encerrar punição', error);
      toast.error('Não foi possível encerrar a punição.');
    } finally {
      setPunishBusy(false);
    }
  };

  const fmtDate = (d: Date | undefined) => (d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <div className="space-y-6">
      {/* Dar ou tirar XP e gold */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900">Dar ou tirar XP e gold</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Hoje: <strong>{progress.availableGold || 0} gold</strong> · <strong>{level.currentXP} XP</strong> · nível {level.currentLevel}. XP sobe o nível; gold compra recompensas.
          O motivo fica registrado: gold aparece no Histórico Gold e XP fica guardado nos ajustes.
        </p>
        <form onSubmit={applyAdjustment} className="grid gap-4 sm:grid-cols-[150px_140px_1fr_auto] sm:items-end">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button type="button" onClick={() => setCurrency('gold')} className={`flex-1 px-3 py-2 text-sm font-semibold inline-flex items-center justify-center gap-1 ${currency === 'gold' ? 'bg-yellow-400 text-yellow-950' : 'bg-white text-gray-600'}`}>
              <Coins className="w-4 h-4" /> Gold
            </button>
            <button type="button" onClick={() => setCurrency('xp')} className={`flex-1 px-3 py-2 text-sm font-semibold inline-flex items-center justify-center gap-1 ${currency === 'xp' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}>
              <Zap className="w-4 h-4" /> XP
            </button>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-600">Valor (negativo tira)</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+20" className="rounded-lg border border-gray-300 px-3 py-2" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-600">Motivo</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={currency === 'gold' ? 'Ex.: ajudou a vó' : 'Ex.: estudou sozinho para a prova'} className="rounded-lg border border-gray-300 px-3 py-2" required />
          </label>
          <button type="submit" disabled={applying} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60">
            {applying ? 'Aplicando...' : 'Aplicar'}
          </button>
        </form>
      </div>

      {/* Modo punição */}
      <div className={`rounded-2xl border p-6 ${punishment ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${punishment ? 'text-red-600' : 'text-gray-400'}`} /> Modo punição
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Para desobediência ou desrespeito. O app do Heitor fica bloqueado até ele fazer 30 tarefas (uma a cada 30 minutos) ou passarem 7 dias.
            </p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${punishment ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {punishment ? 'Ativa' : 'Nenhuma punição ativa'}
          </span>
        </div>

        {punishment ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-white border border-red-200 p-4 text-sm text-gray-800">
              <p><strong>Motivo:</strong> {punishment.reason}</p>
              <p><strong>Começou:</strong> {fmtDate(punishment.startDate)} · <strong>termina:</strong> {fmtDate(punishment.endDate)}</p>
              <p><strong>Tarefas feitas:</strong> {punishment.tasksCompleted} de {punishment.tasksRequired}</p>
            </div>
            <button onClick={() => void endPunishment()} disabled={punishBusy} className="px-5 py-2.5 rounded-lg bg-white border border-red-300 text-red-700 font-bold hover:bg-red-100 disabled:opacity-60 inline-flex items-center gap-2">
              <ShieldOff className="w-4 h-4" /> {punishBusy ? 'Encerrando...' : 'Encerrar punição agora'}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-600">Motivo</span>
              <input value={punishReason} onChange={(e) => setPunishReason(e.target.value)} placeholder="Ex.: respondeu mal à mãe" className="rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <button onClick={() => void activatePunishment()} disabled={punishBusy} className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60">
              {punishBusy ? 'Ativando...' : 'Ativar punição'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminControls;
