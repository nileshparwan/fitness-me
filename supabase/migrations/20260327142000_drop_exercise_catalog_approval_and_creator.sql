-- ============================================================================
-- Migration: Drop exercise catalog approval and creator columns
-- Date: 2026-03-27
--
-- The exercise catalog is now treated as a unified catalog without approval
-- state or creator ownership at the row level.
-- ============================================================================

drop policy if exists exercise_catalog_insert_owner_or_admin on public.exercise_catalog;
drop policy if exists exercise_catalog_update_owner_or_admin on public.exercise_catalog;
drop policy if exists exercise_catalog_delete_owner_or_admin on public.exercise_catalog;

alter table if exists public.exercise_catalog
  drop column if exists is_approved,
  drop column if exists created_by;

create policy exercise_catalog_insert_authenticated on public.exercise_catalog
for insert to authenticated
with check (true);

create policy exercise_catalog_update_authenticated on public.exercise_catalog
for update to authenticated
using (true)
with check (true);

create policy exercise_catalog_delete_authenticated on public.exercise_catalog
for delete to authenticated
using (true);
