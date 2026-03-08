begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_item_type') then
    create type public.meal_item_type as enum (
      'water',
      'breakfast',
      'snack',
      'lunch',
      'pre_workout_meal',
      'post_workout_meal',
      'dinner',
      'protein_drink'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_day_of_week') then
    create type public.meal_day_of_week as enum ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_group_status') then
    create type public.meal_group_status as enum ('draft', 'active', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_group_assignment_status') then
    create type public.meal_group_assignment_status as enum ('active', 'paused', 'completed', 'archived');
  end if;
end
$$;

create table if not exists public.meal_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  start_date date null,
  end_date date null,
  status public.meal_group_status not null default 'draft',
  notes text null,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  is_snapshot boolean not null default false,
  source_group_id uuid null references public.meal_groups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_groups_valid_date_range check (
    start_date is null
    or end_date is null
    or start_date <= end_date
  )
);

create index if not exists idx_meal_groups_owner_status
  on public.meal_groups (owner_user_id, status, updated_at desc);

create table if not exists public.meal_group_plans (
  id uuid primary key default gen_random_uuid(),
  meal_group_id uuid not null references public.meal_groups(id) on delete cascade,
  day_of_week public.meal_day_of_week not null,
  label text not null,
  notes text null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meal_group_id, day_of_week)
);

create index if not exists idx_meal_group_plans_group_day
  on public.meal_group_plans (meal_group_id, day_of_week);

create table if not exists public.meal_group_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_group_plans(id) on delete cascade,
  type public.meal_item_type not null,
  title text not null,
  calories integer not null default 0 check (calories >= 0),
  protein_g integer not null default 0 check (protein_g >= 0),
  carbs_g integer not null default 0 check (carbs_g >= 0),
  fat_g integer not null default 0 check (fat_g >= 0),
  notes text null,
  position integer not null default 0,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meal_group_items_plan_position
  on public.meal_group_items (meal_plan_id, position, created_at);

create table if not exists public.meal_group_assignments (
  id uuid primary key default gen_random_uuid(),
  template_group_id uuid not null references public.meal_groups(id) on delete restrict,
  meal_group_id uuid not null references public.meal_groups(id) on delete restrict,
  subject_user_id uuid null references public.profiles(id) on delete cascade,
  subject_client_id uuid null references public.clients(id) on delete cascade,
  assigned_by_user_id uuid not null references public.profiles(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status public.meal_group_assignment_status not null default 'active',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_group_assignments_subject_xor check (
    ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
  ),
  constraint meal_group_assignments_valid_date_range check (start_date <= end_date)
);

create index if not exists idx_meal_group_assignments_subject_user_start
  on public.meal_group_assignments (subject_user_id, start_date desc)
  where subject_user_id is not null;

create index if not exists idx_meal_group_assignments_subject_client_start
  on public.meal_group_assignments (subject_client_id, start_date desc)
  where subject_client_id is not null;

create index if not exists idx_meal_group_assignments_group_status
  on public.meal_group_assignments (meal_group_id, status, updated_at desc);

create or replace function public.can_access_meal_group(target_group_id uuid)
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
      from public.meal_groups g
      where g.id = target_group_id
        and g.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.meal_group_assignments a
      where a.meal_group_id = target_group_id
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

create or replace function public.can_manage_meal_group(target_group_id uuid)
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
      from public.meal_groups g
      where g.id = target_group_id
        and g.owner_user_id = auth.uid()
    );
$$;

grant execute on function public.can_access_meal_group(uuid) to authenticated;
grant execute on function public.can_manage_meal_group(uuid) to authenticated;

drop trigger if exists trg_meal_groups_set_updated_at on public.meal_groups;
create trigger trg_meal_groups_set_updated_at
before update on public.meal_groups
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_meal_group_plans_set_updated_at on public.meal_group_plans;
create trigger trg_meal_group_plans_set_updated_at
before update on public.meal_group_plans
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_meal_group_items_set_updated_at on public.meal_group_items;
create trigger trg_meal_group_items_set_updated_at
before update on public.meal_group_items
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_meal_group_assignments_set_updated_at on public.meal_group_assignments;
create trigger trg_meal_group_assignments_set_updated_at
before update on public.meal_group_assignments
for each row execute function public.trigger_set_updated_at();

