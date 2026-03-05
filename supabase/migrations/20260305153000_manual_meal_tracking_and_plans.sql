-- Manual meal tracking + subject-aware meal plans

-- Enums ----------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_log_type') then
    create type public.meal_log_type as enum ('breakfast', 'lunch', 'dinner', 'snacks', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_assignment_status') then
    create type public.meal_assignment_status as enum ('draft', 'active', 'archived');
  end if;
end $$;

-- meal_plans enhancements -----------------------------------------------------
alter table public.meal_plans
  add column if not exists subject_user_id uuid null references public.profiles(id) on delete cascade,
  add column if not exists subject_client_id uuid null references public.clients(id) on delete cascade,
  add column if not exists timezone text not null default 'UTC',
  add column if not exists daily_calorie_target integer null,
  add column if not exists daily_protein_target_g numeric(10,2) null,
  add column if not exists daily_carbs_target_g numeric(10,2) null,
  add column if not exists daily_fat_target_g numeric(10,2) null,
  add column if not exists meal_targets_json jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz null;

update public.meal_plans
set subject_user_id = user_id
where subject_user_id is null
  and subject_client_id is null;

alter table public.meal_plans
  drop constraint if exists meal_plans_subject_xor;

alter table public.meal_plans
  add constraint meal_plans_subject_xor
  check (((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1);

alter table public.meal_plans
  drop constraint if exists meal_plans_valid_date_range;

alter table public.meal_plans
  add constraint meal_plans_valid_date_range
  check (start_date <= end_date);

-- Normalize status values to supported business states.
update public.meal_plans
set status = case
  when lower(status) in ('active', 'draft', 'archived') then lower(status)
  else 'draft'
end;

alter table public.meal_plans
  drop constraint if exists meal_plans_status_supported;

alter table public.meal_plans
  add constraint meal_plans_status_supported
  check (status in ('draft', 'active', 'archived'));

alter table public.meal_plans
  alter column status set default 'draft';

create index if not exists idx_meal_plans_subject_user_dates
  on public.meal_plans (subject_user_id, start_date, end_date);

create index if not exists idx_meal_plans_subject_client_dates
  on public.meal_plans (subject_client_id, start_date, end_date);

create index if not exists idx_meal_plans_status
  on public.meal_plans (status, start_date);

-- Prevent overlapping active plans per subject --------------------------------
create or replace function public.enforce_active_meal_plan_overlap()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'active' then
    return new;
  end if;

  if new.start_date > new.end_date then
    raise exception 'Meal plan start_date must be on or before end_date';
  end if;

  if new.subject_user_id is not null then
    if exists (
      select 1
      from public.meal_plans mp
      where mp.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and mp.status = 'active'
        and mp.subject_user_id = new.subject_user_id
        and daterange(mp.start_date, mp.end_date + 1, '[)') && daterange(new.start_date, new.end_date + 1, '[)')
    ) then
      raise exception 'An overlapping active meal plan already exists for this user subject';
    end if;
  elsif new.subject_client_id is not null then
    if exists (
      select 1
      from public.meal_plans mp
      where mp.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and mp.status = 'active'
        and mp.subject_client_id = new.subject_client_id
        and daterange(mp.start_date, mp.end_date + 1, '[)') && daterange(new.start_date, new.end_date + 1, '[)')
    ) then
      raise exception 'An overlapping active meal plan already exists for this client subject';
    end if;
  else
    raise exception 'Meal plan must target exactly one subject';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_meal_plans_overlap_guard on public.meal_plans;
create trigger trg_meal_plans_overlap_guard
before insert or update of status, start_date, end_date, subject_user_id, subject_client_id
on public.meal_plans
for each row
execute function public.enforce_active_meal_plan_overlap();

-- Assignment snapshot tables ---------------------------------------------------
create table if not exists public.meal_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans(id) on delete restrict,
  assigned_by_user_id uuid not null references public.profiles(id) on delete set null,
  subject_user_id uuid null references public.profiles(id) on delete cascade,
  subject_client_id uuid null references public.clients(id) on delete cascade,
  name text not null,
  notes text null,
  timezone text not null default 'UTC',
  start_date date not null,
  end_date date not null,
  status public.meal_assignment_status not null default 'active',
  daily_calorie_target integer null,
  daily_protein_target_g numeric(10,2) null,
  daily_carbs_target_g numeric(10,2) null,
  daily_fat_target_g numeric(10,2) null,
  meal_targets_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint meal_plan_assignments_subject_xor
    check (((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1),
  constraint meal_plan_assignments_valid_date_range
    check (start_date <= end_date)
);

create table if not exists public.meal_plan_assignment_meals (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.meal_plan_assignments(id) on delete cascade,
  meal_type public.meal_log_type not null,
  item_name text not null,
  quantity numeric(10,2) null,
  unit text null,
  calories numeric(10,2) null,
  protein_g numeric(10,2) null,
  carbs_g numeric(10,2) null,
  fat_g numeric(10,2) null,
  fiber_g numeric(10,2) null,
  notes text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meal_plan_assignments_subject_user_dates
  on public.meal_plan_assignments (subject_user_id, start_date, end_date);

create index if not exists idx_meal_plan_assignments_subject_client_dates
  on public.meal_plan_assignments (subject_client_id, start_date, end_date);

create index if not exists idx_meal_plan_assignments_status
  on public.meal_plan_assignments (status, start_date);

create index if not exists idx_meal_plan_assignment_meals_assignment_position
  on public.meal_plan_assignment_meals (assignment_id, meal_type, position);

create unique index if not exists uq_meal_assignment_one_active_user
  on public.meal_plan_assignments(subject_user_id)
  where status = 'active' and subject_user_id is not null;

create unique index if not exists uq_meal_assignment_one_active_client
  on public.meal_plan_assignments(subject_client_id)
  where status = 'active' and subject_client_id is not null;

-- Prevent hard-delete for used plans ------------------------------------------
create or replace function public.prevent_used_meal_plan_delete()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.meal_plan_assignments a where a.plan_id = old.id) then
    raise exception 'Meal plan has assignment history and must be archived instead of deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_used_meal_plan_delete on public.meal_plans;
create trigger trg_prevent_used_meal_plan_delete
before delete on public.meal_plans
for each row
execute function public.prevent_used_meal_plan_delete();

-- Manual diary tables ----------------------------------------------------------
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid null references public.profiles(id) on delete cascade,
  subject_client_id uuid null references public.clients(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete set null,
  performed_on date not null,
  meal_type public.meal_log_type not null,
  timezone text not null default 'UTC',
  notes text null,
  total_calories numeric(10,2) not null default 0,
  total_protein_g numeric(10,2) not null default 0,
  total_carbs_g numeric(10,2) not null default 0,
  total_fat_g numeric(10,2) not null default 0,
  total_fiber_g numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_logs_subject_xor
    check (((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1)
);

create table if not exists public.meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete set null,
  item_name text not null,
  quantity numeric(10,2) null,
  unit text null,
  calories numeric(10,2) null,
  protein_g numeric(10,2) null,
  carbs_g numeric(10,2) null,
  fat_g numeric(10,2) null,
  fiber_g numeric(10,2) null,
  notes text null,
  is_quick_add boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_item_favorites (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references public.profiles(id) on delete cascade,
  item_name text not null,
  quantity numeric(10,2) null,
  unit text null,
  calories numeric(10,2) null,
  protein_g numeric(10,2) null,
  carbs_g numeric(10,2) null,
  fat_g numeric(10,2) null,
  fiber_g numeric(10,2) null,
  notes text null,
  usage_count integer not null default 0,
  last_used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_user_id, item_name, unit)
);

create unique index if not exists uq_meal_logs_user_day_type
  on public.meal_logs(subject_user_id, performed_on, meal_type)
  where subject_user_id is not null;

create unique index if not exists uq_meal_logs_client_day_type
  on public.meal_logs(subject_client_id, performed_on, meal_type)
  where subject_client_id is not null;

create index if not exists idx_meal_logs_subject_user_performed_on
  on public.meal_logs(subject_user_id, performed_on desc)
  where subject_user_id is not null;

create index if not exists idx_meal_logs_subject_client_performed_on
  on public.meal_logs(subject_client_id, performed_on desc)
  where subject_client_id is not null;

create index if not exists idx_meal_log_items_log_position
  on public.meal_log_items(meal_log_id, position, created_at);

create index if not exists idx_meal_item_favorites_user_recent
  on public.meal_item_favorites(subject_user_id, last_used_at desc, created_at desc);

-- Totals trigger for meal_logs -------------------------------------------------
create or replace function public.sync_meal_log_totals()
returns trigger
language plpgsql
as $$
declare
  v_meal_log_id uuid;
begin
  v_meal_log_id := coalesce(new.meal_log_id, old.meal_log_id);

  update public.meal_logs ml
  set
    total_calories = coalesce((select sum(coalesce(i.calories, 0)) from public.meal_log_items i where i.meal_log_id = v_meal_log_id), 0),
    total_protein_g = coalesce((select sum(coalesce(i.protein_g, 0)) from public.meal_log_items i where i.meal_log_id = v_meal_log_id), 0),
    total_carbs_g = coalesce((select sum(coalesce(i.carbs_g, 0)) from public.meal_log_items i where i.meal_log_id = v_meal_log_id), 0),
    total_fat_g = coalesce((select sum(coalesce(i.fat_g, 0)) from public.meal_log_items i where i.meal_log_id = v_meal_log_id), 0),
    total_fiber_g = coalesce((select sum(coalesce(i.fiber_g, 0)) from public.meal_log_items i where i.meal_log_id = v_meal_log_id), 0),
    updated_at = now()
  where ml.id = v_meal_log_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_meal_log_items_sync_totals on public.meal_log_items;
create trigger trg_meal_log_items_sync_totals
after insert or update or delete on public.meal_log_items
for each row
execute function public.sync_meal_log_totals();

-- RLS helper ------------------------------------------------------------------
create or replace function public.has_nutrition_subject_access(target_subject_user_id uuid, target_subject_client_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  actor := auth.uid();
  if actor is null then
    return false;
  end if;

  if public.is_sysadmin() then
    return true;
  end if;

  if target_subject_user_id is not null and target_subject_user_id = actor then
    return true;
  end if;

  if target_subject_client_id is not null then
    if public.has_client_coach_access(target_subject_client_id) then
      return true;
    end if;

    if exists (
      select 1
      from public.clients c
      where c.id = target_subject_client_id
        and c.linked_user_id = actor
    ) then
      return true;
    end if;
  end if;

  return false;
end;
$$;

grant execute on function public.has_nutrition_subject_access(uuid, uuid) to authenticated;

-- Enable RLS ------------------------------------------------------------------
alter table public.meal_plans enable row level security;
alter table public.meal_plan_meals enable row level security;
alter table public.meal_plan_assignments enable row level security;
alter table public.meal_plan_assignment_meals enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_log_items enable row level security;
alter table public.meal_item_favorites enable row level security;

-- Drop legacy meal policies first ---------------------------------------------
drop policy if exists meal_plans_select_owner_or_admin on public.meal_plans;
drop policy if exists meal_plans_write_owner_or_admin on public.meal_plans;
drop policy if exists meal_plan_meals_select_owner_or_admin on public.meal_plan_meals;
drop policy if exists meal_plan_meals_write_owner_or_admin on public.meal_plan_meals;

-- meal_plans policies ----------------------------------------------------------
create policy meal_plans_select_subject_access
on public.meal_plans
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or user_id = auth.uid()
  or public.is_sysadmin()
);

create policy meal_plans_insert_subject_access
on public.meal_plans
for insert
to authenticated
with check (
  (user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

create policy meal_plans_update_subject_access
on public.meal_plans
for update
to authenticated
using (public.has_nutrition_subject_access(subject_user_id, subject_client_id) or public.is_sysadmin())
with check (
  (user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

create policy meal_plans_delete_admin_only
on public.meal_plans
for delete
to authenticated
using (public.is_sysadmin());

-- meal_plan_meals policies -----------------------------------------------------
create policy meal_plan_meals_select_subject_access
on public.meal_plan_meals
for select
to authenticated
using (
  exists (
    select 1
    from public.meal_plans mp
    where mp.id = meal_plan_meals.program_id
      and public.has_nutrition_subject_access(mp.subject_user_id, mp.subject_client_id)
  )
  or public.is_sysadmin()
);

create policy meal_plan_meals_write_subject_access
on public.meal_plan_meals
for all
to authenticated
using (
  exists (
    select 1
    from public.meal_plans mp
    where mp.id = meal_plan_meals.program_id
      and public.has_nutrition_subject_access(mp.subject_user_id, mp.subject_client_id)
  )
  or public.is_sysadmin()
)
with check (
  exists (
    select 1
    from public.meal_plans mp
    where mp.id = meal_plan_meals.program_id
      and public.has_nutrition_subject_access(mp.subject_user_id, mp.subject_client_id)
  )
  or public.is_sysadmin()
);

-- meal_plan_assignments policies ----------------------------------------------
create policy meal_plan_assignments_select_subject_access
on public.meal_plan_assignments
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

create policy meal_plan_assignments_write_subject_access
on public.meal_plan_assignments
for all
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
)
with check (
  (assigned_by_user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

-- meal_plan_assignment_meals policies -----------------------------------------
create policy meal_plan_assignment_meals_select_subject_access
on public.meal_plan_assignment_meals
for select
to authenticated
using (
  exists (
    select 1
    from public.meal_plan_assignments a
    where a.id = meal_plan_assignment_meals.assignment_id
      and public.has_nutrition_subject_access(a.subject_user_id, a.subject_client_id)
  )
  or public.is_sysadmin()
);

create policy meal_plan_assignment_meals_write_subject_access
on public.meal_plan_assignment_meals
for all
to authenticated
using (
  exists (
    select 1
    from public.meal_plan_assignments a
    where a.id = meal_plan_assignment_meals.assignment_id
      and public.has_nutrition_subject_access(a.subject_user_id, a.subject_client_id)
  )
  or public.is_sysadmin()
)
with check (
  exists (
    select 1
    from public.meal_plan_assignments a
    where a.id = meal_plan_assignment_meals.assignment_id
      and public.has_nutrition_subject_access(a.subject_user_id, a.subject_client_id)
  )
  or public.is_sysadmin()
);

-- meal_logs policies -----------------------------------------------------------
create policy meal_logs_select_subject_access
on public.meal_logs
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

create policy meal_logs_insert_subject_access
on public.meal_logs
for insert
to authenticated
with check (
  (created_by_user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

create policy meal_logs_update_subject_access
on public.meal_logs
for update
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
)
with check (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

create policy meal_logs_delete_subject_access
on public.meal_logs
for delete
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

-- meal_log_items policies ------------------------------------------------------
create policy meal_log_items_select_subject_access
on public.meal_log_items
for select
to authenticated
using (
  exists (
    select 1
    from public.meal_logs ml
    where ml.id = meal_log_items.meal_log_id
      and public.has_nutrition_subject_access(ml.subject_user_id, ml.subject_client_id)
  )
  or public.is_sysadmin()
);

create policy meal_log_items_insert_subject_access
on public.meal_log_items
for insert
to authenticated
with check (
  (created_by_user_id = auth.uid() or public.is_sysadmin())
  and exists (
    select 1
    from public.meal_logs ml
    where ml.id = meal_log_items.meal_log_id
      and public.has_nutrition_subject_access(ml.subject_user_id, ml.subject_client_id)
  )
);

create policy meal_log_items_update_subject_access
on public.meal_log_items
for update
to authenticated
using (
  exists (
    select 1
    from public.meal_logs ml
    where ml.id = meal_log_items.meal_log_id
      and public.has_nutrition_subject_access(ml.subject_user_id, ml.subject_client_id)
  )
  or public.is_sysadmin()
)
with check (
  exists (
    select 1
    from public.meal_logs ml
    where ml.id = meal_log_items.meal_log_id
      and public.has_nutrition_subject_access(ml.subject_user_id, ml.subject_client_id)
  )
  or public.is_sysadmin()
);

create policy meal_log_items_delete_subject_access
on public.meal_log_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.meal_logs ml
    where ml.id = meal_log_items.meal_log_id
      and public.has_nutrition_subject_access(ml.subject_user_id, ml.subject_client_id)
  )
  or public.is_sysadmin()
);

-- meal_item_favorites policies -------------------------------------------------
create policy meal_item_favorites_select_own_or_admin
on public.meal_item_favorites
for select
to authenticated
using (subject_user_id = auth.uid() or public.is_sysadmin());

create policy meal_item_favorites_insert_own_or_admin
on public.meal_item_favorites
for insert
to authenticated
with check (subject_user_id = auth.uid() or public.is_sysadmin());

create policy meal_item_favorites_update_own_or_admin
on public.meal_item_favorites
for update
to authenticated
using (subject_user_id = auth.uid() or public.is_sysadmin())
with check (subject_user_id = auth.uid() or public.is_sysadmin());

create policy meal_item_favorites_delete_own_or_admin
on public.meal_item_favorites
for delete
to authenticated
using (subject_user_id = auth.uid() or public.is_sysadmin());
