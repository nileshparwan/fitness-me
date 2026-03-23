begin;

-- ---------------------------------------------------------------------------
-- Workout execution model (explicit adherence logs)
-- ---------------------------------------------------------------------------

create table if not exists public.workout_executions (
  id uuid primary key default gen_random_uuid(),
  template_workout_id uuid null references public.training_sessions(id) on delete set null,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  subject_user_id uuid null references public.profiles(id) on delete set null,
  subject_client_id uuid null references public.clients(id) on delete set null,
  performed_on date not null,
  logged_at timestamptz not null default now(),
  source text not null default 'quick_log',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject_key text generated always as (
    case
      when subject_user_id is not null then 'user:' || subject_user_id::text
      else 'client:' || subject_client_id::text
    end
  ) stored,
  constraint workout_executions_subject_xor check (
    ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
  ),
  constraint workout_executions_source_check check (
    source in (
      'quick_log',
      'session_create',
      'session_backfill',
      'coach_log',
      'client_portal'
    )
  )
);

create index if not exists idx_workout_executions_subject_user_performed_on
  on public.workout_executions (subject_user_id, performed_on desc);

create index if not exists idx_workout_executions_subject_client_performed_on
  on public.workout_executions (subject_client_id, performed_on desc);

create index if not exists idx_workout_executions_template_performed_on
  on public.workout_executions (template_workout_id, performed_on desc);

create index if not exists idx_workout_executions_actor_performed_on
  on public.workout_executions (actor_user_id, performed_on desc);

create unique index if not exists idx_workout_executions_quick_log_dedupe
  on public.workout_executions (template_workout_id, performed_on, subject_key)
  where source = 'quick_log' and template_workout_id is not null;

create table if not exists public.workout_execution_exercises (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.workout_executions(id) on delete cascade,
  exercise_id uuid null references public.exercise_catalog(id) on delete set null,
  exercise_name text not null,
  exercise_type text not null,
  volume_kg numeric null,
  distance_km numeric null,
  duration_minutes integer null,
  created_at timestamptz not null default now(),
  constraint workout_execution_exercises_type_check check (exercise_type in ('strength', 'cardio'))
);

create unique index if not exists idx_workout_execution_exercises_unique
  on public.workout_execution_exercises (
    execution_id,
    exercise_type,
    coalesce(exercise_id::text, lower(trim(exercise_name)))
  );

create index if not exists idx_workout_execution_exercises_execution
  on public.workout_execution_exercises (execution_id);

create index if not exists idx_workout_execution_exercises_exercise
  on public.workout_execution_exercises (exercise_id);

alter table public.strength_sets
  add column if not exists execution_id uuid null references public.workout_executions(id) on delete set null;

alter table public.cardio_sessions
  add column if not exists execution_id uuid null references public.workout_executions(id) on delete set null;

create index if not exists idx_strength_sets_execution_exercise
  on public.strength_sets (execution_id, exercise_id);

create index if not exists idx_cardio_sessions_execution_activity
  on public.cardio_sessions (execution_id, activity_type);

-- ---------------------------------------------------------------------------
-- Materialized PR table
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_prs (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid null references public.profiles(id) on delete set null,
  subject_client_id uuid null references public.clients(id) on delete set null,
  exercise_id uuid null references public.exercise_catalog(id) on delete set null,
  exercise_name text not null,
  best_estimated_1rm_kg numeric not null,
  best_weight_kg numeric null,
  best_reps integer null,
  best_set_date date null,
  best_set_at timestamptz null,
  source_set_id uuid null references public.strength_sets(id) on delete set null,
  source_execution_id uuid null references public.workout_executions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject_key text generated always as (
    case
      when subject_user_id is not null then 'user:' || subject_user_id::text
      else 'client:' || subject_client_id::text
    end
  ) stored,
  exercise_key text generated always as (
    case
      when exercise_id is not null then exercise_id::text
      else lower(trim(exercise_name))
    end
  ) stored,
  constraint exercise_prs_subject_xor check (
    ((subject_user_id is not null)::int + (subject_client_id is not null)::int) = 1
  ),
  constraint exercise_prs_subject_exercise_unique unique (subject_key, exercise_key)
);

create index if not exists idx_exercise_prs_subject_user
  on public.exercise_prs (subject_user_id, updated_at desc);

create index if not exists idx_exercise_prs_subject_client
  on public.exercise_prs (subject_client_id, updated_at desc);

