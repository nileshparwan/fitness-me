begin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_status') then
    create type public.client_status as enum ('active', 'paused', 'blocked', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'coach_assignment_role') then
    create type public.coach_assignment_role as enum ('primary', 'assistant');
  end if;
  if not exists (select 1 from pg_type where typname = 'session_slot') then
    create type public.session_slot as enum ('morning', 'afternoon', 'evening', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'session_location_type') then
    create type public.session_location_type as enum ('gym', 'home', 'outdoor', 'travel', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'client_checkin_status') then
    create type public.client_checkin_status as enum ('pending', 'reviewed', 'actioned');
  end if;
  if not exists (select 1 from pg_type where typname = 'coach_note_tag') then
    create type public.coach_note_tag as enum ('injury', 'nutrition', 'psychology', 'form', 'milestone', 'programming');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'other');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Common trigger function
-- ---------------------------------------------------------------------------
create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Coaching domain tables
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  primary_coach_id uuid not null references public.profiles(id) on delete restrict,
  linked_user_id uuid null unique references public.profiles(id) on delete set null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  first_name text not null,
  last_name text null,
  display_name text null,
  email text null,
  phone text null,
  timezone text not null default 'UTC',
  date_of_birth date null,
  sex text null,
  height_cm numeric(6,2) null,
  weight_kg numeric(6,2) null,
  status public.client_status not null default 'active',
  goals text null,
  medical_flags text null,
  notes text null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_primary_coach_status
  on public.clients (primary_coach_id, status);
create index if not exists idx_clients_linked_user
  on public.clients (linked_user_id);

create table if not exists public.coach_client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  role public.coach_assignment_role not null default 'assistant',
  permissions text[] not null default array['profile', 'goals', 'plans', 'checkins', 'logs', 'notes', 'payments'],
  is_active boolean not null default true,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, coach_id)
);

create index if not exists idx_coach_client_assignments_coach_active
  on public.coach_client_assignments (coach_id, is_active);

create table if not exists public.coach_plan_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text null,
  tags text[] null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coach_plan_templates_coach
  on public.coach_plan_templates (coach_id, is_archived);

create table if not exists public.coach_plan_template_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.coach_plan_templates(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  title text not null,
  session_type text not null default 'mixed',
  notes text null,
  default_slot public.session_slot not null default 'other',
  estimated_duration_minutes integer null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, sequence_no)
);

create table if not exists public.client_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid null references public.coach_plan_templates(id) on delete set null,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  assigned_at timestamptz not null default now(),
  started_on date null,
  ended_on date null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_client_plan_assignments_one_active
  on public.client_plan_assignments (client_id)
  where status = 'active';

create index if not exists idx_client_plan_assignments_client_status
  on public.client_plan_assignments (client_id, status);

create table if not exists public.client_plan_assignment_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.client_plan_assignments(id) on delete cascade,
  template_session_id uuid null references public.coach_plan_template_sessions(id) on delete set null,
  sequence_no integer not null check (sequence_no > 0),
  title text not null,
  session_type text not null default 'mixed',
  notes text null,
  default_slot public.session_slot not null default 'other',
  estimated_duration_minutes integer null,
  metadata jsonb not null default '{}'::jsonb,
  is_skipped boolean not null default false,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, sequence_no)
);

create table if not exists public.client_checkins (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid null references public.profiles(id) on delete set null,
  subject_client_id uuid null references public.clients(id) on delete set null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  status public.client_checkin_status not null default 'pending',
  urgent boolean not null default false,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  actioned_at timestamptz null,
  checkin_data jsonb not null default '{}'::jsonb,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_checkins_subject_xor check (
    ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
  )
);

create index if not exists idx_client_checkins_subject_user_date
  on public.client_checkins (subject_user_id, submitted_at desc);
create index if not exists idx_client_checkins_subject_client_date
  on public.client_checkins (subject_client_id, submitted_at desc);

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  tag public.coach_note_tag not null default 'programming',
  title text null,
  content text not null,
  is_shared_with_linked_user boolean not null default false,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coach_notes_client_created
  on public.coach_notes (client_id, created_at desc);

create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  method public.payment_method not null default 'bank_transfer',
  payment_date date not null default current_date,
  period_start date null,
  period_end date null,
  status public.payment_status not null default 'pending',
  notes text null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_payments_client_date
  on public.client_payments (client_id, payment_date desc);
create index if not exists idx_client_payments_coach_status
  on public.client_payments (coach_id, status);

create or replace function public.prevent_client_payment_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Payments cannot be deleted. Archive the payment instead.';
end;
$$;

