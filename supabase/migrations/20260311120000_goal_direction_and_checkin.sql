begin;

alter table public.fitness_goals
  add column if not exists goal_direction text not null default 'increase',
  add column if not exists check_in_interval_days integer null;

update public.fitness_goals
set goal_direction = 'decrease'
where goal_type = 'weight_loss' and goal_direction = 'increase';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.fitness_goals'::regclass
      and conname = 'fitness_goals_direction_valid'
  ) then
    alter table public.fitness_goals
      add constraint fitness_goals_direction_valid
      check (goal_direction in ('increase', 'decrease'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.fitness_goals'::regclass
      and conname = 'fitness_goals_checkin_interval_valid'
  ) then
    alter table public.fitness_goals
      add constraint fitness_goals_checkin_interval_valid
      check (check_in_interval_days is null or (check_in_interval_days >= 1 and check_in_interval_days <= 365));
  end if;
end $$;

commit;
