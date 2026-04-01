-- ============================================================================
-- Migration: Drop unused columns & auto-calculate BMI
-- Date: 2026-03-24
--
-- These columns exist in the schema but are never queried, written, or
-- displayed anywhere in the application code. Each was verified against
-- every server action, API route, Inngest function, and component.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────────
-- sport_focus: never referenced in any query or UI.
ALTER TABLE profiles
  DROP COLUMN IF EXISTS sport_focus;

-- ── training_sessions ──────────────────────────────────────────────────────
-- assigned_by: superseded by assigned_by_id (UUID FK).
-- plan_id: orphaned FK to training_plans, never queried or set.
-- NOTE: plan_assignment_id and plan_session_id are actively used in
-- coach-tools.ts and client-portal.ts — DO NOT drop them.
ALTER TABLE training_sessions
  DROP COLUMN IF EXISTS assigned_by,
  DROP COLUMN IF EXISTS plan_id;

-- ── cardio_sessions ────────────────────────────────────────────────────────
-- route_gpx_url: GPX route tracking was never implemented.
ALTER TABLE cardio_sessions
  DROP COLUMN IF EXISTS route_gpx_url;

-- ── fitness_goals ──────────────────────────────────────────────────────────
-- These goal-type-specific fields were never wired up; the generic
-- target_value + unit pattern covers these cases.
ALTER TABLE fitness_goals
  DROP COLUMN IF EXISTS target_body_fat_percent,
  DROP COLUMN IF EXISTS weekly_workouts,
  DROP COLUMN IF EXISTS sport_specific_goal,
  DROP COLUMN IF EXISTS review_date;

-- ── body_measurements ──────────────────────────────────────────────────────
-- bone_density_score, visceral_fat_level, measurement_method: never selected
-- in any query. ai_analysis, photo_*_url: only referenced in commented-out code.
-- NOTE: bmi is KEPT and will be auto-calculated via trigger below.
ALTER TABLE body_measurements
  DROP COLUMN IF EXISTS bone_density_score,
  DROP COLUMN IF EXISTS visceral_fat_level,
  DROP COLUMN IF EXISTS measurement_method,
  DROP COLUMN IF EXISTS ai_analysis,
  DROP COLUMN IF EXISTS photo_front_url,
  DROP COLUMN IF EXISTS photo_side_url,
  DROP COLUMN IF EXISTS photo_back_url;

-- ── training_plan_items ────────────────────────────────────────────────────
-- nutrition_log_id: exists in types but never queried or written.
ALTER TABLE training_plan_items
  DROP COLUMN IF EXISTS nutrition_log_id;

-- ============================================================================
-- Auto-calculate BMI on body_measurements INSERT / UPDATE
-- Formula: BMI = weight(kg) / height(m)^2
-- Uses the row's own height_cm if present, otherwise falls back to the
-- most recent prior measurement for the same subject that has a height.
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  w  NUMERIC;
  h  NUMERIC;
BEGIN
  -- weight is stored in the "weight" column (kg)
  w := NEW.weight;

  -- prefer height on this row; fall back to latest known height for the subject
  h := NEW.height_cm;

  IF h IS NULL THEN
    IF NEW.subject_client_id IS NOT NULL THEN
      SELECT bm.height_cm INTO h
        FROM body_measurements bm
       WHERE bm.subject_client_id = NEW.subject_client_id
         AND bm.height_cm IS NOT NULL
         AND bm.id IS DISTINCT FROM NEW.id
       ORDER BY bm.date DESC, bm.created_at DESC
       LIMIT 1;
    ELSIF NEW.subject_user_id IS NOT NULL THEN
      SELECT bm.height_cm INTO h
        FROM body_measurements bm
       WHERE bm.subject_user_id = NEW.subject_user_id
         AND bm.height_cm IS NOT NULL
         AND bm.id IS DISTINCT FROM NEW.id
       ORDER BY bm.date DESC, bm.created_at DESC
       LIMIT 1;
    ELSIF NEW.user_id IS NOT NULL THEN
      SELECT bm.height_cm INTO h
        FROM body_measurements bm
       WHERE bm.user_id = NEW.user_id
         AND bm.height_cm IS NOT NULL
         AND bm.id IS DISTINCT FROM NEW.id
       ORDER BY bm.date DESC, bm.created_at DESC
       LIMIT 1;
    END IF;
  END IF;

  -- calculate BMI only when both values are available and valid
  IF w IS NOT NULL AND w > 0 AND h IS NOT NULL AND h > 0 THEN
    NEW.bmi := ROUND(w / ((h / 100.0) * (h / 100.0)), 1);
  ELSE
    NEW.bmi := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- attach trigger to body_measurements
DROP TRIGGER IF EXISTS trg_calculate_bmi ON body_measurements;
CREATE TRIGGER trg_calculate_bmi
  BEFORE INSERT OR UPDATE OF weight, height_cm
  ON body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bmi();

-- back-fill BMI for existing rows that have weight + height
UPDATE body_measurements
   SET bmi = ROUND((weight / ((height_cm / 100.0) * (height_cm / 100.0)))::numeric, 1)
 WHERE weight IS NOT NULL
   AND weight > 0
   AND height_cm IS NOT NULL
   AND height_cm > 0
   AND (bmi IS NULL OR bmi = 0);
