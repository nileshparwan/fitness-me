alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

drop policy if exists "tickets_select_public_or_own_or_admin" on public.tickets;
drop policy if exists "tickets_insert_own" on public.tickets;
drop policy if exists "tickets_update_admin_only" on public.tickets;
drop policy if exists "tickets_delete_admin_only" on public.tickets;
drop policy if exists "tickets_select_public_or_owner" on public.tickets;
drop policy if exists "tickets_update_owner_only" on public.tickets;

create policy "tickets_select_public_or_owner"
on public.tickets
for select
to authenticated
using (is_public = true or user_id = auth.uid());

create policy "tickets_insert_own"
on public.tickets
for insert
to authenticated
with check (user_id = auth.uid());

create policy "tickets_update_owner_only"
on public.tickets
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "ticket_comments_select_if_ticket_visible_or_owner_or_admin" on public.ticket_comments;
drop policy if exists "ticket_comments_insert_if_ticket_visible_or_owner_or_admin" on public.ticket_comments;
drop policy if exists "ticket_comments_delete_own_or_admin" on public.ticket_comments;
drop policy if exists "ticket_comments_select_public_ticket" on public.ticket_comments;
drop policy if exists "ticket_comments_insert_open_public_ticket" on public.ticket_comments;
drop policy if exists "ticket_comments_update_own" on public.ticket_comments;
drop policy if exists "ticket_comments_delete_own" on public.ticket_comments;

create policy "ticket_comments_select_public_ticket"
on public.ticket_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.tickets t
    where t.id = ticket_comments.ticket_id
      and (t.is_public = true or t.user_id = auth.uid())
  )
);

create policy "ticket_comments_insert_open_public_ticket"
on public.ticket_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tickets t
    where t.id = ticket_comments.ticket_id
      and (t.is_public = true or t.user_id = auth.uid())
      and t.status = 'open'
  )
);

create policy "ticket_comments_update_own"
on public.ticket_comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "ticket_comments_delete_own"
on public.ticket_comments
for delete
to authenticated
using (user_id = auth.uid());

revoke update on public.tickets from authenticated;
grant update (title, description) on public.tickets to authenticated;
