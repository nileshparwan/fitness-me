create table if not exists public.daily_macro_compliance (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  performed_on date not null,
  target_calories numeric,
  target_protein_g numeric,
  target_carbs_g numeric,
  target_fat_g numeric,
  target_source text not null,
  actual_calories numeric not null default 0,
  actual_protein_g numeric not null default 0,
  actual_carbs_g numeric not null default 0,
  actual_fat_g numeric not null default 0,
  calories_compliant boolean,
  protein_compliant boolean,
  carbs_compliant boolean,
  fat_compliant boolean,
  basis text not null,
  overall_compliant boolean,
  updated_at timestamptz not null default now(),
  constraint daily_macro_compliance_subject_xor
    check ((subject_user_id is null) <> (subject_client_id is null)),
  constraint daily_macro_compliance_target_source_check
    check (target_source in ('plan_assignment', 'fitness_goal', 'none')),
  constraint daily_macro_compliance_basis_check
    check (basis in ('complete_log', 'partial_log', 'missing_target', 'no_log'))
);

create unique index if not exists uq_daily_macro_compliance_user_date
  on public.daily_macro_compliance (subject_user_id, performed_on)
  where subject_user_id is not null and subject_client_id is null;

create unique index if not exists uq_daily_macro_compliance_client_date
  on public.daily_macro_compliance (subject_client_id, performed_on)
  where subject_client_id is not null and subject_user_id is null;

create index if not exists idx_daily_macro_compliance_user_date
  on public.daily_macro_compliance (subject_user_id, performed_on desc)
  where subject_user_id is not null and subject_client_id is null;

create index if not exists idx_daily_macro_compliance_client_date
  on public.daily_macro_compliance (subject_client_id, performed_on desc)
  where subject_client_id is not null and subject_user_id is null;

drop trigger if exists trg_daily_macro_compliance_set_updated_at on public.daily_macro_compliance;
create trigger trg_daily_macro_compliance_set_updated_at
before update on public.daily_macro_compliance
for each row execute function public.trigger_set_updated_at();

alter table public.daily_macro_compliance enable row level security;

drop policy if exists daily_macro_compliance_select_subject_access on public.daily_macro_compliance;
create policy daily_macro_compliance_select_subject_access
on public.daily_macro_compliance
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);