drop trigger if exists trg_client_payments_no_delete on public.client_payments;
create trigger trg_client_payments_no_delete
before delete on public.client_payments
for each row
execute function public.prevent_client_payment_delete();

-- ---------------------------------------------------------------------------
-- Extend training sessions for multi-subject and day timeline
-- ---------------------------------------------------------------------------
alter table public.training_sessions
  add column if not exists performed_on date,
  add column if not exists started_at timestamptz null,
  add column if not exists completed_at timestamptz null,
  add column if not exists session_slot public.session_slot,
  add column if not exists session_label text null,
  add column if not exists created_by_user_id uuid null references public.profiles(id) on delete set null,
  add column if not exists subject_user_id uuid null references public.profiles(id) on delete set null,
  add column if not exists subject_client_id uuid null references public.clients(id) on delete set null,
  add column if not exists plan_assignment_id uuid null references public.client_plan_assignments(id) on delete set null,
  add column if not exists plan_session_id uuid null references public.client_plan_assignment_sessions(id) on delete set null,
  add column if not exists location_type public.session_location_type null,
  add column if not exists location_label text null,
  add column if not exists location_address text null,
  add column if not exists location_notes text null;

update public.training_sessions
set performed_on = coalesce(performed_on, date::date),
    created_by_user_id = coalesce(created_by_user_id, user_id),
    subject_user_id = coalesce(subject_user_id, user_id),
    session_slot = coalesce(session_slot, 'other'::public.session_slot)
where performed_on is null
   or created_by_user_id is null
   or subject_user_id is null
   or session_slot is null;

alter table public.training_sessions
  alter column performed_on set default current_date,
  alter column performed_on set not null,
  alter column created_by_user_id set not null,
  alter column session_slot set default 'other'::public.session_slot,
  alter column session_slot set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'training_sessions_subject_xor'
      and conrelid = 'public.training_sessions'::regclass
  ) then
    alter table public.training_sessions
      add constraint training_sessions_subject_xor check (
        ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
      );
  end if;
end $$;

create index if not exists idx_training_sessions_subject_user_performed_on
  on public.training_sessions (subject_user_id, performed_on desc);
create index if not exists idx_training_sessions_subject_client_performed_on
  on public.training_sessions (subject_client_id, performed_on desc);
create index if not exists idx_training_sessions_plan_assignment_session
  on public.training_sessions (plan_assignment_id, plan_session_id);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  rel text;
