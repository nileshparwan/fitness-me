-- Ensure exercise_catalog.muscle_groups contains explicit focus tags
-- used by Progress Muscle Focus charting.

-- 1) Normalize stored tags to lowercase and trim whitespace.
update public.exercise_catalog ec
set muscle_groups = (
  select coalesce(array_agg(distinct normalized), '{}'::text[])
  from (
    select lower(trim(token)) as normalized
    from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as token
    where trim(coalesce(token, '')) <> ''
  ) normalized_tokens
);

-- 2) Backfill one explicit focus tag when missing.
update public.exercise_catalog ec
set muscle_groups = coalesce(ec.muscle_groups, '{}'::text[]) || case
  when exists (
    select 1
    from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as g
    where g = any (array['push','chest','pecs','pectorals','upper_chest','lower_chest','shoulders','front_delts','side_delts','triceps'])
  ) or lower(coalesce(ec.category, '')) like any (array['%push%','%chest%','%shoulder%','%tricep%'])
    then array['push']::text[]
  when exists (
    select 1
    from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as g
    where g = any (array['pull','back','upper_back','lower_back','lats','traps','rhomboids','rear_delts','biceps','forearms'])
  ) or lower(coalesce(ec.category, '')) like any (array['%pull%','%back%','%bicep%'])
    then array['pull']::text[]
  when exists (
    select 1
    from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as g
    where g = any (array['leg','legs','quads','hamstrings','glutes','calves','adductors','abductors','hip_flexors'])
  ) or lower(coalesce(ec.category, '')) like any (array['%leg%','%lower body%'])
    then array['legs']::text[]
  when exists (
    select 1
    from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as g
    where g = any (array['core','abs','obliques','lower_abs','transverse_abdominis'])
  ) or lower(coalesce(ec.category, '')) like '%core%'
    then array['core']::text[]
  else '{}'::text[]
end
where not exists (
  select 1
  from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as g
  where g = any (array['push', 'pull', 'legs', 'core'])
);

-- 3) Deduplicate post-backfill.
update public.exercise_catalog ec
set muscle_groups = (
  select coalesce(array_agg(distinct normalized), '{}'::text[])
  from (
    select lower(trim(token)) as normalized
    from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as token
    where trim(coalesce(token, '')) <> ''
  ) normalized_tokens
);
