-- Nutrition dashboard read-path indexes for diary totals and active-plan resolution.

-- meal_logs: primary filter for dashboard (subject_user_id + date)
create index if not exists idx_meal_logs_user_date
  on public.meal_logs (subject_user_id, performed_on desc)
  where subject_user_id is not null;

-- meal_logs: same for client-subject queries
create index if not exists idx_meal_logs_client_date
  on public.meal_logs (subject_client_id, performed_on desc)
  where subject_client_id is not null;

-- meal_log_items: items lookup by parent log ID
create index if not exists idx_meal_log_items_log_id
  on public.meal_log_items (meal_log_id);

-- meal_plan_assignments: active plan lookup by subject + date range
create index if not exists idx_meal_plan_assignments_user_active
  on public.meal_plan_assignments (subject_user_id, status, start_date, end_date)
  where subject_user_id is not null;

create index if not exists idx_meal_plan_assignments_client_active
  on public.meal_plan_assignments (subject_client_id, status, start_date, end_date)
  where subject_client_id is not null;

-- meal_plans: fallback plan lookup (used when no assignment exists)
create index if not exists idx_meal_plans_user_active
  on public.meal_plans (subject_user_id, status, start_date, end_date)
  where subject_user_id is not null;
