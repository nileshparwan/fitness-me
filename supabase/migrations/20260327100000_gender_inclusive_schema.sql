-- ============================================================================
-- Migration: Gender inclusive schema + cycle tracking foundation
-- Date: 2026-03-27
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'non_binary', 'prefer_not_to_say');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE coach_specialty AS ENUM (
    'general_fitness',
    'strength_and_conditioning',
    'weight_management',
    'womens_health',
    'prenatal_and_postnatal',
    'yoga_and_pilates',
    'endurance_and_running',
    'sport_specific',
    'rehabilitation'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fitness_level AS ENUM ('beginner', 'intermediate', 'advanced', 'athlete');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE menstrual_cycle_phase AS ENUM ('menstrual', 'follicular', 'ovulatory', 'luteal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender gender_type,
  ADD COLUMN IF NOT EXISTS fitness_level fitness_level,
  ADD COLUMN IF NOT EXISTS coach_specialty coach_specialty,
  ADD COLUMN IF NOT EXISTS is_pregnant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS is_postpartum boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS postpartum_since date;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_due_date_requires_pregnant;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_due_date_requires_pregnant
  CHECK (due_date IS NULL OR is_pregnant = true);

UPDATE profiles
   SET gender = CASE
     WHEN lower(gender::text) IN ('male', 'm', 'man') THEN 'male'
     WHEN lower(gender::text) IN ('female', 'f', 'woman', 'girl') THEN 'female'
     WHEN lower(gender::text) IN ('non_binary', 'non-binary', 'nb', 'nonbinary') THEN 'non_binary'
     WHEN lower(gender::text) IN ('prefer_not_to_say', 'prefer not to say', 'none', '') THEN 'prefer_not_to_say'
     ELSE NULL
   END
 WHERE gender IS NOT NULL;

CREATE TABLE IF NOT EXISTS menstrual_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start_date date NOT NULL,
  period_end_date date,
  phase menstrual_cycle_phase,
  cycle_length_days integer CHECK (cycle_length_days BETWEEN 14 AND 60),
  period_length_days integer CHECK (period_length_days BETWEEN 1 AND 14),
  energy_level integer CHECK (energy_level BETWEEN 1 AND 5),
  mood integer CHECK (mood BETWEEN 1 AND 5),
  cramps integer CHECK (cramps BETWEEN 0 AND 3),
  bloating integer CHECK (bloating BETWEEN 0 AND 3),
  headache boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start_date)
);

CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_user_date
  ON menstrual_cycles (user_id, period_start_date DESC);

ALTER TABLE menstrual_cycles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cycles_select_own" ON menstrual_cycles FOR SELECT USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cycles_insert_own" ON menstrual_cycles FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cycles_update_own" ON menstrual_cycles FOR UPDATE USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cycles_delete_own" ON menstrual_cycles FOR DELETE USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS cycle_bell_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cycle_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cycle_reminder_days integer NOT NULL DEFAULT 2;

ALTER TABLE fitness_goals
  DROP CONSTRAINT IF EXISTS fitness_goals_goal_type_supported;

ALTER TABLE fitness_goals
  ADD CONSTRAINT fitness_goals_goal_type_supported
  CHECK (
    goal_type in (
      'weight',
      'muscle_gain',
      'strength',
      'performance',
      'nutrition',
      'custom',
      'body_recomposition',
      'flexibility',
      'mobility',
      'rehabilitation',
      'postpartum_recovery',
      'endurance',
      'sport_specific'
    )
  );
