-- Fix entry_sequence to be per workout entry (exercise/cardio), not per set row.
-- This migration corrects backfilled data from the previous sequence rollout.

-- 1) Strength: build one entry per exercise block within a workout.
with strength_entries as (
  select
    workout_id,
    coalesce(exercise_id::text, '') as exercise_key,
    coalesce(group_id::text, '') as group_key,
    coalesce(exercise_name, '') as name_key,
    min(coalesce(created_at, now())) as first_created_at
  from public.strength_sets
  group by workout_id, exercise_key, group_key, name_key
),
cardio_entries as (
  select
    workout_id,
    id::text as cardio_key,
    min(coalesce(created_at, now())) as first_created_at
  from public.cardio_sessions
  group by workout_id, cardio_key
),
all_entries as (
  select
    workout_id,
    'strength'::text as entry_type,
    exercise_key,
    group_key,
    name_key,
    null::text as cardio_key,
    first_created_at
  from strength_entries
  union all
  select
    workout_id,
    'cardio'::text as entry_type,
    ''::text as exercise_key,
    ''::text as group_key,
    ''::text as name_key,
    cardio_key,
    first_created_at
  from cardio_entries
),
ranked as (
  select
    workout_id,
    entry_type,
    exercise_key,
    group_key,
    name_key,
    cardio_key,
    row_number() over (
      partition by workout_id
      order by first_created_at, entry_type, exercise_key, name_key, cardio_key
    ) - 1 as seq
  from all_entries
)
update public.strength_sets s
set entry_sequence = r.seq
from ranked r
where r.entry_type = 'strength'
  and s.workout_id = r.workout_id
  and coalesce(s.exercise_id::text, '') = r.exercise_key
  and coalesce(s.group_id::text, '') = r.group_key
  and coalesce(s.exercise_name, '') = r.name_key;

with strength_entries as (
  select
    workout_id,
    coalesce(exercise_id::text, '') as exercise_key,
    coalesce(group_id::text, '') as group_key,
    coalesce(exercise_name, '') as name_key,
    min(coalesce(created_at, now())) as first_created_at
  from public.strength_sets
  group by workout_id, exercise_key, group_key, name_key
),
cardio_entries as (
  select
    workout_id,
    id::text as cardio_key,
    min(coalesce(created_at, now())) as first_created_at
  from public.cardio_sessions
  group by workout_id, cardio_key
),
all_entries as (
  select
    workout_id,
    'strength'::text as entry_type,
    exercise_key,
    group_key,
    name_key,
    null::text as cardio_key,
    first_created_at
  from strength_entries
  union all
  select
    workout_id,
    'cardio'::text as entry_type,
    ''::text as exercise_key,
    ''::text as group_key,
    ''::text as name_key,
    cardio_key,
    first_created_at
  from cardio_entries
),
ranked as (
  select
    workout_id,
    entry_type,
    exercise_key,
    group_key,
    name_key,
    cardio_key,
    row_number() over (
      partition by workout_id
      order by first_created_at, entry_type, exercise_key, name_key, cardio_key
    ) - 1 as seq
  from all_entries
)
update public.cardio_sessions c
set entry_sequence = r.seq
from ranked r
where r.entry_type = 'cardio'
  and c.workout_id = r.workout_id
  and c.id::text = r.cardio_key;
