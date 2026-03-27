-- ============================================================================
-- Migration: Nutrition domain consolidation
-- Date: 2026-03-27
--
-- Pre-launch cleanup:
-- 1. consolidate client meal favorites into the shared favorites table
-- 2. retire legacy meal_plan* tables
-- 3. add public sharing support to meal_groups
-- ============================================================================

alter table if exists public.meal_groups
  add column if not exists is_public boolean not null default false;

alter table if exists public.meal_groups
  add column if not exists public_share_token uuid not null default gen_random_uuid();

create unique index if not exists uq_meal_groups_public_share_token
  on public.meal_groups (public_share_token);

do $$
begin
  if to_regclass('public.client_meal_item_favorites') is not null then
    with source_rows as (
      select
        c.linked_user_id as subject_user_id,
        f.item_name,
        f.quantity,
        f.unit,
        f.calories,
        f.protein_g,
        f.carbs_g,
        f.fat_g,
        f.fiber_g,
        f.notes,
        f.usage_count,
        f.last_used_at,
        f.created_at,
        f.updated_at
      from public.client_meal_item_favorites f
      join public.clients c
        on c.id = f.client_id
      where c.linked_user_id is not null
    )
    update public.meal_item_favorites target
       set quantity = source.quantity,
           calories = source.calories,
           protein_g = source.protein_g,
           carbs_g = source.carbs_g,
           fat_g = source.fat_g,
           fiber_g = source.fiber_g,
           notes = source.notes,
           usage_count = greatest(target.usage_count, source.usage_count),
           last_used_at = case
             when target.last_used_at is null and source.last_used_at is null then null
             else greatest(
               coalesce(target.last_used_at, '-infinity'::timestamptz),
               coalesce(source.last_used_at, '-infinity'::timestamptz)
             )
           end,
           updated_at = now()
      from source_rows source
     where target.meal_type is null
       and target.subject_user_id = source.subject_user_id
       and lower(target.item_name) = lower(source.item_name)
       and coalesce(target.unit, '') = coalesce(source.unit, '');

    insert into public.meal_item_favorites (
      subject_user_id,
      item_name,
      quantity,
      unit,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      notes,
      usage_count,
      last_used_at,
      meal_type,
      created_at,
      updated_at
    )
    select
      source.subject_user_id,
      source.item_name,
      source.quantity,
      source.unit,
      source.calories,
      source.protein_g,
      source.carbs_g,
      source.fat_g,
      source.fiber_g,
      source.notes,
      source.usage_count,
      source.last_used_at,
      null,
      source.created_at,
      source.updated_at
    from (
      select
        c.linked_user_id as subject_user_id,
        f.item_name,
        f.quantity,
        f.unit,
        f.calories,
        f.protein_g,
        f.carbs_g,
        f.fat_g,
        f.fiber_g,
        f.notes,
        f.usage_count,
        f.last_used_at,
        f.created_at,
        f.updated_at
      from public.client_meal_item_favorites f
      join public.clients c
        on c.id = f.client_id
      where c.linked_user_id is not null
    ) source
    where not exists (
      select 1
      from public.meal_item_favorites target
      where target.meal_type is null
        and target.subject_user_id = source.subject_user_id
        and lower(target.item_name) = lower(source.item_name)
        and coalesce(target.unit, '') = coalesce(source.unit, '')
    );

    drop table public.client_meal_item_favorites;
  end if;
end $$;

drop table if exists public.meal_plan_assignment_meals;
drop table if exists public.meal_plan_assignments;
drop table if exists public.meal_plan_meals;
drop table if exists public.meal_plans;
