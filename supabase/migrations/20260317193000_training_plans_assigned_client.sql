-- Program ownership remains with the coach (`training_plans.user_id`).
-- Assignment targets a coach-owned client.
alter table public.training_plans
  add column if not exists assigned_client_id uuid null references public.clients(id) on delete set null;

create index if not exists idx_training_plans_assigned_client
  on public.training_plans (assigned_client_id, updated_at desc)
  where assigned_client_id is not null;
