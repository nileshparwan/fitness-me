begin;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('meal_logs', 'diary_entries'),
        ('meal_log_items', 'diary_items'),
        ('meal_log_sections', 'diary_sections'),
        ('meal_item_favorites', 'diary_favorites'),
        ('daily_macro_compliance', 'diary_compliance'),
        ('meal_groups', 'nutrition_plans'),
        ('meal_group_plans', 'nutrition_plan_days'),
        ('meal_group_items', 'nutrition_plan_items'),
        ('meal_group_assignments', 'nutrition_plan_assignments'),
        ('meal_group_plan_types', 'nutrition_plan_types'),
        ('nutrition_target_history', 'nutrition_targets')
    ) as pairs(old_name, new_name)
  loop
    if to_regclass(format('public.%s', item.old_name)) is not null
       and to_regclass(format('public.%s', item.new_name)) is null then
      execute format('alter table public.%I rename to %I', item.old_name, item.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('diary_entries', 'meal_group_id', 'nutrition_plan_id'),
        ('diary_sections', 'meal_group_id', 'nutrition_plan_id'),
        ('nutrition_plans', 'owner_user_id', 'created_by_user_id'),
        ('nutrition_plans', 'source_group_id', 'source_plan_id'),
        ('nutrition_plan_days', 'meal_group_id', 'nutrition_plan_id'),
        ('nutrition_plan_items', 'meal_plan_id', 'plan_day_id'),
        ('nutrition_plan_assignments', 'meal_group_id', 'nutrition_plan_id'),
        ('nutrition_plan_assignments', 'template_group_id', 'template_plan_id'),
        ('nutrition_plan_types', 'meal_plan_id', 'plan_day_id')
    ) as pairs(table_name, old_name, new_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = item.table_name
        and column_name = item.old_name
    ) and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = item.table_name
        and column_name = item.new_name
    ) then
      execute format(
        'alter table public.%I rename column %I to %I',
        item.table_name,
        item.old_name,
        item.new_name
      );
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('idx_meal_group_assignments_subject_user_start', 'idx_nutrition_plan_assignments_subject_user_start'),
        ('idx_meal_group_assignments_subject_client_start', 'idx_nutrition_plan_assignments_subject_client_start'),
        ('idx_meal_group_assignments_group_status', 'idx_nutrition_plan_assignments_plan_status'),
        ('idx_meal_group_plan_types_plan_position', 'idx_nutrition_plan_types_day_position'),
        ('uq_meal_groups_public_share_token', 'uq_nutrition_plans_public_share_token')
    ) as pairs(old_name, new_name)
  loop
    if to_regclass(format('public.%s', item.old_name)) is not null
       and to_regclass(format('public.%s', item.new_name)) is null then
      execute format('alter index public.%I rename to %I', item.old_name, item.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('diary_entries', 'meal_logs_insert_subject_access', 'diary_entries_insert_subject_access'),
        ('diary_entries', 'meal_logs_select_subject_access', 'diary_entries_select_subject_access'),
        ('diary_entries', 'meal_logs_update_subject_access', 'diary_entries_update_subject_access'),
        ('diary_entries', 'meal_logs_delete_subject_access', 'diary_entries_delete_subject_access'),
        ('diary_items', 'meal_log_items_insert_subject_access', 'diary_items_insert_subject_access'),
        ('diary_items', 'meal_log_items_select_subject_access', 'diary_items_select_subject_access'),
        ('diary_items', 'meal_log_items_update_subject_access', 'diary_items_update_subject_access'),
        ('diary_items', 'meal_log_items_delete_subject_access', 'diary_items_delete_subject_access'),
        ('diary_sections', 'meal_log_sections_insert_access', 'diary_sections_insert_access'),
        ('diary_sections', 'meal_log_sections_select_access', 'diary_sections_select_access'),
        ('diary_sections', 'meal_log_sections_delete_access', 'diary_sections_delete_access'),
        ('diary_favorites', 'client_meal_item_favorites_insert_access', 'diary_favorites_insert_access'),
        ('diary_favorites', 'client_meal_item_favorites_select_access', 'diary_favorites_select_access'),
        ('diary_favorites', 'client_meal_item_favorites_update_access', 'diary_favorites_update_access'),
        ('diary_favorites', 'client_meal_item_favorites_delete_access', 'diary_favorites_delete_access'),
        ('diary_compliance', 'daily_macro_compliance_select_subject_access', 'diary_compliance_select_subject_access'),
        ('nutrition_plans', 'meal_groups_insert_owner', 'nutrition_plans_insert_owner'),
        ('nutrition_plans', 'meal_groups_select_access', 'nutrition_plans_select_access'),
        ('nutrition_plans', 'meal_groups_update_owner', 'nutrition_plans_update_owner'),
        ('nutrition_plans', 'meal_groups_delete_owner', 'nutrition_plans_delete_owner'),
        ('nutrition_plan_days', 'meal_group_plans_insert_manage', 'nutrition_plan_days_insert_manage'),
        ('nutrition_plan_days', 'meal_group_plans_select_access', 'nutrition_plan_days_select_access'),
        ('nutrition_plan_days', 'meal_group_plans_update_manage', 'nutrition_plan_days_update_manage'),
        ('nutrition_plan_days', 'meal_group_plans_delete_manage', 'nutrition_plan_days_delete_manage'),
        ('nutrition_plan_items', 'meal_group_items_insert_manage', 'nutrition_plan_items_insert_manage'),
        ('nutrition_plan_items', 'meal_group_items_select_access', 'nutrition_plan_items_select_access'),
        ('nutrition_plan_items', 'meal_group_items_update_manage', 'nutrition_plan_items_update_manage'),
        ('nutrition_plan_items', 'meal_group_items_delete_manage', 'nutrition_plan_items_delete_manage'),
        ('nutrition_plan_assignments', 'meal_group_assignments_insert_access', 'nutrition_plan_assignments_insert_access'),
        ('nutrition_plan_assignments', 'meal_group_assignments_select_access', 'nutrition_plan_assignments_select_access'),
        ('nutrition_plan_assignments', 'meal_group_assignments_update_access', 'nutrition_plan_assignments_update_access'),
        ('nutrition_plan_assignments', 'meal_group_assignments_delete_access', 'nutrition_plan_assignments_delete_access'),
        ('nutrition_plan_types', 'meal_group_plan_types_insert_manage', 'nutrition_plan_types_insert_manage'),
        ('nutrition_plan_types', 'meal_group_plan_types_select_access', 'nutrition_plan_types_select_access'),
        ('nutrition_plan_types', 'meal_group_plan_types_update_manage', 'nutrition_plan_types_update_manage'),
        ('nutrition_plan_types', 'meal_group_plan_types_delete_manage', 'nutrition_plan_types_delete_manage')
    ) as pairs(table_name, old_name, new_name)
  loop
    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = item.table_name
        and policyname = item.old_name
    ) then
      execute format(
        'alter policy %I on public.%I rename to %I',
        item.old_name,
        item.table_name,
        item.new_name
      );
    end if;
  end loop;