begin
  foreach rel in array array[
    'clients',
    'coach_client_assignments',
    'coach_plan_templates',
    'coach_plan_template_sessions',
    'client_plan_assignments',
    'client_plan_assignment_sessions',
    'client_checkins',
    'coach_notes',
    'client_payments'
  ]
  loop
    execute format('drop trigger if exists trg_%I_set_updated_at on public.%I', rel, rel);
    execute format(
      'create trigger trg_%I_set_updated_at before update on public.%I for each row execute function public.trigger_set_updated_at()',
      rel,
      rel
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Access helper functions
-- ---------------------------------------------------------------------------
create or replace function public.has_client_coach_access(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sysadmin()
    or exists (
      select 1
      from public.clients c
      where c.id = target_client_id
        and c.primary_coach_id = auth.uid()
        and c.is_archived = false
    )
    or exists (
      select 1
      from public.coach_client_assignments a
      where a.client_id = target_client_id
        and a.coach_id = auth.uid()
        and a.is_active = true
    );
$$;

create or replace function public.is_client_primary_coach(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sysadmin()
    or exists (
      select 1
      from public.clients c
      where c.id = target_client_id
        and c.primary_coach_id = auth.uid()
    );
$$;

grant execute on function public.has_client_coach_access(uuid) to authenticated;
grant execute on function public.is_client_primary_coach(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.coach_client_assignments enable row level security;
alter table public.coach_plan_templates enable row level security;
alter table public.coach_plan_template_sessions enable row level security;
alter table public.client_plan_assignments enable row level security;
alter table public.client_plan_assignment_sessions enable row level security;
alter table public.client_checkins enable row level security;
alter table public.coach_notes enable row level security;
alter table public.client_payments enable row level security;
alter table public.training_sessions enable row level security;
alter table public.strength_sets enable row level security;
alter table public.cardio_sessions enable row level security;

do $$
declare
  rel text;
  pol record;
begin
  foreach rel in array array[
    'clients',
    'coach_client_assignments',
    'coach_plan_templates',
    'coach_plan_template_sessions',
    'client_plan_assignments',
    'client_plan_assignment_sessions',
    'client_checkins',
    'coach_notes',
    'client_payments'
  ]
  loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = rel
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, rel);
    end loop;
  end loop;
end $$;

drop policy if exists training_sessions_select_owner_or_admin on public.training_sessions;
drop policy if exists training_sessions_write_owner_or_admin on public.training_sessions;
drop policy if exists strength_sets_select_owner_or_admin on public.strength_sets;
drop policy if exists strength_sets_write_owner_or_admin on public.strength_sets;
drop policy if exists cardio_sessions_select_owner_or_admin on public.cardio_sessions;
drop policy if exists cardio_sessions_write_owner_or_admin on public.cardio_sessions;

create policy clients_select_access on public.clients
for select to authenticated
using (
  public.has_client_coach_access(id)
  or linked_user_id = auth.uid()
);

create policy clients_insert_coach on public.clients
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and (primary_coach_id = auth.uid() or public.is_sysadmin())
);

create policy clients_update_coach on public.clients
for update to authenticated
using (public.has_client_coach_access(id))
with check (public.has_client_coach_access(id));

create policy clients_delete_sysadmin on public.clients
for delete to authenticated
using (public.is_sysadmin());

create policy coach_client_assignments_select_access on public.coach_client_assignments
for select to authenticated
using (public.has_client_coach_access(client_id));

create policy coach_client_assignments_insert_primary_or_admin on public.coach_client_assignments
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.is_client_primary_coach(client_id)
);

create policy coach_client_assignments_update_primary_or_admin on public.coach_client_assignments
for update to authenticated
using (public.is_client_primary_coach(client_id))
with check (public.is_client_primary_coach(client_id));

create policy coach_client_assignments_delete_primary_or_admin on public.coach_client_assignments
for delete to authenticated
using (public.is_client_primary_coach(client_id));

create policy coach_plan_templates_select_owner_or_admin on public.coach_plan_templates
for select to authenticated
using (coach_id = auth.uid() or public.is_sysadmin());

create policy coach_plan_templates_insert_owner_or_admin on public.coach_plan_templates
for insert to authenticated
with check (coach_id = auth.uid() or public.is_sysadmin());

create policy coach_plan_templates_update_owner_or_admin on public.coach_plan_templates
for update to authenticated
using (coach_id = auth.uid() or public.is_sysadmin())
with check (coach_id = auth.uid() or public.is_sysadmin());

create policy coach_plan_templates_delete_owner_or_admin on public.coach_plan_templates
for delete to authenticated
using (coach_id = auth.uid() or public.is_sysadmin());

create policy coach_plan_template_sessions_select_owner_or_admin on public.coach_plan_template_sessions
for select to authenticated
using (
  exists (
    select 1
    from public.coach_plan_templates t
    where t.id = coach_plan_template_sessions.template_id
      and (t.coach_id = auth.uid() or public.is_sysadmin())
  )
);

create policy coach_plan_template_sessions_write_owner_or_admin on public.coach_plan_template_sessions
for all to authenticated
using (
  exists (
    select 1
    from public.coach_plan_templates t
    where t.id = coach_plan_template_sessions.template_id
      and (t.coach_id = auth.uid() or public.is_sysadmin())
  )
)
with check (
  exists (
    select 1
    from public.coach_plan_templates t
    where t.id = coach_plan_template_sessions.template_id
      and (t.coach_id = auth.uid() or public.is_sysadmin())
  )
);

create policy client_plan_assignments_select_access on public.client_plan_assignments
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or exists (
    select 1 from public.clients c
    where c.id = client_plan_assignments.client_id
      and c.linked_user_id = auth.uid()
  )
);

create policy client_plan_assignments_write_access on public.client_plan_assignments
for all to authenticated
using (public.has_client_coach_access(client_id))
with check (public.has_client_coach_access(client_id));

create policy client_plan_assignment_sessions_select_access on public.client_plan_assignment_sessions
for select to authenticated
using (
  exists (
    select 1
    from public.client_plan_assignments a
    left join public.clients c on c.id = a.client_id
    where a.id = client_plan_assignment_sessions.assignment_id
      and (
        public.has_client_coach_access(a.client_id)
        or c.linked_user_id = auth.uid()
      )
  )
);

create policy client_plan_assignment_sessions_write_access on public.client_plan_assignment_sessions
for all to authenticated
using (
  exists (
    select 1
    from public.client_plan_assignments a
    where a.id = client_plan_assignment_sessions.assignment_id
      and public.has_client_coach_access(a.client_id)
  )
)
with check (
  exists (
    select 1
    from public.client_plan_assignments a
    where a.id = client_plan_assignment_sessions.assignment_id
      and public.has_client_coach_access(a.client_id)
  )
);

