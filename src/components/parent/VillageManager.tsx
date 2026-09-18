import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import {
  DEFAULT_ECONOMY,
  DEFAULT_MODULES,
  DEFAULT_VILLAGE_SETTINGS,
  GEAR,
} from '../../config/village';
import { MATERIAL_LABELS } from '../../config/englishBase';
import { subscribeSettings, saveSettings } from '../../services/settingsService';
import {
  listDayCompletions,
  resetCharacter,
  resetOnboarding,
  closeSeason,
  subscribeVillage,
} from '../../services/villageService';
import { subscribeBase } from '../../services/englishBaseService';
import { FirestoreService } from '../../services/firestoreService';
import { getAppVersion, subscribeClientErrors, subscribeHealth, type ClientErrorRow } from '../../services/observability';
import { getTodayBrazil } from '../../utils/timezone';
import { addDays } from '../../utils/clock';
import { seasonEndsOn } from '../../services/village/season';
import type {
  EconomySettings,
  HealthDoc,
  ModuleSettings,
  PauseDaysSettings,
  VillageDoc,
  VillageSettings,
} from '../../types/village';
import type { BaseDoc } from '../../types/english';
import { INITIAL_MATERIALS } from '../../config/englishBase';

const MODULE_HELP: Record<keyof ModuleSettings, string> = {
  shop: 'Desligado: a Loja da Vila recusa compras.',
  effects: 'Desligado: equipamentos não dão bônus (ainda dá para craftar).',
  bank: 'Cofrinho, juros e metas da criança.',
  interest: 'Bônus de paciência (5% por semana).',
  logic: 'Vagoneta da Mina. Aparece na Mina depois do Recado do dia.',
  lines: 'Reservado para a próxima etapa.',
  dilemmas: 'Reservado para a próxima etapa.',
  mineShift: 'Reservado para a próxima etapa.',
  football: 'Reservado para a próxima etapa.',
  chat: 'Reservado para a próxima etapa.',
  tts: 'Desligado: a Mina não fala as palavras.',
  aiGeneration: 'Desligado: a prova e o plano do dia não usam IA.',
  music: 'Trilha da Vila. Desligado: a Vila fica em silêncio (os cliques continuam).',
};

