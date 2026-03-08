begin;

alter table public.meal_logs
  add column if not exists meal_group_id uuid null references public.meal_groups(id) on delete set null;

create index if not exists idx_meal_logs_meal_group_performed_on
  on public.meal_logs (meal_group_id, performed_on desc)
  where meal_group_id is not null;

-- Allow one meal log per subject/day/type/group while keeping backward compatibility for legacy rows.
drop index if exists uq_meal_logs_user_day_type;
drop index if exists uq_meal_logs_client_day_type;

create unique index if not exists uq_meal_logs_user_group_day_type
  on public.meal_logs (subject_user_id, meal_group_id, performed_on, meal_type)
  where subject_user_id is not null
    and meal_group_id is not null;

create unique index if not exists uq_meal_logs_user_day_type_legacy
  on public.meal_logs (subject_user_id, performed_on, meal_type)
  where subject_user_id is not null
    and meal_group_id is null;

create unique index if not exists uq_meal_logs_client_group_day_type
  on public.meal_logs (subject_client_id, meal_group_id, performed_on, meal_type)
  where subject_client_id is not null
    and meal_group_id is not null;

create unique index if not exists uq_meal_logs_client_day_type_legacy
  on public.meal_logs (subject_client_id, performed_on, meal_type)
  where subject_client_id is not null
    and meal_group_id is null;

alter table public.meal_log_items
  add column if not exists consumed_time time null;

alter table public.meal_group_items
  add column if not exists planned_date date null,
  add column if not exists planned_time time null;

alter table public.meal_item_favorites
  add column if not exists meal_type public.meal_log_type null;

alter table public.meal_item_favorites
  drop constraint if exists meal_item_favorites_subject_user_id_item_name_unit_key;

create unique index if not exists uq_meal_item_favorites_subject_name_unit_type
  on public.meal_item_favorites (subject_user_id, lower(item_name), coalesce(unit, ''), meal_type)
  where meal_type is not null;

create unique index if not exists uq_meal_item_favorites_subject_name_unit_type_null
  on public.meal_item_favorites (subject_user_id, lower(item_name), coalesce(unit, ''))
  where meal_type is null;

create index if not exists idx_meal_item_favorites_user_type_recent
  on public.meal_item_favorites (subject_user_id, meal_type, last_used_at desc, created_at desc);

create table if not exists public.meal_group_plan_types (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_group_plans(id) on delete cascade,
  type public.meal_item_type not null,
  position integer not null check (position > 0),
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meal_plan_id, type),
  unique (meal_plan_id, position)
);

create index if not exists idx_meal_group_plan_types_plan_position
  on public.meal_group_plan_types (meal_plan_id, position);

create table if not exists public.meal_log_sections (
  id uuid primary key default gen_random_uuid(),
  meal_group_id uuid not null references public.meal_groups(id) on delete cascade,
  subject_user_id uuid null references public.profiles(id) on delete cascade,
  subject_client_id uuid null references public.clients(id) on delete cascade,
  performed_on date not null,
  meal_type public.meal_log_type not null,
  position integer not null check (position > 0),
  created_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_log_sections_subject_xor check (
    ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
  )
);

create unique index if not exists uq_meal_log_sections_user_day_type
  on public.meal_log_sections (meal_group_id, subject_user_id, performed_on, meal_type)
  where subject_user_id is not null;

create unique index if not exists uq_meal_log_sections_client_day_type
  on public.meal_log_sections (meal_group_id, subject_client_id, performed_on, meal_type)
  where subject_client_id is not null;

create unique index if not exists uq_meal_log_sections_user_day_position
  on public.meal_log_sections (meal_group_id, subject_user_id, performed_on, position)
  where subject_user_id is not null;

create unique index if not exists uq_meal_log_sections_client_day_position
  on public.meal_log_sections (meal_group_id, subject_client_id, performed_on, position)
  where subject_client_id is not null;

create index if not exists idx_meal_log_sections_group_user_day
  on public.meal_log_sections (meal_group_id, subject_user_id, performed_on, position)
  where subject_user_id is not null;

create index if not exists idx_meal_log_sections_group_client_day
  on public.meal_log_sections (meal_group_id, subject_client_id, performed_on, position)
  where subject_client_id is not null;

