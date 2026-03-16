alter table public.fitness_goals
  add column if not exists is_personal_goal boolean not null default false;

-- Deterministic backfill:
-- treat rows where assigner and owner are the same as personal goals.
update public.fitness_goals
set is_personal_goal = true
where assigned_by_id is not null
  and assigned_by_id = user_id;
