begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_portal_auth_status') then
    create type public.client_portal_auth_status as enum ('active', 'blocked', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'client_module_key') then
    create type public.client_module_key as enum (
      'workouts',
      'training_plan',
      'meal_plan',
      'meal_logging',
      'steps_tracking',
      'goals',
      'check_ins',
      'coach_notes',
      'tasks'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'client_module_access_level') then
    create type public.client_module_access_level as enum ('disabled', 'read_only', 'enabled');
  end if;
  if not exists (select 1 from pg_type where typname = 'client_task_status') then
    create type public.client_task_status as enum ('pending', 'completed', 'overdue');
  end if;
  if not exists (select 1 from pg_type where typname = 'client_note_visibility') then
    create type public.client_note_visibility as enum ('private', 'visible_to_client');
  end if;
end
$$;

create table if not exists public.client_auth (
  client_id uuid primary key references public.clients(id) on delete cascade,
  username citext not null unique,
  password_hash text not null,
  status public.client_portal_auth_status not null default 'active',
  is_portal_enabled boolean not null default true,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz null,
  last_failed_at timestamptz null,
  last_login_at timestamptz null,
  password_updated_at timestamptz not null default now(),
  username_updated_at timestamptz not null default now(),
  created_by_user_id uuid null references public.profiles(id) on delete set null,
  updated_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_client_auth_username_ci
  on public.client_auth ((lower(username::text)));

create table if not exists public.client_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_seen_at timestamptz null,
  created_ip text null,
  user_agent text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_sessions_client_expires
  on public.client_sessions (client_id, expires_at desc);

create index if not exists idx_client_sessions_active
  on public.client_sessions (client_id, revoked_at, expires_at);

create table if not exists public.client_feature_access (
  client_id uuid not null references public.clients(id) on delete cascade,
  module_key public.client_module_key not null,
  access_level public.client_module_access_level not null default 'disabled',
  configured_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (client_id, module_key)
);

create index if not exists idx_client_feature_access_client
  on public.client_feature_access (client_id);

create table if not exists public.client_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text null,
  due_date date null,
  status public.client_task_status not null default 'pending',
  completed_at timestamptz null,
  created_by_user_id uuid null references public.profiles(id) on delete set null,
  created_by_client_id uuid null references public.clients(id) on delete set null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_tasks_client_status_due
  on public.client_tasks (client_id, status, due_date);

create table if not exists public.client_steps_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  performed_on date not null,
  steps integer not null check (steps >= 0),
  notes text null,
  created_by_user_id uuid null references public.profiles(id) on delete set null,
  created_by_client_id uuid null references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, performed_on)
);

create index if not exists idx_client_steps_logs_client_day
  on public.client_steps_logs (client_id, performed_on desc);

create table if not exists public.client_meal_item_favorites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  item_name text not null,
  quantity numeric null,
  unit text null,
  calories numeric null,
  protein_g numeric null,
  carbs_g numeric null,
  fat_g numeric null,
  fiber_g numeric null,
  notes text null,
  usage_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_client_meal_item_favorites_name_unit
  on public.client_meal_item_favorites (client_id, lower(item_name), coalesce(unit, ''));

create index if not exists idx_client_meal_item_favorites_recent
  on public.client_meal_item_favorites (client_id, last_used_at desc);

alter table public.training_sessions
  add column if not exists created_by_client_id uuid null references public.clients(id) on delete set null;

alter table public.meal_logs
  add column if not exists created_by_client_id uuid null references public.clients(id) on delete set null;

alter table public.meal_log_items
  add column if not exists created_by_client_id uuid null references public.clients(id) on delete set null;

alter table public.client_checkins
  add column if not exists created_by_client_id uuid null references public.clients(id) on delete set null;

alter table public.training_sessions alter column created_by_user_id drop not null;
alter table public.meal_logs alter column created_by_user_id drop not null;
alter table public.meal_log_items alter column created_by_user_id drop not null;
alter table public.client_checkins alter column created_by_user_id drop not null;

alter table public.coach_notes
  add column if not exists visibility public.client_note_visibility;

update public.coach_notes
set visibility = case
  when is_shared_with_linked_user then 'visible_to_client'::public.client_note_visibility
  else 'private'::public.client_note_visibility
end
where visibility is null;

alter table public.coach_notes
  alter column visibility set default 'private'::public.client_note_visibility,
  alter column visibility set not null;

create or replace function public.is_linked_client_user(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and c.linked_user_id = auth.uid()
  );
$$;

grant execute on function public.is_linked_client_user(uuid) to authenticated;

