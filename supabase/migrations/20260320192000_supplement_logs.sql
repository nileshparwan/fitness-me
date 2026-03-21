create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  supplement_id uuid not null references public.supplement_catalog(id) on delete cascade,
  servings numeric not null default 1,
  performed_on date not null default (now()::date),
  logged_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  constraint supplement_logs_subject_check
    check (
      (subject_user_id is not null and subject_client_id is null) or
      (subject_user_id is null and subject_client_id is not null)
    ),
  constraint supplement_logs_servings_check
    check (servings > 0)
);

create index if not exists idx_supplement_logs_user_date
  on public.supplement_logs (subject_user_id, performed_on desc)
  where subject_user_id is not null;

create index if not exists idx_supplement_logs_client_date
  on public.supplement_logs (subject_client_id, performed_on desc)
  where subject_client_id is not null;

create index if not exists idx_supplement_logs_supplement_date
  on public.supplement_logs (supplement_id, performed_on desc);

alter table public.supplement_logs enable row level security;

drop trigger if exists trg_supplement_logs_set_updated_at on public.supplement_logs;
create trigger trg_supplement_logs_set_updated_at
before update on public.supplement_logs
for each row execute function public.trigger_set_updated_at();

drop policy if exists supplement_logs_select_subject_access on public.supplement_logs;
create policy supplement_logs_select_subject_access
on public.supplement_logs
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

drop policy if exists supplement_logs_insert_subject_access on public.supplement_logs;
create policy supplement_logs_insert_subject_access
on public.supplement_logs
for insert
to authenticated
with check (
  (created_by_user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

drop policy if exists supplement_logs_update_subject_access on public.supplement_logs;
create policy supplement_logs_update_subject_access
on public.supplement_logs
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

drop policy if exists supplement_logs_delete_subject_access on public.supplement_logs;
create policy supplement_logs_delete_subject_access
on public.supplement_logs
for delete
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);