alter table public.meal_groups enable row level security;
alter table public.meal_group_plans enable row level security;
alter table public.meal_group_items enable row level security;
alter table public.meal_group_assignments enable row level security;

drop policy if exists meal_groups_select_access on public.meal_groups;
create policy meal_groups_select_access on public.meal_groups
for select to authenticated
using (public.can_access_meal_group(id));

drop policy if exists meal_groups_insert_owner on public.meal_groups;
create policy meal_groups_insert_owner on public.meal_groups
for insert to authenticated
with check (owner_user_id = auth.uid() or public.is_sysadmin());

drop policy if exists meal_groups_update_owner on public.meal_groups;
create policy meal_groups_update_owner on public.meal_groups
for update to authenticated
using (public.can_manage_meal_group(id))
with check (public.can_manage_meal_group(id));

drop policy if exists meal_groups_delete_owner on public.meal_groups;
create policy meal_groups_delete_owner on public.meal_groups
for delete to authenticated
using (public.can_manage_meal_group(id));

drop policy if exists meal_group_plans_select_access on public.meal_group_plans;
create policy meal_group_plans_select_access on public.meal_group_plans
for select to authenticated
using (public.can_access_meal_group(meal_group_id));

drop policy if exists meal_group_plans_insert_manage on public.meal_group_plans;
create policy meal_group_plans_insert_manage on public.meal_group_plans
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_meal_group(meal_group_id)
);

drop policy if exists meal_group_plans_update_manage on public.meal_group_plans;
create policy meal_group_plans_update_manage on public.meal_group_plans
for update to authenticated
using (public.can_manage_meal_group(meal_group_id))
with check (public.can_manage_meal_group(meal_group_id));

drop policy if exists meal_group_plans_delete_manage on public.meal_group_plans;
create policy meal_group_plans_delete_manage on public.meal_group_plans
for delete to authenticated
using (public.can_manage_meal_group(meal_group_id));

drop policy if exists meal_group_items_select_access on public.meal_group_items;
create policy meal_group_items_select_access on public.meal_group_items
for select to authenticated
using (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_items.meal_plan_id
      and public.can_access_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_group_items_insert_manage on public.meal_group_items;
create policy meal_group_items_insert_manage on public.meal_group_items
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_items.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_group_items_update_manage on public.meal_group_items;
create policy meal_group_items_update_manage on public.meal_group_items
for update to authenticated
using (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_items.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
)
with check (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_items.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_group_items_delete_manage on public.meal_group_items;
create policy meal_group_items_delete_manage on public.meal_group_items
for delete to authenticated
using (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_items.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_group_assignments_select_access on public.meal_group_assignments;
create policy meal_group_assignments_select_access on public.meal_group_assignments
for select to authenticated
using (
  public.is_sysadmin()
  or assigned_by_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (
    subject_client_id is not null
    and (
      public.has_client_coach_access(subject_client_id)
      or public.is_linked_client_user(subject_client_id)
    )
  )
);

drop policy if exists meal_group_assignments_insert_access on public.meal_group_assignments;
create policy meal_group_assignments_insert_access on public.meal_group_assignments
for insert to authenticated
with check (
  public.is_sysadmin()
  or (
    assigned_by_user_id = auth.uid()
    and (
      (subject_user_id = auth.uid())
      or (
        subject_user_id is not null
        and exists (
          select 1
          from public.clients c
          where c.linked_user_id = meal_group_assignments.subject_user_id
            and public.has_client_coach_access(c.id)
        )
      )
      or (
        subject_client_id is not null
        and public.has_client_coach_access(subject_client_id)
      )
    )
  )
);

drop policy if exists meal_group_assignments_update_access on public.meal_group_assignments;
create policy meal_group_assignments_update_access on public.meal_group_assignments
for update to authenticated
using (public.is_sysadmin() or assigned_by_user_id = auth.uid())
with check (public.is_sysadmin() or assigned_by_user_id = auth.uid());

drop policy if exists meal_group_assignments_delete_access on public.meal_group_assignments;
create policy meal_group_assignments_delete_access on public.meal_group_assignments
for delete to authenticated
using (public.is_sysadmin() or assigned_by_user_id = auth.uid());

commit;