-- Seed explicit planner meal type cards from existing planner items.
with existing_types as (
  select
    i.meal_plan_id,
    i.type,
    min(i.position) as min_position
  from public.meal_group_items i
  group by i.meal_plan_id, i.type
),
ordered_types as (
  select
    e.meal_plan_id,
    e.type,
    row_number() over (
      partition by e.meal_plan_id
      order by
        case e.type
          when 'water' then 1
          when 'breakfast' then 2
          else 3
        end,
        e.min_position,
        e.type::text
    ) as position
  from existing_types e
)
insert into public.meal_group_plan_types (meal_plan_id, type, position, created_by_user_id)
select
  o.meal_plan_id,
  o.type,
  o.position,
  p.created_by_user_id
from ordered_types o
join public.meal_group_plans p on p.id = o.meal_plan_id
where not exists (
  select 1
  from public.meal_group_plan_types t
  where t.meal_plan_id = o.meal_plan_id
    and t.type = o.type
);

-- Seed explicit diary meal type cards from existing linked logs.
with existing_sections as (
  select
    ml.meal_group_id,
    ml.subject_user_id,
    ml.subject_client_id,
    ml.performed_on,
    ml.meal_type,
    min(ml.created_at) as first_seen,
    (array_agg(ml.created_by_user_id order by ml.created_at asc nulls last))[1] as created_by_user_id
  from public.meal_logs ml
  where ml.meal_group_id is not null
  group by ml.meal_group_id, ml.subject_user_id, ml.subject_client_id, ml.performed_on, ml.meal_type
),
ordered_sections as (
  select
    e.*,
    row_number() over (
      partition by e.meal_group_id, e.subject_user_id, e.subject_client_id, e.performed_on
      order by
        case e.meal_type
          when 'water' then 1
          when 'breakfast' then 2
          else 3
        end,
        e.first_seen,
        e.meal_type::text
    ) as position
  from existing_sections e
)
insert into public.meal_log_sections (
  meal_group_id,
  subject_user_id,
  subject_client_id,
  performed_on,
  meal_type,
  position,
  created_by_user_id
)
select
  o.meal_group_id,
  o.subject_user_id,
  o.subject_client_id,
  o.performed_on,
  o.meal_type,
  o.position,
  o.created_by_user_id
from ordered_sections o
where not exists (
  select 1
  from public.meal_log_sections s
  where s.meal_group_id = o.meal_group_id
    and s.performed_on = o.performed_on
    and s.meal_type = o.meal_type
    and coalesce(s.subject_user_id::text, '') = coalesce(o.subject_user_id::text, '')
    and coalesce(s.subject_client_id::text, '') = coalesce(o.subject_client_id::text, '')
);

alter table public.meal_group_plan_types enable row level security;
alter table public.meal_log_sections enable row level security;

drop trigger if exists trg_meal_group_plan_types_set_updated_at on public.meal_group_plan_types;
create trigger trg_meal_group_plan_types_set_updated_at
before update on public.meal_group_plan_types
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_meal_log_sections_set_updated_at on public.meal_log_sections;
create trigger trg_meal_log_sections_set_updated_at
before update on public.meal_log_sections
for each row execute function public.trigger_set_updated_at();

drop policy if exists meal_logs_select_subject_access on public.meal_logs;
create policy meal_logs_select_subject_access
on public.meal_logs
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  and (meal_group_id is null or public.can_access_meal_group(meal_group_id))
  or public.is_sysadmin()
);

drop policy if exists meal_logs_insert_subject_access on public.meal_logs;
create policy meal_logs_insert_subject_access
on public.meal_logs
for insert
to authenticated
with check (
  (created_by_user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  and (meal_group_id is null or public.can_access_meal_group(meal_group_id))
);

drop policy if exists meal_logs_update_subject_access on public.meal_logs;
create policy meal_logs_update_subject_access
on public.meal_logs
for update
to authenticated
using (
  (public.has_nutrition_subject_access(subject_user_id, subject_client_id)
   and (meal_group_id is null or public.can_access_meal_group(meal_group_id)))
  or public.is_sysadmin()
)
with check (
  (public.has_nutrition_subject_access(subject_user_id, subject_client_id)
   and (meal_group_id is null or public.can_access_meal_group(meal_group_id)))
  or public.is_sysadmin()
);

drop policy if exists meal_logs_delete_subject_access on public.meal_logs;
create policy meal_logs_delete_subject_access
on public.meal_logs
for delete
to authenticated
using (
  (public.has_nutrition_subject_access(subject_user_id, subject_client_id)
   and (meal_group_id is null or public.can_access_meal_group(meal_group_id)))
  or public.is_sysadmin()
);

drop policy if exists meal_log_items_select_subject_access on public.meal_log_items;
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
      and (ml.meal_group_id is null or public.can_access_meal_group(ml.meal_group_id))
  )
  or public.is_sysadmin()
);

