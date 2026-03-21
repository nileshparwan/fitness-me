begin;

-- Supplements are assignment-only (informational) and no longer use daily log rows.
drop table if exists public.supplement_logs cascade;

-- Drop schedule columns introduced for logging-era reminders.
alter table public.supplement_assignments
  drop constraint if exists supplement_assignments_time_of_day_check;

alter table public.supplement_assignments
  drop column if exists time_of_day,
  drop column if exists taken_with_food;

commit;