end $$;

do $$
begin
  if to_regprocedure('public.can_access_meal_group(uuid)') is not null
     and to_regprocedure('public.can_access_nutrition_plan(uuid)') is null then
    execute 'alter function public.can_access_meal_group(uuid) rename to can_access_nutrition_plan';
  end if;
  if to_regprocedure('public.can_manage_meal_group(uuid)') is not null
     and to_regprocedure('public.can_manage_nutrition_plan(uuid)') is null then
    execute 'alter function public.can_manage_meal_group(uuid) rename to can_manage_nutrition_plan';
  end if;
  if to_regprocedure('public.sync_meal_log_totals()') is not null
     and to_regprocedure('public.sync_diary_entry_totals()') is null then
    execute 'alter function public.sync_meal_log_totals() rename to sync_diary_entry_totals';
  end if;
end $$;

create or replace function public.can_access_nutrition_plan(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sysadmin()
    or exists (
      select 1
      from public.nutrition_plans p
      where p.id = target_group_id
        and p.created_by_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.nutrition_plan_assignments a
      where (a.nutrition_plan_id = target_group_id or a.template_plan_id = target_group_id)
        and (
          a.assigned_by_user_id = auth.uid()
          or a.subject_user_id = auth.uid()
          or (
            a.subject_client_id is not null
            and (
              public.has_client_coach_access(a.subject_client_id)
              or public.is_linked_client_user(a.subject_client_id)
            )
          )
        )
    );
$$;

create or replace function public.can_manage_nutrition_plan(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sysadmin()
    or exists (
      select 1
      from public.nutrition_plans p
      where p.id = target_group_id
        and p.created_by_user_id = auth.uid()
    );
$$;

create or replace function public.sync_diary_entry_totals()
returns trigger
language plpgsql
as $$
declare
  v_diary_entry_id uuid;
begin
  v_diary_entry_id := coalesce(new.meal_log_id, old.meal_log_id);

  update public.diary_entries entry_row
  set
    total_calories = coalesce((select sum(coalesce(i.calories, 0)) from public.diary_items i where i.meal_log_id = v_diary_entry_id), 0),
    total_protein_g = coalesce((select sum(coalesce(i.protein_g, 0)) from public.diary_items i where i.meal_log_id = v_diary_entry_id), 0),
    total_carbs_g = coalesce((select sum(coalesce(i.carbs_g, 0)) from public.diary_items i where i.meal_log_id = v_diary_entry_id), 0),
    total_fat_g = coalesce((select sum(coalesce(i.fat_g, 0)) from public.diary_items i where i.meal_log_id = v_diary_entry_id), 0),
    total_fiber_g = coalesce((select sum(coalesce(i.fiber_g, 0)) from public.diary_items i where i.meal_log_id = v_diary_entry_id), 0),
    updated_at = now()
  where entry_row.id = v_diary_entry_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_diary_items_sync_totals on public.diary_items;
create trigger trg_diary_items_sync_totals
after insert or update or delete on public.diary_items
for each row
execute function public.sync_diary_entry_totals();

create or replace function public.enforce_active_nutrition_plan_overlap()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'active' then
    return new;
  end if;

  if new.start_date > new.end_date then
    raise exception 'Nutrition plan start_date must be on or before end_date';
  end if;

  if new.subject_user_id is not null then
    if exists (
      select 1
      from public.nutrition_plan_assignments assignment_row
      where assignment_row.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and assignment_row.status = 'active'
        and assignment_row.subject_user_id = new.subject_user_id
        and daterange(assignment_row.start_date, assignment_row.end_date + 1, '[)')
            && daterange(new.start_date, new.end_date + 1, '[)')
    ) then
      raise exception 'An overlapping active nutrition plan already exists for this user subject';
    end if;
  elsif new.subject_client_id is not null then
    if exists (
      select 1
      from public.nutrition_plan_assignments assignment_row
      where assignment_row.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and assignment_row.status = 'active'
        and assignment_row.subject_client_id = new.subject_client_id
        and daterange(assignment_row.start_date, assignment_row.end_date + 1, '[)')
            && daterange(new.start_date, new.end_date + 1, '[)')
    ) then
      raise exception 'An overlapping active nutrition plan already exists for this client subject';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_nutrition_plan_assignments_overlap_guard on public.nutrition_plan_assignments;
create trigger trg_nutrition_plan_assignments_overlap_guard
before insert or update of status, start_date, end_date, subject_user_id, subject_client_id
on public.nutrition_plan_assignments
for each row
execute function public.enforce_active_nutrition_plan_overlap();

create or replace function public.prevent_used_nutrition_plan_delete()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.nutrition_plan_assignments assignment_row
    where assignment_row.nutrition_plan_id = old.id
       or assignment_row.template_plan_id = old.id
  ) then
    raise exception 'Nutrition plan has assignment history and must be archived instead of deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_used_nutrition_plan_delete on public.nutrition_plans;
create trigger trg_prevent_used_nutrition_plan_delete
before delete on public.nutrition_plans
for each row
execute function public.prevent_used_nutrition_plan_delete();

commit;
