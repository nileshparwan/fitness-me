-- Session-based billing plans and payment logs for coach tools.

-- ---------------------------------------------------------------------------
-- billing_type enum
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'billing_type') then
    create type public.billing_type as enum (
      'per_session',
      'session_package',
      'monthly',
      'program',
      'hourly'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- client_billing_plans
-- ---------------------------------------------------------------------------
create table if not exists public.client_billing_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete restrict,

  billing_type public.billing_type not null default 'per_session',
  session_rate numeric(12,2) not null check (session_rate > 0),
  currency text not null default 'USD' check (char_length(currency) between 3 and 8),
  payment_method public.payment_method not null default 'cash',

  sessions_purchased integer not null default 0 check (sessions_purchased >= 0),
  sessions_used integer not null default 0 check (sessions_used >= 0),

  monthly_amount numeric(12,2) check (monthly_amount > 0 or monthly_amount is null),
  billing_cycle_day integer check (billing_cycle_day between 1 and 28 or billing_cycle_day is null),

  program_start_date date,
  program_end_date date,

  is_active boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_billing_plans_sessions_used_le_purchased check (sessions_used <= sessions_purchased),
  constraint client_billing_plans_program_dates_order check (
    program_end_date is null
    or program_start_date is null
    or program_end_date > program_start_date
  )
);

create unique index if not exists idx_client_billing_plans_active
  on public.client_billing_plans (client_id)
  where is_active = true;

create index if not exists idx_client_billing_plans_coach
  on public.client_billing_plans (coach_id);

create index if not exists idx_client_billing_plans_active_coach
  on public.client_billing_plans (coach_id)
  where is_active = true;

drop trigger if exists trg_client_billing_plans_set_updated_at on public.client_billing_plans;
create trigger trg_client_billing_plans_set_updated_at
before update on public.client_billing_plans
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payment_logs
-- ---------------------------------------------------------------------------
create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  billing_plan_id uuid references public.client_billing_plans(id) on delete set null,

  session_date date not null default current_date,
  amount numeric(12,2),
  session_rate_snapshot numeric(12,2) not null,
  sessions_remaining_after integer,
  billing_type_snapshot public.billing_type not null,

  status text not null default 'logged' check (status in ('logged', 'confirmed', 'voided')),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint unique_client_session_date unique (client_id, session_date)
);

create index if not exists idx_payment_logs_coach_date
  on public.payment_logs (coach_id, session_date desc);

create index if not exists idx_payment_logs_client_date
  on public.payment_logs (client_id, session_date desc);

create index if not exists idx_payment_logs_billing_plan
  on public.payment_logs (billing_plan_id)
  where billing_plan_id is not null;

drop trigger if exists trg_payment_logs_set_updated_at on public.payment_logs;
create trigger trg_payment_logs_set_updated_at
before update on public.payment_logs
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.client_billing_plans enable row level security;
alter table public.payment_logs enable row level security;

drop policy if exists client_billing_plans_select_access on public.client_billing_plans;
create policy client_billing_plans_select_access on public.client_billing_plans
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or exists (
    select 1 from public.clients c
    where c.id = client_billing_plans.client_id
      and c.linked_user_id = auth.uid()
  )
);

drop policy if exists client_billing_plans_insert_access on public.client_billing_plans;
create policy client_billing_plans_insert_access on public.client_billing_plans
for insert to authenticated
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

drop policy if exists client_billing_plans_update_access on public.client_billing_plans;
create policy client_billing_plans_update_access on public.client_billing_plans
for update to authenticated
using (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
)
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

drop policy if exists client_billing_plans_delete_access on public.client_billing_plans;
create policy client_billing_plans_delete_access on public.client_billing_plans
for delete to authenticated
using (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

drop policy if exists payment_logs_select_access on public.payment_logs;
create policy payment_logs_select_access on public.payment_logs
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or exists (
    select 1 from public.clients c
    where c.id = payment_logs.client_id
      and c.linked_user_id = auth.uid()
  )
);

drop policy if exists payment_logs_insert_access on public.payment_logs;
create policy payment_logs_insert_access on public.payment_logs
for insert to authenticated
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

drop policy if exists payment_logs_update_access on public.payment_logs;
create policy payment_logs_update_access on public.payment_logs
for update to authenticated
using (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
)
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

drop policy if exists payment_logs_delete_access on public.payment_logs;
create policy payment_logs_delete_access on public.payment_logs
for delete to authenticated
using (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);