const VillageManager: React.FC = () => {
  const { childUid, user } = useAuth();
  const { tasks } = useData();
  const [village, setVillage] = useState<VillageDoc | null>(null);
  const [materials, setMaterials] = useState<BaseDoc['materials']>({ ...INITIAL_MATERIALS });
  const [settings, setSettings] = useState<VillageSettings>(DEFAULT_VILLAGE_SETTINGS);
  const [economy, setEconomy] = useState<EconomySettings>(DEFAULT_ECONOMY);
  const [modules, setModules] = useState<ModuleSettings>(DEFAULT_MODULES);
  const [pauseDays, setPauseDays] = useState<PauseDaysSettings>({ dates: [] });
  const [health, setHealth] = useState<HealthDoc | null>(null);
  const [errors, setErrors] = useState<ClientErrorRow[]>([]);
  const [todayDone, setTodayDone] = useState<Array<{ taskId: string; taskTitle: string; date: string }>>([]);
  const [seasonStep, setSeasonStep] = useState(0);
  const [seasonBusy, setSeasonBusy] = useState(false);
  const [pauseInput, setPauseInput] = useState('');

  useEffect(() => {
    if (!childUid) return;
    const unsubs = [
      subscribeVillage(childUid, setVillage),
      subscribeBase(childUid, (b) => setMaterials(b.materials)),
      subscribeSettings('village', DEFAULT_VILLAGE_SETTINGS as unknown as Record<string, unknown>, (v) => setSettings(v as unknown as VillageSettings)),
      subscribeSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>, (v) => setEconomy(v as unknown as EconomySettings)),
      subscribeSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>, (v) => setModules(v as unknown as ModuleSettings)),
      subscribeSettings('pauseDays', { dates: [] }, (v) => setPauseDays(v as PauseDaysSettings)),
      subscribeHealth(childUid, setHealth),
      subscribeClientErrors(childUid, setErrors),
    ];
    const today = getTodayBrazil();
    void listDayCompletions(childUid, today).then(setTodayDone);
    return () => unsubs.forEach((u) => u());
  }, [childUid]);

  const saveVillage = async (partial: Partial<VillageSettings>) => {
    await saveSettings('village', { ...settings, ...partial } as unknown as Record<string, unknown>);
    toast.success('Ajustes da Vila salvos');
  };
  const saveEconomy = async (next: EconomySettings) => {
    await saveSettings('economy', next as unknown as Record<string, unknown>);
    toast.success('Economia salva');
  };
  const saveModules = async (next: ModuleSettings) => {
    await saveSettings('modules', next as unknown as Record<string, unknown>);
    toast.success('Módulos salvos');
  };

  const stale = (value: string | null) => {
    if (!value) return true;
    const today = getTodayBrazil();
    return value < today;
  };

  if (!childUid) {
    return <p className="text-gray-600">Sem criança selecionada.</p>;
  }

  const chests = Object.keys(village?.claimed || {}).filter((k) => k.startsWith('daily:')).length;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Visão da Vila</h2>
        {village ? (
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <p><strong>Nome:</strong> {village.name}</p>
            <p><strong>Personagem:</strong> {village.characterName}</p>
            <p><strong>Primeiro acesso:</strong> {village.onboardedAt ? 'feito' : 'pendente'}</p>
            <p><strong>Dias completos seguidos:</strong> {village.fullDays}</p>
            <p><strong>Baús abertos:</strong> {chests}</p>
            <p><strong>Fase:</strong> {village.season || 0}</p>
            <p><strong>Diamante / esmeralda:</strong> {village.rare.diamante} / {village.rare.esmeralda}</p>
            <p><strong>Equipamentos:</strong> {GEAR.filter((g) => (g.slot === 'pickaxe' ? village.gear.pickaxe >= g.level : village.gear[g.slot] >= 1)).map((g) => g.label).join(', ') || 'nenhum'}</p>
          </div>
        ) : (
          <p className="text-gray-500">Carregando vila...</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          {(Object.keys(MATERIAL_LABELS) as Array<keyof typeof MATERIAL_LABELS>).map((m) => (
            <span key={m} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{MATERIAL_LABELS[m]}: {materials[m] || 0}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            onClick={async () => {
              if (!window.confirm('Refazer o primeiro acesso da criança?')) return;
              await resetOnboarding(childUid);
              toast.success('Primeiro acesso zerado');
            }}
          >
            Refazer primeiro acesso
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg"
            onClick={async () => {
              if (!window.confirm('Zerar personagem, equipamentos e cosméticos? Gold e materiais ficam.')) return;
              await resetCharacter(childUid);
              toast.success('Personagem zerado');
            }}
          >
            Zerar personagem
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Não foi feita</h2>
        <p className="text-sm text-gray-600 mb-3">Desfaz a conclusão de hoje, devolve gold/XP/materiais. O Baú do Dia, se já aberto, não reabre. Missões de ontem ficam para a Etapa 2.</p>
        <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Hoje</h3>
            {todayDone.length === 0 ? <p className="text-sm text-gray-500">Nenhuma conclusão.</p> : todayDone.map((row) => (
              <div key={row.taskId} className="flex items-center justify-between border-b border-gray-100 py-2">
                <span className="text-sm">{row.taskTitle}</span>
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={async () => {
                    if (!user || !window.confirm(`Marcar "${row.taskTitle}" como não feita?`)) return;
                    await FirestoreService.revertTaskCompletion(row.taskId, row.date, user.userId);
                    toast.success('Conclusão desfeita');
                    setTodayDone(await listDayCompletions(childUid, getTodayBrazil()));
                  }}
                >
                  Não foi feita
                </button>
              </div>
            ))}
        </div>
        {tasks.length === 0 && <p className="text-xs text-gray-400">Lista de missões carregada pelo painel.</p>}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Loja e time</h2>
        <label className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={settings.shopEnabled} onChange={(e) => setSettings({ ...settings, shopEnabled: e.target.checked })} />
          Loja ligada
        </label>
        <label className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={settings.effectsEnabled} onChange={(e) => setSettings({ ...settings, effectsEnabled: e.target.checked })} />
          Efeitos de equipamento ligados
        </label>
        <label className="block text-sm mb-2">Multiplicador de preço
          <input type="number" step="0.1" min={0.1} className="ml-2 border rounded px-2 py-1 w-24" value={settings.goldPriceMultiplier} onChange={(e) => setSettings({ ...settings, goldPriceMultiplier: Number(e.target.value) || 1 })} />
        </label>
        <label className="block text-sm mb-2">Time
          <input className="ml-2 border rounded px-2 py-1" value={settings.team.name} onChange={(e) => setSettings({ ...settings, team: { ...settings.team, name: e.target.value } })} />
        </label>
        <div className="flex gap-2 mb-3">
          <input type="color" value={settings.team.color1} onChange={(e) => setSettings({ ...settings, team: { ...settings.team, color1: e.target.value } })} />
          <input type="color" value={settings.team.color2} onChange={(e) => setSettings({ ...settings, team: { ...settings.team, color2: e.target.value } })} />
        </div>
        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={() => void saveVillage({})}>Salvar loja</button>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Economia</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {([
            ['materialsPerTask', 'Materiais por missão'],
            ['rareEveryNDays', 'Esmeralda a cada N dias'],
            ['gameGoldDailyCap', 'Teto de gold do jogo no dia'],
            ['redeemMinTasks', 'Mínimo de missões para resgatar'],
            ['taskDefaultXp', 'XP padrão da missão'],
            ['taskDefaultGold', 'Gold padrão da missão'],
            ['chestOpenHour', 'Hora do Baú'],
            ['minDueForChest', 'Mínimo de missões para o Baú'],
          ] as const).map(([key, label]) => (
            <label key={key} className="block">{label}
              <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={economy[key]} onChange={(e) => setEconomy({ ...economy, [key]: Number(e.target.value) })} />
            </label>
          ))}
          <label className="block">Gold do Baú (mín)
            <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={economy.dailyChestGold[0]} onChange={(e) => setEconomy({ ...economy, dailyChestGold: [Number(e.target.value), economy.dailyChestGold[1]] })} />
          </label>
          <label className="block">Gold do Baú (máx)
            <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={economy.dailyChestGold[1]} onChange={(e) => setEconomy({ ...economy, dailyChestGold: [economy.dailyChestGold[0], Number(e.target.value)] })} />
          </label>
          <label className="block">Tarde começa às
            <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={economy.periodStartHours.afternoon} onChange={(e) => setEconomy({ ...economy, periodStartHours: { ...economy.periodStartHours, afternoon: Number(e.target.value) } })} />
          </label>
          <label className="block">Noite começa às
            <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={economy.periodStartHours.evening} onChange={(e) => setEconomy({ ...economy, periodStartHours: { ...economy.periodStartHours, evening: Number(e.target.value) } })} />
          </label>
          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={economy.periodGating} onChange={(e) => setEconomy({ ...economy, periodGating: e.target.checked })} />
            Portão de horário ligado
          </label>
        </div>
        <button type="button" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={() => void saveEconomy(economy)}>Salvar economia</button>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Módulos</h2>
        <div className="space-y-3">
          {(Object.keys(modules) as Array<keyof ModuleSettings>).map((key) => (
            <label key={key} className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={Boolean(modules[key])} onChange={(e) => setModules({ ...modules, [key]: e.target.checked })} />
              <span>
                <span className="font-medium">{key}</span>
                <span className="block text-sm text-gray-600">{MODULE_HELP[key]}</span>
              </span>
            </label>
          ))}
        </div>
        <button type="button" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={() => void saveModules(modules)}>Salvar módulos</button>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dias de folga</h2>
        <div className="flex gap-2 mb-3">
          <input type="date" className="border rounded px-2 py-1" value={pauseInput} onChange={(e) => setPauseInput(e.target.value)} />
          <button
            type="button"
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={async () => {
              if (!pauseInput) return;
              const dates = Array.from(new Set([...pauseDays.dates, pauseInput])).sort();
              await saveSettings('pauseDays', { dates });
              setPauseInput('');
              toast.success('Folga marcada');
            }}
          >
            Marcar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {pauseDays.dates.map((d) => (
            <button
              key={d}
              type="button"
              className="px-3 py-1 bg-gray-100 rounded-full text-sm"
              onClick={async () => {
                const dates = pauseDays.dates.filter((x) => x !== d);
                await saveSettings('pauseDays', { dates });
              }}
            >
              {d} ×
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Fechar temporada</h2>
        <p className="text-sm text-gray-600 mb-3">
          Grava uma estrela, zera o XP, mantém o gold. As conquistas de nível reiniciam. Previsto: {seasonEndsOn(
            village?.stars?.length ? addDays(village.stars[village.stars.length - 1].endedOn, 1) : getTodayBrazil(),
            economy.seasonWeeks || 13
          )}.
        </p>
        {seasonStep === 0 && (
          <button type="button" className="px-4 py-2 bg-amber-600 text-white rounded-lg" disabled={seasonBusy} onClick={() => setSeasonStep(1)}>Fechar temporada</button>
        )}
        {seasonStep === 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="mb-3">Tem certeza? O nível volta para Novato da Mina. O gold não muda.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-amber-700 text-white rounded-lg"
                onClick={async () => {
                  if (!user || seasonBusy) return;
                  setSeasonBusy(true);
                  try {
                    await closeSeason(childUid, user.userId);
                    setSeasonStep(0);
                    toast.success('Temporada fechada');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Não deu para fechar a temporada');
                  } finally {
                    setSeasonBusy(false);
                  }
                }}
                disabled={seasonBusy}
              >
                {seasonBusy ? 'Fechando…' : 'Confirmar de novo'}
              </button>
              <button type="button" className="px-4 py-2 border rounded-lg" disabled={seasonBusy} onClick={() => setSeasonStep(0)}>Cancelar</button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Saúde</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            ['lastCloseDay', health?.lastCloseDay],
            ['lastQuizGenerated', health?.lastQuizGenerated],
            ['lastPlanGenerated', health?.lastPlanGenerated],
            ['lastChestDate', health?.lastChestDate],
            ['lastInterestWeek', health?.lastInterestWeek],
            ['lastLearningWeek', health?.lastLearningWeek],
          ] as const).map(([k, v]) => (
            <span key={k} className={`px-3 py-1 rounded-full text-sm ${stale(v ?? null) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {k}: {v || 'nunca'}
            </span>
          ))}
        </div>
        <h3 className="font-semibold mb-2">Últimos erros do app</h3>
        {errors.length === 0 ? <p className="text-sm text-gray-500">Nenhum.</p> : (
          <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
            {errors.map((e) => (
              <li key={e.id} className="border-b border-gray-100 pb-1">
                <span className="text-gray-500">{e.createdAt}</span> · {e.route} · {e.message}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-400 mt-4">Versão {getAppVersion()}</p>
      </section>
    </div>
  );
};

export default VillageManager;
