begin;

create table if not exists public.sleep_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  date date not null,
  sleep_start timestamptz,
  sleep_end timestamptz,
  total_duration_minutes integer,
  deep_sleep_minutes integer,
  rem_sleep_minutes integer,
  light_sleep_minutes integer,
  awake_minutes integer,
  sleep_score integer check (sleep_score between 0 and 100),
  source public.wearable_provider not null default 'manual',
  raw_sync_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vitals_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  recorded_at timestamptz not null,
  resting_heart_rate integer,
  hrv_ms numeric,
  spo2_percent numeric check (spo2_percent between 50 and 100),
  systolic_bp integer,
  diastolic_bp integer,
  body_temperature_c numeric,
  respiratory_rate numeric,
  source public.wearable_provider not null default 'manual',
  raw_sync_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  date date not null,
  steps integer,
  floors_climbed integer,
  active_minutes integer,
  sedentary_minutes integer,
  active_calories_burned numeric,
  total_calories_burned numeric,
  distance_km numeric,
  sleep_hours numeric check (sleep_hours between 0 and 24),
  energy_level integer check (energy_level between 1 and 5),
  source public.wearable_provider not null default 'manual',
  raw_sync_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.sleep_log
  add column if not exists subject_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists subject_client_id uuid references public.clients(id) on delete cascade,
  add column if not exists source public.wearable_provider not null default 'manual',
  add column if not exists raw_sync_data jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.vitals_log
  add column if not exists subject_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists subject_client_id uuid references public.clients(id) on delete cascade,
  add column if not exists source public.wearable_provider not null default 'manual',
  add column if not exists raw_sync_data jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.daily_activity
  add column if not exists subject_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists subject_client_id uuid references public.clients(id) on delete cascade,
  add column if not exists sleep_hours numeric check (sleep_hours between 0 and 24),
  add column if not exists energy_level integer check (energy_level between 1 and 5),
  add column if not exists source public.wearable_provider not null default 'manual',
  add column if not exists raw_sync_data jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.sleep_log
  alter column user_id drop not null;

alter table if exists public.vitals_log
  alter column user_id drop not null;

alter table if exists public.daily_activity
  alter column user_id drop not null;

update public.sleep_log
set subject_user_id = user_id
where subject_user_id is null
  and subject_client_id is null
  and user_id is not null;

update public.vitals_log
set subject_user_id = user_id
where subject_user_id is null
  and subject_client_id is null
  and user_id is not null;

update public.daily_activity
set subject_user_id = user_id
where subject_user_id is null
  and subject_client_id is null
  and user_id is not null;

alter table public.sleep_log
  drop constraint if exists sleep_log_subject_check;
alter table public.sleep_log
  add constraint sleep_log_subject_check
  check (((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1);

alter table public.vitals_log
  drop constraint if exists vitals_log_subject_check;
alter table public.vitals_log
  add constraint vitals_log_subject_check
  check (((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1);

alter table public.daily_activity
  drop constraint if exists daily_activity_subject_check;
alter table public.daily_activity
  add constraint daily_activity_subject_check
  check (((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1);

with sleep_ranked as (
  select
    id,
    row_number() over (
      partition by subject_user_id, subject_client_id, date
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.sleep_log
  where ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
)
delete from public.sleep_log sl
using sleep_ranked ranked
where sl.id = ranked.id
  and ranked.rn > 1;

with activity_ranked as (
  select
    id,
    row_number() over (
      partition by subject_user_id, subject_client_id, date
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.daily_activity
  where ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
)
delete from public.daily_activity da
using activity_ranked ranked
where da.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists uq_sleep_log_subject_user_date
  on public.sleep_log (subject_user_id, date)
  where subject_user_id is not null and subject_client_id is null;

create unique index if not exists uq_sleep_log_subject_client_date
  on public.sleep_log (subject_client_id, date)
  where subject_client_id is not null and subject_user_id is null;

create unique index if not exists uq_daily_activity_subject_user_date
  on public.daily_activity (subject_user_id, date)
  where subject_user_id is not null and subject_client_id is null;

create unique index if not exists uq_daily_activity_subject_client_date
  on public.daily_activity (subject_client_id, date)
  where subject_client_id is not null and subject_user_id is null;

create index if not exists sleep_log_subject_user_date_idx
  on public.sleep_log (subject_user_id, date desc)
  where subject_user_id is not null;

create index if not exists sleep_log_subject_client_date_idx
  on public.sleep_log (subject_client_id, date desc)
  where subject_client_id is not null;

create index if not exists vitals_log_subject_user_recorded_idx
  on public.vitals_log (subject_user_id, recorded_at desc)
  where subject_user_id is not null;

create index if not exists vitals_log_subject_client_recorded_idx
  on public.vitals_log (subject_client_id, recorded_at desc)
  where subject_client_id is not null;

create index if not exists daily_activity_subject_user_date_idx
  on public.daily_activity (subject_user_id, date desc)
  where subject_user_id is not null;

create index if not exists daily_activity_subject_client_date_idx
  on public.daily_activity (subject_client_id, date desc)
  where subject_client_id is not null;

alter table public.sleep_log enable row level security;
alter table public.vitals_log enable row level security;
alter table public.daily_activity enable row level security;

do $$
declare
  rel text;
  pol record;
begin
  foreach rel in array array['sleep_log', 'vitals_log', 'daily_activity']
  loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = rel
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, rel);
    end loop;
  end loop;
end $$;

create policy sleep_log_subject_access
on public.sleep_log
for all
to authenticated
using (public.has_nutrition_subject_access(subject_user_id, subject_client_id))
with check (public.has_nutrition_subject_access(subject_user_id, subject_client_id));

create policy vitals_log_subject_access
on public.vitals_log
for all
to authenticated
using (public.has_nutrition_subject_access(subject_user_id, subject_client_id))
with check (public.has_nutrition_subject_access(subject_user_id, subject_client_id));

create policy daily_activity_subject_access
on public.daily_activity
for all
to authenticated
using (public.has_nutrition_subject_access(subject_user_id, subject_client_id))
with check (public.has_nutrition_subject_access(subject_user_id, subject_client_id));

commit;
