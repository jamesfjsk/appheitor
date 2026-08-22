import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase, VacationMode } from '../lib/supabase';
import { getTodayBrazil } from '../utils/timezone';

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

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vacation_mode')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (error) {
        console.error('VacationContext load error:', error);
        setConfig(null);
      } else {
        setConfig((data as VacationMode) ?? null);
      }
    } catch (err) {
      console.error('VacationContext unexpected error:', err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('vacation-mode-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vacation_mode', filter: 'id=eq.default' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            setConfig(payload.new as VacationMode);
          } else if (payload.eventType === 'DELETE') {
            setConfig(null);
          }
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      setConfig((current) => (current ? { ...current } : current));
    }, 60 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [load]);

  const updateConfig = useCallback(async (updates: Partial<Omit<VacationMode, 'id' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from('vacation_mode')
      .upsert({ id: 'default', ...updates, updated_at: new Date().toISOString() })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (data) setConfig(data as VacationMode);
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
      reload: load,
    };
  }, [config, loading, updateConfig, load]);

  return <VacationContext.Provider value={value}>{children}</VacationContext.Provider>;
};
