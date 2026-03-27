-- ============================================================================
-- Migration: Drop supplement catalog serving_label
-- Date: 2026-03-27
--
-- The catalog now stores only supplement identity and nutrient content.
-- Assignment dosage/unit already lives on supplement_assignments, so the
-- redundant catalog-level serving_label column can be removed.
-- ============================================================================

alter table if exists public.supplement_catalog
  drop column if exists serving_label;
