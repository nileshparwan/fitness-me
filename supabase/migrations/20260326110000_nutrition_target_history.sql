-- ============================================================================
-- Migration: Nutrition target history
-- Tracks macro target changes over time so per-day compliance fallback uses
-- the goal that was active on that date, not the current one.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nutrition_target_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('fitness_goal', 'manual_override')),
  source_id uuid,
  calories int,
  protein_g int,
  carbs_g int,
  fat_g int,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_target_history_subject_check CHECK (
    (subject_user_id IS NOT NULL AND subject_client_id IS NULL)
    OR (subject_user_id IS NULL AND subject_client_id IS NOT NULL)
  )
);

CREATE INDEX idx_nth_subject_user
  ON nutrition_target_history (subject_user_id, effective_from DESC)
  WHERE subject_user_id IS NOT NULL;

CREATE INDEX idx_nth_subject_client
  ON nutrition_target_history (subject_client_id, effective_from DESC)
  WHERE subject_client_id IS NOT NULL;

ALTER TABLE nutrition_target_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nth_select_own"
  ON nutrition_target_history
  FOR SELECT
  USING (subject_user_id = auth.uid());

CREATE OR REPLACE FUNCTION trg_record_nutrition_target_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_nutrition_changed boolean;
BEGIN
  v_nutrition_changed := (
    TG_OP = 'INSERT'
    OR NEW.daily_calories IS DISTINCT FROM OLD.daily_calories
    OR NEW.protein_target IS DISTINCT FROM OLD.protein_target
    OR NEW.carbs_target IS DISTINCT FROM OLD.carbs_target
    OR NEW.fat_target IS DISTINCT FROM OLD.fat_target
    OR NEW.status IS DISTINCT FROM OLD.status
  );

  IF NOT v_nutrition_changed THEN
    RETURN NEW;
  END IF;

  UPDATE nutrition_target_history
     SET effective_to = v_today
   WHERE subject_user_id = NEW.user_id
     AND effective_to IS NULL
     AND source_type = 'fitness_goal';

  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.daily_calories IS NULL
     AND NEW.protein_target IS NULL
     AND NEW.carbs_target IS NULL
     AND NEW.fat_target IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO nutrition_target_history (
    subject_user_id,
    source_type,
    source_id,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    effective_from
  )
  VALUES (
    NEW.user_id,
    'fitness_goal',
    NEW.id,
    NEW.daily_calories::int,
    NEW.protein_target::int,
    NEW.carbs_target::int,
    NEW.fat_target::int,
    v_today
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nutrition_target_history ON fitness_goals;
CREATE TRIGGER trg_nutrition_target_history
  AFTER INSERT OR UPDATE OF daily_calories, protein_target, carbs_target, fat_target, status
  ON fitness_goals
  FOR EACH ROW
  EXECUTE FUNCTION trg_record_nutrition_target_history();

INSERT INTO nutrition_target_history (
  subject_user_id,
  source_type,
  source_id,
  calories,
  protein_g,
  carbs_g,
  fat_g,
  effective_from
)
SELECT
  fg.user_id,
  'fitness_goal',
  fg.id,
  fg.daily_calories::int,
  fg.protein_target::int,
  fg.carbs_target::int,
  fg.fat_target::int,
  '2000-01-01'::date
FROM fitness_goals fg
WHERE fg.status = 'active'
  AND (
    fg.daily_calories IS NOT NULL
    OR fg.protein_target IS NOT NULL
    OR fg.carbs_target IS NOT NULL
    OR fg.fat_target IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1
      FROM nutrition_target_history nth
     WHERE nth.subject_user_id = fg.user_id
       AND nth.effective_to IS NULL
       AND nth.source_type = 'fitness_goal'
  );
