import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { subscribeBase } from '../services/englishBaseService';
import { subscribeSettings } from '../services/settingsService';
import {
  ackNotice,
  buyCosmetic,
  completeOnboarding,
  confirmHabit,
  craftGear,
  dismissAutoNotice,
  openDailyChest,
  saveCharacter,
  subscribeNotices,
  subscribeVillage,
  tradeMaterials,
} from '../services/villageService';
import {
  DEFAULT_ECONOMY,
  DEFAULT_MODULES,
  DEFAULT_VILLAGE_SETTINGS,
  initialVillageDoc,
} from '../config/village';
import type { BaseDoc } from '../types/english';
import type {
  EconomySettings,
  FatherNotice,
  ModuleSettings,
  PauseDaysSettings,
  VillageCharacter,
  VillageDoc,
  VillageSettings,
} from '../types/village';
import type { Material } from '../types/english';
import { INITIAL_MATERIALS, INITIAL_BUILDINGS } from '../config/englishBase';
import { getTodayBrazil } from '../utils/timezone';

interface VillageContextValue {
  village: VillageDoc;
  materials: BaseDoc['materials'];
  buildings: BaseDoc['buildings'];
  settings: VillageSettings;
  economy: EconomySettings;
  modules: ModuleSettings;
  pauseDays: PauseDaysSettings;
  notices: FatherNotice[];
  loading: boolean;
  completeOnboarding: (input: { characterName: string; villageName: string; character: VillageCharacter }) => Promise<void>;
  saveCharacter: (character: VillageCharacter) => Promise<void>;
  buyCosmetic: (itemId: string) => Promise<void>;
  craftGear: (gearId: string) => Promise<void>;
  tradeMaterials: (from: Material, to: Material) => Promise<void>;
  openChest: () => Promise<void>;
  ackNotice: (id: string) => Promise<void>;
  dismissNotice: (key: string) => Promise<void>;
  confirmHabit: (habitId: string) => Promise<void>;
}

const VillageContext = createContext<VillageContextValue | undefined>(undefined);

export function useVillage(): VillageContextValue {
  const ctx = useContext(VillageContext);
  if (!ctx) throw new Error('useVillage precisa do VillageProvider');
  return ctx;
}

const emptyBase: BaseDoc['materials'] = { ...INITIAL_MATERIALS };
const emptyBuildings: BaseDoc['buildings'] = { ...INITIAL_BUILDINGS };

export const VillageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, childUid } = useAuth();
  const { progress } = useData();
  const uid = user?.role === 'child' ? user.userId : childUid;
  const [village, setVillage] = useState<VillageDoc>(initialVillageDoc(uid || 'pending', new Date().toISOString()));
  const [materials, setMaterials] = useState(emptyBase);
  const [buildings, setBuildings] = useState(emptyBuildings);
  const [settings, setSettings] = useState(DEFAULT_VILLAGE_SETTINGS);
  const [economy, setEconomy] = useState(DEFAULT_ECONOMY);
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [pauseDays, setPauseDays] = useState<PauseDaysSettings>({ dates: [] });
  const [notices, setNotices] = useState<FatherNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const unsubs = [
      subscribeVillage(uid, (v) => { setVillage(v); setLoading(false); }, () => setLoading(false)),
      subscribeBase(uid, (b) => { setMaterials(b.materials); setBuildings(b.buildings); }),
      subscribeSettings('village', DEFAULT_VILLAGE_SETTINGS as unknown as Record<string, unknown>, (v) => setSettings(v as unknown as VillageSettings)),
      subscribeSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>, (v) => setEconomy(v as unknown as EconomySettings)),
      subscribeSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>, (v) => setModules(v as unknown as ModuleSettings)),
      subscribeSettings('pauseDays', { dates: [] }, (v) => setPauseDays(v as PauseDaysSettings)),
      subscribeNotices(uid, setNotices),
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  const wrap = useCallback(async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu certo');
      throw e;
    }
  }, []);

  const value = useMemo<VillageContextValue>(() => ({
    village,
    materials,
    buildings,
    settings,
    economy,
    modules,
    pauseDays,
    notices,
    loading,
    completeOnboarding: (input) => wrap(() => completeOnboarding(uid!, input), 'Minerador criado'),
    saveCharacter: (character) => wrap(() => saveCharacter(uid!, character), 'Visual salvo'),
    buyCosmetic: (itemId) => wrap(() => buyCosmetic(uid!, itemId), 'Item comprado'),
    craftGear: (gearId) => wrap(() => craftGear(uid!, gearId), 'Equipamento pronto'),
    tradeMaterials: (from, to) => wrap(() => tradeMaterials(uid!, from, to), 'Troca feita'),
    openChest: () => wrap(() => openDailyChest(uid!, getTodayBrazil()).then(() => undefined), 'Baú aberto'),
    ackNotice: (id) => wrap(() => ackNotice(id), 'Combinado'),
    dismissNotice: (key) => wrap(() => dismissAutoNotice(uid!, key), 'Recado dispensado'),
    confirmHabit: (habitId) => wrap(() => confirmHabit(uid!, habitId, getTodayBrazil()), 'Hábito feito'),
  }), [village, materials, buildings, settings, economy, modules, pauseDays, notices, loading, uid, wrap, progress.availableGold]);

  return <VillageContext.Provider value={value}>{children}</VillageContext.Provider>;
};
