begin;

alter table public.fitness_goals
  add column if not exists start_date date,
  add column if not exists notes text;

update public.fitness_goals
set start_date = coalesce(start_date, coalesce(created_at::date, current_date))
where start_date is null;

alter table public.fitness_goals
  alter column start_date set default current_date;

alter table public.fitness_goals
  alter column start_date set not null;

update public.fitness_goals
set status = lower(coalesce(nullif(trim(status), ''), 'active'));

update public.fitness_goals
set status = 'active'
where status not in ('active', 'on_track', 'at_risk', 'completed', 'paused', 'archived');

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.fitness_goals'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.fitness_goals drop constraint if exists %I', con.conname);
  end loop;
end $$;

alter table public.fitness_goals
  alter column status set default 'active',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.fitness_goals'::regclass
      and conname = 'fitness_goals_status_supported'
  ) then
    alter table public.fitness_goals
      add constraint fitness_goals_status_supported
      check (status in ('active', 'on_track', 'at_risk', 'completed', 'paused', 'archived'));
  end if;
end $$;

create index if not exists idx_fitness_goals_user_status_updated
  on public.fitness_goals (user_id, status, updated_at desc);

create table if not exists public.goal_progress_history (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.fitness_goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress_percent integer not null check (progress_percent >= 0 and progress_percent <= 100),
  current_value numeric null,
  target_value numeric null,
  current_weight numeric null,
  target_weight numeric null,
  status text not null default 'active' check (status in ('active', 'on_track', 'at_risk', 'completed', 'paused', 'archived')),
  recorded_by_user_id uuid null references public.profiles(id) on delete set null,
  snapshot_at timestamptz not null default now()
);

create index if not exists idx_goal_progress_history_goal_snapshot
  on public.goal_progress_history (goal_id, snapshot_at desc);

create index if not exists idx_goal_progress_history_user_snapshot
  on public.goal_progress_history (user_id, snapshot_at desc);

alter table public.goal_progress_history enable row level security;

drop policy if exists goal_progress_history_select_access on public.goal_progress_history;
create policy goal_progress_history_select_access on public.goal_progress_history
for select to authenticated
using (
  public.is_sysadmin()
  or user_id = auth.uid()
  or exists (
    select 1
    from public.clients c
    where c.linked_user_id = goal_progress_history.user_id
      and public.has_client_coach_access(c.id)
  )
);

drop policy if exists goal_progress_history_insert_access on public.goal_progress_history;
create policy goal_progress_history_insert_access on public.goal_progress_history
for insert to authenticated
with check (
  (recorded_by_user_id is null or recorded_by_user_id = auth.uid())
  and (
    public.is_sysadmin()
    or user_id = auth.uid()
    or exists (
      select 1
      from public.clients c
      where c.linked_user_id = goal_progress_history.user_id
        and public.has_client_coach_access(c.id)
    )
  )
);

grant select, insert on public.goal_progress_history to authenticated;

commit;
