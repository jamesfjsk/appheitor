import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Save, Zap, Coins, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVacation } from '../../contexts/VacationContext';

const defaultTitle = 'Modo Férias Ativado!';
const defaultMessage = 'Ganhe XP e Gold em dobro em todas as missões!';

const VacationModeControl: React.FC = () => {
  const { config, loading, isActive, updateConfig, daysRemaining } = useVacation();

  const [isEnabled, setIsEnabled] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [message, setMessage] = useState(defaultMessage);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [xpMultiplier, setXpMultiplier] = useState(2);
  const [goldMultiplier, setGoldMultiplier] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setIsEnabled(config.is_enabled);
    setTitle(config.title ?? defaultTitle);
    setMessage(config.message ?? defaultMessage);
    setStartDate(config.start_date ?? '');
    setEndDate(config.end_date ?? '');
    setXpMultiplier(Number(config.xp_multiplier) || 1);
    setGoldMultiplier(Number(config.gold_multiplier) || 1);
  }, [config]);

  const handleSave = async () => {
    if (isEnabled && !endDate) {
      toast.error('Defina a data final das férias');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      toast.error('A data inicial precisa ser antes da data final');
      return;
    }
    if (xpMultiplier < 1 || goldMultiplier < 1) {
      toast.error('Os multiplicadores devem ser pelo menos 1');
      return;
    }

    setSaving(true);
    try {
      await updateConfig({
        is_enabled: isEnabled,
        title: title.trim() || defaultTitle,
        message: message.trim() || defaultMessage,
        start_date: startDate || null,
        end_date: endDate || null,
        xp_multiplier: xpMultiplier,
        gold_multiplier: goldMultiplier,
      });
      toast.success(isEnabled ? 'Modo Férias ativado!' : 'Modo Férias atualizado');
    } catch (err: any) {
      console.error('Vacation update error:', err);
      toast.error('Erro ao salvar Modo Férias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border-2 shadow-sm overflow-hidden"
      style={{
        borderColor: isActive ? '#f59e0b' : '#fed7aa',
        background: isActive
          ? 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)'
          : '#fffbeb',
      }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={isActive ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 3, repeat: Infinity }}
              className={`w-11 h-11 rounded-lg flex items-center justify-center shadow ${
                isActive ? 'bg-orange-500' : 'bg-amber-200'
              }`}
            >
              <Sun className={`w-6 h-6 ${isActive ? 'text-white' : 'text-orange-600'}`} strokeWidth={2.5} />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Modo Férias</h3>
              <p className="text-sm text-gray-600">
                XP e Gold multiplicados em todas as missões durante o período configurado.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isActive
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {isActive ? 'ATIVO AGORA' : 'INATIVO'}
            </span>
            {isActive && daysRemaining !== null && (
              <span className="text-xs text-orange-700 font-medium">
                {daysRemaining === 0
                  ? 'Último dia'
                  : `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Ativar Modo Férias</div>
                <div className="text-xs text-gray-500">Aplica os multiplicadores no período abaixo</div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnabled((v) => !v)}
                disabled={loading || saving}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  isEnabled ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    isEnabled ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <label className="block text-xs font-medium text-gray-700 mb-1">Título do banner</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm mb-3"
            />

            <label className="block text-xs font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
            />
          </div>

          <div className="bg-white rounded-lg p-4 border border-orange-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-blue-500" /> Multiplicador XP
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={xpMultiplier}
                  onChange={(e) => setXpMultiplier(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-yellow-500" /> Multiplicador Gold
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={goldMultiplier}
                  onChange={(e) => setGoldMultiplier(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[2, 3, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setXpMultiplier(val);
                    setGoldMultiplier(val);
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-full border border-orange-300 text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  {val}x XP + {val}x Gold
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg font-semibold flex items-center gap-2 shadow"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Modo Férias'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default VacationModeControl;
