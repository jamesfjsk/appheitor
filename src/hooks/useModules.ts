import { useEffect, useState } from 'react';
import { DEFAULT_MODULES } from '../config/village';
import { subscribeSettings } from '../services/settingsService';
import type { ModuleSettings } from '../types/village';

export function useModules(): ModuleSettings {
  const [modules, setModules] = useState<ModuleSettings>(DEFAULT_MODULES);
  useEffect(() => {
    return subscribeSettings(
      'modules',
      DEFAULT_MODULES as unknown as Record<string, unknown>,
      (v) => setModules(v as unknown as ModuleSettings)
    );
  }, []);
  return modules;
}