drop policy if exists meal_log_items_insert_subject_access on public.meal_log_items;
create policy meal_log_items_insert_subject_access
on public.meal_log_items
for insert
to authenticated
with check (
  (created_by_user_id = auth.uid() or public.is_sysadmin() or created_by_client_id is not null)
  and exists (
    select 1
    from public.meal_logs ml
    where ml.id = meal_log_items.meal_log_id
      and public.has_nutrition_subject_access(ml.subject_user_id, ml.subject_client_id)
      and (ml.meal_group_id is null or public.can_access_meal_group(ml.meal_group_id))
  )
);

drop policy if exists meal_log_items_update_subject_access on public.meal_log_items;
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
      and (ml.meal_group_id is null or public.can_access_meal_group(ml.meal_group_id))
  )
  or public.is_sysadmin()
)
with check (
  exists (
    select 1
    from public.meal_logs ml
    where ml.id = meal_log_items.meal_log_id
      and public.has_nutrition_subject_access(ml.subject_user_id, ml.subject_client_id)
      and (ml.meal_group_id is null or public.can_access_meal_group(ml.meal_group_id))
  )
  or public.is_sysadmin()
);

drop policy if exists meal_log_items_delete_subject_access on public.meal_log_items;
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
      and (ml.meal_group_id is null or public.can_access_meal_group(ml.meal_group_id))
  )
  or public.is_sysadmin()
);

drop policy if exists meal_group_plan_types_select_access on public.meal_group_plan_types;
create policy meal_group_plan_types_select_access
on public.meal_group_plan_types
for select
to authenticated
using (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_plan_types.meal_plan_id
      and public.can_access_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_group_plan_types_insert_manage on public.meal_group_plan_types;
create policy meal_group_plan_types_insert_manage
on public.meal_group_plan_types
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_plan_types.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_group_plan_types_update_manage on public.meal_group_plan_types;
create policy meal_group_plan_types_update_manage
on public.meal_group_plan_types
for update
to authenticated
using (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_plan_types.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
)
with check (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_plan_types.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_group_plan_types_delete_manage on public.meal_group_plan_types;
create policy meal_group_plan_types_delete_manage
on public.meal_group_plan_types
for delete
to authenticated
using (
  exists (
    select 1
    from public.meal_group_plans p
    where p.id = meal_group_plan_types.meal_plan_id
      and public.can_manage_meal_group(p.meal_group_id)
  )
);

drop policy if exists meal_log_sections_select_access on public.meal_log_sections;
create policy meal_log_sections_select_access
on public.meal_log_sections
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  and public.can_access_meal_group(meal_group_id)
  or public.is_sysadmin()
);

drop policy if exists meal_log_sections_insert_access on public.meal_log_sections;
create policy meal_log_sections_insert_access
on public.meal_log_sections
for insert
to authenticated
with check (
  (created_by_user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  and public.can_access_meal_group(meal_group_id)
);

drop policy if exists meal_log_sections_update_access on public.meal_log_sections;
create policy meal_log_sections_update_access
on public.meal_log_sections
for update
to authenticated
using (
  (public.has_nutrition_subject_access(subject_user_id, subject_client_id)
   and public.can_access_meal_group(meal_group_id))
  or public.is_sysadmin()
)
with check (
  (public.has_nutrition_subject_access(subject_user_id, subject_client_id)
   and public.can_access_meal_group(meal_group_id))
  or public.is_sysadmin()
);

drop policy if exists meal_log_sections_delete_access on public.meal_log_sections;
create policy meal_log_sections_delete_access
on public.meal_log_sections
for delete
to authenticated
using (
  (public.has_nutrition_subject_access(subject_user_id, subject_client_id)
   and public.can_access_meal_group(meal_group_id))
  or public.is_sysadmin()
);

commit;
