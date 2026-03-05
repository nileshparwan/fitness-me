begin;

-- Script-only legacy tables (no runtime usage in app/components/hooks/lib):
-- assigned_programs, daily_activity, daily_biofeedback, injuries,
-- nutrition_logs, nutrition_meals, sleep_log, vitals_log,
-- wearable_integrations, weekly_checkins.

drop table if exists public.nutrition_meals cascade;
drop table if exists public.nutrition_logs cascade;
drop table if exists public.assigned_programs cascade;
drop table if exists public.daily_activity cascade;
drop table if exists public.daily_biofeedback cascade;
drop table if exists public.injuries cascade;
drop table if exists public.sleep_log cascade;
drop table if exists public.vitals_log cascade;
drop table if exists public.wearable_integrations cascade;
drop table if exists public.weekly_checkins cascade;

commit;
