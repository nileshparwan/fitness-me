begin;

alter table public.fitness_goals
  add column if not exists start_date date,
  add column if not exists notes text,
  add column if not exists start_value numeric null,
  add column if not exists start_weight numeric null;

update public.fitness_goals
set start_date = coalesce(start_date, coalesce(created_at::date, current_date))
where start_date is null;

alter table public.fitness_goals
  alter column start_date set default current_date;

alter table public.fitness_goals
  alter column start_date set not null;

update public.fitness_goals
set start_value = coalesce(start_value, current_value)
where start_value is null and current_value is not null;

update public.fitness_goals
set start_weight = coalesce(start_weight, current_weight)
where start_weight is null and current_weight is not null;

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

commit;