create index if not exists idx_exercise_prs_best_1rm
  on public.exercise_prs (best_estimated_1rm_kg desc);

-- ---------------------------------------------------------------------------
-- Trigger: set updated_at
-- ---------------------------------------------------------------------------

drop trigger if exists trg_workout_executions_set_updated_at on public.workout_executions;
create trigger trg_workout_executions_set_updated_at
before update on public.workout_executions
for each row execute function public.trigger_set_updated_at();

drop trigger if exists trg_exercise_prs_set_updated_at on public.exercise_prs;
create trigger trg_exercise_prs_set_updated_at
before update on public.exercise_prs
for each row execute function public.trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: keep PRs in sync when strength sets are inserted/updated
-- ---------------------------------------------------------------------------

create or replace function public.sync_exercise_pr_from_strength_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_user_id uuid;
  v_subject_client_id uuid;
  v_performed_on date;
  v_est_1rm numeric;
  v_name text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  v_name := trim(coalesce(new.exercise_name, ''));
  if v_name = '' then
    return new;
  end if;

  v_est_1rm := coalesce(
    new.calculated_1rm,
    case
      when coalesce(new.reps, 0) > 0 and coalesce(new.weight, 0) > 0
        then new.weight * (1 + (new.reps / 30.0))
      else null
    end
  );

  if v_est_1rm is null or v_est_1rm <= 0 then
    return new;
  end if;

  select ts.subject_user_id, ts.subject_client_id, ts.performed_on
  into v_subject_user_id, v_subject_client_id, v_performed_on
  from public.training_sessions ts
  where ts.id = new.workout_id;

  if v_subject_user_id is null and v_subject_client_id is null then
    return new;
  end if;

  insert into public.exercise_prs (
    subject_user_id,
    subject_client_id,
    exercise_id,
    exercise_name,
    best_estimated_1rm_kg,
    best_weight_kg,
    best_reps,
    best_set_date,
    best_set_at,
    source_set_id,
    source_execution_id,
    created_at,
    updated_at
  )
  values (
    v_subject_user_id,
    v_subject_client_id,
    new.exercise_id,
    v_name,
    round(v_est_1rm::numeric, 2),
    new.weight,
    new.reps,
    v_performed_on,
    coalesce(new.created_at, now()),
    new.id,
    new.execution_id,
    now(),
    now()
  )
  on conflict (subject_key, exercise_key)
  do update set
    best_estimated_1rm_kg = case
      when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg
        then excluded.best_estimated_1rm_kg
      else exercise_prs.best_estimated_1rm_kg
    end,
    best_weight_kg = case
      when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg
        then excluded.best_weight_kg
      else exercise_prs.best_weight_kg
    end,
    best_reps = case
      when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg
        then excluded.best_reps
      else exercise_prs.best_reps
    end,
    best_set_date = case
      when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg
        then excluded.best_set_date
      else exercise_prs.best_set_date
    end,
    best_set_at = case
      when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg
        then excluded.best_set_at
      else exercise_prs.best_set_at
    end,
    source_set_id = case
      when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg
        then excluded.source_set_id
      else exercise_prs.source_set_id
    end,
    source_execution_id = case
      when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg
        then excluded.source_execution_id
      else exercise_prs.source_execution_id
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_strength_sets_sync_exercise_pr on public.strength_sets;
create trigger trg_strength_sets_sync_exercise_pr
after insert or update of exercise_id, exercise_name, reps, weight, calculated_1rm, workout_id, execution_id
on public.strength_sets
for each row
execute function public.sync_exercise_pr_from_strength_set();

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------

alter table public.workout_executions enable row level security;
alter table public.workout_execution_exercises enable row level security;
alter table public.exercise_prs enable row level security;

drop policy if exists workout_executions_select_access on public.workout_executions;
create policy workout_executions_select_access on public.workout_executions
for select to authenticated
using (
  public.is_sysadmin()
  or actor_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
  or exists (
    select 1 from public.clients c
    where c.id = workout_executions.subject_client_id
      and c.linked_user_id = auth.uid()
  )
);

drop policy if exists workout_executions_insert_access on public.workout_executions;
create policy workout_executions_insert_access on public.workout_executions
for insert to authenticated
with check (
  public.is_sysadmin()
  or (
    actor_user_id = auth.uid()
    and (
      subject_user_id = auth.uid()
      or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
      or exists (
        select 1 from public.clients c
        where c.id = workout_executions.subject_client_id
          and c.linked_user_id = auth.uid()
      )
    )
  )
);

