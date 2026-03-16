-- Settings persistence now uses auth.users.user_metadata.
-- Keep profile schema clean from legacy settings columns.
alter table public.profiles
  drop column if exists phone,
  drop column if exists compact_mode,
  drop column if exists default_calories,
  drop column if exists default_protein,
  drop column if exists default_carbs,
  drop column if exists default_fat;
