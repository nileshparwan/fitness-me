do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_category') then
    create type public.ticket_category as enum ('exercise_request', 'feature_request', 'bug_report', 'other');
  end if;
end $$;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  category public.ticket_category not null,
  status public.ticket_status not null default 'open',
  is_public boolean not null default true,
  upvotes integer not null default 1 check (upvotes >= 0),
  admin_notes text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tickets_user_id
  on public.tickets (user_id);

create index if not exists idx_tickets_public_status_upvotes
  on public.tickets (is_public, status, upvotes desc);

create index if not exists idx_tickets_category_status
  on public.tickets (category, status);

create or replace function public.set_tickets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
before update on public.tickets
for each row
execute function public.set_tickets_updated_at();

alter table public.tickets enable row level security;

drop policy if exists "tickets_select_public_or_own_or_admin" on public.tickets;
create policy "tickets_select_public_or_own_or_admin"
on public.tickets
for select
to authenticated
using (
  is_public = true
  or user_id = auth.uid()
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists "tickets_insert_own" on public.tickets;
create policy "tickets_insert_own"
on public.tickets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "tickets_update_admin_only" on public.tickets;
create policy "tickets_update_admin_only"
on public.tickets
for update
to authenticated
using (coalesce(auth.jwt() ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() ->> 'role', '') = 'admin');

drop policy if exists "tickets_delete_admin_only" on public.tickets;
create policy "tickets_delete_admin_only"
on public.tickets
for delete
to authenticated
using (coalesce(auth.jwt() ->> 'role', '') = 'admin');
