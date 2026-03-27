-- ============================================================================
-- Migration: Menstrual cycles subject pattern
-- Date: 2026-03-27
-- ============================================================================

ALTER TABLE public.menstrual_cycles
  ADD COLUMN IF NOT EXISTS subject_client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS logged_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.menstrual_cycles
   SET logged_by_user_id = user_id,
       subject_client_id = NULL
 WHERE logged_by_user_id IS NULL;

UPDATE public.menstrual_cycles
   SET subject_user_id = user_id
 WHERE subject_user_id IS NULL
   AND subject_client_id IS NULL;

ALTER TABLE public.menstrual_cycles
  DROP CONSTRAINT IF EXISTS menstrual_cycles_user_id_period_start_date_key;

ALTER TABLE public.menstrual_cycles
  DROP CONSTRAINT IF EXISTS menstrual_cycles_subject_date_key;

ALTER TABLE public.menstrual_cycles
  ADD CONSTRAINT menstrual_cycles_subject_date_key
    UNIQUE NULLS NOT DISTINCT (subject_user_id, subject_client_id, period_start_date);

ALTER TABLE public.menstrual_cycles
  DROP CONSTRAINT IF EXISTS menstrual_cycles_subject_check;

ALTER TABLE public.menstrual_cycles
  ADD CONSTRAINT menstrual_cycles_subject_check
    CHECK (
      (subject_user_id IS NOT NULL AND subject_client_id IS NULL) OR
      (subject_user_id IS NULL AND subject_client_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_subject_user_date
  ON public.menstrual_cycles (subject_user_id, period_start_date DESC)
  WHERE subject_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_subject_client_date
  ON public.menstrual_cycles (subject_client_id, period_start_date DESC)
  WHERE subject_client_id IS NOT NULL;

DROP POLICY IF EXISTS "cycles_select_own" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "cycles_insert_own" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "cycles_update_own" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "cycles_delete_own" ON public.menstrual_cycles;

CREATE POLICY "cycles_select_own"
  ON public.menstrual_cycles FOR SELECT
  USING (subject_user_id = auth.uid());

CREATE POLICY "cycles_insert_own"
  ON public.menstrual_cycles FOR INSERT
  WITH CHECK (subject_user_id = auth.uid() AND subject_client_id IS NULL);

CREATE POLICY "cycles_update_own"
  ON public.menstrual_cycles FOR UPDATE
  USING (subject_user_id = auth.uid());

CREATE POLICY "cycles_delete_own"
  ON public.menstrual_cycles FOR DELETE
  USING (subject_user_id = auth.uid());
