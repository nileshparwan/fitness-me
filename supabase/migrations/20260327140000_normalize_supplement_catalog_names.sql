-- ============================================================================
-- Migration: Normalize supplement catalog names
-- Date: 2026-03-27
--
-- Removes trailing dosage text from supplement_catalog.name so the catalog
-- stores only the supplement name. If normalization would create duplicate
-- rows inside the existing (name, is_global) uniqueness scope, assignments are
-- repointed to the earliest row and the duplicates are removed.
-- ============================================================================

with normalized_rows as (
  select
    id,
    is_global,
    created_at,
    name as original_name,
    coalesce(
      nullif(
        btrim(
          regexp_replace(
            regexp_replace(
              name,
              '\s*\((?:[^)]*\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)[^)]*)\)\s*$',
              '',
              'i'
            ),
            '\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)\s*$',
            '',
            'i'
          )
        ),
        ''
      ),
      btrim(name)
    ) as normalized_name
  from public.supplement_catalog
),
ranked_rows as (
  select
    id,
    is_global,
    original_name,
    normalized_name,
    first_value(id) over (
      partition by is_global, normalized_name
      order by created_at asc, id asc
    ) as survivor_id
  from normalized_rows
),
repoint_assignments as (
  update public.supplement_assignments assignments
     set supplement_id = ranked.survivor_id
    from ranked_rows ranked
   where assignments.supplement_id = ranked.id
     and ranked.id <> ranked.survivor_id
  returning assignments.id
),
delete_duplicates as (
  delete from public.supplement_catalog catalog
  using ranked_rows ranked
  where catalog.id = ranked.id
    and ranked.id <> ranked.survivor_id
  returning catalog.id
)
update public.supplement_catalog catalog
   set name = ranked.normalized_name
  from (
    select distinct survivor_id as id, normalized_name
    from ranked_rows
  ) ranked
 where catalog.id = ranked.id
   and catalog.name <> ranked.normalized_name;
