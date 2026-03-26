-- ============================================================================
-- Migration: Remove all AI-related tables and columns
-- Date: 2026-03-25
--
-- ai_insights: write-only table (Inngest writes, no UI reads) — dead weight.
-- ai_feedback (training_sessions): never populated by AI, unused text field.
-- ai_processing_queue: referenced only in commented-out code, never created.
-- ai_analysis (body_measurements): already dropped in 20260324160000.
-- ============================================================================

-- ── Drop ai_insights table entirely ─────────────────────────────────────────
DROP TRIGGER IF EXISTS set_updated_at_ai_insights ON ai_insights;
DROP TABLE IF EXISTS ai_insights;

-- ── Drop ai_feedback column from training_sessions ──────────────────────────
ALTER TABLE training_sessions
  DROP COLUMN IF EXISTS ai_feedback;
