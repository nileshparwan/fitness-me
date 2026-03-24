begin;

alter table if exists public.body_measurements
  add column if not exists subject_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists subject_client_id uuid references public.clients(id) on delete cascade;

alter table if exists public.body_measurements
  alter column user_id drop not null;

update public.body_measurements
set subject_user_id = user_id
where subject_user_id is null
  and subject_client_id is null
  and user_id is not null;

alter table public.body_measurements
  drop constraint if exists body_measurements_subject_check;

alter table public.body_measurements
  add constraint body_measurements_subject_check
  check (
    ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
  );

create unique index if not exists uq_body_measurements_subject_user_date
  on public.body_measurements (subject_user_id, date)
  where subject_user_id is not null and subject_client_id is null;

create unique index if not exists uq_body_measurements_subject_client_date
  on public.body_measurements (subject_client_id, date)
  where subject_client_id is not null and subject_user_id is null;

create index if not exists body_measurements_subject_user_idx
  on public.body_measurements (subject_user_id, date desc)
  where subject_user_id is not null;

create index if not exists body_measurements_subject_client_idx
  on public.body_measurements (subject_client_id, date desc)
  where subject_client_id is not null;

alter table public.body_measurements enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'body_measurements'
  loop
    execute format('drop policy if exists %I on public.body_measurements', pol.policyname);
  end loop;
end $$;

create policy body_measurements_subject_access
on public.body_measurements
for all
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
)
with check (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

commit;
