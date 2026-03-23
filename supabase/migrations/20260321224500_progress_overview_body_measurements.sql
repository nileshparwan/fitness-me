alter table public.body_measurements
  add column if not exists hips_cm numeric,
  add column if not exists chest_cm numeric,
  add column if not exists neck_cm numeric,
  add column if not exists bicep_left_cm numeric,
  add column if not exists bicep_right_cm numeric,
  add column if not exists thigh_left_cm numeric,
  add column if not exists thigh_right_cm numeric,
  add column if not exists calf_cm numeric;

update public.body_measurements
set
  bicep_left_cm = coalesce(bicep_left_cm, arms_cm),
  bicep_right_cm = coalesce(bicep_right_cm, arms_cm),
  thigh_left_cm = coalesce(thigh_left_cm, thighs_cm),
  thigh_right_cm = coalesce(thigh_right_cm, thighs_cm),
  calf_cm = coalesce(calf_cm, calves_cm)
where
  bicep_left_cm is null
  or bicep_right_cm is null
  or thigh_left_cm is null
  or thigh_right_cm is null
  or calf_cm is null;