drop trigger if exists trg_client_auth_set_updated_at on public.client_auth;
create trigger trg_client_auth_set_updated_at
before update on public.client_auth
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_client_sessions_set_updated_at on public.client_sessions;
create trigger trg_client_sessions_set_updated_at
before update on public.client_sessions
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_client_feature_access_set_updated_at on public.client_feature_access;
create trigger trg_client_feature_access_set_updated_at
before update on public.client_feature_access
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_client_tasks_set_updated_at on public.client_tasks;
create trigger trg_client_tasks_set_updated_at
before update on public.client_tasks
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_client_steps_logs_set_updated_at on public.client_steps_logs;
create trigger trg_client_steps_logs_set_updated_at
before update on public.client_steps_logs
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_client_meal_item_favorites_set_updated_at on public.client_meal_item_favorites;
create trigger trg_client_meal_item_favorites_set_updated_at
before update on public.client_meal_item_favorites
for each row execute function public.trigger_set_updated_at();

alter table public.client_auth enable row level security;
alter table public.client_sessions enable row level security;
alter table public.client_feature_access enable row level security;
alter table public.client_tasks enable row level security;
alter table public.client_steps_logs enable row level security;
alter table public.client_meal_item_favorites enable row level security;

drop policy if exists client_auth_select_sysadmin on public.client_auth;
create policy client_auth_select_sysadmin on public.client_auth
for select to authenticated
using (public.is_sysadmin());

drop policy if exists client_auth_write_sysadmin on public.client_auth;
create policy client_auth_write_sysadmin on public.client_auth
for all to authenticated
using (public.is_sysadmin())
with check (public.is_sysadmin());

drop policy if exists client_sessions_select_sysadmin on public.client_sessions;
create policy client_sessions_select_sysadmin on public.client_sessions
for select to authenticated
using (public.is_sysadmin());

drop policy if exists client_sessions_write_sysadmin on public.client_sessions;
create policy client_sessions_write_sysadmin on public.client_sessions
for all to authenticated
using (public.is_sysadmin())
with check (public.is_sysadmin());

drop policy if exists client_feature_access_select_access on public.client_feature_access;
create policy client_feature_access_select_access on public.client_feature_access
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_feature_access_write_coach on public.client_feature_access;
create policy client_feature_access_write_coach on public.client_feature_access
for all to authenticated
using (public.has_client_coach_access(client_id) or public.is_sysadmin())
with check (public.has_client_coach_access(client_id) or public.is_sysadmin());

drop policy if exists client_tasks_select_access on public.client_tasks;
create policy client_tasks_select_access on public.client_tasks
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_tasks_insert_access on public.client_tasks;
create policy client_tasks_insert_access on public.client_tasks
for insert to authenticated
with check (public.has_client_coach_access(client_id) or public.is_sysadmin());

drop policy if exists client_tasks_update_access on public.client_tasks;
create policy client_tasks_update_access on public.client_tasks
for update to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
)
with check (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_tasks_delete_access on public.client_tasks;
create policy client_tasks_delete_access on public.client_tasks
for delete to authenticated
using (public.has_client_coach_access(client_id) or public.is_sysadmin());

drop policy if exists client_steps_logs_select_access on public.client_steps_logs;
create policy client_steps_logs_select_access on public.client_steps_logs
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_steps_logs_insert_access on public.client_steps_logs;
create policy client_steps_logs_insert_access on public.client_steps_logs
for insert to authenticated
with check (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_steps_logs_update_access on public.client_steps_logs;
create policy client_steps_logs_update_access on public.client_steps_logs
for update to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
)
with check (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_steps_logs_delete_access on public.client_steps_logs;
create policy client_steps_logs_delete_access on public.client_steps_logs
for delete to authenticated
using (public.has_client_coach_access(client_id) or public.is_sysadmin());

drop policy if exists client_meal_item_favorites_select_access on public.client_meal_item_favorites;
create policy client_meal_item_favorites_select_access on public.client_meal_item_favorites
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_meal_item_favorites_insert_access on public.client_meal_item_favorites;
create policy client_meal_item_favorites_insert_access on public.client_meal_item_favorites
for insert to authenticated
with check (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_meal_item_favorites_update_access on public.client_meal_item_favorites;
create policy client_meal_item_favorites_update_access on public.client_meal_item_favorites
for update to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
)
with check (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists client_meal_item_favorites_delete_access on public.client_meal_item_favorites;
create policy client_meal_item_favorites_delete_access on public.client_meal_item_favorites
for delete to authenticated
using (
  public.has_client_coach_access(client_id)
  or public.is_linked_client_user(client_id)
  or public.is_sysadmin()
);

drop policy if exists coach_notes_select_access on public.coach_notes;
create policy coach_notes_select_access on public.coach_notes
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or (
    (
      visibility = 'visible_to_client'::public.client_note_visibility
      or is_shared_with_linked_user = true
    )
    and public.is_linked_client_user(client_id)
  )
);

commit;
