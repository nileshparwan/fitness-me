begin;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  reason text null,
  requested_at timestamptz not null default now(),
  deleted_at timestamptz not null default now(),
  recoverable_until timestamptz not null,
  restored_at timestamptz null,
  metadata jsonb null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_account_deletion_requests_user_id
  on public.account_deletion_requests (user_id);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "Users can view own deletion requests" on public.account_deletion_requests;
create policy "Users can view own deletion requests"
  on public.account_deletion_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own deletion requests" on public.account_deletion_requests;
create policy "Users can insert own deletion requests"
  on public.account_deletion_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own deletion requests" on public.account_deletion_requests;
create policy "Users can update own deletion requests"
  on public.account_deletion_requests
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
