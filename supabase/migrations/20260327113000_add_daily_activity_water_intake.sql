alter table public.daily_activity
  add column if not exists water_intake_ml integer;
