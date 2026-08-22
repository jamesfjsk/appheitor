/*
  # Vacation Mode Config

  Single-row global config that toggles a vacation window during which XP and Gold
  rewards are multiplied. The `id` column is fixed to `'default'` so the app always
  reads/writes the same row.

  1. New Tables
     - `vacation_mode`
       - `id` (text, primary key, always `'default'`)
       - `is_enabled` (boolean)
       - `title` (text) — headline shown to the child
       - `message` (text) — subtitle / description
       - `start_date` (date)
       - `end_date` (date)
       - `xp_multiplier` (numeric, default 2)
       - `gold_multiplier` (numeric, default 2)
       - `updated_at` (timestamptz, default now())

  2. Security
     - RLS enabled
     - Anon + authenticated may `SELECT` (public banner)
     - Anon + authenticated may `INSERT` / `UPDATE` (admin toggles via app; auth is
       handled by Firebase, so we permit the anon key to write. This is a family
       app with a single admin.)

  3. Seed
     - Inserts the default row disabled so the app has something to read.
*/

CREATE TABLE IF NOT EXISTS vacation_mode (
  id text PRIMARY KEY DEFAULT 'default',
  is_enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT 'Modo Férias Ativado!',
  message text NOT NULL DEFAULT 'Ganhe XP e Gold em dobro em todas as missões!',
  start_date date,
  end_date date,
  xp_multiplier numeric NOT NULL DEFAULT 2,
  gold_multiplier numeric NOT NULL DEFAULT 2,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vacation_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_vacation_mode"
  ON vacation_mode FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "insert_vacation_mode"
  ON vacation_mode FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "update_vacation_mode"
  ON vacation_mode FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "delete_vacation_mode"
  ON vacation_mode FOR DELETE
  TO anon, authenticated
  USING (true);

INSERT INTO vacation_mode (id, is_enabled, title, message, xp_multiplier, gold_multiplier)
VALUES ('default', false, 'Modo Férias Ativado!', 'Ganhe XP e Gold em dobro em todas as missões!', 2, 2)
ON CONFLICT (id) DO NOTHING;
