-- Canonicalize exercise focus tag to "legs" across exercise_catalog.muscle_groups.

update public.exercise_catalog ec
set muscle_groups = (
  select coalesce(array_agg(distinct normalized), '{}'::text[])
  from (
    select case
      when lower(trim(token)) = 'leg' then 'legs'
      else lower(trim(token))
    end as normalized
    from unnest(coalesce(ec.muscle_groups, '{}'::text[])) as token
    where trim(coalesce(token, '')) <> ''
  ) normalized_tokens
);
