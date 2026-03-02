create table if not exists public.ticket_upvotes (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

create index if not exists idx_ticket_upvotes_user_id
  on public.ticket_upvotes (user_id);

create or replace function public.sync_ticket_upvotes_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.tickets
    set upvotes = upvotes + 1
    where id = new.ticket_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.tickets
    set upvotes = greatest(upvotes - 1, 0)
    where id = old.ticket_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_ticket_upvotes_sync on public.ticket_upvotes;
create trigger trg_ticket_upvotes_sync
after insert or delete on public.ticket_upvotes
for each row
execute function public.sync_ticket_upvotes_count();

alter table public.ticket_upvotes enable row level security;

drop policy if exists "ticket_upvotes_select_own" on public.ticket_upvotes;
create policy "ticket_upvotes_select_own"
on public.ticket_upvotes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "ticket_upvotes_insert_own_on_open_public_ticket" on public.ticket_upvotes;
create policy "ticket_upvotes_insert_own_on_open_public_ticket"
on public.ticket_upvotes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tickets t
    where t.id = ticket_upvotes.ticket_id
      and t.is_public = true
      and t.status <> 'closed'
  )
);

drop policy if exists "ticket_upvotes_delete_own" on public.ticket_upvotes;
create policy "ticket_upvotes_delete_own"
on public.ticket_upvotes
for delete
to authenticated
using (user_id = auth.uid());
