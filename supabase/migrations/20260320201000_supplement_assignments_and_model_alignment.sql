begin;

-- Align catalog uniqueness with seed conflict strategy (name + global scope).
alter table public.supplement_catalog
  drop constraint if exists supplement_catalog_name_key;

create unique index if not exists uq_supplement_catalog_name_scope
  on public.supplement_catalog (name, is_global);

create table if not exists public.supplement_assignments (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  supplement_id uuid not null references public.supplement_catalog(id),
  default_servings numeric not null default 1,
  time_of_day text,
  taken_with_food boolean,
  notes text,
  coach_note text,
  coach_noted_by uuid references auth.users(id),
  is_active boolean not null default true,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplement_assignments_subject_check
    check (
      (subject_user_id is not null and subject_client_id is null) or
      (subject_user_id is null and subject_client_id is not null)
    ),
  constraint supplement_assignments_default_servings_check
    check (default_servings > 0),
  constraint supplement_assignments_time_of_day_check
    check (
      time_of_day is null or time_of_day in ('morning', 'midday', 'evening', 'night')
    ),
  constraint supplement_assignments_user_supplement_unique
    unique (subject_user_id, supplement_id)
    deferrable initially deferred,
  constraint supplement_assignments_client_supplement_unique
    unique (subject_client_id, supplement_id)
    deferrable initially deferred
);

create index if not exists idx_supplement_assignments_user
  on public.supplement_assignments (subject_user_id, is_active)
  where subject_user_id is not null;

create index if not exists idx_supplement_assignments_client
  on public.supplement_assignments (subject_client_id, is_active)
  where subject_client_id is not null;

create index if not exists idx_supplement_assignments_supplement
  on public.supplement_assignments (supplement_id, is_active);

drop trigger if exists trg_supplement_assignments_set_updated_at on public.supplement_assignments;
create trigger trg_supplement_assignments_set_updated_at
before update on public.supplement_assignments
for each row execute function public.trigger_set_updated_at();

alter table public.supplement_assignments enable row level security;

drop policy if exists supplement_assignments_select_subject_access on public.supplement_assignments;
create policy supplement_assignments_select_subject_access
on public.supplement_assignments
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

drop policy if exists supplement_assignments_insert_subject_access on public.supplement_assignments;
create policy supplement_assignments_insert_subject_access
on public.supplement_assignments
for insert
to authenticated
with check (
  (assigned_by = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

drop policy if exists supplement_assignments_update_subject_access on public.supplement_assignments;
create policy supplement_assignments_update_subject_access
on public.supplement_assignments
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

drop policy if exists supplement_assignments_delete_subject_access on public.supplement_assignments;
create policy supplement_assignments_delete_subject_access
on public.supplement_assignments
for delete
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

alter table public.supplement_logs
  add column if not exists assignment_id uuid references public.supplement_assignments(id) on delete set null,
  add column if not exists time_of_day text,
  add column if not exists taken_with_food boolean;

alter table public.supplement_logs
  drop constraint if exists supplement_logs_time_of_day_check;

alter table public.supplement_logs
  add constraint supplement_logs_time_of_day_check
  check (
    time_of_day is null or time_of_day in ('morning', 'midday', 'evening', 'night')
  );

create index if not exists idx_supplement_logs_assignment
  on public.supplement_logs (assignment_id, performed_on desc)
  where assignment_id is not null;

commit;
