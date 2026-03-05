begin;

create extension if not exists pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('sysadmin', 'user');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wearable_provider') THEN
    CREATE TYPE public.wearable_provider AS ENUM ('garmin','apple_health','google_fit','oura','whoop','polar','strava','fitbit','manual');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'injury_severity') THEN
    CREATE TYPE public.injury_severity AS ENUM ('mild', 'moderate', 'severe');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nutrition_tracking_mode') THEN
    CREATE TYPE public.nutrition_tracking_mode AS ENUM ('macro', 'habit', 'intuitive');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkin_status') THEN
    CREATE TYPE public.checkin_status AS ENUM ('pending_review', 'reviewed', 'actioned');
  END IF;
END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  full_name text,
  avatar_url text,
  date_of_birth date,
  gender text,
  height_cm numeric,
  preferred_units text not null default 'metric' check (preferred_units in ('metric', 'imperial')),
  sport_focus text[],
  bio text,
  is_active boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_biofeedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  sleep_hours numeric check (sleep_hours between 0 and 24),
  sleep_quality integer check (sleep_quality between 1 and 5),
  energy_level integer check (energy_level between 1 and 5),
  mood integer check (mood between 1 and 5),
  muscle_soreness integer check (muscle_soreness between 1 and 5),
  stress_level integer check (stress_level between 1 and 5),
  motivation integer check (motivation between 1 and 5),
  perceived_fatigue integer check (perceived_fatigue between 1 and 5),
  readiness_score numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  steps integer,
  floors_climbed integer,
  active_minutes integer,
  sedentary_minutes integer,
  active_calories_burned numeric,
  total_calories_burned numeric,
  distance_km numeric,
  source public.wearable_provider not null default 'manual',
  raw_sync_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date, source)
);

create table if not exists public.vitals_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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

create table if not exists public.sleep_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  updated_at timestamptz not null default now(),
  unique(user_id, date, source)
);

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  tracking_mode public.nutrition_tracking_mode not null default 'macro',
  total_calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  water_ml numeric,
  supplement_notes text,
  adherence_rating integer check (adherence_rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_id uuid not null references public.nutrition_logs(id) on delete cascade,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  meal_time timestamptz,
  food_description text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  morning_weight_avg numeric,
  waist_cm numeric,
  photo_front_url text,
  photo_side_url text,
  photo_back_url text,
  workouts_completed integer,
  workouts_assigned integer,
  nutrition_adherence_days integer,
  avg_steps integer,
  avg_sleep_hours numeric,
  avg_energy numeric,
  avg_soreness numeric,
  user_notes text,
  review_feedback text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  status public.checkin_status not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start_date)
);

create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body_part text not null,
  injury_type text,
  severity public.injury_severity,
  onset_date date,
  resolved_date date,
  is_active boolean not null default true,
  affects_training boolean not null default true,
  description text,
  support_notes text,
  medical_clearance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wearable_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.wearable_provider not null,
  access_token_ref text,
  refresh_token_ref text,
  token_expires_at timestamptz,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  sync_scope text[],
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

