begin;

-- Allow editing all visible supplements (global + owned) from catalog UI.
drop policy if exists supplement_catalog_update_owner on public.supplement_catalog;
drop policy if exists supplement_catalog_update_visible on public.supplement_catalog;
create policy supplement_catalog_update_visible
on public.supplement_catalog
for update
to authenticated
using (
  is_global = true
  or owner_user_id = auth.uid()
  or public.is_sysadmin()
)
with check (
  (
    is_global = true
    and owner_user_id is null
  )
  or (
    is_global = false
    and owner_user_id = auth.uid()
  )
  or public.is_sysadmin()
);

-- Remove manual-date dependency for supplement logs.
alter table public.supplement_logs
  alter column performed_on set default (now()::date);

alter table public.supplement_logs
  add column if not exists updated_at timestamptz;

update public.supplement_logs
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.supplement_logs
  alter column updated_at set default now();

alter table public.supplement_logs
  alter column updated_at set not null;

drop trigger if exists trg_supplement_logs_set_updated_at on public.supplement_logs;
create trigger trg_supplement_logs_set_updated_at
before update on public.supplement_logs
for each row execute function public.trigger_set_updated_at();

commit;
