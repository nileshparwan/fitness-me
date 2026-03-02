alter table public.tickets enable row level security;

drop policy if exists "tickets_update_admin_any" on public.tickets;
drop policy if exists "tickets_delete_admin_any" on public.tickets;

create policy "tickets_update_admin_any"
on public.tickets
for update
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "tickets_delete_admin_any"
on public.tickets
for delete
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);
