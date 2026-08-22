import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type VacationMode = {
  id: string;
  is_enabled: boolean;
  title: string;
  message: string;
  start_date: string | null;
  end_date: string | null;
  xp_multiplier: number;
  gold_multiplier: number;
  updated_at: string;
};