drop policy if exists workout_executions_update_access on public.workout_executions;
create policy workout_executions_update_access on public.workout_executions
for update to authenticated
using (
  public.is_sysadmin()
  or actor_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
)
with check (
  public.is_sysadmin()
  or actor_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

drop policy if exists workout_executions_delete_access on public.workout_executions;
create policy workout_executions_delete_access on public.workout_executions
for delete to authenticated
using (
  public.is_sysadmin()
  or actor_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

drop policy if exists workout_execution_exercises_select_access on public.workout_execution_exercises;
create policy workout_execution_exercises_select_access on public.workout_execution_exercises
for select to authenticated
using (
  exists (
    select 1
    from public.workout_executions we
    where we.id = workout_execution_exercises.execution_id
      and (
        public.is_sysadmin()
        or we.actor_user_id = auth.uid()
        or we.subject_user_id = auth.uid()
        or (we.subject_client_id is not null and public.has_client_coach_access(we.subject_client_id))
        or exists (
          select 1 from public.clients c
          where c.id = we.subject_client_id
            and c.linked_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists workout_execution_exercises_write_access on public.workout_execution_exercises;
create policy workout_execution_exercises_write_access on public.workout_execution_exercises
for all to authenticated
using (
  exists (
    select 1
    from public.workout_executions we
    where we.id = workout_execution_exercises.execution_id
      and (
        public.is_sysadmin()
        or we.actor_user_id = auth.uid()
        or we.subject_user_id = auth.uid()
        or (we.subject_client_id is not null and public.has_client_coach_access(we.subject_client_id))
      )
  )
)
with check (
  exists (
    select 1
    from public.workout_executions we
    where we.id = workout_execution_exercises.execution_id
      and (
        public.is_sysadmin()
        or we.actor_user_id = auth.uid()
        or we.subject_user_id = auth.uid()
        or (we.subject_client_id is not null and public.has_client_coach_access(we.subject_client_id))
      )
  )
);

drop policy if exists exercise_prs_select_access on public.exercise_prs;
create policy exercise_prs_select_access on public.exercise_prs
for select to authenticated
using (
  public.is_sysadmin()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
  or exists (
    select 1 from public.clients c
    where c.id = exercise_prs.subject_client_id
      and c.linked_user_id = auth.uid()
  )
);

drop policy if exists exercise_prs_write_access on public.exercise_prs;
create policy exercise_prs_write_access on public.exercise_prs
for all to authenticated
using (
  public.is_sysadmin()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
)
with check (
  public.is_sysadmin()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

-- ---------------------------------------------------------------------------
-- Backfill executions for historical completed sessions
-- ---------------------------------------------------------------------------

insert into public.workout_executions (
  template_workout_id,
  actor_user_id,
  subject_user_id,
  subject_client_id,
  performed_on,
  logged_at,
  source,
  notes,
  created_at,
  updated_at
)
select
  ts.id,
  coalesce(ts.created_by_user_id, ts.user_id),
  ts.subject_user_id,
  ts.subject_client_id,
  ts.performed_on,
  coalesce(ts.completed_at, ts.updated_at, ts.created_at, now()),
  'session_backfill',
  null,
  now(),
  now()
from public.training_sessions ts
where ts.performed_on is not null
  and (coalesce(ts.completed_at, null) is not null or lower(coalesce(ts.status, '')) = 'completed')
  and not exists (
    select 1
    from public.workout_executions we
    where we.template_workout_id = ts.id
      and we.performed_on = ts.performed_on
      and we.source = 'session_backfill'
  );

insert into public.workout_execution_exercises (
  execution_id,
  exercise_id,
  exercise_name,
  exercise_type,
  volume_kg,
  distance_km,
  duration_minutes,
  created_at
)
select
  we.id,
  ss.exercise_id,
  ss.exercise_name,
  'strength',
  sum(coalesce(ss.weight, 0) * coalesce(ss.reps, 0))::numeric,
  null,
  null,
  coalesce(we.logged_at, now())
from public.workout_executions we
join public.strength_sets ss on ss.workout_id = we.template_workout_id
where we.source = 'session_backfill'
  and ss.exercise_name is not null
  and trim(ss.exercise_name) <> ''
group by we.id, ss.exercise_id, ss.exercise_name
on conflict do nothing;

insert into public.workout_execution_exercises (
  execution_id,
  exercise_id,
  exercise_name,
  exercise_type,
  volume_kg,
  distance_km,
  duration_minutes,
  created_at
)
select
  we.id,
  null,
  coalesce(cs.activity_type, 'Cardio'),
  'cardio',
  null,
  sum(coalesce(cs.distance_km, 0))::numeric,
  sum(coalesce(cs.duration_minutes, 0))::int,
  coalesce(we.logged_at, now())
from public.workout_executions we
join public.cardio_sessions cs on cs.workout_id = we.template_workout_id
where we.source = 'session_backfill'
group by we.id, coalesce(cs.activity_type, 'Cardio')
on conflict do nothing;

update public.strength_sets ss
set execution_id = we.id
from public.workout_executions we
where ss.execution_id is null
  and we.source = 'session_backfill'
  and we.template_workout_id = ss.workout_id;

update public.cardio_sessions cs
set execution_id = we.id
from public.workout_executions we
where cs.execution_id is null
  and we.source = 'session_backfill'
  and we.template_workout_id = cs.workout_id;

-- ---------------------------------------------------------------------------
-- Backfill materialized PR table once
-- ---------------------------------------------------------------------------

with ranked as (
  select
    ts.subject_user_id,
    ts.subject_client_id,
    ss.exercise_id,
    trim(ss.exercise_name) as exercise_name,
    round(
      coalesce(
        ss.calculated_1rm,
        case
          when coalesce(ss.reps, 0) > 0 and coalesce(ss.weight, 0) > 0
            then ss.weight * (1 + (ss.reps / 30.0))
          else 0
        end
      )::numeric,
      2
    ) as est_1rm,
    ss.weight,
    ss.reps,
    ts.performed_on,
    ss.created_at,
    ss.id as set_id,
    ss.execution_id,
    row_number() over (
      partition by
        case
          when ts.subject_user_id is not null then 'user:' || ts.subject_user_id::text
          else 'client:' || ts.subject_client_id::text
        end,
        coalesce(ss.exercise_id::text, lower(trim(ss.exercise_name)))
      order by
        coalesce(
          ss.calculated_1rm,
          case
            when coalesce(ss.reps, 0) > 0 and coalesce(ss.weight, 0) > 0
              then ss.weight * (1 + (ss.reps / 30.0))
            else 0
          end
        ) desc,
        ts.performed_on desc,
        ss.created_at desc,
        ss.id desc
    ) as rn
  from public.strength_sets ss
  join public.training_sessions ts on ts.id = ss.workout_id
  where trim(coalesce(ss.exercise_name, '')) <> ''
    and ((ts.subject_user_id is not null)::int + (ts.subject_client_id is not null)::int) = 1
    and coalesce(
      ss.calculated_1rm,
      case
        when coalesce(ss.reps, 0) > 0 and coalesce(ss.weight, 0) > 0
          then ss.weight * (1 + (ss.reps / 30.0))
        else 0
      end
    ) > 0
)
insert into public.exercise_prs (
  subject_user_id,
  subject_client_id,
  exercise_id,
  exercise_name,
  best_estimated_1rm_kg,
  best_weight_kg,
  best_reps,
  best_set_date,
  best_set_at,
  source_set_id,
  source_execution_id,
  created_at,
  updated_at
)
select
  subject_user_id,
  subject_client_id,
  exercise_id,
  exercise_name,
  est_1rm,
  weight,
  reps,
  performed_on,
  created_at,
  set_id,
  execution_id,
  now(),
  now()
from ranked
where rn = 1
on conflict (subject_key, exercise_key)
do update set
  best_estimated_1rm_kg = greatest(exercise_prs.best_estimated_1rm_kg, excluded.best_estimated_1rm_kg),
  best_weight_kg = case
    when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg then excluded.best_weight_kg
    else exercise_prs.best_weight_kg
  end,
  best_reps = case
    when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg then excluded.best_reps
    else exercise_prs.best_reps
  end,
  best_set_date = case
    when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg then excluded.best_set_date
    else exercise_prs.best_set_date
  end,
  best_set_at = case
    when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg then excluded.best_set_at
    else exercise_prs.best_set_at
  end,
  source_set_id = case
    when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg then excluded.source_set_id
    else exercise_prs.source_set_id
  end,
  source_execution_id = case
    when excluded.best_estimated_1rm_kg > exercise_prs.best_estimated_1rm_kg then excluded.source_execution_id
    else exercise_prs.source_execution_id
  end,
  updated_at = now();

commit;
