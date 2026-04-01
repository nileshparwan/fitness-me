alter table if exists public.body_measurements
  drop column if exists arms_cm,
  drop column if exists thighs_cm,
  drop column if exists calves_cm;