create policy client_checkins_select_access on public.client_checkins
for select to authenticated
using (
  public.is_sysadmin()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
  or exists (
    select 1 from public.clients c
    where c.id = client_checkins.subject_client_id
      and c.linked_user_id = auth.uid()
  )
);

create policy client_checkins_insert_access on public.client_checkins
for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    subject_user_id = auth.uid()
    or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
  )
);

create policy client_checkins_update_access on public.client_checkins
for update to authenticated
using (
  public.is_sysadmin()
  or created_by_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
)
with check (
  public.is_sysadmin()
  or created_by_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

create policy coach_notes_select_access on public.coach_notes
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or (
    is_shared_with_linked_user = true
    and exists (
      select 1 from public.clients c
      where c.id = coach_notes.client_id
        and c.linked_user_id = auth.uid()
    )
  )
);

create policy coach_notes_insert_access on public.coach_notes
for insert to authenticated
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

create policy coach_notes_update_access on public.coach_notes
for update to authenticated
using (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
)
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

create policy client_payments_select_access on public.client_payments
for select to authenticated
using (
  public.has_client_coach_access(client_id)
  or exists (
    select 1 from public.clients c
    where c.id = client_payments.client_id
      and c.linked_user_id = auth.uid()
  )
);

create policy client_payments_insert_access on public.client_payments
for insert to authenticated
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

create policy client_payments_update_access on public.client_payments
for update to authenticated
using (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
)
with check (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);

create policy training_sessions_select_subject_or_coach on public.training_sessions
for select to authenticated
using (
  public.is_sysadmin()
  or user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

create policy training_sessions_insert_subject_or_coach on public.training_sessions
for insert to authenticated
with check (
  public.is_sysadmin()
  or (
    created_by_user_id = auth.uid()
    and (
      subject_user_id = auth.uid()
      or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
    )
  )
);

create policy training_sessions_update_subject_or_coach on public.training_sessions
for update to authenticated
using (
  public.is_sysadmin()
  or created_by_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
)
with check (
  public.is_sysadmin()
  or created_by_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

create policy training_sessions_delete_subject_or_coach on public.training_sessions
for delete to authenticated
using (
  public.is_sysadmin()
  or created_by_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

create policy strength_sets_select_subject_or_coach on public.strength_sets
for select to authenticated
using (
  exists (
    select 1
    from public.training_sessions ts
    where ts.id = strength_sets.workout_id
      and (
        public.is_sysadmin()
        or ts.user_id = auth.uid()
        or ts.subject_user_id = auth.uid()
        or (ts.subject_client_id is not null and public.has_client_coach_access(ts.subject_client_id))
      )
  )
);

create policy strength_sets_write_subject_or_coach on public.strength_sets
for all to authenticated
using (
  exists (
    select 1
    from public.training_sessions ts
    where ts.id = strength_sets.workout_id
      and (
        public.is_sysadmin()
        or ts.created_by_user_id = auth.uid()
        or ts.subject_user_id = auth.uid()
        or (ts.subject_client_id is not null and public.has_client_coach_access(ts.subject_client_id))
      )
  )
)
with check (
  exists (
    select 1
    from public.training_sessions ts
    where ts.id = strength_sets.workout_id
      and (
        public.is_sysadmin()
        or ts.created_by_user_id = auth.uid()
        or ts.subject_user_id = auth.uid()
        or (ts.subject_client_id is not null and public.has_client_coach_access(ts.subject_client_id))
      )
  )
);

create policy cardio_sessions_select_subject_or_coach on public.cardio_sessions
for select to authenticated
using (
  exists (
    select 1
    from public.training_sessions ts
    where ts.id = cardio_sessions.workout_id
      and (
        public.is_sysadmin()
        or ts.user_id = auth.uid()
        or ts.subject_user_id = auth.uid()
        or (ts.subject_client_id is not null and public.has_client_coach_access(ts.subject_client_id))
      )
  )
);

create policy cardio_sessions_write_subject_or_coach on public.cardio_sessions
for all to authenticated
using (
  exists (
    select 1
    from public.training_sessions ts
    where ts.id = cardio_sessions.workout_id
      and (
        public.is_sysadmin()
        or ts.created_by_user_id = auth.uid()
        or ts.subject_user_id = auth.uid()
        or (ts.subject_client_id is not null and public.has_client_coach_access(ts.subject_client_id))
      )
  )
)
with check (
  exists (
    select 1
    from public.training_sessions ts
    where ts.id = cardio_sessions.workout_id
      and (
        public.is_sysadmin()
        or ts.created_by_user_id = auth.uid()
        or ts.subject_user_id = auth.uid()
        or (ts.subject_client_id is not null and public.has_client_coach_access(ts.subject_client_id))
      )
  )
);

commit;
