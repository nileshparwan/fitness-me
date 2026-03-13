-- Normalize legacy goal categories used by coach tools goals modal.
-- Safe/idempotent: maps weight_loss -> weight and habit -> custom.
-- Important: drop legacy goal_type checks first so updates cannot violate old constraints.

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

with renamed_weight as (
  update public.fitness_goals
  set goal_type = 'weight'
  where lower(replace(coalesce(goal_type, ''), ' ', '_')) = 'weight_loss'
  returning id
)
update public.fitness_goals as g
set
  goal_direction = 'decrease',
  unit = coalesce(g.unit, 'kg')
where g.id in (select id from renamed_weight);

update public.fitness_goals
set goal_type = 'custom'
where lower(replace(coalesce(goal_type, ''), ' ', '_')) = 'habit';

update public.fitness_goals
set goal_type = lower(replace(coalesce(goal_type, 'custom'), ' ', '_'));

update public.fitness_goals
set goal_type = 'custom'
where goal_type not in ('weight', 'muscle_gain', 'strength', 'performance', 'nutrition', 'custom');

alter table public.fitness_goals
  add constraint fitness_goals_goal_type_supported
  check (goal_type in ('weight', 'muscle_gain', 'strength', 'performance', 'nutrition', 'custom'));

commit;
