create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_comments_ticket_created_at
  on public.ticket_comments (ticket_id, created_at desc);

create index if not exists idx_ticket_comments_user_id
  on public.ticket_comments (user_id);

alter table public.ticket_comments enable row level security;

drop policy if exists "ticket_comments_select_if_ticket_visible_or_owner_or_admin" on public.ticket_comments;
create policy "ticket_comments_select_if_ticket_visible_or_owner_or_admin"
on public.ticket_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.tickets t
    where t.id = ticket_comments.ticket_id
      and (
        t.is_public = true
        or t.user_id = auth.uid()
        or coalesce(auth.jwt() ->> 'role', '') = 'admin'
      )
  )
);

drop policy if exists "ticket_comments_insert_if_ticket_visible_or_owner_or_admin" on public.ticket_comments;
create policy "ticket_comments_insert_if_ticket_visible_or_owner_or_admin"
on public.ticket_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tickets t
    where t.id = ticket_comments.ticket_id
      and (
        t.is_public = true
        or t.user_id = auth.uid()
        or coalesce(auth.jwt() ->> 'role', '') = 'admin'
      )
  )
);

drop policy if exists "ticket_comments_delete_own_or_admin" on public.ticket_comments;
create policy "ticket_comments_delete_own_or_admin"
on public.ticket_comments
for delete
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);
