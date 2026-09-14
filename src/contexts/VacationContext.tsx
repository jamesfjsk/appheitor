import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayBrazil } from '../utils/timezone';
import { useAuth } from './AuthContext';

// Modo férias: documento único em settings/vacationMode (antes vivia no Supabase)
export interface VacationMode {
  id: string;
  is_enabled: boolean;
  title: string;
  message: string;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;   // YYYY-MM-DD
  xp_multiplier: number;
  gold_multiplier: number;
  updated_at: string;
}

const VACATION_DOC = doc(db, 'settings', 'vacationMode');

interface VacationContextType {
  config: VacationMode | null;
  loading: boolean;
  isActive: boolean;
  xpMultiplier: number;
  goldMultiplier: number;
  daysRemaining: number | null;
  applyXP: (amount: number) => number;
  applyGold: (amount: number) => number;
  updateConfig: (updates: Partial<Omit<VacationMode, 'id' | 'updated_at'>>) => Promise<void>;
  reload: () => Promise<void>;
}

const VacationContext = createContext<VacationContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useVacation = (): VacationContextType => {
  const ctx = useContext(VacationContext);
  if (!ctx) throw new Error('useVacation deve ser usado dentro de VacationProvider');
  return ctx;
};

const isWithinRange = (config: VacationMode | null): boolean => {
  if (!config?.is_enabled) return false;
  const today = getTodayBrazil();
  if (config.start_date && today < config.start_date) return false;
  if (config.end_date && today > config.end_date) return false;
  return true;
};

const computeDaysRemaining = (config: VacationMode | null): number | null => {
  if (!config?.is_enabled || !config.end_date) return null;
  const today = new Date(getTodayBrazil() + 'T00:00:00-03:00');
  const end = new Date(config.end_date + 'T00:00:00-03:00');
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
};

export const VacationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<VacationMode | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const uid = user?.userId ?? null;

  useEffect(() => {
    // Sem login as regras negam a leitura; espera o usuário entrar
    if (!uid) {
      setConfig(null);
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      VACATION_DOC,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            id: snap.id,
            is_enabled: Boolean(data.is_enabled),
            title: data.title ?? '',
            message: data.message ?? '',
            start_date: data.start_date ?? null,
            end_date: data.end_date ?? null,
            xp_multiplier: Number(data.xp_multiplier) || 1,
            gold_multiplier: Number(data.gold_multiplier) || 1,
            updated_at: data.updated_at?.toDate?.().toISOString?.() ?? '',
          });
        } else {
          setConfig(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('VacationContext: erro ao ouvir settings/vacationMode', error);
        setConfig(null);
        setLoading(false);
      }
    );

    // Reavalia a janela de datas de hora em hora (o documento não muda, o dia sim)
    const interval = setInterval(() => {
      setConfig((current) => (current ? { ...current } : current));
    }, 60 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [uid]);

  const updateConfig = useCallback(async (updates: Partial<Omit<VacationMode, 'id' | 'updated_at'>>) => {
    await setDoc(VACATION_DOC, { ...updates, updated_at: serverTimestamp() }, { merge: true });
  }, []);

  const reload = useCallback(async () => {
    /* o listener já mantém o estado atualizado */
  }, []);

  const value = useMemo<VacationContextType>(() => {
    const active = isWithinRange(config);
    const xpMultiplier = active && config ? Number(config.xp_multiplier) || 1 : 1;
    const goldMultiplier = active && config ? Number(config.gold_multiplier) || 1 : 1;

    return {
      config,
      loading,
      isActive: active,
      xpMultiplier,
      goldMultiplier,
      daysRemaining: computeDaysRemaining(config),
      applyXP: (amount: number) => Math.round(amount * xpMultiplier),
      applyGold: (amount: number) => Math.round(amount * goldMultiplier),
      updateConfig,
      reload,
    };
  }, [config, loading, updateConfig, reload]);

  return <VacationContext.Provider value={value}>{children}</VacationContext.Provider>;
};