create table if not exists public.assigned_programs (
  id uuid primary key default gen_random_uuid(),
  assigned_by_id uuid references public.profiles(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_type text check (program_type in ('training_plan', 'meal_plan')),
  training_plan_id uuid references public.training_plans(id) on delete set null,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  program_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_sessions
  add column if not exists assigned_by_id uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_by text default 'self' check (assigned_by in ('self', 'admin', 'system')),
  add column if not exists plan_id uuid references public.training_plans(id) on delete set null,
  add column if not exists sport_type text,
  add column if not exists location text,
  add column if not exists perceived_exertion integer check (perceived_exertion between 1 and 10);

alter table public.body_measurements
  add column if not exists updated_at timestamptz default now(),
  add column if not exists neck_cm numeric,
  add column if not exists hips_cm numeric,
  add column if not exists calves_cm numeric,
  add column if not exists forearms_cm numeric,
  add column if not exists wrist_cm numeric,
  add column if not exists ankle_cm numeric,
  add column if not exists shoulder_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists bmi numeric,
  add column if not exists visceral_fat_level integer,
  add column if not exists bone_density_score numeric,
  add column if not exists skinfold_chest_mm numeric,
  add column if not exists skinfold_abdomen_mm numeric,
  add column if not exists skinfold_thigh_mm numeric,
  add column if not exists measurement_method text check (measurement_method in ('tape', 'dexa', 'bodpod', 'calipers', 'bioimpedance', 'visual'));

alter table public.cardio_sessions
  add column if not exists sport_type text,
  add column if not exists route_gpx_url text,
  add column if not exists avg_cadence_rpm numeric,
  add column if not exists avg_power_watts numeric,
  add column if not exists avg_speed_kmh numeric,
  add column if not exists max_speed_kmh numeric,
  add column if not exists vo2max_estimate numeric,
  add column if not exists training_load_score numeric,
  add column if not exists weather_conditions text,
  add column if not exists indoor_outdoor text check (indoor_outdoor in ('indoor', 'outdoor')),
  add column if not exists device_source text;

alter table public.fitness_goals
  add column if not exists assigned_by_id uuid references public.profiles(id) on delete set null,
  add column if not exists sport_specific_goal text,
  add column if not exists current_value numeric,
  add column if not exists target_value numeric,
  add column if not exists unit text,
  add column if not exists priority integer not null default 1,
  add column if not exists review_date date;

alter table public.exercise_catalog
  add column if not exists sport_category text[],
  add column if not exists difficulty_level text check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists is_unilateral boolean not null default false,
  add column if not exists force_type text check (force_type in ('push', 'pull', 'carry', 'isometric', 'dynamic')),
  add column if not exists joint_actions text[],
  add column if not exists contraindications text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists is_custom boolean not null default false,
  add column if not exists is_approved boolean not null default true;

alter table public.training_plans add column if not exists updated_at timestamptz default now();
alter table public.meal_plans add column if not exists updated_at timestamptz default now();
alter table public.ai_insights add column if not exists updated_at timestamptz default now();
alter table public.analytics_events add column if not exists updated_at timestamptz default now();

do $$
declare
  rel text;
  con record;
begin
  foreach rel in array array[
    'training_sessions',
    'cardio_sessions',
    'body_measurements',
    'fitness_goals',
    'meal_plans',
    'training_plans',
    'ai_insights',
    'analytics_events',
    'tickets',
    'ticket_comments',
    'ticket_upvotes',
    'account_deletion_requests'
  ]
  loop
    for con in
      select pgc.conname
      from pg_constraint pgc
      join pg_class relcls on relcls.oid = pgc.conrelid
      join pg_namespace relnsp on relnsp.oid = relcls.relnamespace
      join pg_class refcls on refcls.oid = pgc.confrelid
      join pg_namespace refnsp on refnsp.oid = refcls.relnamespace
      where relnsp.nspname = 'public'
        and relcls.relname = rel
        and pgc.contype = 'f'
        and refnsp.nspname = 'auth'
        and refcls.relname = 'users'
    loop
      execute format('alter table public.%I drop constraint if exists %I', rel, con.conname);
    end loop;
  end loop;
end $$;

alter table public.training_sessions
  add constraint training_sessions_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.cardio_sessions
  add constraint cardio_sessions_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.body_measurements
  add constraint body_measurements_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.fitness_goals
  add constraint fitness_goals_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.meal_plans
  add constraint meal_plans_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.training_plans
  add constraint training_plans_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.ai_insights
  add constraint ai_insights_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.analytics_events
  add constraint analytics_events_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.tickets
  add constraint tickets_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.ticket_comments
  add constraint ticket_comments_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.ticket_upvotes
  add constraint ticket_upvotes_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;
alter table public.account_deletion_requests
  add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade not valid;

create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  rel text;
begin
  foreach rel in array array[
    'profiles',
    'daily_biofeedback',
    'daily_activity',
    'vitals_log',
    'sleep_log',
    'nutrition_logs',
    'nutrition_meals',
    'weekly_checkins',
    'injuries',
    'wearable_integrations',
    'assigned_programs',
    'training_sessions',
    'strength_sets',
    'cardio_sessions',
    'body_measurements',
    'fitness_goals',
    'meal_plans',
    'training_plans',
    'exercise_catalog',
    'ai_insights',
    'analytics_events',
    'tickets',
    'account_deletion_requests'
  ]
  loop
    execute format('drop trigger if exists trg_%I_set_updated_at on public.%I', rel, rel);
    execute format('create trigger trg_%I_set_updated_at before update on public.%I for each row execute function public.trigger_set_updated_at()', rel, rel);
  end loop;
end $$;

create or replace function public.trigger_strength_set_calculate_1rm()
returns trigger
language plpgsql
as $$
begin
  if new.weight is null or new.reps is null or new.reps <= 0 or new.weight < 0 then
    new.calculated_1rm := null;
  else
    new.calculated_1rm := round((new.weight * (1 + (new.reps::numeric / 30.0)))::numeric, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_strength_sets_calculated_1rm on public.strength_sets;
create trigger trg_strength_sets_calculated_1rm
before insert or update of reps, weight
on public.strength_sets
for each row
execute function public.trigger_strength_set_calculate_1rm();

create or replace function public.trigger_body_measurements_calculate_bmi()
returns trigger
language plpgsql
as $$
declare
  effective_height numeric;
begin
  effective_height := new.height_cm;
  if effective_height is null and new.user_id is not null then
    select p.height_cm into effective_height
    from public.profiles p
    where p.id = new.user_id;
  end if;

  if new.weight is not null and effective_height is not null and effective_height > 0 then
    new.bmi := round((new.weight / power((effective_height / 100.0), 2))::numeric, 2);
  else
    new.bmi := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_body_measurements_bmi on public.body_measurements;
create trigger trg_body_measurements_bmi
before insert or update of weight, height_cm, user_id
on public.body_measurements
for each row
execute function public.trigger_body_measurements_calculate_bmi();

create or replace view public.weekly_training_volume as
select
  ts.user_id,
  date_trunc('week', ts.date::timestamp)::date as week_start,
  coalesce(sum(ss.weight * ss.reps), 0)::numeric as total_volume_kg,
  count(distinct ts.id)::bigint as sessions_count,
  count(ss.id)::bigint as total_sets
from public.training_sessions ts
left join public.strength_sets ss on ss.workout_id = ts.id
where ts.user_id is not null
group by ts.user_id, date_trunc('week', ts.date::timestamp)::date;

alter table public.training_sessions validate constraint training_sessions_user_id_fkey;
alter table public.cardio_sessions validate constraint cardio_sessions_user_id_fkey;
alter table public.body_measurements validate constraint body_measurements_user_id_fkey;
alter table public.fitness_goals validate constraint fitness_goals_user_id_fkey;
alter table public.meal_plans validate constraint meal_plans_user_id_fkey;
alter table public.training_plans validate constraint training_plans_user_id_fkey;
alter table public.ai_insights validate constraint ai_insights_user_id_fkey;
alter table public.analytics_events validate constraint analytics_events_user_id_fkey;
alter table public.tickets validate constraint tickets_user_id_fkey;
alter table public.ticket_comments validate constraint ticket_comments_user_id_fkey;
alter table public.ticket_upvotes validate constraint ticket_upvotes_user_id_fkey;
alter table public.account_deletion_requests validate constraint account_deletion_requests_user_id_fkey;

commit;
