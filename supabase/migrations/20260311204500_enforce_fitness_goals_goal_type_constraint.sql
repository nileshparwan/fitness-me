-- Ensure fitness_goals.goal_type supports the normalized category set.
-- Idempotent and safe for environments where earlier goal migrations already ran.

begin;

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.fitness_goals'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%goal_type%'
  loop
    execute format('alter table public.fitness_goals drop constraint if exists %I', con.conname);
  end loop;
end $$;

update public.fitness_goals
set goal_type = lower(replace(coalesce(goal_type, 'custom'), ' ', '_'));

update public.fitness_goals
set goal_type = 'weight'
where goal_type = 'weight_loss';

update public.fitness_goals
set goal_type = 'custom'
where goal_type = 'habit'
   or goal_type not in ('weight', 'muscle_gain', 'strength', 'performance', 'nutrition', 'custom');

alter table public.fitness_goals
  add constraint fitness_goals_goal_type_supported
  check (goal_type in ('weight', 'muscle_gain', 'strength', 'performance', 'nutrition', 'custom'));

commit;
