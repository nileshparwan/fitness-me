begin;

create or replace function public.get_user_role()
returns public.user_role
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_role public.user_role;
begin
  select p.role
  into resolved_role
  from public.profiles p
  where p.id = auth.uid();

  return coalesce(resolved_role, 'user'::public.user_role);
end;
$$;

create or replace function public.is_sysadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role() = 'sysadmin'::public.user_role;
$$;

grant execute on function public.get_user_role() to authenticated;
grant execute on function public.is_sysadmin() to authenticated;

do $$
declare
  rel text;
begin
  foreach rel in array array[
    'profiles',
    'exercise_catalog',
    'training_plans',
    'training_plan_items',
    'training_sessions',
    'strength_sets',
    'cardio_sessions',
    'meal_plans',
    'meal_plan_meals',
    'fitness_goals',
    'body_measurements',
    'daily_biofeedback',
    'daily_activity',
    'vitals_log',
    'sleep_log',
    'nutrition_logs',
    'nutrition_meals',
    'weekly_checkins',
    'injuries',
    'wearable_integrations',
    'assigned_programs'
  ]
  loop
    execute format('alter table public.%I enable row level security', rel);
  end loop;
end $$;

do $$
declare
  rel text;
  pol record;
begin
  foreach rel in array array[
    'profiles',
    'exercise_catalog',
    'training_plans',
    'training_plan_items',
    'training_sessions',
    'strength_sets',
    'cardio_sessions',
    'meal_plans',
    'meal_plan_meals',
    'fitness_goals',
    'body_measurements',
    'daily_biofeedback',
    'daily_activity',
    'vitals_log',
    'sleep_log',
    'nutrition_logs',
    'nutrition_meals',
    'weekly_checkins',
    'injuries',
    'wearable_integrations',
    'assigned_programs'
  ]
  loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = rel
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, rel);
    end loop;
  end loop;
end $$;

create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_sysadmin());

create policy profiles_insert_self_or_admin on public.profiles
for insert to authenticated
with check (id = auth.uid() or public.is_sysadmin());

create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_sysadmin())
with check (id = auth.uid() or public.is_sysadmin());

create policy profiles_delete_self_or_admin on public.profiles
for delete to authenticated
using (id = auth.uid() or public.is_sysadmin());

create policy exercise_catalog_select_all on public.exercise_catalog
for select to authenticated
using (true);

create policy exercise_catalog_insert_owner_or_admin on public.exercise_catalog
for insert to authenticated
with check (public.is_sysadmin() or created_by = auth.uid());

create policy exercise_catalog_update_owner_or_admin on public.exercise_catalog
for update to authenticated
using (public.is_sysadmin() or created_by = auth.uid())
with check (public.is_sysadmin() or created_by = auth.uid());

create policy exercise_catalog_delete_owner_or_admin on public.exercise_catalog
for delete to authenticated
using (public.is_sysadmin() or created_by = auth.uid());

create policy training_plans_select_owner_or_admin on public.training_plans
for select to authenticated
using (user_id = auth.uid() or public.is_sysadmin());

create policy training_plans_write_owner_or_admin on public.training_plans
for all to authenticated
using (user_id = auth.uid() or public.is_sysadmin())
with check (user_id = auth.uid() or public.is_sysadmin());

create policy training_plan_items_select_owner_or_admin on public.training_plan_items
for select to authenticated
using (
  public.is_sysadmin()
  or exists (
    select 1 from public.training_plans tp
    where tp.id = training_plan_items.program_id
      and tp.user_id = auth.uid()
  )
);

create policy training_plan_items_write_owner_or_admin on public.training_plan_items
for all to authenticated
using (
  public.is_sysadmin()
  or exists (
    select 1 from public.training_plans tp
    where tp.id = training_plan_items.program_id
      and tp.user_id = auth.uid()
  )
)
with check (
  public.is_sysadmin()
  or exists (
    select 1 from public.training_plans tp
    where tp.id = training_plan_items.program_id
      and tp.user_id = auth.uid()
  )
);

