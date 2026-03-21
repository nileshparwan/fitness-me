begin;

create table if not exists public.supplement_subject_profiles (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  title text,
  workout_program text,
  nutrition_program text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplement_subject_profiles_subject_check
    check (
      (subject_user_id is not null and subject_client_id is null)
      or (subject_user_id is null and subject_client_id is not null)
    )
);

create unique index if not exists uq_supplement_subject_profiles_user
  on public.supplement_subject_profiles (subject_user_id)
  where subject_user_id is not null;

create unique index if not exists uq_supplement_subject_profiles_client
  on public.supplement_subject_profiles (subject_client_id)
  where subject_client_id is not null;

create index if not exists idx_supplement_subject_profiles_updated
  on public.supplement_subject_profiles (updated_at desc);

drop trigger if exists trg_supplement_subject_profiles_set_updated_at on public.supplement_subject_profiles;
create trigger trg_supplement_subject_profiles_set_updated_at
before update on public.supplement_subject_profiles
for each row execute function public.trigger_set_updated_at();

alter table public.supplement_subject_profiles enable row level security;

drop policy if exists supplement_subject_profiles_select_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_select_subject_access
on public.supplement_subject_profiles
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

drop policy if exists supplement_subject_profiles_insert_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_insert_subject_access
on public.supplement_subject_profiles
for insert
to authenticated
with check (
  (updated_by = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

drop policy if exists supplement_subject_profiles_update_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_update_subject_access
on public.supplement_subject_profiles
for update
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
)
with check (
  (updated_by = auth.uid() or public.is_sysadmin())
  and (public.has_nutrition_subject_access(subject_user_id, subject_client_id) or public.is_sysadmin())
);

drop policy if exists supplement_subject_profiles_delete_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_delete_subject_access
on public.supplement_subject_profiles
for delete
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

with latest_per_subject as (
  select
    sa.subject_user_id,
    sa.subject_client_id,
    nullif(trim(sa.notes), '') as title,
    nullif(trim(substring(coalesce(sa.coach_note, '') from 'Workout:\s*([^|]+)')), '') as workout_program,
    nullif(trim(substring(coalesce(sa.coach_note, '') from 'Nutrition:\s*([^|]+)')), '') as nutrition_program,
    sa.assigned_by as updated_by,
    sa.updated_at,
    sa.created_at,
    row_number() over (
      partition by sa.subject_user_id, sa.subject_client_id
      order by sa.updated_at desc nulls last, sa.created_at desc nulls last
    ) as rn
  from public.supplement_assignments sa
  where sa.notes is not null or sa.coach_note is not null
)
insert into public.supplement_subject_profiles (
  subject_user_id,
  subject_client_id,
  title,
  workout_program,
  nutrition_program,
  updated_by,
  created_at,
  updated_at
)
select
  subject_user_id,
  subject_client_id,
  title,
  workout_program,
  nutrition_program,
  updated_by,
  coalesce(created_at, now()),
  coalesce(updated_at, now())
from latest_per_subject
where rn = 1
  and (title is not null or workout_program is not null or nutrition_program is not null);

alter table public.supplement_assignments
  drop column if exists notes,
  drop column if exists coach_note,
  drop column if exists coach_noted_by;

commit;
