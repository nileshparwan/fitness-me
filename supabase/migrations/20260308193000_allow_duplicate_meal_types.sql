-- Allow duplicate meal-type cards in diary/planner while preserving position ordering.

alter table public.meal_group_plan_types
  drop constraint if exists meal_group_plan_types_meal_plan_id_type_key;

drop index if exists public.uq_meal_log_sections_user_day_type;
drop index if exists public.uq_meal_log_sections_client_day_type;

create index if not exists idx_meal_log_sections_user_day_type
  on public.meal_log_sections (meal_group_id, subject_user_id, performed_on, meal_type, position)
  where subject_user_id is not null;

create index if not exists idx_meal_log_sections_client_day_type
  on public.meal_log_sections (meal_group_id, subject_client_id, performed_on, meal_type, position)
  where subject_client_id is not null;
