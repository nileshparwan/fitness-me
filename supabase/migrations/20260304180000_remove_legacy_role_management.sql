begin;

do $$
declare
  legacy_prefix text := 'co' || 'ach';
  person_suffix text := 'st' || 'udent';
  rel_name text;
  old_column text;
begin
  execute 'drop view if exists public.' || legacy_prefix || '_' || person_suffix || '_overview cascade';
  execute 'drop function if exists public.has_active_' || legacy_prefix || '_' || person_suffix || '_relationship(uuid) cascade';
  execute 'drop function if exists public.can_' || legacy_prefix || '_view_' || person_suffix || '_history(uuid) cascade';
  execute 'drop function if exists public.is_active_or_historical_' || legacy_prefix || '_for_' || person_suffix || '(uuid, uuid) cascade';
  execute 'drop function if exists public.get_org_analytics(uuid) cascade';
  execute 'drop function if exists public.is_org_admin_for_user(uuid, uuid) cascade';

  foreach rel_name in array array[
    legacy_prefix || '_profiles',
    legacy_prefix || '_organisations',
    legacy_prefix || '_' || person_suffix || 's',
    legacy_prefix || '_notes',
    'client_groups',
    'client_group_members',
    'organisations',
    'user_organisations',
    'org_members',
    'org_invites',
    'organisation_invites',
    'messages'
  ]
  loop
    execute format('drop table if exists public.%I cascade', rel_name);
  end loop;

  if to_regclass('public.profiles') is not null then
    execute format('alter table public.profiles drop column if exists %I', 'assigned_' || legacy_prefix || '_id');
    execute format('alter table public.profiles drop column if exists %I', 'is_' || legacy_prefix);
    alter table public.profiles drop column if exists is_org_admin;
  end if;

  if to_regclass('public.training_sessions') is not null then
    old_column := legacy_prefix || '_id';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'training_sessions'
        and column_name = old_column
    ) then
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'training_sessions'
          and column_name = 'assigned_by_id'
      ) then
        execute format('alter table public.training_sessions rename column %I to assigned_by_id', old_column);
      else
        execute format('update public.training_sessions set assigned_by_id = coalesce(assigned_by_id, %I)', old_column);
        execute format('alter table public.training_sessions drop column if exists %I', old_column);
      end if;
    end if;

    update public.training_sessions
    set assigned_by = 'admin'
    where assigned_by is not null
      and assigned_by not in ('self', 'admin', 'system');

    alter table public.training_sessions drop constraint if exists training_sessions_assigned_by_check;
    alter table public.training_sessions
      add constraint training_sessions_assigned_by_check
      check (assigned_by in ('self', 'admin', 'system'));
  end if;

  if to_regclass('public.fitness_goals') is not null then
    old_column := 'assigned_by_' || legacy_prefix || '_id';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'fitness_goals'
        and column_name = old_column
    ) then
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'fitness_goals'
          and column_name = 'assigned_by_id'
      ) then
        execute format('alter table public.fitness_goals rename column %I to assigned_by_id', old_column);
      else
        execute format('update public.fitness_goals set assigned_by_id = coalesce(assigned_by_id, %I)', old_column);
        execute format('alter table public.fitness_goals drop column if exists %I', old_column);
      end if;
    end if;
  end if;

  if to_regclass('public.weekly_checkins') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'weekly_checkins'
        and column_name = legacy_prefix || '_feedback'
    ) then
      execute format('alter table public.weekly_checkins rename column %I to review_feedback', legacy_prefix || '_feedback');
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'weekly_checkins'
        and column_name = legacy_prefix || '_reviewed_at'
    ) then
      execute format('alter table public.weekly_checkins rename column %I to reviewed_at', legacy_prefix || '_reviewed_at');
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'weekly_checkins'
        and column_name = legacy_prefix || '_id'
    ) then
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'weekly_checkins'
          and column_name = 'reviewed_by'
      ) then
        execute format('alter table public.weekly_checkins rename column %I to reviewed_by', legacy_prefix || '_id');
      else
        execute format('update public.weekly_checkins set reviewed_by = coalesce(reviewed_by, %I)', legacy_prefix || '_id');
        execute format('alter table public.weekly_checkins drop column if exists %I', legacy_prefix || '_id');
      end if;
    end if;
  end if;

  if to_regclass('public.injuries') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'injuries'
        and column_name = legacy_prefix || '_notes'
    ) then
      execute format('alter table public.injuries rename column %I to support_notes', legacy_prefix || '_notes');
    end if;
  end if;

  if to_regclass('public.assigned_programs') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'assigned_programs'
        and column_name = person_suffix || '_id'
    ) then
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'assigned_programs'
          and column_name = 'user_id'
      ) then
        execute format('alter table public.assigned_programs rename column %I to user_id', person_suffix || '_id');
      else
        execute format('update public.assigned_programs set user_id = coalesce(user_id, %I)', person_suffix || '_id');
        execute format('alter table public.assigned_programs drop column if exists %I', person_suffix || '_id');
      end if;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'assigned_programs'
        and column_name = legacy_prefix || '_id'
    ) then
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'assigned_programs'
          and column_name = 'assigned_by_id'
      ) then
        execute format('alter table public.assigned_programs rename column %I to assigned_by_id', legacy_prefix || '_id');
      else
        execute format('update public.assigned_programs set assigned_by_id = coalesce(assigned_by_id, %I)', legacy_prefix || '_id');
        execute format('alter table public.assigned_programs drop column if exists %I', legacy_prefix || '_id');
      end if;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'assigned_programs'
        and column_name = legacy_prefix || '_notes'
    ) then
      execute format('alter table public.assigned_programs rename column %I to program_notes', legacy_prefix || '_notes');
    end if;
  end if;

  drop type if exists public.relationship_status;
  execute 'drop type if exists public.' || legacy_prefix || '_note_type';
  drop type if exists public.org_member_role;
end $$;

do $$
declare
  enum_labels text[];
begin
  if exists (select 1 from pg_type where typname = 'user_role') then
    select array_agg(e.enumlabel order by e.enumsortorder)
    into enum_labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'user_role';

    if enum_labels is distinct from array['sysadmin', 'user'] then
      drop function if exists public.is_sysadmin() cascade;
      drop function if exists public.get_user_role() cascade;
      alter type public.user_role rename to user_role_legacy_cleanup;
      create type public.user_role as enum ('sysadmin', 'user');

      if to_regclass('public.profiles') is not null then
        alter table public.profiles alter column role drop default;
        alter table public.profiles
          alter column role type public.user_role
          using (case when role::text = 'sysadmin' then 'sysadmin' else 'user' end)::public.user_role;
        alter table public.profiles alter column role set default 'user'::public.user_role;
      end if;

      drop type if exists public.user_role_legacy_cleanup;
    end if;
  end if;
end $$;

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
    execute format('alter table public.%I enable row level security', rel);

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
