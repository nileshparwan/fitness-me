begin;

alter table if exists public.clients
  drop column if exists timezone;

alter table if exists public.meal_logs
  drop column if exists timezone;

alter table if exists public.meal_plan_assignments
  drop column if exists timezone;

alter table if exists public.meal_plans
  drop column if exists timezone;

commit;