create policy training_sessions_select_owner_or_admin on public.training_sessions
for select to authenticated
using (user_id = auth.uid() or public.is_sysadmin());

create policy training_sessions_write_owner_or_admin on public.training_sessions
for all to authenticated
using (user_id = auth.uid() or public.is_sysadmin())
with check (user_id = auth.uid() or public.is_sysadmin());

create policy strength_sets_select_owner_or_admin on public.strength_sets
for select to authenticated
using (
  public.is_sysadmin()
  or exists (
    select 1 from public.training_sessions ts
    where ts.id = strength_sets.workout_id
      and ts.user_id = auth.uid()
  )
);

create policy strength_sets_write_owner_or_admin on public.strength_sets
for all to authenticated
using (
  public.is_sysadmin()
  or exists (
    select 1 from public.training_sessions ts
    where ts.id = strength_sets.workout_id
      and ts.user_id = auth.uid()
  )
)
with check (
  public.is_sysadmin()
  or exists (
    select 1 from public.training_sessions ts
    where ts.id = strength_sets.workout_id
      and ts.user_id = auth.uid()
  )
);

create policy cardio_sessions_select_owner_or_admin on public.cardio_sessions
for select to authenticated
using (user_id = auth.uid() or public.is_sysadmin());

create policy cardio_sessions_write_owner_or_admin on public.cardio_sessions
for all to authenticated
using (user_id = auth.uid() or public.is_sysadmin())
with check (user_id = auth.uid() or public.is_sysadmin());

create policy meal_plans_select_owner_or_admin on public.meal_plans
for select to authenticated
using (user_id = auth.uid() or public.is_sysadmin());

create policy meal_plans_write_owner_or_admin on public.meal_plans
for all to authenticated
using (user_id = auth.uid() or public.is_sysadmin())
with check (user_id = auth.uid() or public.is_sysadmin());

create policy meal_plan_meals_select_owner_or_admin on public.meal_plan_meals
for select to authenticated
using (
  public.is_sysadmin()
  or exists (
    select 1 from public.meal_plans mp
    where mp.id = meal_plan_meals.program_id
      and mp.user_id = auth.uid()
  )
);

create policy meal_plan_meals_write_owner_or_admin on public.meal_plan_meals
for all to authenticated
using (
  public.is_sysadmin()
  or exists (
    select 1 from public.meal_plans mp
    where mp.id = meal_plan_meals.program_id
      and mp.user_id = auth.uid()
  )
)
with check (
  public.is_sysadmin()
  or exists (
    select 1 from public.meal_plans mp
    where mp.id = meal_plan_meals.program_id
      and mp.user_id = auth.uid()
  )
);

DO $$
declare
  rel text;
begin
  foreach rel in array array[
    'fitness_goals',
    'body_measurements',
    'daily_biofeedback',
    'daily_activity',
    'vitals_log',
    'sleep_log',
    'nutrition_logs',
    'nutrition_meals',
    'weekly_checkins',
    'injuries',
    'wearable_integrations'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid() or public.is_sysadmin())',
      rel || '_select_owner_or_admin',
      rel
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid() or public.is_sysadmin())',
      rel || '_insert_owner_or_admin',
      rel
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid() or public.is_sysadmin()) with check (user_id = auth.uid() or public.is_sysadmin())',
      rel || '_update_owner_or_admin',
      rel
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid() or public.is_sysadmin())',
      rel || '_delete_owner_or_admin',
      rel
    );
  end loop;
end $$;

create policy assigned_programs_select_owner_or_admin on public.assigned_programs
for select to authenticated
using (user_id = auth.uid() or public.is_sysadmin());

create policy assigned_programs_write_admin_only on public.assigned_programs
for all to authenticated
using (public.is_sysadmin())
with check (public.is_sysadmin());

commit;
