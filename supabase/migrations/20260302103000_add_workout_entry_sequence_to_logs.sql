-- Persist mixed workout entry ordering across strength and cardio logs.
-- This sequence is internal and should not be shown in UI.

alter table public.strength_sets
  add column if not exists entry_sequence integer;

alter table public.cardio_sessions
  add column if not exists entry_sequence integer;

-- Backfill existing rows deterministically using creation time.
with ordered as (
  select
    id,
    row_number() over (
      partition by workout_id
      order by coalesce(created_at, now()), set_number, id
    ) - 1 as seq
  from public.strength_sets
)
update public.strength_sets s
set entry_sequence = o.seq
from ordered o
where s.id = o.id
  and s.entry_sequence is null;

with ordered as (
  select
    id,
    row_number() over (
      partition by workout_id
      order by coalesce(created_at, now()), id
    ) - 1 as seq
  from public.cardio_sessions
)
update public.cardio_sessions c
set entry_sequence = o.seq
from ordered o
where c.id = o.id
  and c.entry_sequence is null;

alter table public.strength_sets
  alter column entry_sequence set default 0;

alter table public.cardio_sessions
  alter column entry_sequence set default 0;

create index if not exists idx_strength_sets_workout_entry_sequence
  on public.strength_sets (workout_id, entry_sequence, set_number);

create index if not exists idx_cardio_sessions_workout_entry_sequence
  on public.cardio_sessions (workout_id, entry_sequence);
