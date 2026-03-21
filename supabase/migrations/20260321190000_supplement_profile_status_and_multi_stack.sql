begin;

-- Add explicit stack status used by the assigned-supplements roster.
alter table public.supplement_subject_profiles
  add column if not exists status text;

update public.supplement_subject_profiles
set status = 'active'
where status is null or btrim(status) = '';

alter table public.supplement_subject_profiles
  drop constraint if exists supplement_subject_profiles_status_check;

alter table public.supplement_subject_profiles
  add constraint supplement_subject_profiles_status_check
  check (status in ('active', 'inactive', 'archived', 'completed'));

alter table public.supplement_subject_profiles
  alter column status set default 'active';

alter table public.supplement_subject_profiles
  alter column status set not null;

-- Allow multiple supplement stacks per subject (remove one-row-per-subject indexes).
drop index if exists public.uq_supplement_subject_profiles_user;
drop index if exists public.uq_supplement_subject_profiles_client;

create index if not exists idx_supplement_subject_profiles_user_updated
  on public.supplement_subject_profiles (subject_user_id, updated_at desc)
  where subject_user_id is not null;

create index if not exists idx_supplement_subject_profiles_client_updated
  on public.supplement_subject_profiles (subject_client_id, updated_at desc)
  where subject_client_id is not null;

-- Link assignments to a concrete stack profile.
alter table public.supplement_assignments
  add column if not exists subject_profile_id uuid;

alter table public.supplement_assignments
  drop constraint if exists supplement_assignments_subject_profile_id_fkey;

alter table public.supplement_assignments
  add constraint supplement_assignments_subject_profile_id_fkey
  foreign key (subject_profile_id)
  references public.supplement_subject_profiles(id)
  on delete cascade;

-- Create a default profile for any subject with assignments but no subject profile row yet.
insert into public.supplement_subject_profiles (
  subject_user_id,
  subject_client_id,
  status,
  updated_by,
  created_at,
  updated_at
)
select
  sa.subject_user_id,
  null,
  'active',
  (
    array_agg(sa.assigned_by order by sa.updated_at desc nulls last, sa.created_at desc nulls last)
    filter (where sa.assigned_by is not null)
  )[1],
  coalesce(min(sa.created_at), now()),
  coalesce(max(sa.updated_at), now())
from public.supplement_assignments sa
where sa.subject_profile_id is null
  and sa.subject_user_id is not null
  and sa.subject_client_id is null
  and not exists (
    select 1
    from public.supplement_subject_profiles sp
    where sp.subject_user_id = sa.subject_user_id
      and sp.subject_client_id is null
  )
group by sa.subject_user_id;

insert into public.supplement_subject_profiles (
  subject_user_id,
  subject_client_id,
  status,
  updated_by,
  created_at,
  updated_at
)
select
  null,
  sa.subject_client_id,
  'active',
  (
    array_agg(sa.assigned_by order by sa.updated_at desc nulls last, sa.created_at desc nulls last)
    filter (where sa.assigned_by is not null)
  )[1],
  coalesce(min(sa.created_at), now()),
  coalesce(max(sa.updated_at), now())
from public.supplement_assignments sa
where sa.subject_profile_id is null
  and sa.subject_client_id is not null
  and sa.subject_user_id is null
  and not exists (
    select 1
    from public.supplement_subject_profiles sp
    where sp.subject_client_id = sa.subject_client_id
      and sp.subject_user_id is null
  )
group by sa.subject_client_id;

-- Map legacy assignments to the most recently updated profile for that subject.
update public.supplement_assignments sa
set subject_profile_id = sp.id
from public.supplement_subject_profiles sp
where sa.subject_profile_id is null
  and sa.subject_user_id is not null
  and sa.subject_client_id is null
  and sp.subject_user_id = sa.subject_user_id
  and sp.subject_client_id is null
  and sp.id = (
    select sp2.id
    from public.supplement_subject_profiles sp2
    where sp2.subject_user_id = sa.subject_user_id
      and sp2.subject_client_id is null
    order by sp2.updated_at desc, sp2.created_at desc, sp2.id desc
    limit 1
  );

update public.supplement_assignments sa
set subject_profile_id = sp.id
from public.supplement_subject_profiles sp
where sa.subject_profile_id is null
  and sa.subject_client_id is not null
  and sa.subject_user_id is null
  and sp.subject_client_id = sa.subject_client_id
  and sp.subject_user_id is null
  and sp.id = (
    select sp2.id
    from public.supplement_subject_profiles sp2
    where sp2.subject_client_id = sa.subject_client_id
      and sp2.subject_user_id is null
    order by sp2.updated_at desc, sp2.created_at desc, sp2.id desc
    limit 1
  );

alter table public.supplement_assignments
  alter column subject_profile_id set not null;

alter table public.supplement_assignments
  drop constraint if exists supplement_assignments_user_supplement_unique,
  drop constraint if exists supplement_assignments_client_supplement_unique,
  drop constraint if exists supplement_assignments_profile_supplement_unique;

alter table public.supplement_assignments
  add constraint supplement_assignments_profile_supplement_unique
  unique (subject_profile_id, supplement_id)
  deferrable initially deferred;

create index if not exists idx_supplement_assignments_subject_profile
  on public.supplement_assignments (subject_profile_id, is_active);

commit;
